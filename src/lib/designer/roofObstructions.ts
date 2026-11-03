/**
 * Obstruction finder on the zoomed roof image (process step 6 in
 * docs/ROOF_DESIGN_PROCESS.md). Vents, whirlybirds (circulating fans),
 * antennas and flues show as small dark spots; level differences (steps)
 * show as thin dark lines, often ending part way across a section. Both
 * were missed on 66 Frances St, Lidcombe when found by eye only, so every
 * roof is now searched for them and the packer packs around what is found.
 *
 * Method (same as scripts/roof-design/find-obstructions.py):
 *  - local contrast: brightness minus its ~6 px blur;
 *  - pixels clearly darker than their surroundings, inside a face and away
 *    from its edges (hips, ridges and valleys are dark lines too);
 *  - connected groups: compact ones are spots, long thin ones are steps.
 * Tiles are noisier (gaps, shadows), so a stronger contrast is needed there.
 */
import type { GeoTiffRaster } from "@/utils/geotiff";
import { rasterLatLngOf, rasterPixelOf } from "@/utils/geotiff";

type LatLng = { lat: number; lng: number };

export type RoofObstruction = {
  kind: "spot" | "step";
  /** Outline to keep clear of (the packer adds the 100 mm setback). */
  ring: LatLng[];
  /** Size in pixels of the zoomed image. */
  sizePx: number;
};

export type ObstructionOptions = {
  /** Darkness below the local mean (grey levels). Default: 18 on bright sheet roofs, 24 on tiles. */
  threshold?: number;
  /** Ignore this close (px) to a face edge. */
  edgePx?: number;
  /** Smallest group kept (px). Default: 12 on sheet roofs, 30 on tiles. */
  minAreaPx?: number;
  /** Largest spot kept (px) — bigger dark areas are shading, not objects. */
  maxSpotPx?: number;
};

/** Separable box blur, applied three times (close to a Gaussian). */
function blur(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const a = src.slice();
  let b = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      let s = 0;
      const row = y * W;
      for (let x = -r; x <= r; x++) s += a[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        b[row + x] = s / (2 * r + 1);
        s += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = s / (2 * r + 1);
        s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
      }
    }
    if (pass < 2) b = new Float32Array(W * H);
  }
  return a;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const L = dx * dx + dy * dy;
  const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Finds obstructions and steps inside the faces. `luma` is the zoomed
 * image's brightness (RoofSnapshotAnalysis.luma); faces are lat/lng rings.
 */
