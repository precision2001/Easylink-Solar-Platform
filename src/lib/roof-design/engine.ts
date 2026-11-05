/**
 * The roof-design engine: every step from "a pin and Google's data" to
 * "roof outline, faces, lines checked, obstructions and panels", in one place.
 *
 * Pure and environment-neutral (browser and Node): it never fetches. Callers
 * load the inputs (the Designs page through its hooks, servers through
 * `./server`) and pass them in a `RoofDesignContext`. The Designs page, the
 * Quotes & Leads designer, the roof-design API, the roof-lines check and the
 * scripts all run these same functions, so a fix here reaches all of them.
 *
 * The rules (100 mm setback, one orientation, faces never crossed, rows along
 * the walls, lines checked against the image, hip or gable decided by
 * trigonometry + Google + the image) are documented in
 * docs/ROOF_DESIGN_PROCESS.md.
 */
import type { GeoTiffRaster } from "@/utils/geotiff";
import type { SolarEstimateResult, SolarPanel } from "@/types/solar";
import type { RoofSnapshotAnalysis } from "@/lib/designer/roofSnapshot";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask, type LineCheck } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines, fillFacesOnRoofs } from "@/lib/designer/roofLineCorrect";
import { generatePanelsForFaces, longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { beautifyPanelsForFaces } from "@/lib/designer/beautify";
import { findRoofObstructions, type RoofObstruction } from "@/lib/designer/roofObstructions";
import { keepPanelsClear } from "@/lib/designer/panelClearance";
import { bestSquareRoof, rankSquareReadings, type SquareReading } from "@/lib/designer/squareRoof";
import { DESIGN_RULES, inverterSizingFor, roofPitchDegrees, type InverterSizing, type PanelOrientation } from "@/lib/designer/designRules";
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";
import {
  boxAreaM2,
  boxCentre,
  boxToRing,
  clipRingToBox,
  convexHull,
  pointInRing,
  clipRingToConvexPolygon,
  dedupePanels,
  distanceM,
  ringAreaM2,
  ringCentroid,
  squareAround,
  type LatLng,
  type LatLngBox,
  type LatLngRing,
  type PanelDims,
} from "./geometry";

/* ── Inputs ─────────────────────────────────────────────────────────── */

/**
 * Everything the engine reads. All optional except the pin: each step uses
 * what it has and falls back as the Designs page always has.
 */
export type RoofDesignContext = {
  pin: LatLng;
  /** Google Solar building insights (segments, panel size, bounding box). */
  estimate?: SolarEstimateResult | null;
  /** Zoom-21 satellite image analysed (see analyseRoofSnapshot). */
  snapshot?: RoofSnapshotAnalysis | null;
  /** Google Solar roof mask and height model. */
  mask?: GeoTiffRaster | null;
  dsm?: GeoTiffRaster | null;
  /** Brightness of Google Solar's RGB layer, for line checks when there is no snapshot. */
  rgbLuma?: GeoTiffRaster | null;
  /** The land lot (cadastre), and Google's geocode bounds for it. */
  parcel?: { ring: LatLngRing; areaM2: number } | null;
  parcelBounds?: LatLngBox | null;
  /** Microsoft building footprint matched to the address. */
  footprint?: LatLngRing | null;
};

/* ── Constants (shared by every caller) ─────────────────────────────── */

export const ROOF_DESIGN_LIMITS = {
  /** Google's mask trace must cover this share of Google's whole-roof area to be trusted. */
  minMaskCoverage: 0.5,
  /** Google's bounding box is ignored when its centre is further than this from the pin (a neighbour's house). */
  maxBoundingBoxDistanceM: 80,
  /** A footprint further than this from Google's own match is probably another building. */
  maxFootprintGoogleDisagreementM: 40,
  /** A clip that keeps less than this share of the lot is a misalignment, not a trim. */
  minClipCoverage: 0.35,
  /**
   * The land lot found for the pin holds less than this share of Google's
   * building for the address: the property is more than that one lot (a house
   * built across two lots — 264 Wangee Rd, Greenacre), so the lot is widened
   * to take in the building. A terrace's lot holds most of its own house
   * (24 Derwent St: 78%), so terraces keep their lot.
   */
  minLotBuildingShare: 0.6,
  /** Relook accepts readings a little looser than the automatic design. */
  relook: { maxShareDiff: 0.15, minSeen: 0.2 },
} as const;

/** EasyLink's standard panel when the design has no panel size of its own (Google's 400 W class). */
export const DEFAULT_PANEL = { watts: 440, dims: { heightM: 1.762, widthM: 1.134 } };

const lineLumaOf = (ctx: RoofDesignContext) => ctx.snapshot?.luma ?? ctx.rgbLuma ?? null;
const lineMaskOf = (ctx: RoofDesignContext) => ctx.snapshot?.mask ?? ctx.mask ?? null;
const realSegments = (ctx: RoofDesignContext) => (ctx.estimate && !ctx.estimate.estimated ? ctx.estimate.roofSegments : undefined);

/* ── Step 0: the land the design may use ─────────────────────────── */

export type DesignLot = { ring: LatLngRing; areaM2: number; extended: boolean };

/**
 * The lot that keeps the roof finder off the neighbours' roofs. The cadastre
 * returns the one lot under the pin; when Google's building for this address
 * (its real roof segments, centred near the pin) lies mostly outside that
 * lot, the property spans more than one lot, and the lot is widened to the
 * building's extent (convex hull of the lot and the segments' boxes) — never
 * cutting the house in half.
 */
export function lotForDesign(
  lot: { ring: LatLngRing; areaM2: number } | null | undefined,
  estimate: SolarEstimateResult | null | undefined,
  pin?: LatLng,
): DesignLot | null {
  if (!lot || lot.ring.length < 3) return null;
  const segs = estimate && !estimate.estimated ? estimate.roofSegments : undefined;
  const total = segs?.reduce((s, g) => s + g.areaM2, 0) ?? 0;
  if (!segs || total <= 0) return { ...lot, extended: false };
  if (pin && distanceM(pin, estimate!.center) > 15) return { ...lot, extended: false };
  const inside = segs.filter((g) => pointInRing(g.center, lot.ring)).reduce((s, g) => s + g.areaM2, 0);
  if (inside / total >= ROOF_DESIGN_LIMITS.minLotBuildingShare) return { ...lot, extended: false };
  const corners = segs.flatMap((g) => (g.boundingBox ? boxToRing(g.boundingBox) : [g.center]));
  const ring = convexHull([...lot.ring, ...corners]);
  return { ring, areaM2: ringAreaM2(ring), extended: true };
}

/* ── Step 1: the starting roof outline ──────────────────────────────── */

export type InitialRoofSource = "square-walls" | "snapshot" | "footprint" | "google-mask" | "google-box" | "placeholder";

export type InitialRoofs = {
  rings: LatLngRing[];
  source: InitialRoofSource;
  /** A real trace of the roof (snapshot or Google's mask), not a footprint or rectangle guess. */
  traced: boolean;
};

/** The roof as traced in the zoomed image: the square-walled reading Google confirms, else the trace straightened and fitted. */
export function snapshotOutlines(ctx: RoofDesignContext): { rings: LatLngRing[]; square: boolean } | null {
  const snap = ctx.snapshot;
  const found = snap?.outlines;
  if (!snap || !found || found.length === 0) return null;
  const segs = realSegments(ctx);
  const sq = segs ? bestSquareRoof(snap.squared, segs, snap.luma ?? null) : null;
  if (sq) return { rings: [sq.ring], square: true };
  const straight = regularizeRoofOutlines(found.map((o) => o.ring));
  return { rings: regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring)), square: false };
}

