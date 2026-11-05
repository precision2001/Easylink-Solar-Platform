/**
 * Two tools that let the trigonometry (square-walled) reading work on more
 * roofs (264 Wangee Rd, Greenacre, Nov 2026):
 *
 * - `squareWalls`: a traced or hand-drawn outline whose short steps came out
 *   at 45° is redrawn with every wall along or square to the main walls (a
 *   step in an eave is square to the walls on a real house). Refused when any
 *   corner would move more than `maxMoveM`.
 * - `splitByRoofLevel`: a main roof and a lower roof built against it (a
 *   rear skillion, a verandah) trace as one outline. When Google's segments
 *   show two pitch groups that sit on either side of a line along or square
 *   to the walls, the outline is cut on the eave line seen in the image
 *   between them, so each roof is read on its own.
 */
import { rasterPixelOf, type GeoTiffRaster } from "@/utils/geotiff";
import type { SolarEstimateResult } from "@/types/solar";
import { dropJogs } from "@/lib/designer/squareRoof";
import { clipRingToConvexPolygon, ringAreaM2, type LatLng, type LatLngRing, type XY } from "./geometry";

const M_PER_LAT = 111_320;

type Segment = SolarEstimateResult["roofSegments"][number];

function frame(ring: LatLngRing) {
  const lat0 = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const lng0 = ring.reduce((s, p) => s + p.lng, 0) / ring.length;
  const mL = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: (p: LatLng): XY => ({ x: (p.lng - lng0) * mL, y: (p.lat - lat0) * M_PER_LAT }),
    toLL: (p: XY): LatLng => ({ lat: lat0 + p.y / M_PER_LAT, lng: lng0 + p.x / mL }),
  };
}

/** Main wall direction, degrees mod 90 (length-weighted, longer walls count more). */
function wallAxis(xy: XY[]): number {
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < xy.length; i++) {
    const p = xy[i];
    const q = xy[(i + 1) % xy.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    // Squared length: the long walls set the axis, not short steps.
    sx += len * len * Math.cos(4 * a);
    sy += len * len * Math.sin(4 * a);
  }
  return Math.atan2(sy, sx) / 4;
}

function uvFrame(ring: LatLngRing) {
  const F = frame(ring);
  const xy = ring.map(F.toXY);
  const t = wallAxis(xy);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const toUV = (p: XY) => ({ u: p.x * c + p.y * s, v: -p.x * s + p.y * c });
  const fromUV = (u: number, v: number): LatLng => F.toLL({ x: u * c - v * s, y: u * s + v * c });
  return { uv: xy.map(toUV), toUV: (p: LatLng) => toUV(F.toXY(p)), fromUV };
}

/**
 * The outline with every wall along or square to the main walls, or null
 * when that would move a corner more than `maxMoveM` (not a square-walled
 * house) or the walls don't alternate.
 */
export function squareWalls(ring: LatLngRing, { maxMoveM = 0.6 }: { maxMoveM?: number } = {}): LatLngRing | null {
  if (ring.length < 4) return null;
  const { uv, fromUV } = uvFrame(ring);
  // Each wall along u or v; merge runs of the same direction.
  const n = uv.length;
  const kind = uv.map((a, i) => {
    const b = uv[(i + 1) % n];
    return Math.abs(b.u - a.u) >= Math.abs(b.v - a.v) ? "u" : "v";
  });
  const keep: number[] = [];
  for (let i = 0; i < n; i++) if (kind[(i - 1 + n) % n] !== kind[i]) keep.push(i);
  if (keep.length < 4 || keep.length % 2 !== 0) return null;
  // Corner k sits where the wall before it meets the wall after it. Each wall
  // is placed at the length-weighted mean of the corners it runs through.
  const m = keep.length;
  const level: number[] = [];
  for (let k = 0; k < m; k++) {
    const i0 = keep[k];
    const i1 = keep[(k + 1) % m];
    const along = kind[i0];
    let sw = 0;
    let sv = 0;
    for (let i = i0; i !== i1; i = (i + 1) % n) {
      const a = uv[i];
      const b = uv[(i + 1) % n];
      const len = Math.hypot(b.u - a.u, b.v - a.v);
      const val = along === "u" ? (a.v + b.v) / 2 : (a.u + b.u) / 2;
      sw += len;
      sv += len * val;
    }
    level.push(sw > 0 ? sv / sw : 0);
  }
  const out: LatLng[] = [];
  for (let k = 0; k < m; k++) {
    const before = (k - 1 + m) % m;
    const along = kind[keep[k]];
    const u = along === "u" ? level[before] : level[k];
    const v = along === "u" ? level[k] : level[before];
    const o = uv[keep[k]];
    if (Math.hypot(o.u - u, o.v - v) > maxMoveM) return null;
    out.push(fromUV(u, v));
  }
  return out;
}

