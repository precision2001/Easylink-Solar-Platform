/**
 * Square-walled roofs, drawn the way they are drawn by hand (25 Gilbert St,
 * Colyton, Oct 2026: the colour trace leaked onto the patio and lawn, its
 * eaves were wavy, and faces taken from Google's 2018 height model crossed
 * the hips seen in the image).
 *
 *  1. `squareRoofOutline` — the roof edge on a 25 cm grid laid along the
 *     walls. Each cell's average colour is compared with the roof's own
 *     (averaging over a cell lets the colour test be strict, so paving and
 *     lawn of a similar shade drop out); notches under 1.25 m are closed,
 *     strips under 1.75 m and small bumps opened away, and the result
 *     traced and straightened along the walls. Only kept when every edge
 *     runs along or square to the walls and it keeps most of the trace.
 *  2. `hipFacesForSquareRoof` — the faces of an equal-pitch hip roof on that
 *     outline: for a square-walled outline the hips and valleys (the
 *     straight skeleton) are where two walls are equally far in the
 *     L-infinity sense, so each point belongs to the wall it is nearest.
 *     Kept only when Google's roof segments confirm it — the same share of
 *     roof facing each way — so gable roofs keep the height-model faces.
 *     Each face takes the pitch of Google's nearest segment facing its way.
 */
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";
import type { GeoTiffBounds, GeoTiffRaster } from "@/utils/geotiff";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask } from "@/lib/designer/roofLineCheck";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };
const M_PER_LAT = 111320;

export type RoofSegmentLite = {
  pitchDegrees: number;
  azimuthDegrees: number;
  areaM2: number;
  center: { lat: number; lng: number };
};

export type SquareFace = { ring: LatLng[]; eaveDeg: number; pitchDeg?: number; azimuthDeg: number };

function frameFor(points: LatLng[]) {
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng0 = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const mL = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: (p: LatLng): XY => ({ x: (p.lng - lng0) * mL, y: (p.lat - lat0) * M_PER_LAT }),
    toLL: (p: XY): LatLng => ({ lat: lat0 + p.y / M_PER_LAT, lng: lng0 + p.x / mL }),
  };
}

/** Main wall direction (degrees from east, counter-clockwise, in [0, 90)): length-weighted mean of edge directions mod 90°. */
export function wallAxisDeg(ring: XY[]): number {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    sx += len * Math.cos(4 * a);
    sy += len * Math.sin(4 * a);
  }
  const deg = ((Math.atan2(sy, sx) / 4) * 180) / Math.PI;
  return ((deg % 90) + 90) % 90;
}

/** Wall-frame coordinates: u along the walls, v square to them. */
function wallFrame(axisDeg: number) {
  const t = (axisDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    toUV: (p: XY) => ({ u: p.x * c + p.y * s, v: -p.x * s + p.y * c }),
    toXY: (u: number, v: number): XY => ({ x: u * c - v * s, y: u * s + v * c }),
  };
}

// ---------- small binary-grid tools (square neighbourhoods, so corners square to the grid stay square) ----------

function boxMax(g: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r) && !v; k++) v = g[y * W + k];
      tmp[y * W + x] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r) && !v; k++) v = tmp[k * W + x];
      out[y * W + x] = v;
    }
  return out;
}

function boxMin(g: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < inv.length; i++) inv[i] = g[i] ? 0 : 1;
  const m = boxMax(inv, W, H, r);
  for (let i = 0; i < m.length; i++) m[i] = m[i] ? 0 : 1;
  return m;
}

const openG = (g: Uint8Array, W: number, H: number, r: number) => boxMax(boxMin(g, W, H, r), W, H, r);
const closeG = (g: Uint8Array, W: number, H: number, r: number) => boxMin(boxMax(g, W, H, r), W, H, r);

