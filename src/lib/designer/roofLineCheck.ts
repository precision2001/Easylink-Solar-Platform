import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { GeoTiffRaster } from "@/utils/geotiff";

/**
 * Roof-line check: yellow lines must follow real roof lines.
 *
 *  - Eaves are fitted to Google's roof mask. Along each eave the roof edge is
 *    found by scanning across the line; if the edge is within the tolerance
 *    (100 mm) the eave is confirmed, if it is further but within
 *    `eaveMaxShiftM` the eave is moved onto it (corners rebuilt where the
 *    moved lines meet), otherwise it is flagged.
 *  - Hips, valleys and ridges are checked against Google's satellite image:
 *    neighbouring faces catch the sun differently, so a real roof line shows a
 *    brightness change. A line is confirmed when the strongest change near it
 *    is within the tolerance and clearly above the background; otherwise it is
 *    flagged for the installer to check.
 *
 * Imagery is only as sharp as its pixels (0.1 m HIGH, 0.25 m MEDIUM), so the
 * check can never be tighter than half a pixel.
 */

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

export type LineStatus = "confirmed" | "adjusted" | "unconfirmed" | "no-data";

export type LineCheck = {
  a: LatLng;
  b: LatLng;
  kind: "eave" | "interior";
  status: LineStatus;
  /** Distance from the drawn line to the edge found in the imagery, metres (+ = inside the roof). */
  offsetM: number | null;
};

const M_PER_LAT = 111320;
const SCAN_STEP_M = 0.05;

function frame(points: LatLng[]) {
  const refLat = points.reduce((s, p) => s + p.lat, 0) / Math.max(points.length, 1);
  const mLng = M_PER_LAT * Math.cos((refLat * Math.PI) / 180);
  return {
    toXY: (p: LatLng): XY => ({ x: p.lng * mLng, y: p.lat * M_PER_LAT }),
    toLL: (p: XY): LatLng => ({ lat: p.y / M_PER_LAT, lng: p.x / mLng }),
  };
}

function plausibleBounds(r: GeoTiffRaster): boolean {
  const { north, south, east, west } = r.bounds;
  return (
    Math.abs(north) <= 90 && Math.abs(south) <= 90 && Math.abs(east) <= 180 && Math.abs(west) <= 180 &&
    north !== south && east !== west
  );
}

function pixelOf(r: GeoTiffRaster, p: LatLng) {
  const { north, south, east, west } = r.bounds;
  return {
    col: ((p.lng - west) / (east - west)) * r.width - 0.5,
    row: ((north - p.lat) / (north - south)) * r.height - 0.5,
  };
}

/** Pixel size in metres (the larger of the two axes). */
export function rasterPixelM(r: GeoTiffRaster): number {
  const { north, south, east, west } = r.bounds;
  const lat = (north + south) / 2;
  const dx = (Math.abs(east - west) / r.width) * M_PER_LAT * Math.cos((lat * Math.PI) / 180);
  const dy = (Math.abs(north - south) / r.height) * M_PER_LAT;
  return Math.max(dx, dy);
}

function maskAt(r: GeoTiffRaster, p: LatLng): boolean | null {
  const { col, row } = pixelOf(r, p);
  const c = Math.round(col);
  const w = Math.round(row);
  if (c < 0 || w < 0 || c >= r.width || w >= r.height) return null;
  const v = r.data[w * r.width + c];
  if (r.noDataValue !== null && v === r.noDataValue) return null;
  return v > 0;
}