function lumaAt(r: GeoTiffRaster, p: LatLng): number | null {
  const { col, row } = rasterPixelOf(r, p.lat, p.lng);
  const c = Math.floor(col);
  const w = Math.floor(row);
  if (c < 0 || w < 0 || c >= r.width || w >= r.height) return null;
  return r.data[w * r.width + c];
}

/**
 * The outline cut into the main roof and a lower roof at a different pitch,
 * or null when Google's segments don't show two separate roofs.
 */
export function splitByRoofLevel(
  ring: LatLngRing,
  segments: Segment[] | null | undefined,
  luma: GeoTiffRaster | null,
  { steepDeg = 18, lowDeg = 15, minShare = 0.15, minAreaM2 = 15 }: { steepDeg?: number; lowDeg?: number; minShare?: number; minAreaM2?: number } = {},
): { main: LatLngRing; lower: LatLngRing } | null {
  if (!segments || segments.length < 3 || ring.length < 4) return null;
  const { uv, toUV, fromUV } = uvFrame(ring);
  const steep = segments.filter((s) => s.pitchDegrees >= steepDeg);
  const low = segments.filter((s) => s.pitchDegrees < lowDeg);
  const area = (g: Segment[]) => g.reduce((s, x) => s + x.areaM2, 0);
  const total = area(segments);
  if (area(steep) < minShare * total || area(low) < minShare * total) return null;
  const su = steep.map((s) => toUV(s.center));
  const lu = low.map((s) => toUV(s.center));
  const umin = Math.min(...uv.map((p) => p.u));
  const umax = Math.max(...uv.map((p) => p.u));
  const vmin = Math.min(...uv.map((p) => p.v));
  const vmax = Math.max(...uv.map((p) => p.v));
  let best: { axis: "u" | "v"; c: number; lowAbove: boolean; score: number } | null = null;
  for (const axis of ["u", "v"] as const) {
    const sv = su.map((p) => p[axis]);
    const lv = lu.map((p) => p[axis]);
    for (const lowAbove of [true, false]) {
      // The lower roof wholly on one side of the main roof's segments.
      const lo = lowAbove ? Math.max(...sv) : Math.max(...lv);
      const hi = lowAbove ? Math.min(...lv) : Math.min(...sv);
      if (!(hi - lo > 0.6)) continue;
      // The eave between them: the strongest straight brightness edge.
      const [a0, a1] = axis === "u" ? [vmin, vmax] : [umin, umax];
      for (let c = lo + 0.3; c <= hi - 0.3; c += 0.05) {
        let sum = 0;
        let cnt = 0;
        for (let t = a0 + 0.5; t <= a1 - 0.5; t += 0.2) {
          const at = (d: number) => (axis === "u" ? fromUV(c + d, t) : fromUV(t, c + d));
          const la = luma ? lumaAt(luma, at(0.25)) : null;
          const lb = luma ? lumaAt(luma, at(-0.25)) : null;
          if (la === null || lb === null) continue;
          sum += Math.abs(la - lb);
          cnt++;
        }
        const score = cnt > 0 ? sum / cnt : 0;
        if (!best || score > best.score) best = { axis, c, lowAbove, score };
      }
    }
  }
  if (!best || best.score < 6) return null;
  const big = 1000;
  const half = (above: boolean): LatLngRing => {
    const { axis, c } = best!;
    const [p0, p1] = above ? [c, c + big] : [c - big, c];
    return axis === "u"
      ? [fromUV(p0, -big), fromUV(p1, -big), fromUV(p1, big), fromUV(p0, big)]
      : [fromUV(-big, p0), fromUV(-big, p1), fromUV(big, p1), fromUV(big, p0)];
  };
  const lower = clipRingToConvexPolygon(ring, half(best.lowAbove));
  const main = clipRingToConvexPolygon(ring, half(!best.lowAbove));
  if (main.length < 3 || lower.length < 3 || ringAreaM2(main) < minAreaM2 || ringAreaM2(lower) < minAreaM2) return null;
  return { main, lower };
}

/**
 * The outline with steps shorter than `maxM` merged away (walls squared
 * first). Traced outlines carry small jogs from shadows and gutters; real
 * steps are kept by the reading that the image and Google confirm best, so
 * callers try several values and let the evidence decide.
 */
export function withoutSmallSteps(ring: LatLngRing, maxM: number): LatLngRing | null {
  const sq = squareWalls(ring) ?? ring;
  const { uv, fromUV } = uvFrame(sq);
  const out = dropJogs(uv, maxM, 0);
  if (out.length < 4) return null;
  return out.map((p) => fromUV(p.u, p.v));
}

