import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clientIpFrom, createRateLimiter, isSameOriginRequest } from "@/lib/server/rate-limit";
import type { LatLng, LatLngRing } from "@/lib/roof-design";
import { googleMapsKey } from "@/lib/roof-design/server";
import { roofJob, roofJobPending } from "@/lib/server/roofDesignPool";
import { ROOF_ENGINE_VERSION } from "@/lib/roof-design/engine";
import { cachedJson, cacheRead, cacheWrite, placeKey } from "@/lib/server/roofDataCache";

/**
 * The roof-design API — the one way installers, customers and outside
 * websites get a system designed (platform rule, 5 Nov 2026). Same engine
 * and rules as the Designs page. See docs/ROOF_DESIGN_API.md.
 *
 * Who may call:
 *   - the platform's own pages (installer, customer and operations portals,
 *     the website): same-origin, limited per visitor IP;
 *   - outside websites listed in ROOF_DESIGN_API_ORIGINS, from the browser:
 *     limited per visitor IP;
 *   - outside systems, server to server: x-api-key from ROOF_DESIGN_API_KEYS,
 *     limited per key.
 *
 *   POST /api/roof-design
 *   { "address": "11 Melton St S, Auburn NSW 2144" }      or { "lat": -33.85, "lng": 151.03 }
 *   optional: "orientation": "PORTRAIT" | "LANDSCAPE" | "best", "beautify": true,
 *             "panelWatts": 440, "outline": [[{lat,lng},...]], "includeImage": true
 */
export const runtime = "nodejs";
export const maxDuration = 120;

/** Per key: 30 designs an hour (each one costs Google Solar and Static Maps calls). */
const limiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });
/** Per visitor (portal pages and listed websites): 20 new designs an hour (kept designs are free). */
const visitorLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 });

/** Outside websites allowed to call from the browser, e.g. "https://partner.com.au". */
function allowedOrigins(): string[] {
  return (process.env.ROOF_DESIGN_API_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, "").toLowerCase())
    .filter((o) => /^https?:\/\/[^/]+$/.test(o));
}

function listedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")?.replace(/\/$/, "").toLowerCase();
  return origin && allowedOrigins().includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      }
    : {};
}

export function OPTIONS(request: Request) {
  const origin = listedOrigin(request);
  return new NextResponse(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) });
}

