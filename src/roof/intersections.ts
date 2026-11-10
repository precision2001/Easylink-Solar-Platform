import { decodePng, type Rgba } from "./overlay.js";
import type { RoofBuilding } from "./faces.js";
import { movePoints } from "./refine.js";

/**
 * THE INTERSECTION RULE (owner, 10 Nov 2026 — the first rule of every roof):
 * corners are calculated, never placed by eye.
 *
 * 1. Each line that meets at a point is measured every 6 px along its clear
 *    length, away from the blurred corners (the middle 70% of it).
 *    - An eave is searched from inside the tiles outwards, so the shadow
 *      beside the house isn't counted as roof; the gutter's thin line is
 *      skipped: the edge is where the tiles end (the last tile pixel).
 *    - A hip, ridge or valley is where the two faces' brightness changes most.
 * 2. A straight line is fitted through the measurements; they must spread no
 *    more than ±100 mm about it (one round of dropping outliers allowed).
 * 3. Each point is where its fitted lines cross (then checked on a close-up).
 * 4. A line that can't be measured keeps the trace's line and is marked for a
 *    site check ("faint"); a point with no measured lines stays and is marked.
 */

export type LineFit = { from: string; to: string; ok: boolean; samples: number; spreadM: number | null; p: [number, number] | null; u: [number, number] | null };
export type IntersectionReport = { lines: LineFit[]; placed: number; marked: number };

const EAVE_KINDS = new Set(["eave", "edge", "border", "parapet", "step", "box", "gable"]);

function lumaOf(img: Rgba): Float32Array {
  const l = new Float32Array(img.width * img.height);
  for (let i = 0; i < l.length; i++) l[i] = 0.299 * img.data[i * 4]! + 0.587 * img.data[i * 4 + 1]! + 0.114 * img.data[i * 4 + 2]!;
  return l;
}

/** Brightness at (x, y), averaged 3 px along `u` (smooths tile texture), bilinear. */
function at(l: Float32Array, W: number, H: number, x: number, y: number, u: [number, number]): number {
  let s = 0;
  for (const k of [-1.5, 0, 1.5]) {
    const X = x + u[0] * k, Y = y + u[1] * k;
    if (X < 0 || Y < 0 || X > W - 2 || Y > H - 2) return Number.NaN;
    const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0;
    const v = (l[y0 * W + x0]! * (1 - fx) + l[y0 * W + x0 + 1]! * fx) * (1 - fy) + (l[(y0 + 1) * W + x0]! * (1 - fx) + l[(y0 + 1) * W + x0 + 1]! * fx) * fy;
    s += v;
  }
  return s / 3;
}

/** Total least squares line through points: centre and direction, plus the largest distance from it. */
function fitLine(pts: [number, number][]): { c: [number, number]; u: [number, number]; spread: number; res: number[] } {
  const n = pts.length;
  const c: [number, number] = [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - c[0]) ** 2; syy += (y - c[1]) ** 2; sxy += (x - c[0]) * (y - c[1]); }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u: [number, number] = [Math.cos(th), Math.sin(th)];
  const res = pts.map(([x, y]) => -(x - c[0]) * u[1] + (y - c[1]) * u[0]);
  return { c, u, spread: Math.max(...res.map(Math.abs)), res };
}

const centroid = (r: [number, number][]) => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length] as [number, number];

/**
 * Measures every line, fits it, and re-places every point where its fitted
 * lines cross. `mpp` is metres per pixel. Lines and points that can't be
 * measured are marked for a site check. Returns what was done.
 */
