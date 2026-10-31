/**
 * The design's roof as flat shapes for drawing in the proposal: roof faces
 * and every panel, in metres (x east, y north) around the roof's middle.
 *
 * Built from what the designer saved — the faces it packed on, the panels
 * where it placed them, the panel size — so each proposal draws its own roof.
 */
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
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

/** Something placed beside the house: centre (m) and the direction of its long side (degrees, counter-clockwise from east). */
export type Placed = { x: number; y: number; angleDeg: number };

export type RoofDrawing = {
  faces: RoofFaceShape[];
  /** The house outline(s), for finding walls. */
  outlines: XY[][];
  /** The car in the driveway (long side along the driveway, nose to the house). */
  ev?: Placed;
  /** The battery on the wall by the car (long side along the wall). */
  battery?: Placed;
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

export function toXY(p: LatLng, c: LatLng): XY {
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
  // Faces the designer saved; designs saved before that get the outline
  // split into faces the way the designer splits a roof with nothing better.
  let faceRings: { ring: LatLng[]; azimuthDeg?: number }[] = (sd.roofFaces ?? []).filter((f) => f.ring.length >= 3);
  if (faceRings.length === 0 && outlines.length > 0) {
    try {
      faceRings = splitRoofsIntoFaces(outlines).map((f) => ({ ring: f.ring }));
    } catch {
      faceRings = [];
    }
  }
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

  const outlineXY = (outlines.length ? outlines : faceRings.map((f) => f.ring)).map((r) => r.map((p) => toXY(p, center)));
  const pts = [...faces.flatMap((f) => f.ring), ...panels.flat()];
  return {
    faces,
    outlines: outlineXY,
    panels,
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
    center,
  };
}

export const EV_SIZE = { length: 4.8, width: 1.95 };
export const BATTERY_SIZE = { length: 1.1, width: 0.45 };

/** Corners of a rectangle of `length` × `width` centred on `p`, long side along `p.angleDeg`. */
export function rectCorners(p: Placed, length: number, width: number): XY[] {
  const a = (p.angleDeg * Math.PI) / 180;
  const ux = { x: Math.cos(a), y: Math.sin(a) };
  const uy = { x: -Math.sin(a), y: Math.cos(a) };
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, j]) => ({ x: p.x + (i * length * ux.x) / 2 + (j * width * uy.x) / 2, y: p.y + (i * length * ux.y) / 2 + (j * width * uy.y) / 2 }));
}

function extraCorners(d: RoofDrawing): XY[] {
  return [
    ...(d.ev ? rectCorners(d.ev, EV_SIZE.length, EV_SIZE.width) : []),
    ...(d.battery ? rectCorners(d.battery, BATTERY_SIZE.length, BATTERY_SIZE.width) : []),
  ];
}

function pointInRing(p: XY, r: XY[]): boolean {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i];
    const b = r[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
  }
  return ins;
}

function signedArea(r: XY[]): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j].x * r[i].y - r[i].x * r[j].y;
  return a / 2;
}

/**
 * Puts the electric car in the driveway and the battery on the wall beside
 * it, the way they'd normally sit at this house:
 *
 *  - the car stands just outside a wall that faces the street (the street
 *    is where Google's Street View camera stands), nose to the house;
 *  - of those spots, the one that looks most like concrete or pavers on the
 *    satellite image wins (`paved`, 0–1 for a footprint) — grass, garden
 *    and roof lose — with the spot nearest the street breaking ties;
 *  - the battery goes on that wall right beside the car's nose, where a
 *    short cable reaches the car.
 */
export function placeDriveway(
  d: RoofDrawing,
  street: XY | null,
  paved: (corners: XY[]) => number = () => 0.5,
): RoofDrawing {
  type Spot = { ev: Placed; battery: Placed; score: number };
  let best: Spot | null = null;
  const GAP = 0.7; // car nose to wall, m
  for (const ring of d.outlines) {
    const ccw = signedArea(ring) > 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < EV_SIZE.width + 0.8) continue;
      const t = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
      // Outward normal: to the right of a counter-clockwise ring.
      const n = ccw ? { x: t.y, y: -t.x } : { x: -t.y, y: t.x };
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // How squarely this wall faces the street (1 = head on). Driveways
      // run from the street to a wall that faces it, so the car points
      // down the driveway — not across it from a side wall.
      let facing = 0.5;
      if (street) {
        const sl = Math.hypot(street.x - mid.x, street.y - mid.y) || 1;
        facing = ((street.x - mid.x) * n.x + (street.y - mid.y) * n.y) / sl;
        if (facing < 0.5) continue;
      }
      const steps = Math.max(1, Math.floor((len - EV_SIZE.width) / 1));
      for (let k = 0; k <= steps; k++) {
        const along = EV_SIZE.width / 2 + 0.2 + ((len - EV_SIZE.width - 0.4) * k) / Math.max(1, steps);
        const wall = { x: a.x + t.x * along, y: a.y + t.y * along };
        const ev: Placed = {
          x: wall.x + n.x * (GAP + EV_SIZE.length / 2),
          y: wall.y + n.y * (GAP + EV_SIZE.length / 2),
          angleDeg: (Math.atan2(n.y, n.x) * 180) / Math.PI,
        };
        const corners = rectCorners(ev, EV_SIZE.length, EV_SIZE.width);
        if (d.outlines.some((r) => corners.some((c) => pointInRing(c, r)))) continue;
        // Battery on the wall beside the car's nose, on whichever side stays on this wall.
        const side = along + EV_SIZE.width / 2 + 0.5 + BATTERY_SIZE.length / 2 <= len ? 1 : -1;
        const bAlong = along + side * (EV_SIZE.width / 2 + 0.5 + BATTERY_SIZE.length / 2);
        const battery: Placed = {
          x: a.x + t.x * bAlong + n.x * (BATTERY_SIZE.width / 2 + 0.05),
          y: a.y + t.y * bAlong + n.y * (BATTERY_SIZE.width / 2 + 0.05),
          angleDeg: (Math.atan2(t.y, t.x) * 180) / Math.PI,
        };
        const dist = street ? Math.hypot(street.x - ev.x, street.y - ev.y) : 0;
        const score = paved(corners) + 0.35 * facing - dist * 0.002;
        if (!best || score > best.score) best = { ev, battery, score };
      }
    }
  }
  return best ? { ...d, ev: best.ev, battery: best.battery } : d;
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
  const pts = [...rings.flat(), ...d.panels.flat(), ...extraCorners(d)];
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
  const turn = (p?: Placed): Placed | undefined => (p ? { ...rotate(p, rad), angleDeg: p.angleDeg + best.deg } : undefined);
  const turned = {
    ...d,
    faces,
    panels,
    outlines: d.outlines.map((r) => r.map((p) => rotate(p, rad))),
    ev: turn(d.ev),
    battery: turn(d.battery),
  };
  const all = [...faces.flatMap((f) => f.ring), ...panels.flat(), ...extraCorners(turned)];
  return {
    ...turned,
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
