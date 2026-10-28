import type { SolarPanel } from "@/types/solar";
import { DESIGN_RULES, type PanelOrientation } from "@/lib/designer/designRules";

/**
 * Packs panels into a traced roof outline (plan view, lat/lng ring).
 *
 * Rows run along the roof's longest edge. Every panel — on every roof of the
 * design — uses the single orientation passed in, and stays `setbackM` clear
 * of the outline on all sides.
 */

type LatLng = { lat: number; lng: number };
type PlanarXY = { x: number; y: number };

export type PanelLayoutOptions = {
  orientation: PanelOrientation;
  /** Clearance from the roof outline; defaults to the EasyLink rule (100 mm). */
  setbackM?: number;
  /** Gap between neighbouring panels; defaults to the EasyLink rule. */
  gapM?: number;
  /**
   * Roof pitch. The outline is a plan (top-down) view, so the up-slope side
   * of each panel — and the gap between rows — is foreshortened by
   * cos(pitch). Rows are assumed to run along the eave (the longest edge).
   * Defaults to flat.
   */
  pitchDeg?: number;
  /**
   * Row direction in degrees (planar, from east, counter-clockwise). Omit to
   * use the roof's own longest edge; `generatePanelsForRoofs` sets it from the
   * alignment rule.
   */
  rowAngleDeg?: number;
  /**
   * Obstructions on the roof (vents, skylights, hot-water units, a lower roof
   * or awning breaking into the face): outlines in lat/lng. Panels keep the
   * setback clear of them as well as of the roof lines.
   *
   * They are packed AROUND, not removed afterwards. Why: on 85 Bombay St
   * (Oct 2026) the east face was first packed as if it were clear and every
   * panel touching the obstruction was then deleted — only 1 panel was left,
   * although 3 fit. Rows packed for an empty face line up badly with the gap
   * an obstruction leaves; each row has to know about it while it is filled,
   * so the row-offset search can pick rows that fit beside it.
   *
   * Use the obstruction's traced shape, not a box square to the image: the
   * same face lost 2 more panels to a box drawn square to the screen around
   * an obstruction lying at an angle.
   */
  obstructions?: LatLng[][];
};

const METRES_PER_DEG_LAT = 111320;
const metresPerDegLng = (refLat: number) =>
  111320 * Math.cos((refLat * Math.PI) / 180);

function toPlanar(point: LatLng, refLat: number): PlanarXY {
  return { x: point.lng * metresPerDegLng(refLat), y: point.lat * METRES_PER_DEG_LAT };
}

function planarToLatLng(point: PlanarXY, refLat: number): LatLng {
  return { lat: point.y / METRES_PER_DEG_LAT, lng: point.x / metresPerDegLng(refLat) };
}

function planarBounds(points: PlanarXY[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

function centroid(points: PlanarXY[]): PlanarXY {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

function rotate(point: PlanarXY, center: PlanarXY, angle: number): PlanarXY {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** Angle (degrees) of the polygon's longest edge, in planar metre space. */
export function longestEdgeAngleDegrees(polygon: LatLng[]): number {
  if (polygon.length < 2) return 0;
  const avgLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  let best = 0;
  let bestLen = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = toPlanar(polygon[i], avgLat);
    const b = toPlanar(polygon[(i + 1) % polygon.length], avgLat);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > bestLen) {
      bestLen = len;
      best = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    }
  }
  return best;
}

/**
 * X-spans of the polygon at scanline `y` (sorted {left, right} pairs). A
 * concave polygon can have more than one span per row.
 */
function xSpansAtY(polygon: PlanarXY[], y: number) {
  const xs: number[] = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].y;
    const yj = polygon[j].y;
    if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
      const t = (y - yi) / (yj - yi);
      xs.push(polygon[i].x + t * (polygon[j].x - polygon[i].x));
    }
  }
  xs.sort((a, b) => a - b);
  const spans: { left: number; right: number }[] = [];
  for (let k = 0; k + 1 < xs.length; k += 2) spans.push({ left: xs[k], right: xs[k + 1] });
  return spans;
}

const ROW_OFFSET_SAMPLES = 12;