/** Connected components (4-neighbour); returns labels (0 = background) and sizes. */
function components(g: Uint8Array, W: number, H: number) {
  const lab = new Int32Array(W * H);
  const sizes: number[] = [0];
  const stack: number[] = [];
  for (let i = 0; i < g.length; i++) {
    if (!g[i] || lab[i]) continue;
    const id = sizes.length;
    let n = 0;
    lab[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      n++;
      const x = j % W;
      const y = (j / W) | 0;
      const nb = [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1];
      for (const k of nb) if (k >= 0 && g[k] && !lab[k]) { lab[k] = id; stack.push(k); }
    }
    sizes.push(n);
  }
  return { lab, sizes };
}

function fillHolesG(g: Uint8Array, W: number, H: number): Uint8Array {
  const inv = new Uint8Array(W * H);
  for (let i = 0; i < inv.length; i++) inv[i] = g[i] ? 0 : 1;
  const { lab } = components(inv, W, H);
  const outside = new Set<number>();
  for (let x = 0; x < W; x++) { outside.add(lab[x]); outside.add(lab[(H - 1) * W + x]); }
  for (let y = 0; y < H; y++) { outside.add(lab[y * W]); outside.add(lab[y * W + W - 1]); }
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = g[i] || !outside.has(lab[i]) ? 1 : 0;
  return out;
}

/**
 * Trace a binary grid laid in the wall frame (cell (0,0) at u0, v1 — top
 * left, v decreasing down) and return the largest ring in wall-frame metres.
 * Uses the mask tracer with a stand-in raster whose "degrees" are metres.
 */
function traceUV(g: Uint8Array, W: number, H: number, u0: number, v1: number, cellM: number, simplifyPx: number) {
  const bounds: GeoTiffBounds = {
    west: u0 / M_PER_LAT,
    east: (u0 + W * cellM) / M_PER_LAT,
    north: v1 / M_PER_LAT,
    south: (v1 - H * cellM) / M_PER_LAT,
  };
  const raster: GeoTiffRaster = { data: g, width: W, height: H, bounds, noDataValue: null };
  const outs = extractRoofOutlinesFromMask(raster, { simplifyPx });
  if (outs.length === 0) return null;
  return outs[0].ring.map((p) => ({ u: p.lng * M_PER_LAT, v: p.lat * M_PER_LAT }));
}

// ---------- colour ----------

const LIN = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  return t;
})();

