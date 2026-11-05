import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { panelCorners, type LatLng, type LatLngRing } from "@/lib/roof-design";
import { designRoofAt, googleMapsKey, renderRoofDesign } from "@/lib/roof-design/server";

/**
 * The roof-design API: EasyLink's roof designer for other systems (CRMs,
 * partner tools, internal services). Same engine and rules as the Designs
 * page. See docs/ROOF_DESIGN_API.md.
 *
 *   POST /api/roof-design
 *   x-api-key: <key from ROOF_DESIGN_API_KEYS>
 *   { "address": "11 Melton St S, Auburn NSW 2144" }      or { "lat": -33.85, "lng": 151.03 }
 *   optional: "orientation": "PORTRAIT" | "LANDSCAPE" | "best", "beautify": true,
 *             "panelWatts": 440, "outline": [[{lat,lng},...]], "includeImage": true
 */
export const runtime = "nodejs";
export const maxDuration = 60;

/** Per key: 30 designs an hour (each one costs Google Solar and Static Maps calls). */
const limiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

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

export async function POST(request: Request) {
  const keys = configuredKeys();
  if (keys.length === 0) return fail(503, "The roof-design API is not enabled on this server.");
  const given = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const key = given ? keyMatches(given, keys) : null;
  if (!key) return fail(401, "A valid x-api-key header is required.");
  const rate = limiter.check(key);
  if (!rate.allowed) return fail(429, "Too many roof designs for this key; try again later.", { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) });

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
    const g = await geocode(body.address.trim().slice(0, 300)).catch(() => null);
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

  try {
    const r = await designRoofAt(pin, { orientation, beautify: body.beautify === true, panelWatts, outline: outline?.length ? outline : undefined });
    if (r.status !== "READY") return NextResponse.json({ status: "NO_ROOF", pin, formattedAddress, message: r.message }, { status: 200 });
    const d = r.design;
    let image: { contentType: string; base64: string } | null = null;
    if (body.includeImage === true && r.image) {
      const { large } = await renderRoofDesign(r.image, d);
      image = { contentType: "image/jpeg", base64: large.toString("base64") };
    }
    return NextResponse.json({
      status: "READY",
      pin,
      formattedAddress,
      outline: { rings: d.outline, source: d.outlineSource, needsVerification: d.needsVerification, areaM2: d.roofAreaM2 },
      faces: {
        source: d.faceSet.source,
        gables: d.faceSet.gables,
        items: d.faceSet.faces.map((f) => ({ ring: f.ring, pitchDeg: f.pitchDeg ?? null, azimuthDeg: f.azimuthDeg ?? null })),
      },
      obstructions: d.faceSet.obstructions.map((o) => ({ ring: o.ring, kind: o.kind })),
      lines: { total: d.lines.total, checked: d.lines.checked, ok: d.lines.ok },
      panels: {
        orientation: d.orientation,
        count: d.panels.length,
        counts: d.counts,
        watts: d.panelWatts,
        dims: d.dims,
        items: d.panels.map((p) => ({ center: p.center, rotationDeg: p.rotationDegrees ?? 0, slopeDeg: p.slopeDegrees ?? 0, corners: panelCorners(p, d.dims) })),
      },
      systemKw: d.systemKw,
      roofPitchDeg: d.pitchDeg,
      inverter: d.inverter,
      notes: d.notes,
      image,
    });
  } catch (e) {
    console.error("roof-design API", e);
    return fail(502, "The roof design couldn't be completed; try again shortly.");
  }
}
