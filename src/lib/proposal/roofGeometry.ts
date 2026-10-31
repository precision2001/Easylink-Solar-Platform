/**
 * The design's roof as flat shapes for drawing in the proposal: roof faces
 * and every panel, in metres (x east, y north) around the roof's middle.
 *
 * Built from what the designer saved — the faces it packed on, the panels
 * where it placed them, the panel size — so each proposal draws its own roof.
 */
import type { DesignProposalSolarDesign } from "@/lib/store/designProposalSlice";
import type { SolarPanel } from "@/types/solar";

type LatLng = { lat: number; lng: number };
export type XY = { x: number; y: number };

const M_PER_LAT = 111320;

/** Google Solar API's standard panel, used when an older design didn't save its size. */
export const DEFAULT_PANEL_DIMS = { heightM: 1.879, widthM: 1.045 };

export type RoofFaceShape = {
  ring: XY[];
  /** 0 (darkest) – 1 (lightest): north-facing faces catch the most light. */
  light: number;
};

export type RoofDrawing = {
  faces: RoofFaceShape[];
  /** Each panel's four corners, seen from above. */
  panels: XY[][];
  /** Bounds of everything, metres. */
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Geographic centre of the drawing, for the satellite image. */
  center: LatLng;
};

function toXY(p: LatLng, c: LatLng): XY {
  return {
    x: (p.lng - c.lng) * M_PER_LAT * Math.cos((c.lat * Math.PI) / 180),
    y: (p.lat - c.lat) * M_PER_LAT,
  };
}

/** Same corners the designer's map draws (long side up the slope in portrait). */
export function panelCornersXY(p: SolarPanel, dims: { heightM: number; widthM: number }, c: LatLng): XY[] {
  const longSide = Math.max(dims.heightM, dims.widthM);
  const shortSide = Math.min(dims.heightM, dims.widthM);
  const land = p.orientation === "LANDSCAPE";
  const hh = ((land ? shortSide : longSide) / 2) * Math.cos(((p.slopeDegrees ?? 0) * Math.PI) / 180);
  const hw = (land ? longSide : shortSide) / 2;
  const a = ((p.rotationDegrees ?? 0) * Math.PI) / 180;
  const co = Math.cos(a);
  const si = Math.sin(a);
  const o = toXY(p.center, c);
  return [
    [-hw, hh],
    [hw, hh],
    [hw, -hh],
    [-hw, -hh],
  ].map(([x, y]) => ({ x: o.x + x * co - y * si, y: o.y + x * si + y * co }));
}

