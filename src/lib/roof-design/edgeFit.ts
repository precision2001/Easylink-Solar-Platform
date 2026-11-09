/**
 * EDGE FIT (owner, 9 Nov 2026): Opus decides which roof lines and
 * intersection points there are; the engine puts them exactly on the image.
 *
 * Opus places a point to within 10-20 px (0.3-1 m); the rule is ±100 mm.
 * So every traced line — border edges included — is fitted onto the edge it
 * runs along in the photo (a brightness step or a capping line, within
 * `searchM` either side), as a straight line: each half of the line is fitted
 * on its own, so a line that is slightly turned is turned back too. Then each
 * intersection point moves to where its fitted lines cross (least squares,
 * one shared point for all its lines); a point on one fitted line is moved
 * onto it. Lines stay straight and stay joined, because their ends are the
 * shared points. A line the image doesn't show clearly keeps Opus's place
 * and is reported, so the design can say "check on site".
 */
import { DESIGN_RULES } from "@/lib/designer/designRules";
import { rasterPixelM } from "@/lib/designer/roofLineCheck";
import type { GeoTiffRaster } from "@/utils/geotiff";
import { frameOf, sampler } from "./junctions";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

export type EdgeFitTrace = {
  outline: LatLng[] | null;
  faces: { ring: LatLng[] }[];
  lines: { a: LatLng; b: LatLng }[];
};

export type EdgeFitResult<T> = {
  trace: T;
  /** Lines fitted onto an edge in the image and, after the points moved, within the tolerance of it. */
  onEdge: number;
  /** Lines the image doesn't show clearly: left where Opus put them. */
  notSeen: number;
  /** Lines seen, but whose points couldn't follow them within the tolerance. */
  off: number;
  total: number;
  /** Intersection points moved, and the largest move (m). */
  moved: number;
  maxMoveM: number;
};

export type EdgeFitOptions = { searchM?: number; toleranceM?: number; maxMoveM?: number };

type Fitted = { p: XY; d: XY; strong: boolean };

/**
 * A traced line fitted onto the image: the straight line, within ±searchM of
 * where it is drawn (each end on its own, so a turned line turns back), along
 * which the image shows a line most strongly: a brightness step across it or
 * a capping line along it. Strong when it clearly stands out from the
 * background beside it.
 */