/** CIELab in OpenCV's 8-bit units (L·2.55, a+128, b+128). */
function lab(r: number, g: number, b: number): [number, number, number] {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const fy = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const fz = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [(116 * fy - 16) * 2.55, 500 * (fx - fy) + 128, 200 * (fy - fz) + 128];
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export type SquaredOutline = { ring: LatLng[]; axisDeg: number; areaM2: number };

/**
 * Square-walled roof outline from the zoom-21 snapshot and its traced roof
 * mask (both W×H over `bounds`). Null when the roof isn't square-walled or
 * the result loses too much of the trace.
 */
export function squareRoofOutline(
  rgba: Uint8ClampedArray | Uint8Array,
  W: number,
  H: number,
  bounds: GeoTiffBounds,
  roofMask: ArrayLike<number>,
  {
    cellM = 0.25,
    maxColourDist = 4,
    giveBackDist = 6,
    closeR = 2,
    openR = 3,
    bumpR = 5,
    bumpMaxM2 = 4,
    minKeep = 0.8,
  }: {
    cellM?: number;
    maxColourDist?: number;
    giveBackDist?: number;
    closeR?: number;
    openR?: number;
    bumpR?: number;
    bumpMaxM2?: number;
    minKeep?: number;
  } = {},
): SquaredOutline | null {
  const fail = (why: number) => { (globalThis as { __sqWhy?: (w: number) => void }).__sqWhy?.(why); return null; };
  const latOf = (row: number) => bounds.north + (row / H) * (bounds.south - bounds.north);
  const lngOf = (col: number) => bounds.west + (col / W) * (bounds.east - bounds.west);
  // Roof pixels and their bounding box.
  let c0 = W, c1 = -1, r0 = H, r1 = -1, n = 0;
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++)
      if (roofMask[r * W + c]) { n++; if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r; }
  if (n < 100) return fail(1);
  const centre = { lat: latOf((r0 + r1) / 2), lng: lngOf((c0 + c1) / 2) };
  const F = frameFor([centre]);
  const mppX = ((bounds.east - bounds.west) / W) * M_PER_LAT * Math.cos((centre.lat * Math.PI) / 180);
  const pad = Math.ceil(1 / mppX);
  c0 = Math.max(0, c0 - pad); c1 = Math.min(W - 1, c1 + pad); r0 = Math.max(0, r0 - pad); r1 = Math.min(H - 1, r1 + pad);

  // Wall direction from the mask's own boundary pixels (edges between roof and not-roof).
  const edgePts: XY[] = [];
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const i = r * W + c;
      if (roofMask[i] && (c === 0 || !roofMask[i - 1] || c === W - 1 || !roofMask[i + 1] || !roofMask[i - W] || !roofMask[i + W]))
        edgePts.push(F.toXY({ lat: latOf(r + 0.5), lng: lngOf(c + 0.5) }));
    }
  const axisDeg = axisFromBoundary(edgePts);
  const wf = wallFrame(axisDeg);

  // Grid along the walls.
  const corners = [[c0, r0], [c1 + 1, r0], [c0, r1 + 1], [c1 + 1, r1 + 1]].map(([c, r]) => wf.toUV(F.toXY({ lat: latOf(r), lng: lngOf(c) })));
  const u0 = Math.min(...corners.map((p) => p.u)), u1 = Math.max(...corners.map((p) => p.u));
  const v0 = Math.min(...corners.map((p) => p.v)), v1 = Math.max(...corners.map((p) => p.v));
  const GW = Math.ceil((u1 - u0) / cellM), GH = Math.ceil((v1 - v0) / cellM);
  const sL = new Float32Array(GW * GH), sA = new Float32Array(GW * GH), sB = new Float32Array(GW * GH);
  const cnt = new Float32Array(GW * GH), inCnt = new Float32Array(GW * GH);
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const p = wf.toUV(F.toXY({ lat: latOf(r + 0.5), lng: lngOf(c + 0.5) }));
      const gx = Math.floor((p.u - u0) / cellM), gy = Math.floor((v1 - p.v) / cellM);
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
      const k = gy * GW + gx;
      const i = r * W + c;
      const [L, A, B] = lab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      sL[k] += L; sA[k] += A; sB[k] += B; cnt[k]++;
      if (roofMask[i]) inCnt[k]++;
    }
  const inm = new Uint8Array(GW * GH);
  for (let k = 0; k < inm.length; k++) if (cnt[k] > 0 && inCnt[k] / cnt[k] > 0.5) inm[k] = 1;
  // Roof colour from the inner cells (1 m in from the trace).
  const core = boxMin(inm, GW, GH, Math.round(1 / cellM));
  const cl: number[] = [], ca: number[] = [], cb: number[] = [];
  for (let k = 0; k < core.length; k++) if (core[k]) { cl.push(sL[k] / cnt[k]); ca.push(sA[k] / cnt[k]); cb.push(sB[k] / cnt[k]); }
  if (cl.length < 30) return fail(2);
  const mL = median(cl), mA = median(ca), mB = median(cb);
  const tL = Math.max(4, 1.4826 * median(cl.map((x) => Math.abs(x - mL))));
  const tA = Math.max(1.5, 1.4826 * median(ca.map((x) => Math.abs(x - mA))));
  const tB = Math.max(1.5, 1.4826 * median(cb.map((x) => Math.abs(x - mB))));
  // Each cell's colour distance from the roof's.
  const dist = new Float32Array(GW * GH);
  for (let k = 0; k < dist.length; k++)
    dist[k] = inm[k] ? Math.hypot((sL[k] / cnt[k] - mL) / tL, (sA[k] / cnt[k] - mA) / tA, (sB[k] / cnt[k] - mB) / tB) : 99;
  const dbg = (globalThis as { __sqDebug?: (name: string, g: ArrayLike<number>, w: number, h: number) => void }).__sqDebug;
  dbg?.("inm", inm, GW, GH);
  dbg?.("dist", Array.from(dist, (d) => Math.min(255, d * 20)), GW, GH);
  // Cells the roof's colour (a majority of the 3×3 around, so speckle —
  // moss, a shadowed tile — doesn't cut the edge), notches closed and thin
  // strips (a gutter, a path along the eave) opened away.
  let g: Uint8Array = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      if (!inm[y * GW + x]) continue;
      let on = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < GW && yy < GH && dist[yy * GW + xx] < maxColourDist) on++;
        }
      if (on >= 5) g[y * GW + x] = 1;
    }
  g = openG(closeG(g, GW, GH, closeR), GW, GH, openR);
  // Parts of the trace the colour test dropped: given back when only a little
  // off the roof's colour — a face in shade or sun (134 Old Canterbury Rd's
  // south hip) — but not paving or lawn (25 Gilbert St's patio), judged on
  // each part's average.
  const trace = openG(closeG(inm, GW, GH, closeR), GW, GH, openR);
  const dropped = new Uint8Array(GW * GH);
  for (let k = 0; k < g.length; k++) if (trace[k] && !g[k]) dropped[k] = 1;
  const dp = components(dropped, GW, GH);
  const dSum = new Float64Array(dp.sizes.length);
  for (let k = 0; k < g.length; k++) if (dropped[k]) dSum[dp.lab[k]] += Math.min(dist[k], 12);
  const back = new Uint8Array(GW * GH);
  for (let k = 0; k < g.length; k++) if (dropped[k] && dSum[dp.lab[k]] / dp.sizes[dp.lab[k]] <= giveBackDist) { g[k] = 1; back[k] = 1; }
  // …but not a part that sticks out (a patio corner beside a wing): one a
  // wider opening would mostly remove again.
  {
    const wide0 = openG(g, GW, GH, bumpR);
    const out = new Float64Array(dp.sizes.length);
    for (let k = 0; k < g.length; k++) if (back[k] && !wide0[k]) out[dp.lab[k]]++;
    for (let k = 0; k < g.length; k++) if (back[k] && out[dp.lab[k]] > 0.5 * dp.sizes[dp.lab[k]]) g[k] = 0;
  }
  g = openG(closeG(g, GW, GH, closeR), GW, GH, openR);
  dbg?.("open", g, GW, GH);
  // Small bumps (a patch of paving the roof's colour against an eave): parts
  // a wider opening removes, when each is small.
  const wide = openG(g, GW, GH, bumpR);
  const extra = new Uint8Array(GW * GH);
  for (let k = 0; k < g.length; k++) if (g[k] && !wide[k]) extra[k] = 1;
  const ex = components(extra, GW, GH);
  for (let k = 0; k < g.length; k++) if (extra[k] && ex.sizes[ex.lab[k]] * cellM * cellM < bumpMaxM2) g[k] = 0;
  // Largest piece, holes filled.
  const cc = components(g, GW, GH);
  let best = 0;
  for (let i = 1; i < cc.sizes.length; i++) if (cc.sizes[i] > cc.sizes[best]) best = i;
  if (!best) return fail(3);
  for (let k = 0; k < g.length; k++) g[k] = cc.lab[k] === best ? 1 : 0;
  g = fillHolesG(g, GW, GH);
  dbg?.("final", g, GW, GH);
  let kept = 0, traced = 0;
  for (let k = 0; k < g.length; k++) { kept += g[k] & inm[k]; traced += inm[k]; }
  if (traced === 0 || kept / traced < minKeep) return fail(4);

  // The outline along the cell edges (square by construction), short steps
  // dropped.
  const uv = cellOutline(g, GW, GH, u0, v1, cellM);
  if (!uv || uv.length < 4) return fail(5);
  const jogFree = dropJogs(uv).map((p) => F.toLL(wf.toXY(p.u, p.v)));
  if (jogFree.length < 4) return fail(6);
  // Each eave onto the traced roof edge, when that is close (the 25 cm cells
  // sit a little inside a roof edged by a dark gap — 134 Old Canterbury Rd).
  const maskRaster: GeoTiffRaster = { data: roofMask as GeoTiffRaster["data"], width: W, height: H, bounds, noDataValue: null };
  const fitted = fitEavesToMask(jogFree, maskRaster, { maxShiftM: 0.3 }).ring;
  const straight = dropJogs(fitted.map(F.toXY).map(wf.toUV)).map((p) => F.toLL(wf.toXY(p.u, p.v)));
  if (straight.length < 4) return fail(8);
  // Every edge along or square to the walls.
  const xy = straight.map(F.toXY);
  for (let i = 0; i < xy.length; i++) {
    const p = xy[i], q = xy[(i + 1) % xy.length];
    const a = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI - axisDeg;
    const off = Math.abs(((a % 90) + 135) % 90 - 45);
    if (off > 2) { (globalThis as { __sqWhy?: (w: number) => void }).__sqWhy?.(1000 + Math.round(off * 10) + 100000 * Math.round(Math.hypot(q.x - p.x, q.y - p.y) * 10)); return fail(7); }
  }
  return { ring: straight, axisDeg, areaM2: Math.abs(ringAreaXY(xy)) };
}