export function placeIntersections(photoPng: Buffer, buildings: RoofBuilding[], mpp: number, opts: { searchM?: number; tolM?: number; maxMoveM?: number } = {}): IntersectionReport {
  const report: IntersectionReport = { lines: [], placed: 0, marked: 0 };
  const img = decodePng(photoPng);
  if (!img || !(mpp > 0)) return report;
  const L = lumaOf(img);
  const W = img.width, H = img.height;
  const search = Math.max(4, (opts.searchM ?? 0.6) / mpp); // how far either side of the traced line
  const tol = (opts.tolM ?? 0.1) / mpp; // ±100 mm
  const maxMove = (opts.maxMoveM ?? 1.0) / mpp;
  const step = Math.max(5, Math.min(10, Math.round(0.2 / mpp))); // 5-10 px
  const moves = new Map<string, [number, number]>();

  buildings.forEach((b, bi) => {
    const at0 = new Map(b.points.map((p) => [p.id, [p.x, p.y] as [number, number]]));
    const fits = new Map<string, { c: [number, number]; u: [number, number] }>();
    for (const ln of b.lines) {
      const a = at0.get(ln.from), c = at0.get(ln.to);
      if (!a || !c) continue;
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const fit: LineFit = { from: ln.from, to: ln.to, ok: false, samples: 0, spreadM: null, p: null, u: null };
      report.lines.push(fit);
      if (len < 4 * step) continue;
      const u: [number, number] = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
      let n: [number, number] = [-u[1], u[0]];
      const eave = EAVE_KINDS.has(ln.kind) || isOnBorder(b, a, c);
      if (eave) {
        // n points into the roof: towards the centre of a face that has this line.
        const face = b.faces.find((f) => near(f.ring, a) && near(f.ring, c));
        const inside = face ? centroid(face.ring) : b.outline.length >= 3 ? centroid(b.outline) : null;
        const mid: [number, number] = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
        if (inside && (inside[0] - mid[0]) * n[0] + (inside[1] - mid[1]) * n[1] < 0) n = [-n[0], -n[1]];
      }
      const pts: [number, number][] = [];
      for (let s = 0.15 * len; s <= 0.85 * len; s += step) {
        const x = a[0] + u[0] * s, y = a[1] + u[1] * s;
        const off = eave ? eaveOffset(L, W, H, x, y, n, u, search) : creaseOffset(L, W, H, x, y, n, u, search);
        if (off === null) continue;
        pts.push([x + n[0] * off, y + n[1] * off]);
      }
      fit.samples = pts.length;
      if (pts.length < 4) continue;
      let f = fitLine(pts);
      if (f.spread > tol) {
        // one round: drop measurements further than the tolerance, refit
        const keep = pts.filter((_, i) => Math.abs(f.res[i]!) <= tol);
        if (keep.length >= Math.max(4, pts.length * 0.6)) f = fitLine(keep);
      }
      fit.spreadM = +(f.spread * mpp).toFixed(3);
      if (f.spread > tol) continue;
      // the fitted line must still be the traced line (same direction within 10°)
      if (Math.abs(f.u[0] * u[0] + f.u[1] * u[1]) < Math.cos((10 * Math.PI) / 180)) continue;
      fit.ok = true;
      fit.p = f.c;
      fit.u = f.u;
      fits.set(`${ln.from}|${ln.to}`, { c: f.c, u: f.u });
    }
    // 3. each point where its fitted lines cross
    for (const p of b.points) {
      const mine = b.lines.filter((l) => l.from === p.id || l.to === p.id).map((l) => fits.get(`${l.from}|${l.to}`)).filter((x): x is { c: [number, number]; u: [number, number] } => Boolean(x));
      let q: [number, number] | null = null;
      if (mine.length >= 2) {
        // least squares crossing of all fitted lines through the point (normals n_i, n_i·q = n_i·c_i)
        let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0, spread = 0;
        for (const m of mine) {
          const nx = -m.u[1], ny = m.u[0];
          a11 += nx * nx; a12 += nx * ny; a22 += ny * ny;
          const d = nx * m.c[0] + ny * m.c[1];
          b1 += nx * d; b2 += ny * d;
        }
        for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) spread = Math.max(spread, 1 - Math.abs(mine[i]!.u[0] * mine[j]!.u[0] + mine[i]!.u[1] * mine[j]!.u[1]));
        const det = a11 * a22 - a12 * a12;
        if (spread > 0.03 && Math.abs(det) > 1e-6) q = [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det];
      }
      if (!q && mine.length >= 1) {
        // one measured line (or parallel ones): onto it, along it where the trace had it
        const m = mine[0]!;
        const t = (p.x - m.c[0]) * m.u[0] + (p.y - m.c[1]) * m.u[1];
        q = [m.c[0] + m.u[0] * t, m.c[1] + m.u[1] * t];
      }
      if (q && Math.hypot(q[0] - p.x, q[1] - p.y) <= maxMove) {
        moves.set(`${bi}|${p.id}`, q);
        report.placed++;
      } else {
        // 4. can't be calculated: stays, its lines are marked for a site check
        for (const l of b.lines) if (l.from === p.id || l.to === p.id) l.seen = "faint";
        report.marked++;
      }
    }
    // unmeasured lines: site check
    for (const l of b.lines) if (!fits.has(`${l.from}|${l.to}`)) l.seen = "faint";
  });
  movePoints(buildings, moves);
  return report;
}

function near(ring: [number, number][], p: [number, number]) {
  return ring.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) <= 2);
}

function isOnBorder(b: RoofBuilding, a: [number, number], c: [number, number]): boolean {
  const r = b.outline;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!, q = r[(i + 1) % r.length]!;
    if ((near([p], a) && near([q], c)) || (near([p], c) && near([q], a))) return true;
  }
  return false;
}

/**
 * Where the tiles end, walking from inside the roof outwards along `n`
 * (returns the offset from (x, y), positive towards the inside). The tile
 * brightness is read well inside; the edge is the last pixel still within the
 * tiles' range before the brightness leaves it for good (2 px running), so a
 * gutter line or the shadow outside never counts. Null when the profile has
 * no clear edge.
 */
function eaveOffset(L: Float32Array, W: number, H: number, x: number, y: number, n: [number, number], u: [number, number], search: number): number | null {
  const prof: number[] = [];
  for (let d = search; d >= -search; d -= 1) prof.push(at(L, W, H, x + n[0] * d, y + n[1] * d, u));
  if (prof.some(Number.isNaN)) return null;
  const inner = prof.slice(0, Math.max(3, Math.round(prof.length * 0.3))).sort((p, q) => p - q);
  const tile = inner[Math.floor(inner.length / 2)]!;
  const spreadIn = inner[inner.length - 1]! - inner[0]!;
  const T = Math.max(22, 0.22 * tile, spreadIn * 0.8);
  for (let i = Math.round(prof.length * 0.3); i < prof.length - 2; i++) {
    if (Math.abs(prof[i]! - tile) > T && Math.abs(prof[i + 1]! - tile) > T) {
      return search - (i - 1); // the last tile pixel
    }
  }
  return null;
}

/** A hip, ridge or valley: where the brightness steps most across it (offset along `n`). */
function creaseOffset(L: Float32Array, W: number, H: number, x: number, y: number, n: [number, number], u: [number, number], search: number): number | null {
  let best = { d: 0, g: 0 };
  for (let d = -search; d <= search; d += 1) {
    const p = at(L, W, H, x + n[0] * (d + 2), y + n[1] * (d + 2), u);
    const q = at(L, W, H, x + n[0] * (d - 2), y + n[1] * (d - 2), u);
    if (Number.isNaN(p) || Number.isNaN(q)) return null;
    const g = Math.abs(p - q);
    if (g > best.g) best = { d, g };
  }
  return best.g >= 12 ? best.d : null;
}
