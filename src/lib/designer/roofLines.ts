import { DESIGN_RULES } from "@/lib/designer/designRules";
import { longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";

/**
 * Roof-line rule. Traced roofs come in with wobbly edges and corners that
 * don't quite meet their neighbours. This straightens them so outlines follow
 * real roof lines:
 *  1. Corners of different roofs within `roofCornerMergeM` become one shared
 *     corner, so faces meet exactly — no gaps or overlaps at ridges and hips.
 *  2. Each edge within `roofLineSnapDeg` of the building's main axis, of 90°
 *     to it, or of 45° (hips and valleys) is snapped onto that direction.
 *  3. Every corner is rebuilt where its two neighbouring lines intersect, and
 *     corners on a straight run are dropped.
 *  4. Corners are shared again after straightening.
 * A ring that comes out invalid (self-crossing, collapsed, or with its area
 * changed by more than 25%) is left as traced.
 */

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

const M_PER_LAT = 111320;

export type RoofLineOptions = {
  snapDeg?: number;
  mergeM?: number;
  /** Main-wall direction (degrees from east, counter-clockwise); defaults to the largest roof's longest edge. */
  mainAxisDeg?: number;
};

function ringArea(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

function segmentsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const o = (p: XY, q: XY, r: XY) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function isSimple(r: XY[]): boolean {
  const n = r.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return false;
    }
  }
  return true;
}

/** Merge points (across all rings) closer than `tol` into their shared average. */
function shareCorners(rings: XY[][], tol: number): XY[][] {
  const groups: { sum: XY; n: number; members: XY[] }[] = [];
  for (const ring of rings) {
    for (const p of ring) {
      const g = groups.find((g) => Math.hypot(g.sum.x / g.n - p.x, g.sum.y / g.n - p.y) <= tol);
      if (g) {
        g.sum = { x: g.sum.x + p.x, y: g.sum.y + p.y };
        g.n += 1;
        g.members.push(p);
      } else groups.push({ sum: { ...p }, n: 1, members: [p] });
    }
  }
  const rep = (p: XY) => {
    const g = groups.find((g) => g.members.includes(p))!;
    return { x: g.sum.x / g.n, y: g.sum.y / g.n };
  };
  return rings.map((ring) => dropDuplicates(ring.map(rep)));
}

function dropDuplicates(r: XY[]): XY[] {
  const out: XY[] = [];
  for (const p of r) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-6) out.pop();
  return out;
}

type Run = { a: number; c: number; len: number };

/** Signed offset of point p from the line through the origin with direction a. */
const offsetOf = (a: number, p: XY) => Math.cos(a) * p.y - Math.sin(a) * p.x;

function sameDir(a: number, b: number) {
  return Math.cos(a - b) > 0.999;
}

function joinRuns(p: Run, q: Run): Run {
  const len = p.len + q.len;
  return { a: p.a, c: (p.c * p.len + q.c * q.len) / len, len };
}

/**
 * Straighten one ring: each edge snaps onto the main axis, 90° to it, or
 * 45° (within the snap angle); consecutive edges running the same way are
 * fitted as one line (length-weighted); short steps between two lines of
 * the same direction and nearly the same position — trace noise on one
 * wall — are dropped and the two lines joined; corners are rebuilt where
 * neighbouring lines meet.
 */
