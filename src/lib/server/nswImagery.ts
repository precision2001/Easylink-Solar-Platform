/**
 * NSW Spatial Services aerial imagery (SIX Maps, maps.six.nsw.gov.au) as a
 * second photo of a roof beside Google's (owner, 9 Nov 2026): to compare when
 * assessing and designing, and as the backup when Google's image fails.
 *
 * Public cached tile service "NSW_Imagery" (Web Mercator, 256 px tiles, best
 * level 21 ≈ 6-7 cm ground pixels in Sydney), licensed CC BY (attribution
 * below). Capture date and resolution per area come from "NSW_Imagery_Dates".
 * NSW only: elsewhere every function returns null.
 */
import sharp from "sharp";
import { cachedBytes, cachedJson } from "./roofDataCache";

const BASE = "https://maps.six.nsw.gov.au/arcgis/rest/services/public";
const TILE_MAX_LEVEL = 21;
const TILE = 256;

export const NSW_IMAGERY_ATTRIBUTION = "Imagery © NSW Spatial Services, Department of Customer Service (CC BY)";

/** NSW and the ACT, roughly (the imagery covers the state; tiles outside come back missing). */
export function inNsw(lat: number, lng: number): boolean {
  return lat <= -28.1 && lat >= -37.6 && lng >= 140.9 && lng <= 153.7;
}

export type NswImageryDate = {
  /** When the block covering this point was flown (yyyy-mm-dd). */
  capturedOn: string | null;
  resolutionCm: number | null;
  block: string | null;
};

const mercator = (lat: number, lng: number) => {
  const R = 6378137;
  return { x: ((lng * Math.PI) / 180) * R, y: Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * R };
};

