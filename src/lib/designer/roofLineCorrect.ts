import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { GeoTiffRaster } from "@/utils/geotiff";
import { checkInteriorLine, interiorEdges, type LineCheck } from "@/lib/designer/roofLineCheck";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";

/**
 * Roof-line correction, after the faces are found:
 *  1. Face corners near the roof outline are put exactly on it (onto an
 *     outline corner, or onto the nearest eave), so faces share the eaves
 *     instead of stopping short of them.
 *  2. Every hip, ridge and valley is checked against the zoomed image. A line
 *     whose edge in the image sits further off than the ±100 mm tolerance
 *     (but within `maxShiftM`) is moved onto it; corners shared by several
 *     lines move by the average. Then step 1 runs again so eave ends stay on
 *     the eaves, and every line is checked once more.
 */

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

const M_PER_LAT = 111320;

function frame(points: LatLng[]) {
  const refLat = points.reduce((s, p) => s + p.lat, 0) / Math.max(points.length, 1);
  const mLng = M_PER_LAT * Math.cos((refLat * Math.PI) / 180);
  return {
    toXY: (p: LatLng): XY => ({ x: p.lng * mLng, y: p.lat * M_PER_LAT }),
    toLL: (p: XY): LatLng => ({ lat: p.y / M_PER_LAT, lng: p.x / mLng }),
  };
}

function projectOnSegment(p: XY, a: XY, b: XY): { q: XY; d: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  const q = { x: a.x + t * dx, y: a.y + t * dy };
  return { q, d: Math.hypot(p.x - q.x, p.y - q.y) };
}

/** Put face corners within `tolM` of the outline exactly onto it. */
export function snapFacesToOutline<F extends { ring: LatLng[] }>(
  faces: F[],
  outlines: LatLng[][],
  tolM = 0.7,
): F[] {
  const all = [...outlines.flat(), ...faces.flatMap((f) => f.ring)];
  if (all.length === 0) return faces;
  const { toXY, toLL } = frame(all);
  const corners = outlines.flat().map(toXY);
  const segs = outlines.flatMap((r) => r.map((p, i) => [toXY(p), toXY(r[(i + 1) % r.length])] as [XY, XY]));
  const cornerTol = Math.min(tolM, 0.5);
  return faces.map((f) => ({
    ...f,
    ring: f.ring.map((p) => {
      const xy = toXY(p);
      let best: XY | null = null;
      let bestD = Infinity;
      for (const c of corners) {
        const d = Math.hypot(c.x - xy.x, c.y - xy.y);
        if (d < bestD && d <= cornerTol) {
          bestD = d;
          best = c;
        }
      }
      if (!best) {
        for (const [a, b] of segs) {
          const { q, d } = projectOnSegment(xy, a, b);
          if (d < bestD && d <= tolM) {
            bestD = d;
            best = q;
          }
        }
      }
      return best ? toLL(best) : p;
    }),
  }));
}

export type CorrectedRoofLines<F> = {
  faces: F[];
  /** Hips, ridges and valleys after correction, each with its check. */
  checks: LineCheck[];
  /** How many lines were moved onto the image edge. */
  moved: number;
};

export function correctInteriorLines<F extends { ring: LatLng[] }>(
  faces: F[],
  outlines: LatLng[][],
  luma: GeoTiffRaster | null,
  {
    toleranceM = DESIGN_RULES.roofLineToleranceM,
    maxShiftM = 0.6,
  }: { toleranceM?: number; maxShiftM?: number } = {},
): CorrectedRoofLines<F> {
  let current = snapFacesToOutline(faces, outlines);
  const all = [...outlines.flat(), ...current.flatMap((f) => f.ring)];
  if (!luma || all.length === 0) {
    return {
      faces: current,
      checks: interiorEdges(current, outlines).map(([a, b]) => checkInteriorLine(a, b, luma, { toleranceM })),
      moved: 0,
    };
  }
  const { toXY, toLL } = frame(all);
  const key = (p: LatLng) => {
    const q = toXY(p);
    return `${q.x.toFixed(2)},${q.y.toFixed(2)}`;
  };
  const moved = new Set<string>();

  for (let pass = 0; pass < 3; pass++) {
    const moves = new Map<string, { x: number; y: number; n: number }>();
    for (const [a, b] of interiorEdges(current, outlines)) {
      const pa = toXY(a);
      const pb = toXY(b);
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const c = checkInteriorLine(a, b, luma, { toleranceM });
      const offset = c.offsetM;
      if (offset === null || Math.abs(offset) <= toleranceM || Math.abs(offset) > maxShiftM) continue;
      // Same normal convention as checkInteriorLine (left of a→b).
      const nx = -(pb.y - pa.y) / len;
      const ny = (pb.x - pa.x) / len;
      for (const p of [a, b]) {
        const k = key(p);
        const m = moves.get(k) ?? { x: 0, y: 0, n: 0 };
        moves.set(k, { x: m.x + offset * nx, y: m.y + offset * ny, n: m.n + 1 });
      }
      moved.add([key(a), key(b)].sort().join("|"));
    }
    if (moves.size === 0) break;
    const before = current;
    current = current.map((f) => ({
      ...f,
      ring: f.ring.map((p) => {
        const m = moves.get(key(p));
        if (!m) return p;
        const q = toXY(p);
        return toLL({ x: q.x + m.x / m.n, y: q.y + m.y / m.n });
      }),
    }));
    // Eave ends of hips and valleys stay on the eaves.
    current = snapFacesToOutline(current, outlines, 0.8);
    // Face rule guard: a correction that folds a face or makes faces
    // overlap is undone — panels must never end up across a roof line.
    if (!facesValid(current.map((f) => f.ring.map(toXY)), outlines.map((r) => r.map(toXY)))) {
      current = before;
      break;
    }
  }

  const checks = interiorEdges(current, outlines).map(([a, b]) => {
    const c = checkInteriorLine(a, b, luma, { toleranceM });
    return c;
  });
  return { faces: current, checks, moved: moved.size };
}

