import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { GeoTiffRaster } from "@/utils/geotiff";
import { checkInteriorLine, interiorEdges, type LineCheck } from "@/lib/designer/roofLineCheck";

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

  for (let pass = 0; pass < 2; pass++) {
    const moves = new Map<string, { x: number; y: number; n: number }>();
    for (const [a, b] of interiorEdges(current, outlines)) {
      const c = checkInteriorLine(a, b, luma, { toleranceM });
      if (c.offsetM === null || Math.abs(c.offsetM) <= toleranceM || Math.abs(c.offsetM) > maxShiftM) continue;
      const pa = toXY(a);
      const pb = toXY(b);
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      // Same normal convention as checkInteriorLine (left of a→b).
      const nx = -(pb.y - pa.y) / len;
      const ny = (pb.x - pa.x) / len;
      for (const p of [a, b]) {
        const k = key(p);
        const m = moves.get(k) ?? { x: 0, y: 0, n: 0 };
        moves.set(k, { x: m.x + c.offsetM * nx, y: m.y + c.offsetM * ny, n: m.n + 1 });
      }
      moved.add([key(a), key(b)].sort().join("|"));
    }
    if (moves.size === 0) break;
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
  }

  const checks = interiorEdges(current, outlines).map(([a, b]) => {
    const c = checkInteriorLine(a, b, luma, { toleranceM });
    return c;
  });
  return { faces: current, checks, moved: moved.size };
}