/**
 * For each short step (wall run under `maxM`) of the squared outline, the
 * outline with just that step merged away — so each step can be kept or
 * dropped on the evidence, one at a time (a real step in an eave and a
 * tracing notch look alike by size).
 */
export function singleStepRemovals(ring: LatLngRing, maxM = 1.5): LatLngRing[] {
  const sq = squareWalls(ring);
  if (!sq) return [];
  const { uv, fromUV } = uvFrame(sq);
  type Run = { along: "u" | "v"; pos: number; len: number };
  const n = uv.length;
  const runs: Run[] = uv.map((a, i) => {
    const b = uv[(i + 1) % n];
    const along = Math.abs(b.u - a.u) >= Math.abs(b.v - a.v) ? "u" : "v";
    return { along, pos: along === "u" ? (a.v + b.v) / 2 : (a.u + b.u) / 2, len: Math.hypot(b.u - a.u, b.v - a.v) };
  });
  const toRing = (rs: Run[]): LatLngRing | null => {
    // Merge neighbours running the same way, drop zero-length runs, until stable.
    const cur = rs.map((r) => ({ ...r }));
    for (let guard = 0; guard < 50; guard++) {
      let changed = false;
      for (let i = 0; i < cur.length && cur.length > 4; i++) {
        const j = (i + 1) % cur.length;
        if (cur[i].along === cur[j].along) {
          const w = cur[i].len + cur[j].len || 1;
          cur[i] = { along: cur[i].along, pos: (cur[i].pos * cur[i].len + cur[j].pos * cur[j].len) / w, len: cur[i].len + cur[j].len };
          cur.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (!changed) break;
    }
    if (cur.length < 4 || cur.length % 2) return null;
    const pts = cur.map((r, k) => {
      const nx = cur[(k + 1) % cur.length];
      return r.along === "u" ? fromUV(nx.pos, r.pos) : fromUV(r.pos, nx.pos);
    });
    // Recompute run lengths are implicit; reject degenerate outlines.
    return ringAreaM2(pts) > 4 ? pts : null;
  };
  const out: LatLngRing[] = [];
  runs.forEach((r, i) => {
    if (r.len > maxM || runs.length <= 4) return;
    const m = runs.length;
    const prev = runs[(i - 1 + m) % m];
    const next = runs[(i + 1) % m];
    const w = prev.len + next.len || 1;
    const merged: Run = { along: prev.along, pos: (prev.pos * prev.len + next.pos * next.len) / w, len: prev.len + next.len };
    const rest: Run[] = [];
    for (let k = 0; k < m; k++) {
      if (k === i || k === (i + 1) % m) continue;
      rest.push(k === (i - 1 + m) % m ? merged : runs[k]);
    }
    // Keep the original order starting after the merged run.
    const ring2 = toRing(rest);
    if (ring2) out.push(ring2);
  });
  return out;
}

/**
 * The outline with each long wall moved onto the matching wall of a more
 * precise reference outline (the image's square-walled outline), when one
 * runs the same way within `maxShiftM` and overlaps it. Short steps the
 * reference lacks are kept, so a traced step gets precise eaves around it.
 */
export function alignWalls(ring: LatLngRing, refs: LatLngRing[], { maxShiftM = 1.0, minLenM = 2 } = {}): LatLngRing | null {
  const sq = squareWalls(ring);
  if (!sq || refs.length === 0) return null;
  const { uv, toUV, fromUV } = uvFrame(sq);
  const n = uv.length;
  type Run = { along: "u" | "v"; pos: number; lo: number; hi: number; len: number };
  const runsOf = (pts: { u: number; v: number }[]): Run[] =>
    pts.map((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const along = Math.abs(b.u - a.u) >= Math.abs(b.v - a.v) ? "u" : "v";
      const [x0, x1] = along === "u" ? [a.u, b.u] : [a.v, b.v];
      return { along, pos: along === "u" ? (a.v + b.v) / 2 : (a.u + b.u) / 2, lo: Math.min(x0, x1), hi: Math.max(x0, x1), len: Math.abs(x1 - x0) };
    });
  const mine = runsOf(uv);
  const theirs = refs.flatMap((r) => runsOf(r.map(toUV))).filter((r) => r.len >= minLenM);
  let moved = false;
  const pos = mine.map((r) => {
    if (r.len < minLenM) return r.pos;
    let best: Run | null = null;
    for (const t of theirs) {
      if (t.along !== r.along || Math.abs(t.pos - r.pos) > maxShiftM) continue;
      const overlap = Math.min(r.hi, t.hi) - Math.max(r.lo, t.lo);
      if (overlap < 0.5 * Math.min(r.len, t.len)) continue;
      if (!best || Math.abs(t.pos - r.pos) < Math.abs(best.pos - r.pos)) best = t;
    }
    if (best && Math.abs(best.pos - r.pos) > 0.01) moved = true;
    return best ? best.pos : r.pos;
  });
  // A step the reference doesn't have: walls either side of a short run
  // would both snap onto the same reference wall — snap the longer one and
  // keep the step's size (264 Wangee Rd's north eave step).
  for (let k = 0; k < n; k++) {
    if (mine[k].len >= minLenM) continue;
    const a = (k - 1 + n) % n;
    const b = (k + 1) % n;
    const orig = Math.abs(mine[a].pos - mine[b].pos);
    if (orig < 0.15 || Math.abs(pos[a] - pos[b]) >= 0.5 * orig) continue;
    const [lng, sht] = mine[a].len >= mine[b].len ? [a, b] : [b, a];
    pos[sht] = mine[sht].pos + (pos[lng] - mine[lng].pos);
  }
  if (!moved) return null;
  const out = mine.map((r, k) => {
    const nk = (k + 1) % n;
    return r.along === "u" ? fromUV(pos[nk], pos[k]) : fromUV(pos[k], pos[nk]);
  });
  return ringAreaM2(out) > 4 ? out : null;
}

/**
 * The outline with notches and tabs merged away: a short wall run counts as a
 * real step only when long walls run on both sides of it (the eave carries on
 * at a new line — 264 Wangee Rd's north step). A short run next to other
 * short runs is a box on the roof or tracing noise, and an offset under
 * `minStepM` can't be a wall set back (134 Old Canterbury Rd).
 */
export function withoutNotches(ring: LatLngRing, { maxM = 1.5, minFlankM = 2, minStepM = 0 } = {}): LatLngRing | null {
  let cur = squareWalls(ring);
  if (!cur) return null;
  for (let guard = 0; guard < 12; guard++) {
    const { uv } = uvFrame(cur);
    const n = uv.length;
    const len = uv.map((a, i) => Math.hypot(uv[(i + 1) % n].u - a.u, uv[(i + 1) % n].v - a.v));
    const i = len.findIndex((l, k) => l < minStepM || (l <= maxM && (len[(k - 1 + n) % n] < minFlankM || len[(k + 1) % n] < minFlankM)));
    if (i < 0) break;
    // Remove that run: the same as singleStepRemovals for index i.
    const next = singleStepRemovalAt(cur, i);
    if (!next) break;
    cur = next;
  }
  return cur;
}

function singleStepRemovalAt(ring: LatLngRing, index: number): LatLngRing | null {
  const { uv, fromUV } = uvFrame(ring);
  const n = uv.length;
  type Run = { along: "u" | "v"; pos: number; len: number };
  const runs: Run[] = uv.map((a, i) => {
    const b = uv[(i + 1) % n];
    const along = Math.abs(b.u - a.u) >= Math.abs(b.v - a.v) ? "u" : "v";
    return { along, pos: along === "u" ? (a.v + b.v) / 2 : (a.u + b.u) / 2, len: Math.hypot(b.u - a.u, b.v - a.v) };
  });
  const m = runs.length;
  if (m <= 4) return null;
  const prev = runs[(index - 1 + m) % m];
  const next = runs[(index + 1) % m];
  const w = prev.len + next.len || 1;
  const merged: Run = { along: prev.along, pos: (prev.pos * prev.len + next.pos * next.len) / w, len: prev.len + next.len };
  let rest: Run[] = [];
  for (let k = 0; k < m; k++) {
    if (k === index || k === (index + 1) % m) continue;
    rest.push(k === (index - 1 + m) % m ? merged : runs[k]);
  }
  for (let guard = 0; guard < 50; guard++) {
    const j = rest.findIndex((r, k) => r.along === rest[(k + 1) % rest.length].along);
    if (j < 0 || rest.length <= 4) break;
    const a = rest[j];
    const b = rest[(j + 1) % rest.length];
    const ww = a.len + b.len || 1;
    const mm: Run = { along: a.along, pos: (a.pos * a.len + b.pos * b.len) / ww, len: a.len + b.len };
    rest = rest.filter((_, k) => k !== j && k !== (j + 1) % rest.length);
    rest.splice(Math.min(j, rest.length), 0, mm);
  }
  if (rest.length < 4 || rest.length % 2) return null;
  const pts = rest.map((r, k) => {
    const nx = rest[(k + 1) % rest.length];
    return r.along === "u" ? fromUV(nx.pos, r.pos) : fromUV(r.pos, nx.pos);
  });
  return ringAreaM2(pts) > 4 ? pts : null;
}