export function generatePanelsForRoofPolygon(
  polygon: LatLng[],
  panelDimensions: { heightM: number; widthM: number },
  segmentIndex: number,
  {
    orientation,
    setbackM = DESIGN_RULES.edgeSetbackM,
    gapM = DESIGN_RULES.panelGapM,
    pitchDeg = 0,
    rowAngleDeg: rowAngleOverride,
    obstructions = [],
  }: PanelLayoutOptions,
): SolarPanel[] {
  if (polygon.length < 3) return [];

  const avgLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const polygonXY = polygon.map((p) => toPlanar(p, avgLat));
  const center = centroid(polygonXY);
  const rowAngleDeg = rowAngleOverride ?? longestEdgeAngleDegrees(polygon);
  const rowAngle = (rowAngleDeg * Math.PI) / 180;
  const rotPoly = polygonXY.map((p) => rotate(p, center, -rowAngle));
  const bounds = planarBounds(rotPoly);

  const longSide = Math.max(panelDimensions.heightM, panelDimensions.widthM);
  const shortSide = Math.min(panelDimensions.heightM, panelDimensions.widthM);
  const isLandscape = orientation === "LANDSCAPE";
  const slope = Math.min(Math.max(pitchDeg, 0), 89);
  const cosSlope = Math.cos((slope * Math.PI) / 180);
  // Width runs along the row (the roof's longest edge), height up the slope,
  // seen from above.
  const pw = isLandscape ? longSide : shortSide;
  const ph = (isLandscape ? shortSide : longSide) * cosSlope;
  const rowGap = gapM * cosSlope;
  const s = Math.max(0, setbackM);

  // Obstructions in the same rotated frame as the roof.
  const rotObstructions = obstructions
    .filter((o) => o.length >= 3)
    .map((o) => o.map((p) => rotate(toPlanar(p, avgLat), center, -rowAngle)));

  /** X-ranges a row band [y0, y1] can't use because of obstructions (setback added). */
  const blockedInBand = (y0: number, y1: number): { left: number; right: number }[] => {
    const out: { left: number; right: number }[] = [];
    for (const poly of rotObstructions) {
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        // Every point of edge a–b inside the band (clipped segment ends).
        const lo = Math.min(a.y, b.y);
        const hi = Math.max(a.y, b.y);
        if (hi < y0 || lo > y1) continue;
        const at = (y: number) => (Math.abs(b.y - a.y) < 1e-12 ? a.x : a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
        const ya = Math.max(lo, y0);
        const yb = Math.min(hi, y1);
        for (const x of [at(ya), at(yb)]) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
      // A band lying wholly inside the obstruction has no edge in it.
      if (minX === Infinity) {
        const mid = (y0 + y1) / 2;
        const spans = xSpansAtY(poly, mid);
        for (const sp of spans) out.push({ left: sp.left - s, right: sp.right + s });
        continue;
      }
      out.push({ left: minX - s, right: maxX + s });
    }
    return out;
  };

  /** Cut blocked ranges out of a usable span. */
  const subtract = (left: number, right: number, blocked: { left: number; right: number }[]) => {
    let parts = [{ left, right }];
    for (const b of blocked) {
      parts = parts.flatMap((p) => {
        if (b.right <= p.left || b.left >= p.right) return [p];
        const keep: { left: number; right: number }[] = [];
        if (b.left > p.left) keep.push({ left: p.left, right: b.left });
        if (b.right < p.right) keep.push({ left: b.right, right: p.right });
        return keep;
      });
    }
    return parts;
  };

  const toPanel = (x: number, y: number): SolarPanel => ({
    center: planarToLatLng(rotate({ x, y }, center, rowAngle), avgLat),
    orientation,
    rotationDegrees: rowAngleDeg,
    ...(slope > 0 ? { slopeDegrees: slope } : {}),
    segmentIndex,
    yearlyEnergyDcKwh: 0,
  });

  /**
   * Fill one row centred on `y`. The usable span is where the polygon is at
   * least `s` beyond the panel's top and bottom edges, trimmed by `s` at each
   * end — so the panel, grown by the setback on every side, sits inside the
   * outline.
   */
  const fillRow = (y: number): SolarPanel[] => {
    const reach = ph / 2 + s;
    const topSpans = xSpansAtY(rotPoly, y + reach);
    const botSpans = xSpansAtY(rotPoly, y - reach);
    const panels: SolarPanel[] = [];
    const blocked = rotObstructions.length > 0 ? blockedInBand(y - reach, y + reach) : [];
    for (const top of topSpans) {
      for (const bot of botSpans) {
        const left = Math.max(top.left, bot.left) + s;
        const right = Math.min(top.right, bot.right) - s;
        for (const part of subtract(left, right, blocked)) {
          if (part.right - part.left < pw) continue;
          for (let x = part.left + pw / 2; x + pw / 2 <= part.right + 1e-6; x += pw + gapM) {
            panels.push(toPanel(x, y));
          }
        }
      }
    }
    return panels;
  };

  let best: SolarPanel[] = [];
  const yStep = ph + rowGap;
  for (let k = 0; k < ROW_OFFSET_SAMPLES; k++) {
    const yOffset = (k / ROW_OFFSET_SAMPLES) * yStep;
    const generated: SolarPanel[] = [];
    for (
      let y = bounds.minY + s + ph / 2 + yOffset;
      y + ph / 2 + s <= bounds.maxY + 1e-6;
      y += yStep
    ) {
      generated.push(...fillRow(y));
    }
    if (generated.length > best.length) best = generated;
  }
  return best;
}

function planarArea(points: PlanarXY[]): number {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += points[j].x * points[i].y - points[i].x * points[j].y;
  }
  return Math.abs(a) / 2;
}