function fitLine(at: (q: XY) => number | null, a: XY, b: XY, searchM: number, halfM: number): Fitted {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const n = { x: -u.y, y: u.x };
  const step = 0.02;
  const nd = Math.round(searchM / step);
  const D = 2 * nd + 1;
  const K = Math.max(6, Math.round((0.8 * len) / 0.1));
  const ts = Array.from({ length: K + 1 }, (_, k) => 0.1 + (0.8 * k) / K);
  // The response at each sample along the line, for each shift across it.
  const resp: (Float32Array | null)[] = ts.map((t) => {
    const row = new Float32Array(D);
    const c = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    for (let i = 0; i < D; i++) {
      const d = (i - nd) * step;
      const p = { x: c.x + d * n.x, y: c.y + d * n.y };
      const l0 = at(p);
      const l1 = at({ x: p.x + halfM * n.x, y: p.y + halfM * n.y });
      const l2 = at({ x: p.x - halfM * n.x, y: p.y - halfM * n.y });
      if (l0 === null || l1 === null || l2 === null) return null;
      row[i] = Math.max(Math.abs(l1 - l2), Math.abs(l0 - (l1 + l2) / 2));
    }
    return row;
  });
  const rows = ts.map((t, k) => ({ t, r: resp[k] })).filter((x): x is { t: number; r: Float32Array } => x.r !== null);
  if (rows.length < ts.length / 2) return { p: a, d: u, strong: false };
  const score = (ia: number, ib: number) => {
    let s = 0;
    for (const { t, r } of rows) {
      const i = Math.round(ia + (ib - ia) * t);
      if (i < 0 || i >= D) return -1;
      s += r[i];
    }
    return s / rows.length;
  };
  // Nearer wins a close call: a parapet or gutter beside the line can be as strong.
  const near = (ia: number, ib: number) => 1 - (0.35 * (Math.abs(ia - nd) + Math.abs(ib - nd))) / (2 * nd);
  let best = { ia: nd, ib: nd, s: -1, v: -1 };
  for (let ia = 0; ia < D; ia += 2)
    for (let ib = 0; ib < D; ib += 2) {
      const s = score(ia, ib);
      const v = s * near(ia, ib);
      if (v > best.v) best = { ia, ib, s, v };
    }
  for (let ia = Math.max(0, best.ia - 2); ia <= Math.min(D - 1, best.ia + 2); ia++)
    for (let ib = Math.max(0, best.ib - 2); ib <= Math.min(D - 1, best.ib + 2); ib++) {
      const s = score(ia, ib);
      const v = s * near(ia, ib);
      if (v > best.v) best = { ia, ib, s, v };
    }
  // The background: the same line moved across, over the whole search band.
  const bg: number[] = [];
  for (let k = -D; k <= D; k += 2) {
    const s = score(best.ia + k, best.ib + k);
    if (s >= 0 && Math.abs(k) > 6) bg.push(s);
  }
  bg.sort((x, y) => x - y);
  const background = bg.length ? bg[Math.floor(bg.length / 2)] : 0;
  const strong = best.s >= 6 && best.s >= 2 * background;
  if (!strong) return { p: a, d: u, strong: false };
  const da = (best.ia - nd) * step;
  const db = (best.ib - nd) * step;
  // The fitted line through its two ends (at t = 0 and t = 1).
  const pa = { x: a.x + da * n.x, y: a.y + da * n.y };
  const pb = { x: b.x + db * n.x, y: b.y + db * n.y };
  const l = Math.hypot(pb.x - pa.x, pb.y - pa.y);
  return { p: pa, d: { x: (pb.x - pa.x) / l, y: (pb.y - pa.y) / l }, strong: true };
}

const distToLine = (q: XY, f: Fitted) => Math.abs((q.x - f.p.x) * -f.d.y + (q.y - f.p.y) * f.d.x);

/** The point nearest to all the given lines (least squares); null when they're near parallel. */
function crossing(lines: Fitted[]): XY | null {
  let a11 = 0;
  let a12 = 0;
  let a22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (const f of lines) {
    const n = { x: -f.d.y, y: f.d.x };
    const c = n.x * f.p.x + n.y * f.p.y;
    a11 += n.x * n.x;
    a12 += n.x * n.y;
    a22 += n.y * n.y;
    b1 += n.x * c;
    b2 += n.y * c;
  }
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 0.05 * lines.length * lines.length) return null;
  return { x: (b1 * a22 - b2 * a12) / det, y: (a11 * b2 - a12 * b1) / det };
}

function segmentsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const o = (p: XY, q: XY, r: XY) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}
function simple(r: XY[]): boolean {
  const n = r.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return false;
    }
  return true;
}

