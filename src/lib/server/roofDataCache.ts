/**
 * Server cache for everything a roof design reads, shared by the Designs
 * page's data routes and the Roof Designer (API, Quotes & Leads), so an
 * address is loaded from Google once and every later design of it — the
 * customer's roof step after the address step, an installer opening the job,
 * a proposal — starts from local files.
 *
 * Kept on disk (survives restarts) for up to 30 days, the most Google's terms
 * allow for performance caching; capped in size, oldest first out.
 *
 * Google's data-layer links expire after about an hour, so the layer files
 * are stored by address and layer, not by link: the link → file mapping is
 * recorded when the links are issued.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBackendUrl, extractMessage, unwrapApiData } from "@/lib/customers/backend";

const DIR = process.env.ROOF_DATA_CACHE_DIR || join(tmpdir(), "easylink-roof-cache");
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BYTES = Number(process.env.ROOF_DATA_CACHE_MAX_MB || 2048) * 1024 * 1024;

const fileOf = (key: string) => join(DIR, createHash("sha1").update(key).digest("hex"));

/** Address key: 6 decimals (~0.1 m). */
export const placeKey = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

export async function cacheRead(key: string): Promise<Buffer | null> {
  const f = fileOf(key);
  try {
    const s = await stat(f);
    if (Date.now() - s.mtimeMs > TTL_MS) {
      await unlink(f).catch(() => {});
      return null;
    }
    return await readFile(f);
  } catch {
    return null;
  }
}

let writes = 0;
export async function cacheWrite(key: string, data: Buffer | string): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    const f = fileOf(key);
    const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, f);
    if (++writes % 50 === 1) void prune();
  } catch (e) {
    console.warn("roof data cache write failed", e);
  }
}

/** Drop expired files; over the size cap, the oldest go first. */
async function prune(): Promise<void> {
  try {
    const names = await readdir(DIR);
    const files: { f: string; t: number; size: number }[] = [];
    for (const n of names) {
      const f = join(DIR, n);
      try {
        const s = await stat(f);
        if (Date.now() - s.mtimeMs > TTL_MS || (n.endsWith(".tmp") && Date.now() - s.mtimeMs > 3600_000)) await unlink(f);
        else files.push({ f, t: s.mtimeMs, size: s.size });
      } catch {
        /* gone already */
      }
    }
    let total = files.reduce((a, x) => a + x.size, 0);
    files.sort((a, b) => a.t - b.t);
    for (const x of files) {
      if (total <= MAX_BYTES) break;
      await unlink(x.f).catch(() => {});
      total -= x.size;
    }
  } catch {
    /* no cache dir yet */
  }
}

/** One load at a time per key: a page and a prefetch asking together share it. */
const inFlight = new Map<string, Promise<unknown>>();
function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  const p = inFlight.get(key) as Promise<T> | undefined;
  if (p) return p;
  const q = make().finally(() => inFlight.delete(key));
  inFlight.set(key, q);
  return q;
}

export async function cachedJson<T>(key: string, make: () => Promise<T | null>): Promise<T | null> {
  const hit = await cacheRead(key);
  if (hit) {
    try {
      return JSON.parse(hit.toString("utf8")) as T;
    } catch {
      /* corrupt: reload */
    }
  }
  return once(key, async () => {
    const v = await make();
    if (v !== null && v !== undefined) await cacheWrite(key, JSON.stringify(v));
    return v;
  });
}

export async function cachedBytes(key: string, make: () => Promise<Buffer | null>): Promise<Buffer | null> {
  const hit = await cacheRead(key);
  if (hit) return hit;
  return once(key, async () => {
    const v = await make();
    if (v && v.byteLength > 0) await cacheWrite(key, v);
    return v;
  });
}

/* ── Backend calls (the platform's Google Solar, cadastre and footprint services) ── */

export type BackendResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

function backendBase(): string | null {
  return process.env.BACKEND_API_BASE_URL || null;
}