function lumaAt(r: GeoTiffRaster, p: LatLng): number | null {
  const { col, row } = pixelOf(r, p);
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  if (c0 < 0 || r0 < 0 || c0 + 1 >= r.width || r0 + 1 >= r.height) return null;
  const fx = col - c0;
  const fy = row - r0;
  const at = (c: number, w: number) => r.data[w * r.width + c];
  return (
    at(c0, r0) * (1 - fx) * (1 - fy) +
    at(c0 + 1, r0) * fx * (1 - fy) +
    at(c0, r0 + 1) * (1 - fx) * fy +
    at(c0 + 1, r0 + 1) * fx * fy
  );
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function signedArea(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

/**
 * Fit each eave of an outline to the roof mask. Returns the (possibly moved)
 * outline and a check per eave.
 */
export function fitEavesToMask(
  ring: LatLng[],
  mask: GeoTiffRaster | null,
  {
    toleranceM = DESIGN_RULES.roofLineToleranceM,
    maxShiftM = DESIGN_RULES.eaveMaxShiftM,
  }: { toleranceM?: number; maxShiftM?: number } = {},
): { ring: LatLng[]; checks: LineCheck[] } {
  const n = ring.length;
  const noData = (r: LatLng[]): { ring: LatLng[]; checks: LineCheck[] } => ({
    ring: r,
    checks: r.map((a, i) => ({ a, b: r[(i + 1) % r.length], kind: "eave", status: "no-data", offsetM: null })),
  });
  if (n < 3 || !mask || !plausibleBounds(mask)) return noData(ring);

  const { toXY, toLL } = frame(ring);
  const pts = ring.map(toXY);
  const ccw = signedArea(pts) > 0;
  const tol = Math.max(toleranceM, rasterPixelM(mask) / 2);

  const lines: { p: XY; d: XY; shift: number; status: LineStatus; offset: number | null }[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // Inward normal: left of the edge for a counter-clockwise ring.
    const nIn = ccw ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
    const offsets: number[] = [];
    const samples = Math.max(5, Math.round(len / 0.5));
    for (let k = 0; k < samples; k++) {
      const t = 0.15 + (0.7 * k) / Math.max(samples - 1, 1);
      const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      let best: number | null = null;
      let prev: boolean | null = null;
      for (let s = -maxShiftM; s <= maxShiftM + 1e-9; s += SCAN_STEP_M) {
        const inside = maskAt(mask, toLL({ x: p.x + s * nIn.x, y: p.y + s * nIn.y }));
        // The roof edge is where the scan goes from outside to inside the mask.
        if (prev === false && inside === true) {
          const e = s - SCAN_STEP_M / 2;
          if (best === null || Math.abs(e) < Math.abs(best)) best = e;
        }
        prev = inside;
      }
      if (best !== null) offsets.push(best);
    }
    let status: LineStatus = "unconfirmed";
    let shift = 0;
    let offset: number | null = null;
    if (offsets.length >= samples * 0.4) {
      offset = median(offsets);
      if (Math.abs(offset) <= tol) status = "confirmed";
      else {
        status = "adjusted";
        shift = offset;
      }
    }
    lines.push({ p: { x: a.x + shift * nIn.x, y: a.y + shift * nIn.y }, d, shift, status, offset });
  }

  // Rebuild corners where neighbouring (possibly moved) eaves meet.
  const out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    const den = l1.d.x * l2.d.y - l1.d.y * l2.d.x;
    if (Math.abs(den) < 1e-9) {
      out.push(l2.p);
      continue;
    }
    const t = ((l2.p.x - l1.p.x) * l2.d.y - (l2.p.y - l1.p.y) * l2.d.x) / den;
    out.push({ x: l1.p.x + t * l1.d.x, y: l1.p.y + t * l1.d.y });
  }
  const before = Math.abs(signedArea(pts));
  const after = Math.abs(signedArea(out));
  if (!(after > 0) || Math.abs(after - before) / before > 0.3) return noData(ring);

  const fitted = out.map(toLL);
  return {
    ring: fitted,
    checks: lines.map((l, i) => ({
      a: fitted[i],
      b: fitted[(i + 1) % n],
      kind: "eave",
      status: l.status,
      offsetM: l.status === "adjusted" ? 0 : l.offset,
    })),
  };
}

/**
 * Check a hip, valley or ridge against the satellite image: the strongest
 * brightness change within ±1 m must be within the tolerance and clearly
 * stronger than the background variation around it.
 */
export function checkInteriorLine(
  a: LatLng,
  b: LatLng,
  luma: GeoTiffRaster | null,
  { toleranceM = DESIGN_RULES.roofLineToleranceM }: { toleranceM?: number } = {},
): LineCheck {
  const base: LineCheck = { a, b, kind: "interior", status: "no-data", offsetM: null };
  if (!luma || !plausibleBounds(luma)) return base;
  const { toXY, toLL } = frame([a, b]);
  const pa = toXY(a);
  const pb = toXY(b);
  const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  if (len < 0.5) return base;
  const nrm = { x: -(pb.y - pa.y) / len, y: (pb.x - pa.x) / len };
  const px = rasterPixelM(luma);
  const half = Math.max(0.3, px);
  const samples = Math.max(6, Math.round(len / 0.25));
  const profile: { d: number; c: number }[] = [];
  for (let d = -1; d <= 1 + 1e-9; d += SCAN_STEP_M) {
    let sa = 0;
    let sb = 0;
    let count = 0;
    for (let k = 0; k < samples; k++) {
      const t = 0.15 + (0.7 * k) / Math.max(samples - 1, 1);
      const p = { x: pa.x + t * (pb.x - pa.x), y: pa.y + t * (pb.y - pa.y) };
      const la = lumaAt(luma, toLL({ x: p.x + (d + half) * nrm.x, y: p.y + (d + half) * nrm.y }));
      const lb = lumaAt(luma, toLL({ x: p.x + (d - half) * nrm.x, y: p.y + (d - half) * nrm.y }));
      if (la === null || lb === null) continue;
      sa += la;
      sb += lb;
      count++;
    }
    if (count >= samples / 2) profile.push({ d, c: Math.abs(sa - sb) / count });
  }
  if (profile.length < 10) return base;
  // The difference is equally strong over a short band either side of a sharp
  // edge, so take the centre of the strongest band, not its first sample.
  let iMax = 0;
  profile.forEach((p, i) => {
    if (p.c > profile[iMax].c) iMax = i;
  });
  const peak = profile[iMax].c;
  let lo = iMax;
  let hi = iMax;
  while (lo > 0 && profile[lo - 1].c >= 0.9 * peak) lo--;
  while (hi < profile.length - 1 && profile[hi + 1].c >= 0.9 * peak) hi++;
  const edgeD = (profile[lo].d + profile[hi].d) / 2;
  const background = median(profile.map((p) => p.c));
  const tol = Math.max(toleranceM, px / 2);
  const strong = peak >= 6 && peak >= 2 * background;
  return {
    ...base,
    status: strong && Math.abs(edgeD) <= tol ? "confirmed" : "unconfirmed",
    offsetM: strong ? edgeD : null,
  };
}

/** Edges of the faces that are not on any outline edge — the hips, valleys and ridges. */
export function interiorEdges(
  faces: { ring: LatLng[] }[],
  outlines: LatLng[][],
  /** How close (m) a face edge must run to the outline to count as an eave. */
  outlineTolM = 0.05,
): [LatLng, LatLng][] {
  const all = outlines.flat();
  if (all.length === 0) return [];
  const { toXY } = frame(all);
  const outlineSegs = outlines.flatMap((r) => r.map((p, i) => [toXY(p), toXY(r[(i + 1) % r.length])] as [XY, XY]));
  const onOutline = (p: XY, q: XY) =>
    outlineSegs.some(([u, v]) => {
      const len = Math.hypot(v.x - u.x, v.y - u.y);
      if (len < 1e-6) return false;
      const dist = (w: XY) => Math.abs((v.x - u.x) * (u.y - w.y) - (u.x - w.x) * (v.y - u.y)) / len;
      return dist(p) < outlineTolM && dist(q) < outlineTolM;
    });
  const seen = new Set<string>();
  const key = (p: XY) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  const out: [LatLng, LatLng][] = [];
  for (const f of faces) {
    for (let i = 0; i < f.ring.length; i++) {
      const a = f.ring[i];
      const b = f.ring[(i + 1) % f.ring.length];
      const pa = toXY(a);
      const pb = toXY(b);
      if (Math.hypot(pb.x - pa.x, pb.y - pa.y) < 0.3 || onOutline(pa, pb)) continue;
      const k = [key(pa), key(pb)].sort().join("|");
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([a, b]);
    }
  }
  return out;
}