/** Outer boundary of a cell grid along the cell edges, in wall-frame metres (largest loop). */
function cellOutline(g: Uint8Array, W: number, H: number, u0: number, v1: number, cellM: number) {
  const key = (x: number, y: number) => y * (W + 1) + x;
  const next = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const k = key(x0, y0);
    (next.get(k) ?? next.set(k, []).get(k)!).push(key(x1, y1));
  };
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && g[y * W + x] === 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) add(x, y, x + 1, y);
      if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!on(x - 1, y)) add(x, y + 1, x, y);
    }
  let best: number[] = [];
  const used = new Set<string>();
  for (const [start, outs] of next) {
    for (const first of outs) {
      if (used.has(`${start}>${first}`)) continue;
      const loop = [start];
      let cur = start, nx = first;
      for (let guard = 0; guard < 1e6; guard++) {
        used.add(`${cur}>${nx}`);
        if (nx === start) break;
        loop.push(nx);
        const cand = (next.get(nx) ?? []).filter((t) => !used.has(`${nx}>${t}`));
        if (cand.length === 0) break;
        cur = nx;
        nx = cand[0];
      }
      if (loop.length > best.length) best = loop;
    }
  }
  if (best.length < 4) return null;
  const pts = best.map((k) => ({ u: u0 + (k % (W + 1)) * cellM, v: v1 - Math.floor(k / (W + 1)) * cellM }));
  // Corners only.
  const out: { u: number; v: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    if (Math.abs((b.u - a.u) * (c.v - b.v) - (b.v - a.v) * (c.u - b.u)) > 1e-9) out.push(b);
  }
  return out;
}

