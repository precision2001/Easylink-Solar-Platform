/**
 * Shared lat/lng geometry for roof design. One copy, used by the Designs page,
 * the Quotes & Leads designer, the proposal drawing, the roof-design API and
 * the scripts — these helpers used to be copied into each of them.
 *
 * Planar approximations (metres per degree at the ring's latitude): accurate to
 * well under 1% at building and lot scale.
 */
import type { SolarPanel } from "@/types/solar";

export type LatLng = { lat: number; lng: number };
export type LatLngRing = LatLng[];
export type XY = { x: number; y: number };
export type LatLngBox = { sw: LatLng; ne: LatLng };
export type PanelDims = { heightM: number; widthM: number };

export const M_PER_DEG_LAT = 111_320;

export const metresPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/** Planar distance between two points, metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * M_PER_DEG_LAT;
  const dLng = (b.lng - a.lng) * metresPerDegLng(a.lat);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Point in metres (x east, y north) from an origin. */
export function toLocalXY(p: LatLng, origin: LatLng): XY {
  return { x: (p.lng - origin.lng) * metresPerDegLng(origin.lat), y: (p.lat - origin.lat) * M_PER_DEG_LAT };
}

export function fromLocalXY(p: XY, origin: LatLng): LatLng {
  return { lat: origin.lat + p.y / M_PER_DEG_LAT, lng: origin.lng + p.x / metresPerDegLng(origin.lat) };
}

export function ringCentroid(ring: LatLngRing): LatLng {
  const s = ring.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: s.lat / ring.length, lng: s.lng / ring.length };
}

/** Signed area in degrees² (positive = counter-clockwise); for orientation tests only. */
export function ringSignedArea(ring: LatLngRing): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.lng * b.lat - b.lng * a.lat;
  }
  return sum / 2;
}

/** Area of a ring in m² (shoelace on a planar metres projection). */
export function ringAreaM2(ring: LatLngRing): number {
  if (ring.length < 3) return 0;
  const avgLat = ring.reduce((s, p) => s + p.lat, 0) / ring.length;
  const mx = metresPerDegLng(avgLat);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a.lng * mx * (b.lat * M_PER_DEG_LAT) - b.lng * mx * (a.lat * M_PER_DEG_LAT);
  }
  return Math.abs(area / 2);
}

export function boxToRing(box: LatLngBox): LatLngRing {
  return [
    { lat: box.ne.lat, lng: box.sw.lng },
    { lat: box.ne.lat, lng: box.ne.lng },
    { lat: box.sw.lat, lng: box.ne.lng },
    { lat: box.sw.lat, lng: box.sw.lng },
  ];
}

export function boxCentre(box: LatLngBox): LatLng {
  return { lat: (box.ne.lat + box.sw.lat) / 2, lng: (box.ne.lng + box.sw.lng) / 2 };
}

export function boxAreaM2(box: LatLngBox): number {
  return distanceM(box.sw, { lat: box.sw.lat, lng: box.ne.lng }) * distanceM(box.sw, { lat: box.ne.lat, lng: box.sw.lng });
}

/** A small square around a point (the page's placeholder roof when nothing else is known). */
export function squareAround(centre: LatLng, offsetDeg = 0, halfDeg = 0.00008): LatLngRing {
  return [
    { lat: centre.lat - halfDeg + offsetDeg, lng: centre.lng - halfDeg + offsetDeg },
    { lat: centre.lat + halfDeg + offsetDeg, lng: centre.lng - halfDeg + offsetDeg },
    { lat: centre.lat + halfDeg + offsetDeg, lng: centre.lng + halfDeg + offsetDeg },
    { lat: centre.lat - halfDeg + offsetDeg, lng: centre.lng + halfDeg + offsetDeg },
  ];
}

/** Sutherland–Hodgman clip against one edge rule. */
function clipEdge(points: LatLng[], inside: (p: LatLng) => boolean, intersect: (a: LatLng, b: LatLng) => LatLng): LatLng[] {
  if (points.length === 0) return [];
  const out: LatLng[] = [];
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + points.length) % points.length];
    const currIn = inside(curr);
    const prevIn = inside(prev);
    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) out.push(intersect(prev, curr));
  }
  return out;
}