/** The capture date and pixel size of the NSW imagery at a point. */
export async function nswImageryDate(lat: number, lng: number): Promise<NswImageryDate | null> {
  if (!inNsw(lat, lng)) return null;
  const { x, y } = mercator(lat, lng);
  return cachedJson<NswImageryDate>(`nswdate|${lat.toFixed(5)},${lng.toFixed(5)}`, async () => {
    const qs = new URLSearchParams({
      geometry: `${x},${y}`,
      geometryType: "esriGeometryPoint",
      inSR: "3857",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "BlockName,BlockStartDate,Resolution_cm",
      returnGeometry: "false",
      f: "json",
    });
    const res = await fetch(`${BASE}/NSW_Imagery_Dates/MapServer/0/query?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { features?: { attributes: { BlockName?: string; BlockStartDate?: number; Resolution_cm?: number } }[] };
    // The newest, finest block wins where blocks overlap.
    const a = (j.features ?? [])
      .map((f) => f.attributes)
      .sort((p, q) => (q.BlockStartDate ?? 0) - (p.BlockStartDate ?? 0) || (p.Resolution_cm ?? 99) - (q.Resolution_cm ?? 99))[0];
    if (!a) return null;
    return {
      capturedOn: a.BlockStartDate ? new Date(a.BlockStartDate).toISOString().slice(0, 10) : null,
      resolutionCm: a.Resolution_cm ?? null,
      block: a.BlockName ?? null,
    };
  });
}

/** Tile URL for the browser (Google Maps ImageMapType): z/y/x, levels up to 21. */
export const NSW_TILE_URL = (z: number, x: number, y: number) => `${BASE}/NSW_Imagery/MapServer/tile/${z}/${y}/${x}`;

async function tile(z: number, x: number, y: number): Promise<Buffer | null> {
  try {
    const res = await fetch(NSW_TILE_URL(z, x, y), { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * The NSW aerial photo in exactly the frame of Google's roof snapshot: the
 * same centre, the same `sizePx`×`sizePx` at `scale` (Static Maps zoom `zoom`
 * at scale 2 is Web Mercator level zoom+1). The NSW tiles stop at level 21,
 * so a level-22 frame is made from level-21 tiles, enlarged. Null outside
 * NSW, or when most of the frame has no tiles.
 */
export async function getNswSnapshotPng(lat: number, lng: number, zoom: number, sizePx = 640, scale = 2): Promise<Buffer | null> {
  if (!inNsw(lat, lng)) return null;
  return cachedBytes(`nswsnap|${lat.toFixed(7)},${lng.toFixed(7)}|${zoom}|${sizePx}|${scale}`, async () => {
    const out = sizePx * scale;
    const frameLevel = zoom + Math.log2(scale);
    const level = Math.min(TILE_MAX_LEVEL, Math.floor(frameLevel));
    const shrink = 2 ** (frameLevel - level); // frame pixels per tile pixel
    const world = TILE * 2 ** level;
    const cx = ((lng + 180) / 360) * world;
    const sin = Math.sin((lat * Math.PI) / 180);
    const cy = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
    const span = out / shrink; // tile pixels across the frame
    const left = cx - span / 2;
    const top = cy - span / 2;
    const tx0 = Math.floor(left / TILE);
    const ty0 = Math.floor(top / TILE);
    const tx1 = Math.floor((left + span - 1e-6) / TILE);
    const ty1 = Math.floor((top + span - 1e-6) / TILE);
    const jobs: Promise<{ x: number; y: number; img: Buffer | null }>[] = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) jobs.push(tile(level, tx, ty).then((img) => ({ x: tx, y: ty, img })));
    const tiles = await Promise.all(jobs);
    const have = tiles.filter((t) => t.img);
    if (have.length < tiles.length * 0.75) return null;
    const w = (tx1 - tx0 + 1) * TILE;
    const h = (ty1 - ty0 + 1) * TILE;
    const mosaic = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .composite(have.map((t) => ({ input: t.img!, left: (t.x - tx0) * TILE, top: (t.y - ty0) * TILE })))
      .png()
      .toBuffer();
    const ex = { left: Math.round(left - tx0 * TILE), top: Math.round(top - ty0 * TILE), width: Math.round(span), height: Math.round(span) };
    return sharp(mosaic).extract(ex).resize(out, out, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();
  });
}

/**
 * How far the NSW photo sits from Google's in the same frame (pixels of the
 * frame, NSW minus Google), found by matching the two pictures; the two can
 * be a few metres apart (Google's photos lean; NSW's are surveyed
 * orthophotos). Null when they don't match well enough to tell (very
 * different seasons, a building changed, cloud).
 */
export async function nswOffsetPx(googlePng: Buffer, nswPng: Buffer, maxShiftPx = 160): Promise<{ dx: number; dy: number; score: number } | null> {
  const N = 256;
  const g = await sharp(googlePng).greyscale().resize(N, N).raw().toBuffer({ resolveWithObject: true });
  const n = await sharp(nswPng).greyscale().resize(N, N).raw().toBuffer();
  const A = g.data;
  const B = n;
  const per = ((await sharp(googlePng).metadata()).width ?? 1280) / N; // frame pixels per matching pixel
  const R = Math.min(60, Math.round(maxShiftPx / per));
  let best = { s: -2, dx: 0, dy: 0 };
  const score = (dx: number, dy: number) => {
    let sa = 0, sb = 0, sab = 0, saa = 0, sbb = 0, c = 0;
    for (let y = R; y < N - R; y += 2)
      for (let x = R; x < N - R; x += 2) {
        const a = A[y * N + x];
        const b = B[(y + dy) * N + (x + dx)];
        sa += a; sb += b; sab += a * b; saa += a * a; sbb += b * b; c++;
      }
    const cov = sab / c - (sa / c) * (sb / c);
    const va = saa / c - (sa / c) ** 2;
    const vb = sbb / c - (sb / c) ** 2;
    return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : -1;
  };
  for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) {
    const s = score(dx, dy);
    if (s > best.s) best = { s, dx, dy };
  }
  for (let dy = best.dy - 1; dy <= best.dy + 1; dy++) for (let dx = best.dx - 1; dx <= best.dx + 1; dx++) {
    if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    const s = score(dx, dy);
    if (s > best.s) best = { s, dx, dy };
  }
  if (best.s < 0.35) return null;
  return { dx: best.dx * per, dy: best.dy * per, score: best.s };
}

/**
 * The NSW photo moved onto Google's (same pixels, same features), so the two
 * can be compared line for line and Opus can read both. The offset is kept so
 * a design can say how far Google's photo is from the surveyed one.
 */
export async function alignedNswSnapshot(googlePng: Buffer, lat: number, lng: number, zoom: number): Promise<{ png: Buffer; offsetPx: { dx: number; dy: number } | null } | null> {
  const nsw = await getNswSnapshotPng(lat, lng, zoom).catch(() => null);
  if (!nsw) return null;
  const off = await nswOffsetPx(googlePng, nsw).catch(() => null);
  if (!off) return { png: nsw, offsetPx: null };
  const meta = await sharp(nsw).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const dx = Math.round(off.dx);
  const dy = Math.round(off.dy);
  // Shift by (-dx, -dy): the NSW feature at (x + dx, y + dy) lands on (x, y).
  const png = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite([{ input: await sharp(nsw).extract({ left: Math.max(0, dx), top: Math.max(0, dy), width: w - Math.abs(dx), height: h - Math.abs(dy) }).toBuffer(), left: Math.max(0, -dx), top: Math.max(0, -dy) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { png, offsetPx: { dx: off.dx, dy: off.dy } };
}