/**
 * Faces traced from the height model are coarse (0.5 m cells) and leave gaps
 * between them and the eaves. On the high-resolution roof mask, every roof
 * pixel goes to the nearest face, so the faces tile the whole roof with no
 * gaps; each is then traced, and all are straightened together with the
 * outline (one set of shared corners, lines at 0/45/90° to the main walls).
 * Faces keep their own properties (pitch, slope direction).
 */
export function fillFacesOnMask<F extends { ring: LatLng[] }>(
  faces: F[],
  mask: GeoTiffRaster,
  outline: LatLng[],
  metresPerPixel: number,
  regularize: (rings: LatLng[][]) => LatLng[][],
  trace: (bin: Uint8Array) => LatLng[] | null,
): F[] {
  const W = mask.width;
  const H = mask.height;
  const b = mask.bounds;
  if (faces.length === 0) return faces;
  const label = new Int32Array(W * H).fill(-1);
  const lngOf = (c: number) => b.west + ((c + 0.5) / W) * (b.east - b.west);
  const latOf = (r: number) => b.north + ((r + 0.5) / H) * (b.south - b.north);
  const inRing = (lat: number, lng: number, ring: LatLng[]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p = ring[i];
      const q = ring[j];
      if (p.lat > lat !== q.lat > lat && lng < ((q.lng - p.lng) * (lat - p.lat)) / (q.lat - p.lat) + p.lng) inside = !inside;
    }
    return inside;
  };
  // Seed: pixels inside each face (shrunk a little so neighbours don't overlap).
  const queue: number[] = [];
  faces.forEach((f, k) => {
    const lats = f.ring.map((p) => p.lat);
    const lngs = f.ring.map((p) => p.lng);
    const r0 = Math.max(0, Math.floor(((b.north - Math.max(...lats)) / (b.north - b.south)) * H));
    const r1 = Math.min(H - 1, Math.ceil(((b.north - Math.min(...lats)) / (b.north - b.south)) * H));
    const c0 = Math.max(0, Math.floor(((Math.min(...lngs) - b.west) / (b.east - b.west)) * W));
    const c1 = Math.min(W - 1, Math.ceil(((Math.max(...lngs) - b.west) / (b.east - b.west)) * W));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * W + c;
        if (!mask.data[i] || label[i] >= 0) continue;
        if (inRing(latOf(r), lngOf(c), f.ring)) {
          label[i] = k;
          queue.push(i);
        }
      }
    }
  });
  if (queue.length === 0) return faces;
  // Grow every face outwards over the roof until the roof is covered.
  for (let h = 0; h < queue.length; h++) {
    const i = queue[h];
    const r = (i / W) | 0;
    const c = i - r * W;
    const nb = [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1];
    for (const j of nb) {
      if (j >= 0 && mask.data[j] && label[j] < 0) {
        label[j] = label[i];
        queue.push(j);
      }
    }
  }
  // Labels can come out in separate pieces; each piece is traced on its own.
  const cut = new Uint8Array(W * H);

  const minPx = 1 / (metresPerPixel * metresPerPixel); // 1 m²
  const traced: { k: number; ring: LatLng[] }[] = [];
  const seen = new Uint8Array(W * H);
  faces.forEach((_, k) => {
    // Each face, split into its parts between the image lines.
    for (let i0 = 0; i0 < W * H; i0++) {
      if (label[i0] !== k || cut[i0] || seen[i0]) continue;
      const bin = new Uint8Array(W * H);
      let n = 0;
      const stack = [i0];
      seen[i0] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        bin[i] = 1;
        n++;
        const r = (i / W) | 0;
        const c = i - r * W;
        const nb = [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1];
        for (const j of nb) {
          if (j >= 0 && !seen[j] && label[j] === k && !cut[j]) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
      if (n < minPx) continue;
      const ring = trace(bin);
      if (ring && ring.length >= 3) traced.push({ k, ring });
    }
  });
  if (traced.length === 0) return faces;
  const straight = regularize([outline, ...traced.map((t) => t.ring)]).slice(1);
  const out = traced.map((t, i) => ({ ...faces[t.k], ring: straight[i] }));
  return snapFacesToOutline(out, [outline], 0.3).map((f) => {
    const eaveDeg = eaveAlongOutline(f.ring, outline);
    return eaveDeg === null ? f : { ...f, eaveDeg };
  });
}