/** Clip a ring to an axis-aligned lat/lng box (e.g. Google's geocode bounds for a parcel). */
export function clipRingToBox(ring: LatLngRing, box: LatLngBox): LatLngRing {
  let pts: LatLng[] = ring;
  pts = clipEdge(pts, (p) => p.lng >= box.sw.lng, (a, b) => ({ lat: a.lat + ((box.sw.lng - a.lng) / (b.lng - a.lng)) * (b.lat - a.lat), lng: box.sw.lng }));
  pts = clipEdge(pts, (p) => p.lng <= box.ne.lng, (a, b) => ({ lat: a.lat + ((box.ne.lng - a.lng) / (b.lng - a.lng)) * (b.lat - a.lat), lng: box.ne.lng }));
  pts = clipEdge(pts, (p) => p.lat >= box.sw.lat, (a, b) => ({ lat: box.sw.lat, lng: a.lng + ((box.sw.lat - a.lat) / (b.lat - a.lat)) * (b.lng - a.lng) }));
  pts = clipEdge(pts, (p) => p.lat <= box.ne.lat, (a, b) => ({ lat: box.ne.lat, lng: a.lng + ((box.ne.lat - a.lat) / (b.lat - a.lat)) * (b.lng - a.lng) }));
  return pts;
}

/**
 * Clip a ring to a convex polygon (a land lot, a strip between party walls).
 * A non-convex clip polygon can clip wrongly; callers check the coverage.
 */
export function clipRingToConvexPolygon(subject: LatLngRing, clip: LatLngRing): LatLngRing {
  if (subject.length < 3 || clip.length < 3) return [];
  const ccw = ringSignedArea(clip) > 0;
  let output: LatLng[] = subject;
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) break;
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    output = clipEdge(
      output,
      (p) => {
        const cross = (b.lng - a.lng) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lng - a.lng);
        return ccw ? cross >= 0 : cross <= 0;
      },
      (p1, p2) => {
        const denom = (p1.lng - p2.lng) * (a.lat - b.lat) - (p1.lat - p2.lat) * (a.lng - b.lng);
        if (Math.abs(denom) < 1e-15) return p2;
        const t = ((p1.lng - a.lng) * (a.lat - b.lat) - (p1.lat - a.lat) * (a.lng - b.lng)) / denom;
        return { lng: p1.lng + t * (p2.lng - p1.lng), lat: p1.lat + t * (p2.lat - p1.lat) };
      },
    );
  }
  return output;
}

/**
 * A panel's four corners as drawn from above. Portrait = long side up the
 * slope, whichever field the data calls height (the packer's convention);
 * the up-slope side is shortened by cos(pitch). Rotation is degrees
 * counter-clockwise from east.
 */
export function panelCorners(panel: Pick<SolarPanel, "center" | "orientation" | "rotationDegrees" | "slopeDegrees">, dims: PanelDims): LatLngRing {
  const longSide = Math.max(dims.heightM, dims.widthM);
  const shortSide = Math.min(dims.heightM, dims.widthM);
  const land = panel.orientation === "LANDSCAPE";
  const hh = ((land ? shortSide : longSide) / 2) * Math.cos(((panel.slopeDegrees ?? 0) * Math.PI) / 180);
  const hw = (land ? longSide : shortSide) / 2;
  const a = ((panel.rotationDegrees ?? 0) * Math.PI) / 180;
  const co = Math.cos(a);
  const si = Math.sin(a);
  return [
    [-hw, hh],
    [hw, hh],
    [hw, -hh],
    [-hw, -hh],
  ].map(([x, y]) => fromLocalXY({ x: x * co - y * si, y: x * si + y * co }, panel.center));
}

/** One panel per roof face and position: the key includes the face so overlapping roofs don't swallow each other's panels. */
export function dedupePanels(panels: SolarPanel[]): SolarPanel[] {
  const seen = new Set<string>();
  return panels.filter((p) => {
    const k = [p.segmentIndex, p.center.lat.toFixed(7), p.center.lng.toFixed(7), p.orientation, (p.rotationDegrees ?? 0).toFixed(2)].join(":");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