/** Google's mask traced, kept to the lot (Google joins houses built close together). */
export function maskOutlines(ctx: RoofDesignContext): { rings: LatLngRing[]; coversRoof: boolean } | null {
  if (!ctx.mask) return null;
  const traced = extractRoofOutlinesFromMask(ctx.mask);
  if (traced.length === 0) return null;
  let rings = traced.map((o) => o.ring);
  if (ctx.parcel?.ring) {
    const clipped = rings.map((r) => clipRingToConvexPolygon(r, ctx.parcel!.ring)).filter((r) => r.length >= 3 && ringAreaM2(r) >= 4);
    if (clipped.length > 0) rings = clipped;
  }
  const whole = ctx.estimate?.wholeRoofAreaM2;
  const coversRoof = !whole || traced.reduce((s, o) => s + o.areaM2, 0) >= whole * ROOF_DESIGN_LIMITS.minMaskCoverage;
  return { rings, coversRoof };
}

/** The building footprint trimmed to this address's lot (attached houses share one footprint). */
export function footprintOutline(ctx: RoofDesignContext): LatLngRing | null {
  const raw = ctx.footprint;
  if (!raw || raw.length < 3) return null;
  if (ctx.parcel?.ring) {
    const clipped = clipRingToConvexPolygon(raw, ctx.parcel.ring);
    if (clipped.length >= 3 && ringAreaM2(clipped) / ctx.parcel.areaM2 >= ROOF_DESIGN_LIMITS.minClipCoverage) return clipped;
  }
  if (ctx.parcelBounds) {
    const clipped = clipRingToBox(raw, ctx.parcelBounds);
    if (clipped.length >= 3 && ringAreaM2(clipped) / boxAreaM2(ctx.parcelBounds) >= ROOF_DESIGN_LIMITS.minClipCoverage) return clipped;
  }
  return raw;
}

