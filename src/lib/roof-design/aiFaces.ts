/**
 * The AI platform's reading of a roof (server only). The zoom-21 satellite
 * image around the pin is cropped to the house and handed to the AI platform
 * (`POST /v1/roof/faces`, event-based: it answers with an id and reads the
 * roof in the background with its smart model, Claude Opus 5.5). The faces it
 * returns are mapped from image pixels to lat/lng for the engine, which uses
 * them as one more reading of the roof (`RoofDesignContext.aiFaces`).
 *
 * Optional by design: without the platform, on any error, or past the time
 * limit, the roof is designed exactly as before.
 *
 * Env: ROOF_AI_PLATFORM_URL and ROOF_AI_INGEST_KEY (the AI platform's API and
 * its ingest key) switch on this reading alone, so the roof designer can use
 * the platform before the portals' other AI features are connected; else
 * AI_PLATFORM_URL and AI_EVENT_INGEST_KEY. ROOF_AI=off turns it off.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { cacheRead, cacheWrite } from "@/lib/server/roofDataCache";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AiRoofFace, AiRoofTrace } from "./engine";
import type { LatLng } from "./geometry";
import { snapshotMetresPerPixel, type SnapshotGeo } from "@/lib/designer/roofSnapshot";

type Snapshot = { png: Buffer; geo: SnapshotGeo };

/** Side of the square sent to the AI, in image pixels (about 30 m at zoom 21). */
export const AI_CROP_PX = 960;
/**
 * How long a design waits for the AI's trace. Opus traces every roof first and
 * then checks its trace against the photo (owner's rules, 9 Nov 2026), which
 * takes 1.5-4 minutes. The design job waits for it (inside the job's 240 s);
 * the request answers "still designing" (202) at 100 s and the page asks again
 * and collects it, so the engine's own reading isn't designed on meanwhile
 * (owner, 10 Nov 2026). Past this wait the reading keeps running, the design
 * says Opus is still tracing, and the page waits for it.
 */
export const AI_WAIT_MS = 210_000;
/** A reading is picked up again by later requests for the same roof for this long. */
const READING_REUSE_MS = 30 * 60_000;
const READINGS_FILE = join(tmpdir(), "easylink-roof-ai-readings.json");
type ReadingRef = { id: string; at: number; status: "pending" | "done" | "error" };
function readRefs(): Record<string, ReadingRef> {
  try {
    return JSON.parse(readFileSync(READINGS_FILE, "utf8")) as Record<string, ReadingRef>;
  } catch {
    return {};
  }
}
function saveRef(key: string, ref: ReadingRef | null) {
  try {
    const all = readRefs();
    const now = Date.now();
    for (const [k, v] of Object.entries(all)) if (now - v.at > READING_REUSE_MS) delete all[k];
    if (ref) all[key] = ref;
    else delete all[key];
    writeFileSync(READINGS_FILE, JSON.stringify(all));
  } catch {
    // best effort: without it a later request starts a new reading
  }
}
function freshRef(key: string): ReadingRef | null {
  const r = readRefs()[key];
  return r && Date.now() - r.at < READING_REUSE_MS && r.status !== "error" ? r : null;
}
/** True while Opus is still tracing or checking this roof (started by an earlier request). */
export function aiTraceRunning(key: string): boolean {
  return freshRef(key)?.status === "pending";
}
/**
 * A roof's finished, self-checked trace is kept (owner, 10 Nov 2026: 26
 * Bridgeview Cct was traced perfectly, then traced again after 30 minutes and
 * the new trace was worse; meanwhile the engine's own reading was shown).
 * The same roof gets the same trace from then on, across engine updates and
 * restarts (the roof data cache keeps it 30 days); only a new trace version
 * reads it again.
 */
const TRACE_STORE_VERSION = "v2"; // v2: roof surface only (10 Nov 2026)
const traceStoreKey = (key: string) => `opus-trace|${TRACE_STORE_VERSION}|${key}`;
async function keptTrace(key: string | undefined): Promise<AiRoofTrace | null> {
  if (!key) return null;
  try {
    const hit = await cacheRead(traceStoreKey(key));
    return hit ? (JSON.parse(hit.toString("utf8")) as AiRoofTrace) : null;
  } catch {
    return null;
  }
}
/** True when this roof already has a kept trace (no Opus wait needed). */
export async function hasKeptTrace(key: string): Promise<boolean> {
  return (await keptTrace(key)) !== null;
}

