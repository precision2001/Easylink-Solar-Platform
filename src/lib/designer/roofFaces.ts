import { longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";

/**
 * Face rule: panels sit inside one roof face and never cross a roof line.
 *
 * A traced roof outline is the eave line seen from above. On a hip roof with
 * equal pitches every eave edge rises to its own face, and the faces meet at
 * hips (45° from the corners), valleys and a ridge. This splits an outline
 * into those faces so the packer can lay each one separately — the 100 mm
 * setback then applies to hips, valleys and ridges as well as the eaves.
 *
 *  - Square-cornered outlines (after the roof-line rule) are split into
 *    rectangles; each rectangle becomes a hip roof — two long faces meeting
 *    at a ridge and a triangle at each end. Where rectangles meet, panels are
 *    kept off the junction rather than allowed across it.
 *  - Other convex outlines: each eave gets the part of the roof closer to its
 *    line than to any other eave — exactly where the hips fall.
 *  - Anything else is left as one face.
 */

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

export type RoofFace = {
  ring: LatLng[];
  /** Direction of this face's eave (degrees from east, counter-clockwise) — rows run along it. */
  eaveDeg: number;
  /** Index of the drawn roof this face came from. */
  roofIndex: number;
};

const M_PER_LAT = 111320;
const AXIS_TOL_M = 0.05;

function area(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

function isConvex(r: XY[]): boolean {
  let sign = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    const c = r[(i + 2) % r.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Clip a ring to the half-plane a·x + b·y <= c (Sutherland–Hodgman). */
function clipHalfPlane(ring: XY[], a: number, b: number, c: number): XY[] {
  const out: XY[] = [];
  const f = (p: XY) => a * p.x + b * p.y - c;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const fp = f(p);
    const fq = f(q);
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq);
      out.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
    }
  }
  return out;
}

/** Hip-roof faces of an axis-aligned rectangle; eave angles in the rotated frame (0 = along x). */
function hipFaces(x0: number, y0: number, x1: number, y1: number): { ring: XY[]; eave: number }[] {
  const w = x1 - x0;
  const h = y1 - y0;
  if (w >= h) {
    const half = h / 2;
    const ym = y0 + half;
    return [
      { ring: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1 - half, y: ym }, { x: x0 + half, y: ym }], eave: 0 },
      { ring: [{ x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0 + half, y: ym }, { x: x1 - half, y: ym }], eave: 0 },
      { ring: [{ x: x0, y: y1 }, { x: x0, y: y0 }, { x: x0 + half, y: ym }], eave: 90 },
      { ring: [{ x: x1, y: y0 }, { x: x1, y: y1 }, { x: x1 - half, y: ym }], eave: 90 },
    ].filter((f) => Math.abs(area(f.ring)) > 1e-6);
  }
  const half = w / 2;
  const xm = x0 + half;
  return [
    { ring: [{ x: x0, y: y1 }, { x: x0, y: y0 }, { x: xm, y: y0 + half }, { x: xm, y: y1 - half }], eave: 90 },
    { ring: [{ x: x1, y: y0 }, { x: x1, y: y1 }, { x: xm, y: y1 - half }, { x: xm, y: y0 + half }], eave: 90 },
    { ring: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: xm, y: y0 + half }], eave: 0 },
    { ring: [{ x: x1, y: y1 }, { x: x0, y: y1 }, { x: xm, y: y1 - half }], eave: 0 },
  ].filter((f) => Math.abs(area(f.ring)) > 1e-6);
}

function pointInRing(p: XY, r: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i].y > p.y !== r[j].y > p.y && p.x < ((r[j].x - r[i].x) * (p.y - r[i].y)) / (r[j].y - r[i].y) + r[i].x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Split a square-cornered ring (in the axis frame) into rectangles, largest first. */
function rectangles(ring: XY[]): [number, number, number, number][] | null {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (Math.abs(a.x - b.x) > AXIS_TOL_M && Math.abs(a.y - b.y) > AXIS_TOL_M) return null;
  }
  const uniq = (v: number[]) =>
    v.sort((p, q) => p - q).filter((x, i, arr) => i === 0 || x - arr[i - 1] > AXIS_TOL_M);
  const xs = uniq(ring.map((p) => p.x));
  const ys = uniq(ring.map((p) => p.y));
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  if (nx < 1 || ny < 1 || nx * ny > 400) return null;
  const inside: boolean[][] = [];
  for (let i = 0; i < nx; i++) {
    inside.push([]);
    for (let j = 0; j < ny; j++) {
      inside[i].push(pointInRing({ x: (xs[i] + xs[i + 1]) / 2, y: (ys[j] + ys[j + 1]) / 2 }, ring));
    }
  }
  const rects: [number, number, number, number][] = [];
  for (;;) {
    let best: [number, number, number, number] | null = null;
    let bestArea = 0;
    for (let i0 = 0; i0 < nx; i0++) {
      for (let j0 = 0; j0 < ny; j0++) {
        if (!inside[i0][j0]) continue;
        for (let i1 = i0; i1 < nx && inside[i1][j0]; i1++) {
          let j1 = j0;
          for (;;) {
            let ok = true;
            for (let i = i0; i <= i1; i++) if (!inside[i][j1]) ok = false;
            if (!ok) break;
            const a = (xs[i1 + 1] - xs[i0]) * (ys[j1 + 1] - ys[j0]);
            if (a > bestArea) {
              bestArea = a;
              best = [i0, j0, i1, j1];
            }
            if (j1 + 1 >= ny) break;
            j1++;
          }
        }
      }
    }
    if (!best) break;
    const [i0, j0, i1, j1] = best;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) inside[i][j] = false;
    rects.push([xs[i0], ys[j0], xs[i1 + 1], ys[j1 + 1]]);
  }
  return rects;
}