function straighten(
  ring: XY[],
  axisRad: number,
  snapRad: number,
  { minRunM = 0.6, maxJogM = 0.45 }: { minRunM?: number; maxJogM?: number } = {},
): XY[] {
  const n = ring.length;
  if (n < 3) return ring;
  let runs: Run[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < 1e-6) continue;
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    let best = ang;
    let bestDiff = Infinity;
    for (let k = -8; k <= 8; k++) {
      const cand = axisRad + (k * Math.PI) / 4;
      const diff = Math.abs(Math.atan2(Math.sin(ang - cand), Math.cos(ang - cand)));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = cand;
      }
    }
    const a = bestDiff <= snapRad ? best : ang;
    runs.push({ a, c: offsetOf(a, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }), len });
  }

  const mergeNeighbours = (rs: Run[]): Run[] => {
    const out: Run[] = [];
    for (const r of rs) {
      const prev = out[out.length - 1];
      if (prev && sameDir(prev.a, r.a)) out[out.length - 1] = joinRuns(prev, { ...r, c: offsetOf(prev.a, pointOn(r)) });
      else out.push(r);
    }
    while (out.length > 1 && sameDir(out[0].a, out[out.length - 1].a)) {
      const last = out.pop()!;
      out[0] = joinRuns(out[0], { ...last, c: offsetOf(out[0].a, pointOn(last)) });
    }
    return out;
  };
  runs = mergeNeighbours(runs);

  // Drop trace noise: the shortest run first, while any is too short.
  for (let guard = 0; guard < 500 && runs.length > 3; guard++) {
    let k = -1;
    for (let i = 0; i < runs.length; i++) if (runs[i].len < minRunM && (k < 0 || runs[i].len < runs[k].len)) k = i;
    if (k < 0) break;
    const m = runs.length;
    const prev = runs[(k - 1 + m) % m];
    const next = runs[(k + 1) % m];
    if (sameDir(prev.a, next.a)) {
      // A step between two runs of one wall: only noise if they nearly line up.
      if (Math.abs(prev.c - next.c) > maxJogM && runs[k].len >= maxJogM) {
        runs[k] = { ...runs[k], len: minRunM }; // a real step — keep it
        continue;
      }
    }
    runs.splice(k, 1);
    runs = mergeNeighbours(runs);
  }
  if (runs.length < 3) return ring;

  const out: XY[] = [];
  for (let i = 0; i < runs.length; i++) {
    const l1 = runs[(i - 1 + runs.length) % runs.length];
    const l2 = runs[i];
    // Solve cos(a)·y − sin(a)·x = c for both lines.
    const a1 = -Math.sin(l1.a), b1 = Math.cos(l1.a);
    const a2 = -Math.sin(l2.a), b2 = Math.cos(l2.a);
    const den = a1 * b2 - a2 * b1;
    if (Math.abs(den) < 1e-6) return ring;
    out.push({ x: (l1.c * b2 - l2.c * b1) / den, y: (a1 * l2.c - a2 * l1.c) / den });
  }
  // Two nearly parallel lines meet far away: a corner rebuilt more than 1 m
  // outside the traced roof is not a corner (134 Old Canterbury Rd: one
  // landed 24 m off, drawing a line across the neighbours). Keep the trace.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of ring) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  if (out.some((p) => p.x < x0 - 1 || p.x > x1 + 1 || p.y < y0 - 1 || p.y > y1 + 1)) return ring;
  return out;
}

/** A point on a run's line (the foot of the perpendicular from the origin). */
function pointOn(r: Run): XY {
  return { x: -Math.sin(r.a) * r.c, y: Math.cos(r.a) * r.c };
}

export function regularizeRoofOutlines(
  roofs: LatLng[][],
  {
    snapDeg = DESIGN_RULES.roofLineSnapDeg,
    mergeM = DESIGN_RULES.roofCornerMergeM,
    mainAxisDeg,
  }: RoofLineOptions = {},
): LatLng[][] {
  const all = roofs.flat();
  if (all.length < 3) return roofs;
  const refLat = all.reduce((s, p) => s + p.lat, 0) / all.length;
  const mLng = M_PER_LAT * Math.cos((refLat * Math.PI) / 180);
  const toXY = (p: LatLng): XY => ({ x: p.lng * mLng, y: p.lat * M_PER_LAT });
  const toLL = (p: XY): LatLng => ({ lat: p.y / M_PER_LAT, lng: p.x / mLng });

  const original = roofs.map((r) => r.map(toXY));
  const valid = original.map((r) => r.length >= 3);
  let axisDeg = mainAxisDeg;
  if (axisDeg === undefined) {
    // Seed with the largest roof's longest edge, then refine with a
    // length-weighted mean over edges within the snap angle of that direction
    // or 90° to it (the walls) — hips and valleys don't pull it off.
    const areas = original.map((r, i) => (valid[i] ? Math.abs(ringArea(r)) : 0));
    const seed = (longestEdgeAngleDegrees(roofs[areas.indexOf(Math.max(...areas))]) * Math.PI) / 180;
    let sx = 0;
    let sy = 0;
    original.forEach((r, i) => {
      if (!valid[i]) return;
      for (let k = 0; k < r.length; k++) {
        const p = r[k];
        const q = r[(k + 1) % r.length];
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        const ang = Math.atan2(q.y - p.y, q.x - p.x);
        const off = Math.atan2(Math.sin(4 * (ang - seed)), Math.cos(4 * (ang - seed))) / 4;
        if (Math.abs(off) > (snapDeg * Math.PI) / 180) continue;
        sx += len * Math.cos(off);
        sy += len * Math.sin(off);
      }
    });
    axisDeg = ((seed + Math.atan2(sy, sx)) * 180) / Math.PI;
  }
  const axis = (axisDeg * Math.PI) / 180;
  const snap = (snapDeg * Math.PI) / 180;

  let rings = shareCorners(original, mergeM);
  rings = rings.map((r, i) => (valid[i] ? straighten(r, axis, snap) : r));
  rings = shareCorners(rings, mergeM);

  return rings.map((r, i) => {
    if (!valid[i]) return roofs[i];
    const before = Math.abs(ringArea(original[i]));
    const after = Math.abs(ringArea(r));
    const ok =
      r.length >= 3 &&
      isSimple(r) &&
      before > 0 &&
      Math.abs(after - before) / before <= 0.25;
    return ok ? r.map(toLL) : roofs[i];
  });
}