function centroid(points: XY[]): XY {
  const n = Math.max(1, points.length);
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

/** Which way a face slopes down, from its azimuth or, failing that, from where it sits on the roof. */
function faceLight(face: { azimuthDeg?: number }, ring: XY[], roofMid: XY): number {
  let az = face.azimuthDeg;
  if (az === undefined || !Number.isFinite(az)) {
    const m = centroid(ring);
    // Compass bearing from the roof's middle to the face's middle.
    az = ((Math.atan2(m.x - roofMid.x, m.y - roofMid.y) * 180) / Math.PI + 360) % 360;
  }
  // North (0°) lightest, south (180°) darkest — the sun is in the north here.
  return 0.5 + 0.5 * Math.cos((az * Math.PI) / 180);
}

export function buildRoofDrawing(sd: DesignProposalSolarDesign | null | undefined): RoofDrawing | null {
  if (!sd) return null;
  const panelsLL = sd.generatedPanels ?? [];
  const outlines = (sd.savedRoofs ?? []).filter((r) => r.length >= 3);
  // Faces the designer saved. Designs saved before faces were stored get
  // the roof outline only: a guessed split would draw ridges the panels
  // were never packed against.
  const faceRings: { ring: LatLng[]; azimuthDeg?: number }[] = (sd.roofFaces ?? []).filter((f) => f.ring.length >= 3);
  const allLL: LatLng[] = [
    ...faceRings.flatMap((f) => f.ring),
    ...outlines.flat(),
    ...panelsLL.map((p) => p.center),
  ];
  if (allLL.length === 0) return null;

  const lats = allLL.map((p) => p.lat);
  const lngs = allLL.map((p) => p.lng);
  const center = {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };

  const dims = sd.panelDimensions ?? DEFAULT_PANEL_DIMS;
  const panels = panelsLL.map((p) => panelCornersXY(p, dims, center));

  const roofMid = centroid((faceRings.length ? faceRings.flatMap((f) => f.ring) : outlines.flat()).map((p) => toXY(p, center)));
  const faces: RoofFaceShape[] = faceRings.length
    ? faceRings.map((f) => {
        const ring = f.ring.map((p) => toXY(p, center));
        return { ring, light: faceLight(f, ring, roofMid) };
      })
    : outlines.map((r) => ({ ring: r.map((p) => toXY(p, center)), light: 0.6 }));

  const pts = [...faces.flatMap((f) => f.ring), ...panels.flat()];
  return {
    faces,
    panels,
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
    center,
  };
}

function rotate(p: XY, rad: number): XY {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/**
 * Turns the drawing so the roof fills a box as fully as it can: it tries the
 * direction of every roof wall (and square to it) and keeps the one that
 * draws the roof largest. A wide box gets the roof lying wide (landscape),
 * walls square to the frame. `rotationDeg` is how far it turned
 * (counter-clockwise), so a north arrow can turn with it.
 */
export function orientForBox(d: RoofDrawing, width: number, height: number): RoofDrawing & { rotationDeg: number } {
  const rings = d.faces.map((f) => f.ring);
  const candidates = new Set<number>([0]);
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) continue;
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      candidates.add(Math.round(((-deg % 90) + 90) % 90 * 10) / 10);
      candidates.add(Math.round((((-deg % 90) + 90) % 90 + 90) * 10) / 10);
    }
  }
  const pts = [...rings.flat(), ...d.panels.flat()];
  let best = { deg: 0, scale: -1 };
  for (const deg of candidates) {
    const rad = (deg * Math.PI) / 180;
    const q = pts.map((p) => rotate(p, rad));
    const w = Math.max(...q.map((p) => p.x)) - Math.min(...q.map((p) => p.x));
    const h = Math.max(...q.map((p) => p.y)) - Math.min(...q.map((p) => p.y));
    const scale = Math.min(width / Math.max(w, 0.1), height / Math.max(h, 0.1));
    // Prefer the smaller turn when two are as good.
    if (scale > best.scale * 1.005 || (Math.abs(scale - best.scale) <= best.scale * 0.005 && Math.abs(deg) < Math.abs(best.deg))) {
      best = { deg, scale };
    }
  }
  const rad = (best.deg * Math.PI) / 180;
  const faces = d.faces.map((f) => ({ ...f, ring: f.ring.map((p) => rotate(p, rad)) }));
  const panels = d.panels.map((c) => c.map((p) => rotate(p, rad)));
  const all = [...faces.flatMap((f) => f.ring), ...panels.flat()];
  return {
    ...d,
    faces,
    panels,
    minX: Math.min(...all.map((p) => p.x)),
    minY: Math.min(...all.map((p) => p.y)),
    maxX: Math.max(...all.map((p) => p.x)),
    maxY: Math.max(...all.map((p) => p.y)),
    rotationDeg: best.deg,
  };
}

/** Fits the drawing into a box (px), keeping its shape; returns a metres→px mapper. */
export function fitToBox(d: RoofDrawing, width: number, height: number, padding: number) {
  const w = Math.max(1, d.maxX - d.minX);
  const h = Math.max(1, d.maxY - d.minY);
  const scale = Math.min((width - 2 * padding) / w, (height - 2 * padding) / h);
  const ox = (width - w * scale) / 2;
  const oy = (height - h * scale) / 2;
  return {
    scale,
    toPx: (p: XY) => ({ x: ox + (p.x - d.minX) * scale, y: oy + (d.maxY - p.y) * scale }),
  };
}