/** Google's bounding box, only when it is near the pin (on a vacant block Google snaps to a neighbour). */
export function boundingBoxNearPin(ctx: RoofDesignContext): LatLngBox | null {
  const box = ctx.estimate?.boundingBox;
  if (!box) return null;
  return distanceM(ctx.pin, boxCentre(box)) <= ROOF_DESIGN_LIMITS.maxBoundingBoxDistanceM ? box : null;
}

/**
 * The best starting outline from what is known, in the page's order: the
 * zoomed image; a footprint Google doesn't contradict; Google's mask; Google's
 * box; any footprint; Google's box; a placeholder square.
 */
export function initialRoofs(ctx: RoofDesignContext, { placeholder = true }: { placeholder?: boolean } = {}): InitialRoofs | null {
  const best = bestAvailableRoofs(ctx);
  if (best) return best;
  const box = boundingBoxNearPin(ctx);
  if (box) return { rings: [boxToRing(box)], source: "google-box", traced: false };
  return placeholder ? { rings: [squareAround(ctx.pin)], source: "placeholder", traced: false } : null;
}

/**
 * The outline sources that can beat Google's plain box: the image, a
 * footprint Google doesn't contradict, Google's mask, Google's box when it
 * contradicts the footprint, any footprint. Null when none of them is known
 * (yet) — the page waits for slower sources before falling back to the box.
 */
export function bestAvailableRoofs(ctx: RoofDesignContext): InitialRoofs | null {
  const snap = snapshotOutlines(ctx);
  if (snap) return { rings: snap.rings, source: snap.square ? "square-walls" : "snapshot", traced: true };
  const footprint = footprintOutline(ctx);
  const disagrees =
    Boolean(footprint && ctx.estimate && !ctx.estimate.estimated) &&
    distanceM(ringCentroid(footprint!), ctx.estimate!.center) > ROOF_DESIGN_LIMITS.maxFootprintGoogleDisagreementM;
  if (footprint && !disagrees) return { rings: [footprint], source: "footprint", traced: false };
  const mask = maskOutlines(ctx);
  if (mask && mask.rings.length > 0 && mask.coversRoof) return { rings: mask.rings, source: "google-mask", traced: true };
  const box = boundingBoxNearPin(ctx);
  if (disagrees && box) return { rings: [boxToRing(box)], source: "google-box", traced: false };
  if (footprint) return { rings: [footprint], source: "footprint", traced: false };
  return null;
}

/* ── Step 2: confirm the outline (Save Roof) ────────────────────────── */

/**
 * Roof-line rule on the outline(s) drawn or edited: straight lines along or
 * square to the walls (or 45°), shared corners; then each eave fitted to the
 * roof edge in the image — unless Google and the image confirm a
 * square-walled reading, whose border is kept as drawn along the walls.
 */
export function confirmRoofOutlines(rings: LatLngRing[], ctx: RoofDesignContext): LatLngRing[] {
  const straightened = regularizeRoofOutlines(rings.filter((p) => p.length >= 3));
  const segs = realSegments(ctx);
  const squareConfirmed = straightened.length === 1 && segs !== undefined && rankSquareReadings([straightened[0]], segs, ctx.snapshot?.luma ?? null).length > 0;
  const lineMask = lineMaskOf(ctx);
  return lineMask && !squareConfirmed ? regularizeRoofOutlines(straightened.map((ring) => fitEavesToMask(ring, lineMask).ring)) : straightened;
}

/* ── Step 3: faces, lines and obstructions ──────────────────────────── */

export type RoofFace = { ring: LatLngRing; eaveDeg: number; pitchDeg?: number; azimuthDeg?: number };

export type FaceSource = "square-hip" | "height-model" | "assumed-hip";

export type RoofFaceSet = {
  source: FaceSource;
  faces: RoofFace[];
  /** Hips, valleys and ridges checked against the image. */
  interiorChecks: LineCheck[];
  /** Interior lines moved onto the edges seen in the image. */
  moved: number;
  obstructions: RoofObstruction[];
  /** Gable ends (square-walled readings). */
  gables: number;
};