/**
 * Remove short steps in a wall (a jog under `maxM` between two parallel runs):
 * the shorter run moves onto the longer run's line. Trace noise at a corner
 * (25 Gilbert St: a 0.5 m step at the north-east corner) otherwise makes
 * extra hips.
 */
export function dropJogs(
  r: { u: number; v: number }[],
  maxM = 1.0,
  maxCornerStepM = 2.0,
  maxCornerStepM2 = 4.5,
): { u: number; v: number }[] {
  let pts = r.map((p) => ({ ...p }));
  const clean = () => {
    // Drop repeated points and middle points of straight runs.
    let changed = true;
    while (changed && pts.length > 3) {
      changed = false;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
        const same = Math.hypot(b.u - c.u, b.v - c.v) < 1e-6;
        const straight = Math.abs((b.u - a.u) * (c.v - b.v) - (b.v - a.v) * (c.u - b.u)) < 1e-6;
        if (same || straight) { pts.splice(i, 1); changed = true; break; }
      }
    }
  };
  clean();
  for (let guard = 0; guard < 50 && pts.length > 4; guard++) {
    const n = pts.length;
    let k = -1, kl = Infinity;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const len = Math.hypot(b.u - a.u, b.v - a.v);
      if (len >= maxCornerStepM || len >= kl) continue;
      const p = pts[(i - 1 + n) % n], q = pts[(i + 2) % n];
      const d1 = { u: a.u - p.u, v: a.v - p.v }, d2 = { u: q.u - b.u, v: q.v - b.v };
      if (d1.u * d2.u + d1.v * d2.v <= 0) continue; // not a step (a notch or bump end)
      // A longer step only when what it cuts off is small (a patio corner
      // beside a wing, 25 Gilbert St: 1.7 m by 2.3 m).
      const shortRun = Math.min(Math.hypot(d1.u, d1.v), Math.hypot(d2.u, d2.v));
      if (len >= maxM && shortRun * len > maxCornerStepM2) continue;
      k = i; kl = len;
    }
    if (k < 0) break;
    const a = pts[k], b = pts[(k + 1) % n];
    const p = pts[(k - 1 + n) % n], q = pts[(k + 2) % n];
    const prevLen = Math.hypot(a.u - p.u, a.v - p.v), nextLen = Math.hypot(q.u - b.u, q.v - b.v);
    // The runs either side are square to the jog: put both on one line — the
    // inner one, so panels never reach over a gutter or paving.
    void prevLen; void nextLen;
    const jogAlongV = Math.abs(b.u - a.u) < Math.abs(b.v - a.v);
    const tryMove = (forward: boolean) => {
      const c = pts.map((x) => ({ ...x }));
      const A = c[k], B = c[(k + 1) % n], P = c[(k - 1 + n) % n], Q = c[(k + 2) % n];
      if (forward) { if (jogAlongV) { B.v = A.v; Q.v = A.v; } else { B.u = A.u; Q.u = A.u; } }
      else { if (jogAlongV) { A.v = B.v; P.v = B.v; } else { A.u = B.u; P.u = B.u; } }
      return c;
    };
    const areaUV = (c: { u: number; v: number }[]) => Math.abs(ringAreaXY(c.map((x) => ({ x: x.u, y: x.v }))));
    const f = tryMove(true), bk = tryMove(false);
    pts = areaUV(f) <= areaUV(bk) ? f : bk;
    clean();
  }
  return pts;
}