export function findRoofObstructions(
  luma: GeoTiffRaster,
  faces: LatLng[][],
  opts: ObstructionOptions = {},
): RoofObstruction[] {
  const W = luma.width;
  const H = luma.height;
  const g = luma.data as ArrayLike<number>;
  if (faces.length === 0 || W * H === 0) return [];
  const rings = faces.filter((f) => f.length >= 3).map((f) => f.map((p) => rasterPixelOf(luma, p.lat, p.lng)));

  // Pixels inside a face, away from its edges.
  const inside = new Uint8Array(W * H);
  const edgePx = opts.edgePx ?? 6;
  let roofSum = 0;
  const roofVals: number[] = [];
  for (const r of rings) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of r) {
      minX = Math.min(minX, p.col); maxX = Math.max(maxX, p.col);
      minY = Math.min(minY, p.row); maxY = Math.max(maxY, p.row);
    }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(W - 1, Math.ceil(maxX)); x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        let isIn = false;
        let dMin = Infinity;
        for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
          const a = r[i];
          const b = r[j];
          if (a.row > cy !== b.row > cy && cx < ((b.col - a.col) * (cy - a.row)) / (b.row - a.row) + a.col) isIn = !isIn;
          dMin = Math.min(dMin, segDist(cx, cy, a.col, a.row, b.col, b.row));
        }
        if (isIn && dMin > edgePx) {
          inside[y * W + x] = 1;
          roofSum += g[y * W + x];
          if ((x + y) % 7 === 0) roofVals.push(g[y * W + x]);
        }
      }
    }
  }
  if (roofVals.length === 0) return [];
  roofVals.sort((a, b) => a - b);
  const median = roofVals[Math.floor(roofVals.length / 2)];
  void roofSum;
  const sheet = median > 165; // white / light sheet metal; tiles are darker and noisier
  // Tuned on 66 Frances St (white sheet) and 57 Harry Ave (terracotta): tile
  // vents sit only a little below the tile texture, so on tiles a group needs
  // its darkest tenth well below the noise (0.5% of tile pixels reach -32).
  const thr = opts.threshold ?? (sheet ? 18 : 22);
  const minArea = opts.minAreaPx ?? (sheet ? 12 : 20);
  const maxSpot = opts.maxSpotPx ?? (sheet ? 900 : 400);
  const coreThr = sheet ? 2 * thr : 35;

  const src = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) src[i] = g[i];
  const mean = blur(src, W, H, 5); // three box passes of r=5 ≈ Gaussian σ 5.5 px (script: σ 6)
  const dark = new Uint8Array(W * H);
  const strong = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (!inside[i]) continue;
    const d = src[i] - mean[i];
    if (d < -thr) dark[i] = 1;
    if (d < -coreThr) strong[i] = 1;
  }

  // Connected groups (4-neighbour).
  const seen = new Uint8Array(W * H);
  const out: RoofObstruction[] = [];
  /** Spots as pixel boxes, merged below when close (one object often breaks into pieces). */
  const spots: { x0: number; y0: number; x1: number; y1: number; n: number }[] = [];
  const stack: number[] = [];
  for (let s = 0; s < W * H; s++) {
    if (!dark[s] || seen[s]) continue;
    const px: number[] = [];
    let nStrong = 0;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      px.push(i);
      if (strong[i]) nStrong++;
      const x = i % W;
      const y = (i / W) | 0;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (n >= 0 && dark[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    // A dark core: at least a tenth of the group well below the noise.
    if (px.length < minArea || nStrong < Math.max(2, px.length * 0.1)) continue;
    // Principal axes.
    let mx = 0, my = 0;
    for (const i of px) { mx += i % W; my += (i / W) | 0; }
    mx /= px.length; my /= px.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const i of px) {
      const dx = (i % W) - mx;
      const dy = ((i / W) | 0) - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    sxx /= px.length; syy /= px.length; sxy /= px.length;
    const tr = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l2 = Math.max(1e-6, tr - l1);
    const length = 4 * Math.sqrt(l1);
    const width = 4 * Math.sqrt(l2);
    const isStep = length > 25 && length / Math.max(width, 1) > 4;
    if (!isStep && px.length > maxSpot) continue;
    if (!isStep) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const i of px) {
        const x = i % W;
        const y = (i / W) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      spots.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n: px.length });
      continue;
    }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    // Oriented box around the group, padded 2 px.
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const i of px) {
      const dx = (i % W) + 0.5 - mx;
      const dy = ((i / W) | 0) + 0.5 - my;
      const a = dx * ux + dy * uy;
      const b = -dx * uy + dy * ux;
      a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b);
    }
    a0 -= 2; a1 += 2; b0 -= 2; b1 += 2;
    const corners: [number, number][] = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
    out.push({
      kind: "step",
      sizePx: px.length,
      ring: corners.map(([a, b]) => rasterLatLngOf(luma, mx + a * ux - b * uy, my + a * uy + b * ux)),
    });
  }
  // Merge spots within ~25 cm of each other (a stain, a fan and its shadow).
  const gap = 8;
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < spots.length && !merged; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i];
        const b = spots[j];
        if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) {
          spots[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n };
          spots.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  for (const b of spots) {
    const p = 2;
    out.push({
      kind: "spot",
      sizePx: b.n,
      ring: [
        rasterLatLngOf(luma, b.x0 - p, b.y0 - p),
        rasterLatLngOf(luma, b.x1 + p, b.y0 - p),
        rasterLatLngOf(luma, b.x1 + p, b.y1 + p),
        rasterLatLngOf(luma, b.x0 - p, b.y1 + p),
      ],
    });
  }
  return out;
}