/**
 * Every face of the roof(s), in order of trust: a square-walled reading
 * (faces by trigonometry from the walls, hip or gable per end, confirmed by
 * Google and the image); else Google's height model, filled out to the
 * outline; else the standard hip split. Lines are then corrected against the
 * image, and obstructions found inside the faces.
 */
export function findRoofFaces(paths: LatLngRing[], ctx: RoofDesignContext, { relook = false }: { relook?: boolean } = {}): RoofFaceSet {
  const snap = ctx.snapshot ?? null;
  const segs = realSegments(ctx);
  const reading =
    paths.length === 1 && segs ? rankSquareReadings([paths[0]], segs, snap?.luma ?? null, relook ? ROOF_DESIGN_LIMITS.relook : {})[0] : undefined;
  if (reading) {
    const obstructions = snap ? findRoofObstructions(snap.luma, reading.faces.map((f) => f.ring)) : [];
    return { source: "square-hip", faces: reading.faces, interiorChecks: reading.lines, moved: 0, obstructions, gables: reading.gables.length };
  }
  const detected = detectRoofFaces(ctx.dsm ?? null, paths, ctx.mask ?? null);
  let faces: RoofFace[];
  let source: FaceSource;
  if (detected && detected.length > 0) {
    source = "height-model";
    const rings = regularizeRoofOutlines(detected.map((f) => f.ring));
    faces = detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg }));
    // The height model is coarse (0.5 m): fill faces out to the outline on the image's 3 cm grid.
    if (snap) faces = fillFacesOnRoofs(faces, paths, snap.mask, snap.metresPerPixel);
  } else {
    source = "assumed-hip";
    faces = splitRoofsIntoFaces(paths).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
  }
  const corrected = correctInteriorLines(faces, paths, lineLumaOf(ctx));
  const obstructions = snap ? findRoofObstructions(snap.luma, corrected.faces.map((f) => f.ring)) : [];
  return { source, faces: corrected.faces, interiorChecks: corrected.checks, moved: corrected.moved, obstructions, gables: 0 };
}

/** Every roof line checked: eaves against the roof edge, hips/valleys/ridges against the image. */
export function checkRoofLines(paths: LatLngRing[], faceSet: RoofFaceSet, ctx: RoofDesignContext): { lines: LineCheck[]; total: number; checked: number; ok: number } {
  if (paths.length === 0) return { lines: [], total: 0, checked: 0, ok: 0 };
  const lineMask = lineMaskOf(ctx);
  const lines = [...paths.flatMap((ring) => fitEavesToMask(ring, lineMask).checks), ...faceSet.interiorChecks];
  const checked = lines.filter((c) => c.status !== "no-data");
  const ok = checked.filter((c) => c.status === "confirmed" || c.status === "adjusted");
  return { lines, total: lines.length, checked: checked.length, ok: ok.length };
}

/* ── Step 4: panels ─────────────────────────────────────────────────── */

export type PanelLayoutRequest = {
  orientation?: PanelOrientation;
  /** Aligned, symmetric blocks instead of the most that fit. */
  beautify?: boolean;
  dims?: PanelDims;
};

export function panelDimsOf(ctx: RoofDesignContext): PanelDims {
  return ctx.estimate?.panelDimensions ?? DEFAULT_PANEL.dims;
}

export function roofPitchOf(ctx: RoofDesignContext): number {
  return roofPitchDegrees(ctx.estimate?.roofSegments, ctx.estimate?.estimated ?? true);
}

/**
 * Panels on every face: one orientation, rows along the largest roof's main
 * walls, the roof pitch, packed around obstructions; then checked last
 * whatever packed them — every panel inside one face and the outline, 100 mm
 * clear of every roof line.
 */
export function layoutRoofPanels(paths: LatLngRing[], faceSet: RoofFaceSet, ctx: RoofDesignContext, req: PanelLayoutRequest = {}): SolarPanel[] {
  const dims = req.dims ?? panelDimsOf(ctx);
  const orientation = req.orientation ?? DESIGN_RULES.defaultOrientation;
  const { faces, obstructions } = faceSet;
  const largest = paths.reduce<LatLngRing | null>((best, p) => (p.length >= 3 && (!best || ringAreaM2(p) > ringAreaM2(best)) ? p : best), null);
  const axis = largest ? longestEdgeAngleDegrees(largest) : undefined;
  const options = { orientation, pitchDeg: roofPitchOf(ctx), obstructions: obstructions.map((o) => o.ring) };
  const packed = req.beautify ? beautifyPanelsForFaces(faces, dims, options, axis) : generatePanelsForFaces(faces, dims, options, axis);
  return dedupePanels(keepPanelsClear(packed, faces.map((f) => f.ring), paths, dims, { clearM: DESIGN_RULES.edgeSetbackM }));
}