function axisFromBoundary(pts: XY[]): number {
  // Directions between boundary pixels a short way apart, weighted mod 90°.
  if (pts.length < 10) return 0;
  let sx = 0, sy = 0;
  const step = Math.max(1, Math.floor(pts.length / 4000));
  const grid = new Map<string, XY[]>();
  for (const p of pts) {
    const key = `${Math.floor(p.x)}|${Math.floor(p.y)}`;
    (grid.get(key) ?? grid.set(key, []).get(key)!).push(p);
  }
  for (let i = 0; i < pts.length; i += step) {
    const p = pts[i];
    const gx = Math.floor(p.x), gy = Math.floor(p.y);
    let mx = 0, my = 0, mxx = 0, myy = 0, mxy = 0, n = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++)
      for (const q of grid.get(`${gx + dx}|${gy + dy}`) ?? []) {
        if (Math.hypot(q.x - p.x, q.y - p.y) > 0.6) continue;
        mx += q.x; my += q.y; mxx += q.x * q.x; myy += q.y * q.y; mxy += q.x * q.y; n++;
      }
    if (n < 8) continue;
    mx /= n; my /= n;
    const cxx = mxx / n - mx * mx, cyy = myy / n - my * my, cxy = mxy / n - mx * my;
    const ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy); // local line direction
    const lin = Math.sqrt((cxx - cyy) ** 2 + 4 * cxy * cxy) / (cxx + cyy + 1e-9); // 1 = straight
    if (lin < 0.8) continue; // corners
    sx += Math.cos(4 * ang);
    sy += Math.sin(4 * ang);
  }
  const deg = ((Math.atan2(sy, sx) / 4) * 180) / Math.PI;
  return ((deg % 90) + 90) % 90;
}

