/**
 * Visible-line rule for flat and low-pitch roofs (owner, 9 Nov 2026, 66
 * Frances St, Lidcombe: "if there is no visible roof line connecting two
 * intersection points do not consider a split. Roof can be flat too.").
 *
 * On a roof flatter than DESIGN_RULES.flatRoofMaxPitchDeg, a line between
 * two faces stays only where the image shows it — a brightness step or a
 * capping line clearly stronger than the roof beside it. Faces either side
 * of a line the image doesn't show are one face; a roof with no visible
 * lines is one flat face (its outline).
 *
 * Pitched roofs keep their hips, valleys and ridges even where the image
 * shows them faintly (two faces lit alike can hide a hip: g25 in the checks),
 * because a panel must never sit across one.
 */
import type { GeoTiffRaster } from "@/utils/geotiff";
import { frameOf, lineResponse, sampler } from "./junctions";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

/** A line counts as seen when its response is at least this, and this many times the roof beside it. */
export const VISIBLE_LINE = { minResponse: 8, minRatio: 2 };

export function lineVisible(at: (q: XY) => number | null, a: XY, b: XY): boolean {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 0.3) return false;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  // Narrow and wide (a capping strip or a step's shadow is 15–30 cm wide).
  const resp = (p: XY, q: XY) => Math.max(lineResponse(at, p, q, 0.06), lineResponse(at, p, q, 0.18));
  const r = resp(a, b);
  const bg = [-1.0, -0.6, 0.6, 1.0]
    .map((o) => resp({ x: a.x + o * n.x, y: a.y + o * n.y }, { x: b.x + o * n.x, y: b.y + o * n.y }))
    .sort((x, y) => x - y);
  const med = (bg[1] + bg[2]) / 2;
  return r >= VISIBLE_LINE.minResponse && r >= VISIBLE_LINE.minRatio * Math.max(med, 0.5);
}

/**
 * Faces of one roof merged across every line the image doesn't show.
 * `outline` is that roof's border; faces must share their corner points
 * (they do after fitRoofJunctions).
 */
export function mergeAcrossUnseenLines<F extends { ring: LatLng[] }>(
  faces: F[],
  outline: LatLng[],
  luma: GeoTiffRaster | null,
): { faces: F[]; merged: number } {
  if (!luma || faces.length < 2) return { faces, merged: 0 };
  const { toXY, toLL } = frameOf([...outline, ...faces.flatMap((f) => f.ring)]);
  const at = sampler(luma, toLL);
  const keyOf = (q: XY) => `${Math.round(q.x * 50)},${Math.round(q.y * 50)}`;
  const pts = new Map<string, XY>();
  const rings = faces.map((f) =>
    f.ring.map((p) => {
      const q = toXY(p);
      const k = keyOf(q);
      if (!pts.has(k)) pts.set(k, q);
      return k;
    }),
  );
  // Which faces meet along which edge.
  const edgeFaces = new Map<string, number[]>();
  const ek = (u: string, v: string) => (u < v ? `${u}|${v}` : `${v}|${u}`);
  rings.forEach((r, fi) => {
    for (let i = 0; i < r.length; i++) {
      const u = r[i];
      const v = r[(i + 1) % r.length];
      if (u === v) continue;
      const k = ek(u, v);
      edgeFaces.set(k, [...(edgeFaces.get(k) ?? []), fi]);
    }
  });
  // Union faces across shared edges the image doesn't show.
  const parent = faces.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  let merged = 0;
  for (const [k, fs] of edgeFaces) {
    if (fs.length !== 2 || fs[0] === fs[1]) continue;
    const [u, v] = k.split("|");
    if (lineVisible(at, pts.get(u)!, pts.get(v)!)) continue;
    const a = find(fs[0]);
    const b = find(fs[1]);
    if (a !== b) {
      parent[b] = a;
      merged++;
    }
  }
  if (merged === 0) return { faces, merged: 0 };

  const groups = new Map<number, number[]>();
  faces.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  const out: F[] = [];
  for (const members of groups.values()) {
    if (members.length === 1) {
      out.push(faces[members[0]]);
      continue;
    }
    const biggest = members.reduce((b, i) => (area(faces[i].ring.map(toXY)) > area(faces[b].ring.map(toXY)) ? i : b), members[0]);
    if (members.length === faces.length) {
      // Every face of the roof is one: the roof is flat (or reads as flat) — its face is its outline.
      out.push({ ...faces[biggest], ring: outline });
      continue;
    }
    const ring = boundaryOf(members.map((i) => rings[i]));
    if (!ring) {
      // Couldn't trace the merged border cleanly: keep these faces as they were.
      for (const i of members) out.push(faces[i]);
      continue;
    }
    out.push({ ...faces[biggest], ring: simplify(ring.map((k) => pts.get(k)!)).map(toLL) });
  }
  return { faces: out, merged };
}

function area(r: XY[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i].x * r[(i + 1) % r.length].y - r[(i + 1) % r.length].x * r[i].y;
  return Math.abs(s) / 2;
}

/** The outer border of a group of faces sharing edges: edges used once, chained. Null unless they make one loop. */
function boundaryOf(rings: string[][]): string[] | null {
  const count = new Map<string, number>();
  const ek = (u: string, v: string) => (u < v ? `${u}|${v}` : `${v}|${u}`);
  for (const r of rings) for (let i = 0; i < r.length; i++) if (r[i] !== r[(i + 1) % r.length]) count.set(ek(r[i], r[(i + 1) % r.length]), (count.get(ek(r[i], r[(i + 1) % r.length])) ?? 0) + 1);
  const next = new Map<string, string>();
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const u = r[i];
      const v = r[(i + 1) % r.length];
      if (u === v || count.get(ek(u, v)) !== 1) continue;
      if (next.has(u)) return null; // a point the border passes twice
      next.set(u, v);
    }
  }
  if (next.size < 3) return null;
  const start = next.keys().next().value as string;
  const loop: string[] = [start];
  for (let k = next.get(start)!; k !== start; k = next.get(k)!) {
    if (!k || loop.length > next.size) return null;
    loop.push(k);
  }
  return loop.length === next.size ? loop : null;
}

/** Drops points on a straight run (within 3 cm). */
function simplify(r: XY[]): XY[] {
  const out = r.filter((p, i) => {
    const a = r[(i - 1 + r.length) % r.length];
    const b = r[(i + 1) % r.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l < 1e-6) return false;
    return Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / l > 0.03;
  });
  return out.length >= 3 ? out : r;
}