async function backendJson<T>(path: string, init: RequestInit | undefined, fallbackMessage: string, raw = false): Promise<BackendResult<T>> {
  const base = backendBase();
  if (!base) return { ok: false, status: 500, message: "Server configuration is missing BACKEND_API_BASE_URL." };
  let res: Response;
  try {
    res = await fetch(buildBackendUrl(base, path), { cache: "no-store", ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  } catch {
    return { ok: false, status: 502, message: fallbackMessage };
  }
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!res.ok) return { ok: false, status: res.status, message: extractMessage(payload, fallbackMessage) };
  return { ok: true, data: (raw ? payload : unwrapApiData<T>(payload)) as T };
}

type CombinedSolar = {
  estimate: unknown;
  dataLayers: { rgbUrl?: string; maskUrl?: string; annualFluxUrl?: string; dsmUrl?: string; [k: string]: unknown };
};

/** The layers the design reads; a cached estimate is used only while these files are cached too (their links expire). */
const DESIGN_LAYERS = ["rgb", "mask", "dsm"] as const;
const layerKey = (place: string, layer: string) => `layer|${place}|${layer}`;
const linkKey = (url: string) => `link|${url}`;

/** Google Solar's estimate + data-layer links for a point, cached with its layer files. */
export async function getCombinedSolar(lat: number, lng: number): Promise<BackendResult<CombinedSolar>> {
  const place = placeKey(lat, lng);
  const key = `combined|${place}`;
  const hit = await cacheRead(key);
  if (hit) {
    try {
      const data = JSON.parse(hit.toString("utf8")) as CombinedSolar;
      const have = await Promise.all(DESIGN_LAYERS.map((l) => cacheRead(layerKey(place, l)).then((b) => Boolean(b))));
      if (have.every(Boolean)) return { ok: true, data };
    } catch {
      /* reload */
    }
  }
  return once(key, async () => {
    const r = await backendJson<CombinedSolar>(
      "/solar/estimate-with-layers",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latitude: lat, longitude: lng }) },
      "Solar estimation failed. Please try again.",
    );
    if (!r.ok || !r.data) return r.ok ? { ok: false as const, status: 502, message: "Unexpected response from solar service." } : r;
    const links: [string, string | undefined][] = [
      ["rgb", r.data.dataLayers?.rgbUrl],
      ["mask", r.data.dataLayers?.maskUrl],
      ["dsm", r.data.dataLayers?.dsmUrl],
      ["flux", r.data.dataLayers?.annualFluxUrl],
    ];
    for (const [layer, url] of links) if (url) await cacheWrite(linkKey(url), layerKey(place, layer));
    // Fetch the design's layer files now, together, so the page and the Roof Designer read them locally.
    await Promise.all(
      links.filter(([l, u]) => u && (DESIGN_LAYERS as readonly string[]).includes(l)).map(([, u]) => getLayerBytes(u!).catch(() => null)),
    );
    await cacheWrite(key, JSON.stringify(r.data));
    return r;
  });
}

async function fetchLayerFromBackend(url: string): Promise<Buffer | null> {
  const base = backendBase();
  if (!base) return null;
  const proxy = new URL(buildBackendUrl(base, "/solar/geotiff-proxy"));
  proxy.searchParams.set("url", url);
  const res = await fetch(proxy.toString(), { cache: "no-store" });
  if (!res.ok) throw Object.assign(new Error(`GeoTIFF proxy failed: ${res.status}`), { status: res.status });
  return Buffer.from(await res.arrayBuffer());
}

/** A data-layer file by its (possibly expired) link: from the cache when the link was issued for a cached address. */
export async function getLayerBytes(url: string): Promise<Buffer | null> {
  const mapped = await cacheRead(linkKey(url));
  if (!mapped) return fetchLayerFromBackend(url);
  return cachedBytes(mapped.toString("utf8"), () => fetchLayerFromBackend(url));
}

/** The land lot under a point (NSW cadastre); `null` data = none found, cached too. */
export async function getCadastre<T>(lat: number, lng: number): Promise<BackendResult<T | null>> {
  const key = `cadastre|${placeKey(lat, lng)}`;
  const hit = await cacheRead(key);
  if (hit) return { ok: true, data: JSON.parse(hit.toString("utf8")).data as T | null };
  return once(key, async () => {
    const r = await backendJson<{ data?: T | null } | null>(`/cadastre/lookup?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, undefined, "Cadastre lookup failed. Please try again.", true);
    if (!r.ok) return r;
    const data = r.data?.data ?? null;
    await cacheWrite(key, JSON.stringify({ data }));
    return { ok: true as const, data };
  });
}

/** The building footprint near a point; `null` data = none found, cached too. */
export async function getFootprint<T>(lat: number, lng: number): Promise<BackendResult<T | null>> {
  const key = `footprint|${placeKey(lat, lng)}`;
  const hit = await cacheRead(key);
  if (hit) return { ok: true, data: JSON.parse(hit.toString("utf8")).data as T | null };
  return once(key, async () => {
    const r = await backendJson<{ data?: T | null } | null>(
      `/building-footprint/lookup?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      undefined,
      "Building footprint lookup failed. Please try again.",
      true,
    );
    if (!r.ok) return r;
    const data = r.data?.data ?? null;
    await cacheWrite(key, JSON.stringify({ data }));
    return { ok: true as const, data };
  });
}

/* ── Satellite image ───────────────────────────────────────────────── */

const STATIC_MAPS = "https://maps.googleapis.com/maps/api/staticmap";

/** The zoomed satellite image (Static Maps, 640×640 at scale 2), cached by point and zoom. */
export async function getSnapshotPng(lat: number, lng: number, zoom: number, key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY): Promise<Buffer | null> {
  if (!key) throw new Error("Google Maps key is not configured");
  const center = `${lat.toFixed(7)},${lng.toFixed(7)}`;
  return cachedBytes(`snap|${center}|${zoom}`, async () => {
    const params = new URLSearchParams({ center, zoom: String(zoom), size: "640x640", scale: "2", maptype: "satellite", format: "png32", key });
    const res = await fetch(`${STATIC_MAPS}?${params}`, { cache: "no-store", headers: { Referer: "https://www.easylinksolar.com.au/" } });
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) throw new Error(`Satellite image failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  });
}