function ringAreaXY(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

/** Bearing (compass, clockwise from north) of a direction in the local east/north frame. */
const bearingOf = (dx: number, dy: number) => (((Math.atan2(dx, dy) * 180) / Math.PI) % 360 + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/**
 * Faces of an equal-pitch hip roof on a square-walled outline, confirmed by
 * Google's roof segments. Null when the outline isn't square-walled, there
 * are no segments, or the segments disagree (e.g. a gable roof).
 */
export function hipFacesForSquareRoof(
  ring: LatLng[],
  segments: RoofSegmentLite[] | null | undefined,
  { cellM = 0.05, maxShareDiff = 0.1, maxUnmatched = 0.15, minAreaRatio = 0.85 }: { cellM?: number; maxShareDiff?: number; maxUnmatched?: number; minAreaRatio?: number } = {},
): SquareFace[] | null {
  if (ring.length < 4 || !segments || segments.length === 0) return null;
  const F = frameFor(ring);
  const xy = ring.map(F.toXY);
  const axisDeg = wallAxisDeg(xy);
  const wf = wallFrame(axisDeg);
  const uv = xy.map(wf.toUV);
  const n = uv.length;
  for (let i = 0; i < n; i++) {
    const p = uv[i], q = uv[(i + 1) % n];
    const du = Math.abs(q.u - p.u), dv = Math.abs(q.v - p.v);
    if (Math.min(du, dv) > 0.02 * Math.max(du, dv) + 0.02) return null; // not along / square to the walls
  }
  const ccw = ringAreaXY(xy) > 0;
  const u0 = Math.min(...uv.map((p) => p.u)), u1 = Math.max(...uv.map((p) => p.u));
  const v0 = Math.min(...uv.map((p) => p.v)), v1 = Math.max(...uv.map((p) => p.v));
  const GW = Math.ceil((u1 - u0) / cellM), GH = Math.ceil((v1 - v0) / cellM);
  if (GW * GH > 4_000_000) return null;
  const label = new Int16Array(GW * GH).fill(-1);
  const edges = uv.map((a, i) => {
    const b = uv[(i + 1) % n];
    const len = Math.hypot(b.u - a.u, b.v - a.v);
    return { a, tu: (b.u - a.u) / len, tv: (b.v - a.v) / len, len };
  });
  for (let gy = 0; gy < GH; gy++) {
    const v = v1 - (gy + 0.5) * cellM;
    // Crossings of this row with the outline (even-odd).
    const xs: number[] = [];
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = uv[i], b = uv[j];
      if (a.v > v !== b.v > v) xs.push(a.u + ((v - a.v) * (b.u - a.u)) / (b.v - a.v));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const ga = Math.max(0, Math.ceil((xs[k] - u0) / cellM - 0.5));
      const gb = Math.min(GW - 1, Math.floor((xs[k + 1] - u0) / cellM - 0.5));
      for (let gx = ga; gx <= gb; gx++) {
        const u = u0 + (gx + 0.5) * cellM;
        let best = Infinity, bi = -1;
        for (let e = 0; e < n; e++) {
          const E = edges[e];
          const ru = u - E.a.u, rv = v - E.a.v;
          const s = ru * E.tu + rv * E.tv;
          const perp = Math.abs(-ru * E.tv + rv * E.tu);
          const over = Math.max(0, -s, s - E.len);
          const d = Math.max(perp, over) + (over > perp ? 1e-6 : 0);
          if (d < best) { best = d; bi = e; }
        }
        label[gy * GW + gx] = bi;
      }
    }
  }
  const faces: (SquareFace & { planM2: number })[] = [];
  for (let e = 0; e < n; e++) {
    const g = new Uint8Array(GW * GH);
    let cnt = 0;
    for (let k = 0; k < g.length; k++) if (label[k] === e) { g[k] = 1; cnt++; }
    const planM2 = cnt * cellM * cellM;
    if (planM2 < 0.5) continue;
    const fr = traceUV(g, GW, GH, u0, v1, cellM, 1.5);
    if (!fr || fr.length < 3) continue;
    const E = edges[e];
    // Downslope: outward from the wall.
    const t = wf.toXY(E.tu, E.tv); // direction in east/north (rotation only)
    const tdx = t.x, tdy = t.y;
    const out = ccw ? { x: tdy, y: -tdx } : { x: -tdy, y: tdx };
    faces.push({
      ring: fr.map((p) => F.toLL(wf.toXY(p.u, p.v))),
      eaveDeg: (Math.atan2(tdy, tdx) * 180) / Math.PI,
      azimuthDeg: bearingOf(out.x, out.y),
      planM2,
    });
  }
  if (faces.length < 4) return null;

  // Google's confirmation: the share of roof facing each wall direction.
  const dirs = [0, 1, 2, 3].map((k) => (bearingOf(Math.cos((axisDeg * Math.PI) / 180), Math.sin((axisDeg * Math.PI) / 180)) + 90 * k) % 360);
  const bin = (b: number) => {
    let bi = 0;
    for (let k = 1; k < 4; k++) if (angDiff(b, dirs[k]) < angDiff(b, dirs[bi])) bi = k;
    return { bi, off: angDiff(b, dirs[bi]) };
  };
  const inside = (p: XY) => {
    let ins = false;
    for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) {
      const a = xy[i], b = xy[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
    }
    return ins;
  };
  const segs = segments.filter((s) => inside(F.toXY(s.center)));
  if (segs.length === 0) return null;
  const g = [0, 0, 0, 0];
  let unmatched = 0, gTotal = 0;
  for (const s of segs) {
    const plan = s.areaM2 * Math.cos((s.pitchDegrees * Math.PI) / 180);
    gTotal += plan;
    const { bi, off } = bin(s.azimuthDegrees);
    if (off > 25) unmatched += plan;
    else g[bi] += plan;
  }
  const f = [0, 0, 0, 0];
  let fTotal = 0;
  for (const face of faces) { f[bin(face.azimuthDeg).bi] += face.planM2; fTotal += face.planM2; }
  if (gTotal <= 0 || unmatched / gTotal > maxUnmatched) return null;
  let diff = 0;
  for (let k = 0; k < 4; k++) diff += Math.abs(f[k] / fTotal - g[k] / gTotal);
  (globalThis as { __sqWhy?: (w: unknown) => void }).__sqWhy?.({ diff: +diff.toFixed(3), unmatched: +(unmatched / gTotal).toFixed(3), gTotal: Math.round(gTotal), fTotal: Math.round(fTotal), f: f.map((x) => Math.round(x)), g: g.map((x) => Math.round(x)) });
  if (diff > maxShareDiff) return null;
  // And about as much roof as Google measured (not a part of it).
  if (fTotal < minAreaRatio * gTotal) return null;

  // Pitch: Google's nearest segment facing the same way.
  const pitches = segs.map((s) => s.pitchDegrees);
  const fallback = median(pitches);
  const shaped = regularizeRoofOutlines(faces.map((fc) => fc.ring), { mainAxisDeg: axisDeg });
  return faces.map((fc, i) => {
    const c = F.toXY({ lat: fc.ring.reduce((s, p) => s + p.lat, 0) / fc.ring.length, lng: fc.ring.reduce((s, p) => s + p.lng, 0) / fc.ring.length });
    const same = segs.filter((s) => angDiff(s.azimuthDegrees, fc.azimuthDeg) <= 30);
    let pitch = fallback;
    if (same.length) {
      const near = same.reduce((a, b) => {
        const pa = F.toXY(a.center), pb = F.toXY(b.center);
        return Math.hypot(pa.x - c.x, pa.y - c.y) <= Math.hypot(pb.x - c.x, pb.y - c.y) ? a : b;
      });
      pitch = near.pitchDegrees;
    }
    return { ring: shaped[i], eaveDeg: fc.eaveDeg, azimuthDeg: Math.round(fc.azimuthDeg), pitchDeg: pitch };
  });
}