/* ── Relook ─────────────────────────────────────────────────────────── */

/**
 * Other readings of the roof (other edge and colour settings, hip or gable
 * per end) that Google and the image confirm, best first. `current` (the
 * saved outline) is included so it can be compared.
 */
export function relookReadings(ctx: RoofDesignContext, current?: LatLngRing | null): SquareReading[] {
  const snap = ctx.snapshot;
  const segs = realSegments(ctx);
  if (!snap || !segs) return [];
  const rings = [...(current ? [current] : []), ...(snap.relook?.() ?? [])];
  return rankSquareReadings(rings, segs, snap.luma, ROOF_DESIGN_LIMITS.relook);
}

/* ── The whole design in one call ───────────────────────────────────── */

export type RoofDesign = {
  pin: LatLng;
  outline: LatLngRing[];
  outlineSource: InitialRoofSource;
  /** True when the outline came from a footprint, a box or a placeholder: check the roof shape. */
  needsVerification: boolean;
  roofAreaM2: number;
  faceSet: RoofFaceSet;
  lines: { total: number; checked: number; ok: number; items: LineCheck[] };
  pitchDeg: number;
  dims: PanelDims;
  orientation: PanelOrientation;
  panels: SolarPanel[];
  /** Panels that fit in each orientation (the design uses `orientation`). */
  counts: Record<PanelOrientation, number>;
  panelWatts: number;
  systemKw: number;
  inverter: InverterSizing;
  notes: string[];
};

export type DesignRoofOptions = {
  /** An outline to use instead of finding one (drawn by hand, or saved earlier). */
  outline?: LatLngRing[];
  /** "best" picks whichever orientation fits more panels; default is the design rules' default. */
  orientation?: PanelOrientation | "best";
  beautify?: boolean;
  panelWatts?: number;
  dims?: PanelDims;
};

/**
 * Pin + data in, finished design out: the Designs page's steps (initial
 * outline → Save Roof → faces → panels) without the screen.
 */
export function designRoof(ctx: RoofDesignContext, opts: DesignRoofOptions = {}): RoofDesign | null {
  const initial: InitialRoofs | null = opts.outline ? { rings: opts.outline, source: "snapshot", traced: true } : initialRoofs(ctx, { placeholder: false });
  if (!initial) return null;
  const outline = confirmRoofOutlines(initial.rings, ctx);
  if (outline.length === 0) return null;
  const faceSet = findRoofFaces(outline, ctx);
  const dims = opts.dims ?? panelDimsOf(ctx);
  const lay = (orientation: PanelOrientation) => layoutRoofPanels(outline, faceSet, ctx, { orientation, beautify: opts.beautify, dims });
  const portrait = lay("PORTRAIT");
  const landscape = lay("LANDSCAPE");
  const orientation: PanelOrientation =
    opts.orientation === "best" ? (landscape.length > portrait.length ? "LANDSCAPE" : "PORTRAIT") : opts.orientation ?? DESIGN_RULES.defaultOrientation;
  const panels = orientation === "PORTRAIT" ? portrait : landscape;
  const panelWatts = opts.panelWatts ?? ctx.estimate?.panelCapacityWatts ?? DEFAULT_PANEL.watts;
  const lines = checkRoofLines(outline, faceSet, ctx);
  const needsVerification = !initial.traced;
  const notes = [
    needsVerification ? "Roof outline from Google's data or a building footprint, not traced from the image: check the roof shape." : null,
    panels.length === 0 ? "Roof found, but no face is big enough for a panel." : null,
    faceSet.obstructions.length > 0 ? `${faceSet.obstructions.length} possible vents, fans, antennas or level differences packed around: check on site.` : null,
  ].filter((n): n is string => Boolean(n));
  return {
    pin: ctx.pin,
    outline,
    outlineSource: initial.source,
    needsVerification,
    roofAreaM2: Math.round(outline.reduce((s, r) => s + ringAreaM2(r), 0)),
    faceSet,
    lines: { total: lines.total, checked: lines.checked, ok: lines.ok, items: lines.lines },
    pitchDeg: roofPitchOf(ctx),
    dims,
    orientation,
    panels,
    counts: { PORTRAIT: portrait.length, LANDSCAPE: landscape.length },
    panelWatts,
    systemKw: Math.round(((panels.length * panelWatts) / 1000) * 100) / 100,
    inverter: inverterSizingFor(panels.length, panelWatts),
    notes,
  };
}
