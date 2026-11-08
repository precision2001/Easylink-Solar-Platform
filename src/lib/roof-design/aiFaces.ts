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
import type { AiRoofFace } from "./engine";
import type { LatLng } from "./geometry";
import { snapshotMetresPerPixel, type SnapshotGeo } from "@/lib/designer/roofSnapshot";

type Snapshot = { png: Buffer; geo: SnapshotGeo };

/** Side of the square sent to the AI, in image pixels (about 30 m at zoom 21). */
export const AI_CROP_PX = 960;
/** How long a design waits for the AI's reading before going on without it. */
export const AI_WAIT_MS = 35_000;
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

type PlatformReading = {
  id: string;
  status: "pending" | "done" | "error";
  faces?: { name: string; bearingDeg: number | null; ring: [number, number][] }[];
  message?: string;
};

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
 * The AI's faces of the roof at the centre of the image, in lat/lng, or null
 * (not configured, not readable, or not back in time). Never throws.
 */
export async function fetchAiRoofFaces(image: Snapshot, opts: { waitMs?: number; hint?: string } = {}): Promise<AiRoofFace[] | null> {
  if (!aiRoofFacesEnabled()) return null;
  const deadline = Date.now() + (opts.waitMs ?? AI_WAIT_MS);
  try {
    const { geo } = image;
    const side = Math.min(AI_CROP_PX, geo.widthPx, geo.heightPx);
    const left = Math.round((geo.widthPx - side) / 2);
    const top = Math.round((geo.heightPx - side) / 2);
    // PNG keeps the tile and edge detail the model reads lines from.
    const crop = await sharp(image.png).extract({ left, top, width: side, height: side }).png({ compressionLevel: 9 }).toBuffer();
    const started = await platform("v1/roof/faces", {
      method: "POST",
      body: JSON.stringify({
        imageBase64: crop.toString("base64"),
        format: "png",
        widthPx: side,
        heightPx: side,
        metresPerPixel: snapshotMetresPerPixel(geo),
        hint: opts.hint,
      }),
    });
    if (!started?.id) return null;
    let r: PlatformReading | null = started;
    while (r && r.status === "pending" && Date.now() + POLL_MS < deadline) {
      await wait(POLL_MS);
      r = await platform(`v1/roof/faces/${encodeURIComponent(started.id)}`);
    }
    if (!r || r.status !== "done" || !r.faces?.length) return null;
    return r.faces.map((f) => ({
      name: f.name,
      azimuthDeg: azimuthOf(f.bearingDeg),
      ring: f.ring.map(([x, y]) => fromPx(geo, x + left, y + top)),
    }));
  } catch {
    return null;
  }
}