/** The key a roof's reading is filed under: the pin to about 10 cm. */
export const aiTraceKey = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
const POLL_MS = 1500;

const platformUrl = () => process.env.ROOF_AI_PLATFORM_URL || process.env.AI_PLATFORM_URL || "";
const ingestKey = () => process.env.ROOF_AI_INGEST_KEY || process.env.AI_EVENT_INGEST_KEY || "";

export function aiRoofFacesEnabled(): boolean {
  return Boolean(platformUrl() && ingestKey()) && process.env.ROOF_AI !== "off";
}

/** Lat/lng of a pixel in the snapshot (the inverse of `toPx`, Web Mercator). */
export function fromPx(geo: SnapshotGeo, x: number, y: number): LatLng {
  const W = 256 * 2 ** geo.zoom * geo.scale;
  const s = Math.sin((geo.centerLat * Math.PI) / 180);
  const xc = ((geo.centerLng + 180) / 360) * W;
  const yc = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W;
  const mx = xc + (x - geo.widthPx / 2);
  const my = yc + (y - geo.heightPx / 2);
  const lng = (mx / W) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * my) / W;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

/** Compass bearing → the azimuth convention the engine uses (degrees clockwise from north). */
const azimuthOf = (bearing: number | null | undefined) => (typeof bearing === "number" && Number.isFinite(bearing) ? bearing : undefined);

type PxRing = [number, number][];
type PlatformFace = { name: string; bearingDeg: number | null; ring: PxRing };
type PlatformBuilding = {
  name: string;
  main: boolean;
  flat: boolean;
  outline: PxRing;
  points: { id: string; x: number; y: number }[];
  lines: { from: string; to: string; kind: string; seen: "clear" | "faint" }[];
  faces: PlatformFace[];
  obstructions: { kind: string; ring: PxRing }[];
};
type PlatformReading = {
  id: string;
  status: "pending" | "done" | "error";
  faces?: PlatformFace[];
  buildings?: PlatformBuilding[];
  noRoof?: boolean;
  message?: string;
};

/**
 * The same view with local contrast boosted (the image minus its blur, x4,
 * around mid-grey): faint box edges and light step lines on white or metal
 * roofs show clearly. Sent to Opus as a second image.
 */