/**
 * Row direction of a face: the outline edge (eave) it runs along the most.
 * On a hip roof that is always the face's own eave, whatever the coarse
 * height model says about its slope direction.
 */
export function eaveAlongOutline(ring: LatLng[], outline: LatLng[], tolM = 0.3): number | null {
  if (ring.length < 3 || outline.length < 3) return null;
  const { toXY } = frame([...ring, ...outline]);
  const fp = ring.map(toXY);
  const op = outline.map(toXY);
  let bestLen = 0;
  let best: number | null = null;
  for (let i = 0; i < fp.length; i++) {
    const p = fp[i];
    const q = fp[(i + 1) % fp.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len <= bestLen) continue;
    const onOutline = op.some((u, j) => {
      const v = op[(j + 1) % op.length];
      return projectOnSegment(p, u, v).d <= tolM && projectOnSegment(q, u, v).d <= tolM;
    });
    if (onOutline) {
      bestLen = len;
      best = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    }
  }
  return best;
}

function ringArea(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

function ringSimple(r: XY[]): boolean {
  const n = r.length;
  const cross = (a: XY, b: XY, c: XY) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = r[i], b = r[(i + 1) % n], c = r[j], d = r[(j + 1) % n];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return false;
    }
  }
  return true;
}

/** Every face a simple shape, and together no bigger than the roof (no overlaps). */
function facesValid(faces: XY[][], outlines: XY[][]): boolean {
  if (!faces.every((f) => f.length >= 3 && ringSimple(f) && Math.abs(ringArea(f)) > 0.05)) return false;
  const total = faces.reduce((s, f) => s + Math.abs(ringArea(f)), 0);
  const roof = outlines.reduce((s, o) => s + Math.abs(ringArea(o)), 0);
  return roof <= 0 || total <= roof * 1.03;
}

/**
 * Fill height-model faces out to each saved roof outline, on the zoomed
 * image's pixel grid (~3 cm): faces tile the whole roof with no gaps, rows
 * follow each face's eave, and lines are straightened with the outline.
 */
export function fillFacesOnRoofs<F extends { ring: LatLng[] }>(
  faces: F[],
  roofs: LatLng[][],
  grid: GeoTiffRaster,
  metresPerPixel: number,
): F[] {
  const W = grid.width;
  const H = grid.height;
  const b = grid.bounds;
  const inRing = (lat: number, lng: number, ring: LatLng[]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p = ring[i];
      const q = ring[j];
      if (p.lat > lat !== q.lat > lat && lng < ((q.lng - p.lng) * (lat - p.lat)) / (q.lat - p.lat) + p.lng) inside = !inside;
    }
    return inside;
  };
  const centroid = (ring: LatLng[]) => ({
    lat: ring.reduce((s, p) => s + p.lat, 0) / ring.length,
    lng: ring.reduce((s, p) => s + p.lng, 0) / ring.length,
  });
  const out: F[] = [];
  const used = new Set<number>();
  for (const roof of roofs) {
    if (roof.length < 3) continue;
    const mine = faces
      .map((f, i) => ({ f, i }))
      .filter(({ f, i }) => !used.has(i) && f.ring.length >= 3 && inRing(centroid(f.ring).lat, centroid(f.ring).lng, roof));
    if (mine.length === 0) continue;
    mine.forEach(({ i }) => used.add(i));
    // This roof's outline, rasterised on the zoomed grid.
    const data = new Uint8Array(W * H);
    let any = 0;
    for (let r = 0; r < H; r++) {
      const lat = b.north + ((r + 0.5) / H) * (b.south - b.north);
      for (let c = 0; c < W; c++) {
        const lng = b.west + ((c + 0.5) / W) * (b.east - b.west);
        if (inRing(lat, lng, roof)) {
          data[r * W + c] = 1;
          any++;
        }
      }
    }
    if (any === 0) {
      out.push(...mine.map(({ f }) => f));
      continue;
    }
    const mask: GeoTiffRaster = { data, width: W, height: H, bounds: b, noDataValue: null };
    const simplifyPx = Math.max(1, 0.12 / metresPerPixel);
    out.push(
      ...fillFacesOnMask(
        mine.map(({ f }) => f),
        mask,
        roof,
        metresPerPixel,
        (rings) => regularizeRoofOutlines(rings),
        (bin) => extractRoofOutlinesFromMask({ ...mask, data: bin }, { simplifyPx })[0]?.ring ?? null,
      ),
    );
  }
  faces.forEach((f, i) => {
    if (!used.has(i)) out.push(f);
  });
  return out;
}