/** Smallest difference between two angles (degrees), in [0, 180]. */
function angleDiffDeg(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

/**
 * Alignment rule. The building's main axis is the longest edge of its
 * largest roof. Every other roof's row direction is snapped onto that axis,
 * or the one at 90° to it, when its own longest edge is within
 * `alignmentSnapDeg` — so wings, hip ends and roughly traced sections line
 * up with the rest of the house instead of following a skewed edge.
 */
export function alignedRowAngles(
  roofs: LatLng[][],
  snapDeg: number = DESIGN_RULES.alignmentSnapDeg,
): number[] {
  const valid = roofs.map((r) => r.length >= 3);
  if (!valid.some(Boolean)) return roofs.map(() => 0);
  const own = roofs.map((r) => (r.length >= 2 ? longestEdgeAngleDegrees(r) : 0));
  const areas = roofs.map((r) => {
    if (r.length < 3) return 0;
    const avgLat = r.reduce((s, p) => s + p.lat, 0) / r.length;
    return planarArea(r.map((p) => toPlanar(p, avgLat)));
  });
  const mainIndex = areas.indexOf(Math.max(...areas));
  const mainAxis = own[mainIndex];

  return own.map((angle, i) => {
    if (i === mainIndex) return angle;
    let best = angle;
    let bestDiff = Infinity;
    for (let k = -4; k <= 4; k++) {
      const candidate = mainAxis + k * 90;
      const diff = angleDiffDeg(angle, candidate);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = candidate;
      }
    }
    return bestDiff <= snapDeg ? best : angle;
  });
}

/**
 * Lays out every roof of a design with one shared orientation, and rows
 * aligned to the building's main walls (see `alignedRowAngles`).
 */
export function generatePanelsForRoofs(
  roofs: LatLng[][],
  panelDimensions: { heightM: number; widthM: number },
  options: PanelLayoutOptions,
): SolarPanel[] {
  const angles = alignedRowAngles(roofs);
  return roofs.flatMap((ring, index) =>
    generatePanelsForRoofPolygon(ring, panelDimensions, index, {
      ...options,
      rowAngleDeg: options.rowAngleDeg ?? angles[index],
    }),
  );
}

/**
 * Face rule: lays panels out one roof face at a time (see `splitRoofIntoFaces`),
 * so no panel crosses a hip, valley or ridge, and the setback applies to every
 * roof line. Each face's rows run along its own eave, snapped onto the main
 * walls (or 90° to them) under the alignment rule.
 */
export function generatePanelsForFaces(
  faces: { ring: LatLng[]; eaveDeg: number; pitchDeg?: number }[],
  panelDimensions: { heightM: number; widthM: number },
  options: PanelLayoutOptions,
  mainAxisDeg?: number,
): SolarPanel[] {
  if (faces.length === 0) return [];
  const main = mainAxisDeg ?? faces[0].eaveDeg;
  const snap = DESIGN_RULES.alignmentSnapDeg;
  return faces.flatMap((face, index) => {
    let angle = face.eaveDeg;
    let bestDiff = Infinity;
    for (let k = -4; k <= 4; k++) {
      const candidate = main + k * 90;
      const diff = angleDiffDeg(face.eaveDeg, candidate);
      if (diff < bestDiff) {
        bestDiff = diff;
        if (diff <= snap) angle = candidate;
      }
    }
    return generatePanelsForRoofPolygon(face.ring, panelDimensions, index, {
      ...options,
      rowAngleDeg: angle,
      // A face measured from the height model uses its own pitch.
      pitchDeg: face.pitchDeg ?? options.pitchDeg,
    });
  });
}