export async function localContrastPng(png: Buffer): Promise<Buffer> {
  const g = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(png).greyscale().blur(5).raw().toBuffer();
  const out = Buffer.alloc(g.data.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, 128 + 4 * (g.data[i] - b[i])));
  return sharp(out, { raw: { width: g.info.width, height: g.info.height, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer();
}

/** Pixel of a lat/lng in the snapshot (Web Mercator, like `fromPx`). */
function toPxOf(geo: SnapshotGeo, p: LatLng): [number, number] {
  const W = 256 * 2 ** geo.zoom * geo.scale;
  const merc = (lat: number, lng: number) => {
    const s = Math.sin((lat * Math.PI) / 180);
    return [((lng + 180) / 360) * W, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W];
  };
  const [xc, yc] = merc(geo.centerLat, geo.centerLng);
  const [x, y] = merc(p.lat, p.lng);
  return [x - xc + geo.widthPx / 2, y - yc + geo.heightPx / 2];
}

async function platform(path: string, init?: RequestInit): Promise<PlatformReading | null> {
  const base = platformUrl().replace(/\/+$/, "");
  const res = await fetch(`${base}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: { "x-ingest-key": ingestKey(), "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { data?: PlatformReading } | null;
  return body?.data ?? null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Opus's trace of the roof at the centre of the image, in lat/lng (owner's
 * rule: Opus traces every roof first — visible lines and intersection points,
 * borders, faces, obstructions), or null (not configured, not readable, or not
 * back in time). Never throws.
 */
export async function fetchAiRoofTrace(
  image: Snapshot,
  opts: {
    waitMs?: number;
    hint?: string;
    lot?: LatLng[] | null;
    key?: string;
    /** A second aerial photo in the same frame, lined up with `image` (NSW Spatial Services), and what it is. */
    second?: { png: Buffer; note: string } | null;
  } = {},
): Promise<AiRoofTrace | null> {
  if (!aiRoofFacesEnabled()) return null;
  const deadline = Date.now() + (opts.waitMs ?? AI_WAIT_MS);
  const kept = await keptTrace(opts.key);
  if (kept) return kept;
  try {
    const { geo } = image;
    const side = Math.min(AI_CROP_PX, geo.widthPx, geo.heightPx);
    const left = Math.round((geo.widthPx - side) / 2);
    const top = Math.round((geo.heightPx - side) / 2);
    // PNG keeps the tile and edge detail the model reads lines from.
    const crop = await sharp(image.png).extract({ left, top, width: side, height: side }).png({ compressionLevel: 9 }).toBuffer();
    const contrast = await localContrastPng(crop).catch(() => null);
    // The second photo, cut the same way (a palette PNG keeps the request small).
    const second = opts.second
      ? await sharp(opts.second.png).extract({ left, top, width: side, height: side }).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer().catch(() => null)
      : null;
    const lot = opts.lot?.length ? opts.lot.map((p) => { const [x, y] = toPxOf(geo, p); return [Math.round(x - left), Math.round(y - top)] as [number, number]; }) : undefined;
    const had = opts.key ? freshRef(opts.key) : null;
    const started = had ? { id: had.id, status: "pending" as const } : await platform("v1/roof/faces", {
      method: "POST",
      body: JSON.stringify({
        imageBase64: crop.toString("base64"),
        contrastBase64: contrast ? contrast.toString("base64") : undefined,
        secondImageBase64: second ? second.toString("base64") : undefined,
        secondImageNote: second ? opts.second!.note : undefined,
        format: "png",
        widthPx: side,
        heightPx: side,
        metresPerPixel: snapshotMetresPerPixel(geo),
        hint: opts.hint,
        lot,
        scope: "house",
        review: 2,
        // Close-ups of every point, then the edge snap within 30 cm (owner, 10 Nov 2026).
        refine: true,
      }),
    });
    if (!started?.id) return null;
    if (opts.key && !had) saveRef(opts.key, { id: started.id, at: Date.now(), status: "pending" });
    let r: PlatformReading | null = started;
    while (r && r.status === "pending" && Date.now() + POLL_MS < deadline) {
      await wait(POLL_MS);
      r = await platform(`v1/roof/faces/${encodeURIComponent(started.id)}`);
    }
    if (opts.key && r && r.status !== "pending") saveRef(opts.key, { id: started.id, at: had?.at ?? Date.now(), status: r.status });
    if (!r || r.status !== "done") return null;
    const ll = ([x, y]: [number, number]) => fromPx(geo, x + left, y + top);
    const ring = (pts: PxRing) => pts.map(ll);
    const buildings = r.buildings?.length
      ? r.buildings
      : r.faces?.length
        ? [{ name: "Main roof", main: true, flat: false, outline: [], points: [], lines: [], faces: r.faces, obstructions: [] } as PlatformBuilding]
        : [];
    const main = buildings.find((b) => b.main) ?? buildings[0];
    if (!main) return r.noRoof ? { noRoof: true, faces: [], outline: null, lines: [], obstructions: [], flat: false } : null;
    const pts = new Map(main.points.map((p) => [p.id, [p.x, p.y] as [number, number]]));
    const trace: AiRoofTrace = {
      noRoof: false,
      flat: main.flat,
      outline: main.outline.length >= 3 ? ring(main.outline) : null,
      faces: main.faces.map((f) => ({ name: f.name, azimuthDeg: azimuthOf(f.bearingDeg), ring: ring(f.ring) })),
      lines: main.lines
        .filter((l) => pts.has(l.from) && pts.has(l.to))
        .map((l) => ({ a: ll(pts.get(l.from)!), b: ll(pts.get(l.to)!), kind: l.kind, seen: l.seen })),
      obstructions: main.obstructions.map((o) => ({ kind: o.kind, ring: ring(o.ring) })),
    };
    if (opts.key && trace.faces.length) await cacheWrite(traceStoreKey(opts.key), JSON.stringify(trace)).catch(() => {});
    return trace;
  } catch {
    return null;
  }
}

/** The faces alone (older callers). */
export async function fetchAiRoofFaces(image: Snapshot, opts: { waitMs?: number; hint?: string } = {}): Promise<AiRoofFace[] | null> {
  const t = await fetchAiRoofTrace(image, opts);
  return t?.faces.length ? t.faces : null;
}