export function splitRoofIntoFaces(
  ring: LatLng[],
  roofIndex = 0,
  mainAxisDeg?: number,
): RoofFace[] {
  if (ring.length < 3) return [];
  const refLat = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const mLng = M_PER_LAT * Math.cos((refLat * Math.PI) / 180);
  const axisDeg = mainAxisDeg ?? longestEdgeAngleDegrees(ring);
  const t = (axisDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  // Axis frame: x along the main walls.
  const toAxis = (p: LatLng): XY => {
    const x = p.lng * mLng;
    const y = p.lat * M_PER_LAT;
    return { x: x * cos + y * sin, y: -x * sin + y * cos };
  };
  const fromAxis = (p: XY): LatLng => {
    const x = p.x * cos - p.y * sin;
    const y = p.x * sin + p.y * cos;
    return { lat: y / M_PER_LAT, lng: x / mLng };
  };
  const r = ring.map(toAxis);
  const whole: RoofFace[] = [{ ring, eaveDeg: axisDeg, roofIndex }];

  const rects = rectangles(r);
  if (rects && rects.length > 0) {
    return rects.flatMap(([x0, y0, x1, y1]) =>
      hipFaces(x0, y0, x1, y1).map((f) => ({
        ring: f.ring.map(fromAxis),
        eaveDeg: axisDeg + f.eave,
        roofIndex,
      })),
    );
  }

  if (isConvex(r)) {
    // Orient counter-clockwise so every edge's inward normal is to its left.
    const ccw = area(r) > 0 ? r : [...r].reverse();
    const n = ccw.length;
    const lines = ccw.map((p, i) => {
      const q = ccw[(i + 1) % n];
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      const nx = -(q.y - p.y) / len;
      const ny = (q.x - p.x) / len;
      // Inward distance of a point: nx·x + ny·y - c.
      return { nx, ny, c: nx * p.x + ny * p.y, angle: Math.atan2(q.y - p.y, q.x - p.x), len };
    });
    const faces: RoofFace[] = [];
    lines.forEach((li, i) => {
      if (li.len < 1e-6) return;
      let face = ccw;
      lines.forEach((lj, j) => {
        if (i === j || lj.len < 1e-6 || face.length < 3) return;
        // Keep points at least as close to edge i's line as to edge j's.
        face = clipHalfPlane(face, li.nx - lj.nx, li.ny - lj.ny, li.c - lj.c);
      });
      if (face.length >= 3 && Math.abs(area(face)) > 1e-6) {
        faces.push({
          ring: face.map(fromAxis),
          eaveDeg: axisDeg + (li.angle * 180) / Math.PI,
          roofIndex,
        });
      }
    });
    return faces.length > 0 ? faces : whole;
  }

  return whole;
}

/** Faces for every drawn roof, all sharing the largest roof's main-wall direction. */
export function splitRoofsIntoFaces(roofs: LatLng[][]): RoofFace[] {
  if (roofs.length === 0) return [];
  const areas = roofs.map((ring) => {
    if (ring.length < 3) return 0;
    const refLat = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
    const mLng = M_PER_LAT * Math.cos((refLat * Math.PI) / 180);
    return Math.abs(area(ring.map((p) => ({ x: p.lng * mLng, y: p.lat * M_PER_LAT }))));
  });
  const main = longestEdgeAngleDegrees(roofs[areas.indexOf(Math.max(...areas))]);
  return roofs.flatMap((ring, i) => splitRoofIntoFaces(ring, i, main));
}