function configuredKeys(): string[] {
  return (process.env.ROOF_DESIGN_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
}

function keyMatches(given: string, keys: string[]): string | null {
  const g = Buffer.from(given);
  for (const k of keys) {
    const b = Buffer.from(k);
    if (b.length === g.length && timingSafeEqual(b, g)) return k;
  }
  return null;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPoint = (p: unknown): p is LatLng => Boolean(p) && isNum((p as LatLng).lat) && isNum((p as LatLng).lng);

async function geocode(address: string): Promise<{ pin: LatLng; formattedAddress: string } | null> {
  const key = googleMapsKey();
  if (!key) return null;
  const params = new URLSearchParams({ address, region: "au", components: "country:AU", key });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
    cache: "no-store",
    headers: { Referer: "https://www.easylinksolar.com.au/" },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { status: string; results?: { formatted_address: string; geometry: { location: LatLng } }[] };
  const hit = j.status === "OK" ? j.results?.[0] : undefined;
  return hit ? { pin: hit.geometry.location, formattedAddress: hit.formatted_address } : null;
}

const fail = (status: number, message: string, headers?: Record<string, string>) => NextResponse.json({ message }, { status, headers });

/** Under the site's 120 s request limit (nginx), with room to answer. */
const ANSWER_WITHIN_MS = 100_000;

export async function POST(request: Request) {
  const origin = listedOrigin(request);
  const res = await handle(request, origin);
  for (const [k, v] of Object.entries(corsHeaders(origin))) res.headers.set(k, v);
  return res;
}

async function handle(request: Request, origin: string | null): Promise<NextResponse> {
  const given = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const keys = configuredKeys();
  const key = given ? keyMatches(given, keys) : null;
  // Who is asking decides the limit; it's charged only when a design has to
  // be made (a design kept from earlier costs nothing).
  let takeRate: () => NextResponse | null;
  if (key) {
    takeRate = () => {
      const rate = limiter.check(key);
      return rate.allowed ? null : fail(429, "Too many roof designs for this key; try again later.", { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) });
    };
  } else if (!given && (origin || isSameOriginRequest(request.headers, request.url))) {
    // The platform's own pages, or a listed outside website, from the visitor's browser.
    takeRate = () => {
      const rate = visitorLimiter.check(`ip:${clientIpFrom(request.headers)}`);
      return rate.allowed ? null : fail(429, "Too many roof designs; try again later.", { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) });
    };
  } else if (keys.length === 0 && !given) {
    return fail(503, "The roof-design API is not enabled on this server.");
  } else {
    return fail(401, "A valid x-api-key header is required.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "The body must be JSON.");
  }

  let pin: LatLng | null = null;
  let formattedAddress: string | null = null;
  if (isNum(body.lat) && isNum(body.lng)) pin = { lat: body.lat, lng: body.lng };
  else if (typeof body.address === "string" && body.address.trim().length > 4) {
    const addr = body.address.trim().slice(0, 300);
    const g = await cachedJson(`geocode|${addr.toLowerCase()}`, () => geocode(addr).catch(() => null));
    if (!g) return fail(422, "Couldn't find this address on the map.");
    ({ pin, formattedAddress } = g);
  } else return fail(400, "Give either lat and lng, or an address.");
  if (Math.abs(pin.lat) > 90 || Math.abs(pin.lng) > 180) return fail(400, "lat/lng out of range.");

  const orientation = body.orientation === "PORTRAIT" || body.orientation === "LANDSCAPE" || body.orientation === "best" ? body.orientation : undefined;
  const outline =
    Array.isArray(body.outline) && body.outline.length > 0 && body.outline.length <= 20
      ? (body.outline as unknown[]).filter((r): r is LatLngRing => Array.isArray(r) && r.length >= 3 && r.length <= 400 && r.every(isPoint))
      : undefined;
  const panelWatts = isNum(body.panelWatts) && body.panelWatts >= 100 && body.panelWatts <= 1000 ? body.panelWatts : undefined;

  // Finished designs are kept by address, options and engine version; an
  // edited outline is its own entry, so a user's edit is never answered with
  // the automatic design.
  const designKey = [
    "design",
    ROOF_ENGINE_VERSION,
    placeKey(pin.lat, pin.lng),
    orientation ?? "-",
    body.beautify === true ? "b" : "-",
    panelWatts ?? "-",
    outline?.length ? createHash("sha1").update(JSON.stringify(outline)).digest("hex") : "auto",
    body.includeImage === true ? "img" : "-",
  ].join("|");
  const kept = await cacheRead(designKey);
  if (kept) {
    const res = new NextResponse(kept.toString("utf8"), { status: 200, headers: { "Content-Type": "application/json", "X-Roof-Design-Cache": "hit" } });
    return res;
  }
  // Asking again for a design that's still being made (after a 202) joins it
  // and isn't charged.
  const limited = roofJobPending(designKey) ? null : takeRate();
  if (limited) return limited;

  try {
    // On the design worker, shared with anyone asking for the same design
    // right now; dropped if this visitor goes before it starts.
    const job = roofJob(
      {
        kind: "api",
        pin,
        formattedAddress,
        orientation,
        beautify: body.beautify === true,
        panelWatts,
        outline: outline?.length ? outline : undefined,
        includeImage: body.includeImage === true,
      },
      { key: designKey, signal: request.signal },
    );
    // Kept only when Opus traced it (or no AI is set up): an untraced design is asked again next time.
    const keep = job.then(async (r) => {
      if (r.status !== "READY") return r;
      const notes = (r.body as { notes?: string[] }).notes ?? [];
      if (!notes.some((n) => n.startsWith("Opus couldn't trace") || n.startsWith("Opus is still"))) await cacheWrite(designKey, JSON.stringify(r.body));
      return r;
    });
    keep.catch(() => {});
    // Answer inside the site's 120 s request limit: a design still going on
    // (busy worker, slow Opus) keeps going and is kept when done; the page
    // asks again and gets it (202 = ask again shortly).
    const r = await Promise.race([keep, new Promise<null>((res) => setTimeout(() => res(null), ANSWER_WITHIN_MS))]);
    if (!r) return NextResponse.json({ status: "WORKING", message: "Still designing this roof: ask again shortly." }, { status: 202 });
    if (r.status !== "READY") return NextResponse.json(r.body, { status: 200 });
    return new NextResponse(JSON.stringify(r.body), { status: 200, headers: { "Content-Type": "application/json", "X-Roof-Design-Cache": "miss" } });
  } catch (e) {
    console.error("roof-design API", e);
    return fail(502, "The roof design couldn't be completed; try again shortly.");
  }
}