export function fitTraceToEdges<T extends EdgeFitTrace>(
  trace: T,
  luma: GeoTiffRaster | null,
  { searchM = 0.8, toleranceM = DESIGN_RULES.roofLineToleranceM, maxMoveM = 1.2 }: EdgeFitOptions = {},
): EdgeFitResult<T> {
  const none = { trace, onEdge: 0, notSeen: 0, off: 0, total: 0, moved: 0, maxMoveM: 0 };
  const all = [...(trace.outline ?? []), ...trace.faces.flatMap((f) => f.ring), ...trace.lines.flatMap((l) => [l.a, l.b])];
  if (!luma || all.length < 3) return none;
  const { toXY, toLL } = frameOf(all);
  const at = sampler(luma, toLL);
  const halfM = Math.max(0.06, 1.5 * rasterPixelM(luma));

  // Shared points: everything within 5 cm is one point.
  const pts: { p: XY; lines: number[] }[] = [];
  const idOf = (ll: LatLng): number => {
    const q = toXY(ll);
    const i = pts.findIndex((v) => Math.hypot(v.p.x - q.x, v.p.y - q.y) < 0.05);
    if (i >= 0) return i;
    pts.push({ p: q, lines: [] });
    return pts.length - 1;
  };
  // Every traced line, and the border's edges if Opus didn't list them.
  const segs: [number, number][] = [];
  const addSeg = (a: number, b: number) => {
    if (a === b || segs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return;
    segs.push([a, b]);
  };
  for (const l of trace.lines) addSeg(idOf(l.a), idOf(l.b));
  const o = trace.outline ?? [];
  o.forEach((p, i) => addSeg(idOf(p), idOf(o[(i + 1) % o.length])));
  for (const f of trace.faces) f.ring.forEach((p) => idOf(p));

  const fits: (Fitted | null)[] = segs.map(([i, j]) => {
    const a = pts[i].p;
    const b = pts[j].p;
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) return null;
    return fitLine(at, a, b, searchM, halfM);
  });
  segs.forEach(([i, j], k) => {
    if (fits[k]?.strong) {
      pts[i].lines.push(k);
      pts[j].lines.push(k);
    }
  });

  // Each point to where its fitted lines cross.
  const next = pts.map((v) => {
    const ls = v.lines.map((k) => fits[k]!);
    if (ls.length === 0) return v.p;
    let q: XY | null = ls.length >= 2 ? crossing(ls) : null;
    if (!q) {
      // One line (or parallel ones): straight onto the first.
      const f = ls[0];
      const t = (v.p.x - f.p.x) * f.d.x + (v.p.y - f.p.y) * f.d.y;
      q = { x: f.p.x + t * f.d.x, y: f.p.y + t * f.d.y };
    }
    return Math.hypot(q.x - v.p.x, q.y - v.p.y) <= maxMoveM ? q : v.p;
  });

  // No face may fold over: a point that would fold one stays where it was.
  const faceIds = trace.faces.map((f) => f.ring.map(idOf));
  const outlineIds = o.map(idOf);
  for (let pass = 0; pass < 3; pass++) {
    let fixed = false;
    for (const ids of [...faceIds, outlineIds]) {
      if (ids.length < 3 || simple(ids.map((i) => next[i]))) continue;
      for (const i of ids) {
        if (next[i] !== pts[i].p) {
          next[i] = pts[i].p;
          fixed = true;
        }
      }
    }
    if (!fixed) break;
  }

  let onEdge = 0;
  let notSeen = 0;
  let off = 0;
  segs.forEach(([i, j], k) => {
    const f = fits[k];
    if (!f) return;
    if (!f.strong) notSeen++;
    else if (Math.max(distToLine(next[i], f), distToLine(next[j], f)) <= toleranceM) onEdge++;
    else off++;
  });
  let moved = 0;
  let maxMove = 0;
  next.forEach((q, i) => {
    const m = Math.hypot(q.x - pts[i].p.x, q.y - pts[i].p.y);
    if (m > 0.01) moved++;
    maxMove = Math.max(maxMove, m);
  });

  const map = (ll: LatLng): LatLng => toLL(next[idOf(ll)]);
  const fitted = {
    ...trace,
    outline: trace.outline ? trace.outline.map(map) : trace.outline,
    faces: trace.faces.map((f) => ({ ...f, ring: f.ring.map(map) })),
    lines: trace.lines.map((l) => ({ ...l, a: map(l.a), b: map(l.b) })),
  } as T;
  return { trace: fitted, onEdge, notSeen, off, total: segs.filter((_, k) => fits[k]).length, moved, maxMoveM: maxMove };
}
