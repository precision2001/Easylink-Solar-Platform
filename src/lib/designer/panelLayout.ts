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
  }: PanelLayoutOptions,
): SolarPanel[] {
  if (polygon.length < 3) return [];

  const avgLat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
  const polygonXY = polygon.map((p) => toPlanar(p, avgLat));
  const center = centroid(polygonXY);
  const rowAngleDeg = longestEdgeAngleDegrees(polygon);
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
    for (const top of topSpans) {
      for (const bot of botSpans) {
        const left = Math.max(top.left, bot.left) + s;
        const right = Math.min(top.right, bot.right) - s;
        if (right - left < pw) continue;
        for (let x = left + pw / 2; x + pw / 2 <= right + 1e-6; x += pw + gapM) {
          panels.push(toPanel(x, y));
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

/** Lays out every roof of a design with one shared orientation. */
export function generatePanelsForRoofs(
  roofs: LatLng[][],
  panelDimensions: { heightM: number; widthM: number },
  options: PanelLayoutOptions,
): SolarPanel[] {
  return roofs.flatMap((ring, index) =>
    generatePanelsForRoofPolygon(ring, panelDimensions, index, options),
  );
}
