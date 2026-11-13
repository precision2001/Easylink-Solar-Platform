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
import { checkInteriorLine, fitEavesToMask, interiorEdges, type LineCheck } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines, fillFacesOnRoofs } from "@/lib/designer/roofLineCorrect";
import { fitRoofJunctions } from "./junctions";
import { flatSectionsFromLines } from "./flatSections";
import { generatePanelsForFaces, longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { beautifyPanelsForFaces } from "@/lib/designer/beautify";
import { findExistingArrays, findRoofObstructions, panelsOffRoof, type RoofObstruction } from "@/lib/designer/roofObstructions";
import { keepPanelsClear } from "@/lib/designer/panelClearance";
import { bestSquareRoof, rankSquareReadings, wallAxisDeg, type SquareReading } from "@/lib/designer/squareRoof";
import { DESIGN_RULES, inverterSizingFor, roofPitchDegrees, type InverterSizing, type PanelOrientation } from "@/lib/designer/designRules";
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";
import {
  boxAreaM2,
  boxCentre,
  boxToRing,
  clipRingToBox,
  convexHull,
  minAreaRectangle,
  simplifyRing,
  pointInRing,
  toLocalXY,
  fromLocalXY,
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
  panelCorners,
} from "./geometry";
import { alignWalls, withoutNotches, singleStepRemovals, splitByRoofLevel, squareWalls, withoutSmallSteps } from "./roofLevels";
import { imageLines, unexplainedLength, type ImageLine } from "./roofLineEvidence";

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
  /**
   * Faces read from the zoom-21 image by the AI platform's smart model (Claude
   * Opus 5.5; `fetchAiRoofFaces` on the server). One more reading of the roof:
   * filled to the outline, its lines moved onto the edges in the image, and
   * scored on the same priority tests as every other reading — never taken as
   * given.
   */
  aiFaces?: AiRoofFace[] | null;
  /**
   * Opus's full trace of the roof (owner's rule, 9 Nov 2026: Opus traces every
   * roof first). When present it IS the design: its border and faces are
   * used, the engine only snaps its intersection points onto the image and
   * checks every line. `undefined`: not asked (no AI); `null`: asked, but no
   * trace came back — the design says it needs a hand trace.
   */
  aiTrace?: AiRoofTrace | null;
  /** Opus is still tracing and checking this roof (past this request's wait): ask again shortly. */
  aiTracePending?: boolean;
};

/** A face the AI read from the image, in map coordinates. */
export type AiRoofFace = { ring: LatLngRing; azimuthDeg?: number; name?: string };

/** Opus's trace of the main roof, in map coordinates. */
export type AiRoofTrace = {
  noRoof: boolean;
  flat: boolean;
  outline: LatLngRing | null;
  faces: AiRoofFace[];
  /** Every visible line, intersection point to intersection point; "faint" = check on site. */
  lines: { a: LatLng; b: LatLng; kind: string; seen: "clear" | "faint" }[];
  obstructions: { kind: string; ring: LatLngRing }[];
};

/* ── Constants (shared by every caller) ─────────────────────────────── */

/**
 * Changes whenever the engine's decisions change: finished designs are kept
 * per version, so an engine change never serves a design made by an older one.
 */
export const ROOF_ENGINE_VERSION = "2026-11-11.1";

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
  /**
   * Google's roof data this many years older than today is out of date: the
   * roof may have changed since (108 Delhi St, Lidcombe: Google's 2018 data
   * against a 2026 image). It can no longer veto the image's reading.
   */
  staleGoogleYears: 3,
  /** A traced border with more corners than this is ragged: straight walls replace it. */
  maxTraceCorners: 20,
  /** Google's share test switched off (out-of-date data): any share difference passes. */
  googleWaived: 9,
  /** How far Save may move an eave a person drew or edited, to snap it to the edge in the image. */
  editSnapM: 0.3,
  /** A roof's lines count as determined when this share of their length is seen in the image (and Google agrees). */
  minSeenDetermined: 0.8,
  /** Relook accepts readings a little looser than the automatic design. */
  relook: { maxShareDiff: 0.15, minSeen: 0.2 },
} as const;

/** EasyLink's standard panel when the design has no panel size of its own (Google's 400 W class). */
export const DEFAULT_PANEL = { watts: 440, dims: { heightM: 1.762, widthM: 1.134 } };

const lineLumaOf = (ctx: RoofDesignContext) => ctx.snapshot?.luma ?? ctx.rgbLuma ?? null;
const lineMaskOf = (ctx: RoofDesignContext) => ctx.snapshot?.mask ?? ctx.mask ?? null;
const realSegments = (ctx: RoofDesignContext) => (ctx.estimate && !ctx.estimate.estimated ? ctx.estimate.roofSegments : undefined);

/** Years between Google's imagery for this address and today (Infinity when unknown). */
export function googleDataAgeYears(ctx: RoofDesignContext): number {
  const d = ctx.estimate && !ctx.estimate.estimated ? Date.parse(ctx.estimate.imageryDate) : NaN;
  return Number.isFinite(d) ? (Date.now() - d) / (365.25 * 24 * 3600 * 1000) : Infinity;
}

/**
 * Google's data is too old to overrule the image: faces are identified from
 * the image (owner's rule); Google's data only confirms them, when current.
 */
export function googleDataStale(ctx: RoofDesignContext): boolean {
  const age = googleDataAgeYears(ctx);
  return Number.isFinite(age) && age >= ROOF_DESIGN_LIMITS.staleGoogleYears;
}

/** Per-context caches: the same ring is read many times (outline search, Save Roof, faces). */
const caches = new WeakMap<RoofDesignContext, Map<string, unknown>>();
function cached<T>(ctx: RoofDesignContext, key: string, make: () => T): T {
  let m = caches.get(ctx);
  if (!m) {
    m = new Map();
    caches.set(ctx, m);
  }
  if (m.has(key)) return m.get(key) as T;
  const v = make();
  m.set(key, v);
  return v;
}
const ringKey = (r: LatLngRing) => r.map((p) => `${p.lat.toFixed(8)},${p.lng.toFixed(8)}`).join(";");

/** The square-walled reading of one ring (cached per context). */
function squareReadingOf(ring: LatLngRing, ctx: RoofDesignContext, opts: { maxShareDiff?: number; minSeen?: number; cellM?: number } = {}): SquareReading | null {
  const segs = realSegments(ctx);
  if (!segs || ring.length < 4) return null;
  // Out-of-date Google data can't overrule the hips the image shows.
  const o = { ...opts, googleStale: googleDataStale(ctx) };
  return cached(ctx, `sq|${JSON.stringify(o)}|${ringKey(ring)}`, () => rankSquareReadings([ring], segs, ctx.snapshot?.luma ?? null, o)[0] ?? null);
}

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

export type InitialRoofSource = "ai-trace" | "square-walls" | "snapshot" | "footprint" | "google-mask" | "google-box" | "placeholder";

export type InitialRoofs = {
  rings: LatLngRing[];
  source: InitialRoofSource;
  /** A real trace of the roof (snapshot or Google's mask), not a footprint or rectangle guess. */
  traced: boolean;
};

/**
 * A border is straight walls (owner's rule): a traced border with more than
 * maxTraceCorners corners is replaced by the straight-walled border the image
 * agrees with best — the image's square-walled outline (when it is this
 * roof), the trace squared, or the trace without notches. Fewer corners wins
 * a near tie. Applies to every outline, however many the image has and
 * whether or not Google has data (114 Bombay St, 7 Nov 2026: four outlines of
 * up to 69 corners went through untouched).
 */
/** The trace simplified (0.3–2 m) until it has few enough corners, then squared to its walls when that works. */
function simplifiedOptions(ring: LatLngRing): [string, LatLngRing | null][] {
  for (const tol of [0.3, 0.5, 0.8, 1.2, 1.6, 2]) {
    const s = simplifyRing(ring, tol);
    if (s.length > ROOF_DESIGN_LIMITS.maxTraceCorners) continue;
    const sq = s.length >= 4 ? squareWalls(s) : null;
    return [
      ["simplified-squared", sq],
      ["simplified", s.length >= 4 ? s : null],
    ];
  }
  return [];
}

export function straightenRaggedBorder(ring: LatLngRing, ctx: RoofDesignContext, imageSquare: LatLngRing | null): LatLngRing {
  if (ring.length <= ROOF_DESIGN_LIMITS.maxTraceCorners) return ring;
  const labelled: [string, LatLngRing | null][] = [
    ["image-square", imageSquare && overlapShare(ring, imageSquare) >= 0.5 ? imageSquare : null],
    ["squared-trace", squareWalls(ring)],
    ["no-notches", withoutNotches(ring)],
    ...simplifiedOptions(ring),
    ["rectangle", minAreaRectangle(ring)],
  ];
  const kinds = new Map<LatLngRing, string>();
  const options = labelled.filter(([, r]) => r && r.length >= 4 && r.length <= ROOF_DESIGN_LIMITS.maxTraceCorners).map(([k, r]) => (kinds.set(r!, k), r!));
  if (options.length === 0) return ring;
  if (options.length === 1) return options[0];
  const scored = options.map((r) => {
    const o = findOtherFaces([r], ctx);
    return { r, ev: evidenceFor(o.faces, r, o.checks, Infinity, roofImageLines(r, ctx), 0.1, null, 0), keeps: overlapShare(ring, r) };
  });
  const band = (x: (typeof scored)[number]) => (Number.isFinite(x.ev.disagreementM) ? Math.floor(x.ev.disagreementM / 2) : 1e9);
  scored.sort((a, b) => band(a) - band(b) || a.r.length - b.r.length);
  (globalThis as { __roofDebug?: (k: string, v: unknown) => void }).__roofDebug?.("border options", scored.map((x) => ({ kind: kinds.get(x.r), pts: x.r.length, d: +x.ev.disagreementM.toFixed(1), keeps: +x.keeps.toFixed(3), area: Math.round(ringAreaM2(x.r)) })));
  return scored[0].r;
}

/** The roof as traced in the zoomed image: the square-walled reading Google confirms, else the trace straightened and fitted. */
export function snapshotOutlines(ctx: RoofDesignContext): { rings: LatLngRing[]; square: boolean } | null {
  const snap = ctx.snapshot;
  const found = snap?.outlines;
  if (!snap || !found || found.length === 0) return null;
  const segs = realSegments(ctx);
  const straight = regularizeRoofOutlines(found.map((o) => o.ring));
  const fitted = regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring));
  const imageSquare = snap.squared?.ring ?? null;
  const straightened = () => ({ rings: fitted.map((r) => straightenRaggedBorder(r, ctx, imageSquare)), square: false });
  if (!segs) return straightened();
  // Every outline reading, scored on the same priority tests (Google, then
  // the image both ways) — never first-found-wins:
  //  - the square-walled outlines found in the image, whole;
  //  - the same and the trace cut into a main roof and a lower roof at a
  //    different pitch (264 Wangee Rd: a hip roof with a rear skillion).
  const squared = snap.squared ? [snap.squared.ring, ...(snap.squared.alternatives ?? [])] : [];
  const bases = [found[0].ring, ...squared];
  type Cand = { rings: LatLngRing[]; reading: ScoredReading };
  const cands: Cand[] = [];
  // Alternative measurements of the same walls are settled by the confirmed
  // square-roof rule (most lines seen, then closest to Google); the image
  // can't tell 0.5 m of gutter from tile (134 Old Canterbury Rd).
  const whole = bestSquareRoof(snap.squared, segs, snap.luma ?? null);
  const refs = whole ? [whole.ring] : squared;
  if (whole) {
    const reading = squareReadingFor(whole.ring, ctx, {}, refs);
    if (reading) cands.push({ rings: [reading.ring], reading });
  }
  for (const base of bases) {
    const split = splitByRoofLevel(base, segs, snap.luma ?? null);
    if (!split) continue;
    const reading = squareReadingFor(split.main, ctx, {}, refs);
    if (reading && newStructureConfirmed(reading)) cands.push({ rings: [reading.ring, ...regularizeRoofOutlines([split.lower])], reading });
  }
  if (fitted.length === 1) {
    const reading = squareReadingFor(fitted[0], ctx, {}, refs);
    if (reading && newStructureConfirmed(reading)) cands.push({ rings: [reading.ring], reading });
  }
  if (cands.length === 0 && googleDataStale(ctx)) {
    // Google's data predates the roof in today's image: read the roof on the
    // image alone — the reading's lines must be seen (80%) and the image's
    // lines explained — and say Google couldn't confirm it.
    const waived = { maxShareDiff: ROOF_DESIGN_LIMITS.googleWaived };
    for (const r of [...squared, ...(fitted.length === 1 ? [fitted[0]] : [])]) {
      const reading = squareReadingFor(r, ctx, waived, refs);
      if (reading && reading.evidence.seen >= ROOF_DESIGN_LIMITS.minSeenDetermined) cands.push({ rings: [reading.ring], reading });
    }
  }
  if (cands.length === 0) {
    // No confirmed reading: the border is still straight walls — the image's
    // square-walled outline, never a raw trace with dozens of corners.
    // Of the straight-walled borders, the one the image agrees with best
    // (24 Derwent St: squaring its trace moved walls the image disagrees with).
    return straightened();
  }
  cands.sort((x, y) => compareEvidence(x.reading.evidence, y.reading.evidence));
  const rate = (c: Cand) => c.reading.evidence.disagreementM;
  (globalThis as { __roofDebug?: (k: string, v: unknown) => void }).__roofDebug?.(
    "outline candidates",
    cands.map((c) => ({ pts: c.rings.map((r) => r.length), areaM2: Math.round(ringAreaM2(c.reading.ring)), rate: +rate(c).toFixed(3), ...c.reading.evidence })),
  );
  return { rings: cands[0].rings, square: true };
}

/**
 * What a reading of a roof scored on the two priority tests (owner's rule,
 * 5 Nov 2026), which apply to every reading whatever produced it:
 * 1. Google: its faces match Google's segments inside the roof
 *    (`googleDiff`, 0 = exact; `googleOk` within `maxShareDiff`).
 * 2. The image: its hips, valleys and ridges are seen in the image
 *    (`unseenM` = length not seen), and the lines the image shows are
 *    explained by its face borders (`unexplainedM` = length not explained).
 * Readings that pass Google are ranked by `disagreementM` = unseen +
 * unexplained, smallest first.
 */
export type RoofEvidence = {
  googleDiff: number;
  googleOk: boolean;
  /** Google's data is out of date and was not used to confirm this reading (image only). */
  googleStale?: boolean;
  seen: number;
  unseenM: number;
  unexplainedM: number;
  disagreementM: number;
};

/**
 * The priority order, the same for every reading of a roof whatever made it:
 * 1. Google confirms it (faces facing each way in Google's shares);
 * 2. the image agrees with it both ways: fewest metres of its lines not seen
 *    in the image plus image lines it leaves unexplained (2 m bands);
 * 3. closest to Google.
 */
export function compareEvidence(a: RoofEvidence, b: RoofEvidence): number {
  if (a.googleOk !== b.googleOk) return a.googleOk ? -1 : 1;
  const band = (e: RoofEvidence) => Math.floor(e.disagreementM / 2);
  if (band(a) !== band(b)) return band(a) - band(b);
  return a.googleDiff - b.googleDiff;
}

/** The trigonometry reading of one roof chosen on the priority tests, with its evidence. */
export type ScoredReading = SquareReading & { evidence: RoofEvidence };

/**
 * Every outline variant worth reading for one roof: as given, walls squared,
 * and with small steps merged away at several sizes.
 */
export function outlineVariants(ring: LatLngRing): LatLngRing[] {
  const out: LatLngRing[] = [ring];
  const sq = squareWalls(ring);
  if (sq) out.push(sq);
  for (const m of [0.5, 1.2]) {
    const v = withoutSmallSteps(ring, m);
    if (v) out.push(v);
  }
  const key = (r: LatLngRing) => r.map((p) => `${p.lat.toFixed(7)},${p.lng.toFixed(7)}`).join(";");
  const seen = new Set<string>();
  return out.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function lineLengthM(l: LineCheck): number {
  return distanceM(l.a, l.b);
}

/** Share of ring `a`'s area that ring `b` also covers (sampled on a 0.25 m grid). */
export function overlapShare(a: LatLngRing, b: LatLngRing): number {
  const o = a[0];
  const A = a.map((p) => toLocalXY(p, o));
  const xs = A.map((p) => p.x);
  const ys = A.map((p) => p.y);
  let inA = 0;
  let both = 0;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.25) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.25) {
      const p = fromLocalXY({ x, y }, o);
      if (!pointInRing(p, a)) continue;
      inA++;
      if (pointInRing(p, b)) both++;
    }
  }
  return inA ? both / inA : 0;
}

/** Google's plan roof area inside an outline (segments centred in it, sloped area × cos pitch). */
export function googlePlanFor(outline: LatLngRing, ctx: RoofDesignContext): number {
  const segs = realSegments(ctx)?.filter((g) => pointInRing(g.center, outline)) ?? [];
  return segs.reduce((a, g) => a + g.areaM2 * Math.cos((g.pitchDegrees * Math.PI) / 180), 0);
}

/** Share (by length) of the lines a reading has that the reading without a step lacks, seen in the image (within 0.5 m). */
function stepLinesSeen(withStep: LineCheck[], without: LineCheck[]): number {
  const near = (l: LineCheck, m: LineCheck) => {
    const mid = { lat: (l.a.lat + l.b.lat) / 2, lng: (l.a.lng + l.b.lng) / 2 };
    const o = m.a;
    const p = toLocalXY(mid, o);
    const b = toLocalXY(m.b, o);
    const L2 = b.x * b.x + b.y * b.y;
    const t = L2 > 0 ? Math.max(0, Math.min(1, (p.x * b.x + p.y * b.y) / L2)) : 0;
    return Math.hypot(p.x - t * b.x, p.y - t * b.y) < 0.3;
  };
  const added = withStep.filter((l) => !without.some((m) => near(l, m)) && l.status !== "no-data");
  const total = added.reduce((a, l) => a + lineLengthM(l), 0);
  if (total < 0.5) return 1;
  const seenLen = added.filter((l) => l.offsetM !== null && Math.abs(l.offsetM) <= 0.5).reduce((a, l) => a + lineLengthM(l), 0);
  return seenLen / total;
}

/** The image's lines on one roof, leaving out obstructions (vents, existing panels: their frames are not roof lines). */
function roofImageLines(ring: LatLngRing, ctx: RoofDesignContext): ImageLine[] {
  return cached(ctx, `lines|${ringKey(ring)}`, () => roofImageLinesUncached(ring, ctx));
}

function roofImageLinesUncached(ring: LatLngRing, ctx: RoofDesignContext): ImageLine[] {
  const luma = ctx.snapshot?.luma ?? null;
  if (!luma) return [];
  // Obstructions found once on the whole traced roof, reused for every reading.
  const whole = ctx.snapshot?.outlines?.[0]?.ring ?? ring;
  const skip = cached(ctx, `obs|${ringKey(whole)}`, () => findRoofObstructions(luma, [whole]).map((o) => o.ring));
  return imageLines(luma, [ring], wallAxisOf(ring), { skip });
}

function wallAxisOf(ring: LatLngRing): number {
  const o = ring[0];
  return wallAxisDeg(ring.map((p) => toLocalXY(p, o)));
}

/** Evidence for a set of faces of a roof whose interior lines were checked. */
export function evidenceFor(
  faces: { ring: LatLngRing; azimuthDeg?: number }[],
  outline: LatLngRing,
  lines: LineCheck[],
  googleDiff: number,
  imgLines: ImageLine[],
  maxShareDiff = 0.1,
  edgeLuma: GeoTiffRaster | null = null,
  googlePlanM2 = 0,
): RoofEvidence {
  // (Google's total plan area is reported but not scored: it is only good
  // to about ±5–10% — gutters, overhangs, Google's own segmentation.)
  void googlePlanM2;
  const checked = lines.filter((l) => l.status !== "no-data");
  const total = checked.reduce((s, l) => s + lineLengthM(l), 0);
  // Graded: a line whose edge in the image is within 0.4 m is seen; from 0.4
  // to 0.8 m it is partly seen (nearly right); beyond that, or no edge, unseen.
  const unseenM = checked.reduce((s, l) => {
    const off = l.offsetM === null ? Infinity : Math.abs(l.offsetM);
    return s + lineLengthM(l) * Math.min(1, Math.max(0, (off - 0.4) / 0.4));
  }, 0);
  const unexplainedM = unexplainedLength(imgLines, faces.map((f) => f.ring), [outline]);
  // The borders too: each eave against the roof edge seen in the image.
  // Eaves are not scored here: the roof-colour mask leaves gutters out and the
  // brightest edge beside an eave is often a shadow or fence (134 Old
  // Canterbury Rd). Walls are taken from the image's square-walled outline
  // instead (alignWalls), so candidates differ only in structure.
  void edgeLuma;
  const eaves: LineCheck[] = [];
  const offEaveM = eaves.reduce((s, l) => {
    const off = l.offsetM === null ? Infinity : Math.abs(l.offsetM);
    return s + lineLengthM(l) * Math.min(1, Math.max(0, (off - 0.2) / 0.4));
  }, 0);
  const eaveTotal = eaves.reduce((s, l) => s + lineLengthM(l), 0);
  return {
    googleDiff,
    googleOk: googleDiff <= maxShareDiff,
    seen: total + eaveTotal > 0 ? 1 - (unseenM + offEaveM) / (total + eaveTotal) : 0,
    unseenM: unseenM + offEaveM,
    unexplainedM,
    disagreementM: unseenM + offEaveM + unexplainedM,
  };
}

/**
 * How far a set of faces is from Google's segments inside the roof: share of
 * plan area facing each of the four wall directions, summed difference (the
 * same measure the trigonometry reading uses), for any reading.
 */
export function googleDiffFor(faces: { ring: LatLngRing; azimuthDeg?: number }[], outline: LatLngRing, ctx: RoofDesignContext): number {
  const segs = realSegments(ctx)?.filter((g) => pointInRing(g.center, outline));
  if (!segs || segs.length === 0 || faces.some((f) => f.azimuthDeg === undefined)) return Infinity;
  const axis = wallAxisOf(outline);
  const bin = (az: number) => {
    // Compass bearing of the wall directions: axis (deg from east, CCW) → bearing.
    const b0 = (90 - axis + 360) % 360;
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < 4; k++) {
      const d = Math.abs((((az - (b0 + 90 * k)) % 360) + 540) % 360 - 180);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };
  const g = [0, 0, 0, 0];
  let gT = 0;
  for (const s of segs) {
    const plan = s.areaM2 * Math.cos((s.pitchDegrees * Math.PI) / 180);
    g[bin(s.azimuthDegrees)] += plan;
    gT += plan;
  }
  const f = [0, 0, 0, 0];
  let fT = 0;
  for (const fc of faces) {
    const a = ringAreaM2(fc.ring);
    f[bin(fc.azimuthDeg!)] += a;
    fT += a;
  }
  if (gT <= 0 || fT <= 0) return Infinity;
  return f.reduce((s, x, k) => s + Math.abs(x / fT - g[k] / gT), 0);
}

/**
 * A structure the image's square-walled outline didn't give directly (a roof
 * split by level, a traced step, a cleaned trace) must have its lines seen in
 * the image (61 Harry Ave: a cleaned trace passed Google but drew faces
 * across the roof, with 60% of its lines seen).
 */
function newStructureConfirmed(r: ScoredReading): boolean {
  return r.evidence.googleOk && r.evidence.seen >= ROOF_DESIGN_LIMITS.minSeenDetermined;
}

function confirmedReadingRing(ring: LatLngRing, ctx: RoofDesignContext): LatLngRing | null {
  const r = squareReadingFor(ring, ctx);
  return r && newStructureConfirmed(r) ? r.ring : null;
}

/**
 * The trigonometry reading of one roof, chosen on the priority tests among
 * every outline variant (as given, walls squared, small steps merged): it
 * must pass Google; then the one the image agrees with best.
 */
export function squareReadingFor(
  ring: LatLngRing,
  ctx: RoofDesignContext,
  opts: { maxShareDiff?: number; minSeen?: number } = {},
  /** Precise walls to line up with (default: the image's square-walled outlines). */
  wallRefs?: LatLngRing[],
): ScoredReading | null {
  return cached(ctx, `best|${JSON.stringify(opts)}|${wallRefs ? wallRefs.map(ringKey).join("/") : "-"}|${ringKey(ring)}`, () => squareReadingSearch(ring, ctx, opts, wallRefs));
}

function squareReadingSearch(
  ring: LatLngRing,
  ctx: RoofDesignContext,
  opts: { maxShareDiff?: number; minSeen?: number },
  wallRefs?: LatLngRing[],
): ScoredReading | null {
  const segs = realSegments(ctx);
  if (!segs || ring.length < 4) return null;
  const imgLines = roofImageLines(ring, ctx);
  const score = (r: LatLngRing): ScoredReading | null => {
    // Searching: a 10 cm grid; the chosen outline is read again at 5 cm for its faces.
    const reading = squareReadingOf(r, ctx, { ...opts, cellM: 0.1 });
    return reading ? { ...reading, evidence: evidenceFor(reading.faces, reading.ring, reading.lines, reading.diff, imgLines, opts.maxShareDiff ?? 0.1, ctx.snapshot?.luma ?? null, googlePlanFor(reading.ring, ctx)) } : null;
  };
  const better = (a: ScoredReading, b: ScoredReading | null) => !b || compareEvidence(a.evidence, b.evidence) < 0;
  let best: ScoredReading | null = null;
  // Walls lined up with the image's square-walled outline (precise eaves), as well as the trace's own.
  const refs = wallRefs ?? (ctx.snapshot?.squared ? [ctx.snapshot.squared.ring, ...(ctx.snapshot.squared.alternatives ?? [])] : []);
  // Long walls always on the image's square-walled outline where it has one
  // (its eaves are the precise ones); only structure — steps — varies.
  // Notches and tabs (short runs beside short runs) are boxes on the roof or
  // tracing noise (134 Old Canterbury Rd's flue box); a step with long walls
  // either side is tested on the evidence (264 Wangee Rd's north eave).
  const starts = outlineVariants(ring).map((v) => {
    const clean = withoutNotches(v) ?? v;
    return alignWalls(clean, refs) ?? clean;
  });
  // With out-of-date Google data a wing may be newer than Google's data; its
  // corners are kept as a start too (12 Fursorb St), and the evidence decides.

  for (const v of starts) {
    // From each starting outline, drop short steps one at a time while the
    // evidence improves: real steps stay, tracing notches go.
    let cur = score(v);
    let ringNow = v;
    for (let guard = 0; guard < 8; guard++) {
      let step: { r: LatLngRing; s: ScoredReading } | null = null;
      for (const r of singleStepRemovals(ringNow)) {
        const s2 = score(r);
        if (s2 && (!step || better(s2, step.s))) step = { r, s: s2 };
      }
      if (!step || (cur && !better(step.s, cur))) break;
      cur = step.s;
      ringNow = step.r;
    }
    // A step stays only when the lines it adds are seen in the image (264
    // Wangee Rd's strip lines are; a step traced round a flue box at 134 Old
    // Canterbury Rd added a line down the roof that isn't).
    for (let guard = 0; cur && guard < 8; guard++) {
      let dropped = false;
      for (const r of singleStepRemovals(ringNow)) {
        const without = score(r);
        if (!without) continue;
        if (stepLinesSeen(cur.lines, without.lines) < 0.7) {
          cur = without;
          ringNow = r;
          dropped = true;
          break;
        }
      }
      if (!dropped) break;
    }
    if (cur && better(cur, best)) best = cur;
  }
  return best;
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
export function confirmRoofOutlines(
  rings: LatLngRing[],
  ctx: RoofDesignContext,
  /**
   * The outline was drawn or edited by a person: their walls and steps are
   * kept. Only their own corners are squared (by at most 0.6 m) and eaves
   * fitted to the image as before; no other reading replaces it.
   */
  { userEdit = false }: { userEdit?: boolean } = {},
): LatLngRing[] {
  const drawn = rings.filter((p) => p.length >= 3);
  const straightened = regularizeRoofOutlines(drawn);
  // Each roof on its own: one Google and the image confirm as square-walled
  // keeps its walls (squared if a step came out at 45°).
  // An outline that already passes Google and the image as drawn is kept
  // exactly (straightening would turn a square step back to 45°); otherwise
  // the best-scoring reading of it.
  const segs = realSegments(ctx);
  const passes = (r: LatLngRing | undefined) => Boolean(r && segs && squareReadingOf(r, ctx));
  const own = (d: LatLngRing | undefined) => {
    if (!d) return null;
    if (passes(d)) return d;
    const sq = squareWalls(d);
    return sq && passes(sq) ? sq : null;
  };
  const square = userEdit
    ? drawn.length === straightened.length
      ? drawn.map((d, i) => own(d) ?? own(straightened[i]))
      : straightened.map((r) => own(r))
    : drawn.length === straightened.length
      ? drawn.map((d, i) => (passes(d) ? d : confirmedReadingRing(straightened[i], ctx) ?? confirmedReadingRing(d, ctx)))
      : straightened.map((r) => confirmedReadingRing(r, ctx));
  const lineMask = lineMaskOf(ctx);
  if (!lineMask) return straightened.map((r, i) => square[i] ?? r);
  const rest = straightened.filter((_, i) => !square[i]);
  // A person's edit: eaves only snapped to the image (≤ 0.3 m), never pushed
  // back to where the customer moved them from (57 Harry Ave test: a north
  // wall moved in 1.5 m came back out with the full fit).
  const fitOpts = userEdit ? { maxShiftM: ROOF_DESIGN_LIMITS.editSnapM } : {};
  const fitted = rest.length ? regularizeRoofOutlines(rest.map((ring) => fitEavesToMask(ring, lineMask, fitOpts).ring)) : [];
  let k = 0;
  return straightened.map((_, i) => square[i] ?? fitted[k++]);
}

/* ── Step 3: faces, lines and obstructions ──────────────────────────── */

export type RoofFace = { ring: LatLngRing; eaveDeg: number; pitchDeg?: number; azimuthDeg?: number };

export type FaceSource = "ai-trace" | "square-hip" | "ai-image" | "height-model" | "assumed-hip";

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
  /** Each roof's reading on the priority tests (Google, then the image both ways). */
  evidence: RoofEvidence[];
  /** Every roof's reading passes Google and the image shows its lines: the roof lines are determined. */
  determined: boolean;
  /** When Opus traced the roof: its lines, how many it saw only faintly, and how many the image doesn't confirm. */
  trace?: { lines: number; faint: number; unconfirmed: number };
};

/**
 * Every face of the roof(s), in order of trust: a square-walled reading
 * (faces by trigonometry from the walls, hip or gable per end, confirmed by
 * Google and the image); else Google's height model, filled out to the
 * outline; else the standard hip split. Lines are then corrected against the
 * image, and obstructions found inside the faces.
 */
/**
 * Every face of the roof(s) — the reading the priority tests pick (below) —
 * with the INTERSECTION-POINT RULE applied last, on every path that draws
 * faces (Designs page, Roof Designer API, Quotes & Leads, proposals):
 * every point where two or more roof lines meet is one shared point, fitted
 * once to the image for all its lines (DESIGN_RULES.roofJunctions; owner,
 * 9 Nov 2026, 12 Fursorb St). Lines stay straight and connected.
 */
export function findRoofFaces(paths: LatLngRing[], ctx: RoofDesignContext, opts: { relook?: boolean } = {}): RoofFaceSet {
  const traced = tracedFaces(paths, ctx);
  if (traced) return traced;
  const found = readRoofFaces(paths, ctx, opts);
  if (typeof process !== "undefined" && process.env?.ROOF_JUNCTIONS === "0") return found;
  const luma = lineLumaOf(ctx);
  const flat = roofPitchOf(ctx) < DESIGN_RULES.flatRoofMaxPitchDeg;
  // Flat roof (DESIGN_RULES.flatRoofMaxPitchDeg): no hips — one flat face
  // per roof, cut into sections only along the lines the image shows.
  const fit = flat ? { faces: found.faces, moved: 0 } : fitRoofJunctions(paths, found.faces, luma);
  let faces = fit.faces;
  let merged = 0;
  if (flat) {
    const pitchDeg = roofPitchOf(ctx);
    faces = paths.flatMap((p) => {
      const seen = luma ? cached(ctx, `flat-lines|${ringKey(p)}`, () => imageLines(luma, [p], wallAxisOf(p), { insetM: 0.2, minLengthM: 1.0 })) : [];
      const eaveDeg = longestEdgeAngleDegrees(p);
      return flatSectionsFromLines(p, seen).sections.map((ring) => ({ ring, eaveDeg, pitchDeg }) as RoofFace);
    });
    merged = 1;
  }
  if (fit.moved === 0 && merged === 0) return found;
  const snap = ctx.snapshot ?? null;
  return {
    ...found,
    faces,
    interiorChecks: interiorEdges(faces, paths).map(([a, b]) => checkInteriorLine(a, b, luma)),
    obstructions: snap ? findRoofObstructions(snap.luma, faces.map((f) => f.ring)) : found.obstructions,
  };
}

/** Metres from p to segment a-b (local flat frame). */
function distanceToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  const mLng = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const X = (q: LatLng) => ({ x: (q.lng - p.lng) * mLng, y: (q.lat - p.lat) * 111320 });
  const A = X(a), B = X(b);
  const dx = B.x - A.x, dy = B.y - A.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, -(A.x * dx + A.y * dy) / l2)) : 0;
  return Math.hypot(A.x + t * dx, A.y + t * dy);
}

/** The trace must cover this share of the roof to be the design. */
export const AI_TRACE_MIN_COVERAGE = 0.6;

/**
 * Opus's trace as the roof's faces (owner's rule: Opus traces every roof
 * first; the engine only checks). Its faces are kept as traced; their shared
 * intersection points are snapped onto the lines in the image
 * (fitRoofJunctions); every line is checked against the image; faint lines
 * and lines the image doesn't confirm are reported for an on-site check.
 * Obstructions: Opus's, plus the engine's small spots (vents it may have
 * missed). Null when there is no trace or it covers too little of the roof.
 */
function tracedFaces(paths: LatLngRing[], ctx: RoofDesignContext): RoofFaceSet | null {
  const t = ctx.aiTrace;
  if (!t || t.noRoof || t.faces.length === 0) return null;
  const roofM2 = paths.reduce((s, p) => s + ringAreaM2(p), 0);
  const mine = t.faces.filter((f) => f.ring.length >= 3 && paths.some((p) => pointInRing(ringCentroid(f.ring), p)));
  const coveredM2 = mine.reduce((s, f) => s + ringAreaM2(f.ring), 0);
  if (roofM2 <= 0 || coveredM2 / roofM2 < AI_TRACE_MIN_COVERAGE) return null;
  const pitchDeg = roofPitchOf(ctx);
  let faces: RoofFace[] = mine.map((f) => {
    const az = f.azimuthDeg;
    const azRad = ((az ?? 0) * Math.PI) / 180;
    return {
      ring: f.ring,
      eaveDeg: az === undefined || t.flat ? longestEdgeAngleDegrees(f.ring) : (Math.atan2(Math.sin(azRad), -Math.cos(azRad)) * 180) / Math.PI,
      azimuthDeg: az,
      pitchDeg: t.flat ? pitchDeg : undefined,
    };
  });
  const luma = lineLumaOf(ctx);
  // Fine-tuning only: a traced point moves at most 0.3 m, and only on a clear
  // gain (12 Fursorb St, 9 Nov 2026: a 1 m allowance pulled Opus's points onto
  // other edges and the faces no longer matched the trace). Opus's lines are
  // not fitted further to the photo's edges (owner, 9 Nov 2026).
  const fit = fitRoofJunctions(paths, faces, luma, { junctionM: 0.3, minGain: 0.2 });
  faces = fit.faces;
  const checks = interiorEdges(faces, paths).map(([a, b]) => checkInteriorLine(a, b, luma));
  const snap = ctx.snapshot ?? null;
  // The engine's own spots, except along a traced line (hip capping reads as spots).
  const edges = interiorEdges(faces, paths);
  const nearLine = (ring: LatLngRing) => {
    const c = ringCentroid(ring);
    return edges.some(([a, b]) => distanceToSegmentM(c, a, b) < 0.35);
  };
  const spots = snap ? findRoofObstructions(snap.luma, faces.map((f) => f.ring)).filter((o) => o.kind === "spot" && !nearLine(o.ring)) : [];
  const traced: RoofObstruction[] = t.obstructions.filter((o) => o.ring.length >= 3).map((o) => ({ kind: o.kind === "shading" ? "step" : "spot", ring: o.ring, sizePx: 0 }));
  // Existing solar panels, from the photo as well as Opus's outlines: Opus
  // doesn't always mark them, or falls short of their edges (26 Bridgeview Cct,
  // 10 Nov 2026: new panels laid over the existing array).
  const arrays = snap ? findExistingArrays(snap.luma, faces.map((f) => f.ring), t.obstructions.filter((o) => o.kind === "panels" && o.ring.length >= 3).map((o) => o.ring)) : [];
  const faint = t.lines.filter((l) => l.seen === "faint").length;
  const unconfirmed = checks.filter((c) => c.status === "unconfirmed").length;
  return {
    source: "ai-trace",
    faces,
    interiorChecks: checks,
    moved: fit.moved,
    obstructions: [...traced, ...arrays, ...spots],
    gables: 0,
    evidence: [],
    determined: faint === 0 && unconfirmed === 0,
    trace: { lines: t.lines.length, faint, unconfirmed },
  };
}

function readRoofFaces(paths: LatLngRing[], ctx: RoofDesignContext, { relook = false }: { relook?: boolean } = {}): RoofFaceSet {
  const snap = ctx.snapshot ?? null;
  const segs = realSegments(ctx);
  const opts: { maxShareDiff?: number; minSeen?: number } = relook ? ROOF_DESIGN_LIMITS.relook : {};
  const maxShareDiff = opts.maxShareDiff ?? 0.1;
  // Each roof on its own, every reading scored on the same priority tests:
  // the trigonometry reading and the height model / hip split alike.
  const faces: RoofFace[] = [];
  const checks: LineCheck[] = [];
  const evidence: RoofEvidence[] = [];
  let moved = 0;
  let gables = 0;
  const sources = new Set<FaceSource>();
  for (const p of paths) {
    const imgLines = roofImageLines(p, ctx);
    type Cand = { source: FaceSource; faces: RoofFace[]; checks: LineCheck[]; moved: number; gables: number; evidence: RoofEvidence };
    const cands: Cand[] = [];
    let sq = squareReadingOf(p, ctx, opts) ?? undefined;
    let waived = false;
    if (!sq && googleDataStale(ctx)) {
      // Out-of-date Google data: the reading stands on the image alone.
      const w = squareReadingOf(p, ctx, { ...opts, maxShareDiff: ROOF_DESIGN_LIMITS.googleWaived });
      if (w) {
        const ev = evidenceFor(w.faces, p, w.lines, w.diff, imgLines, ROOF_DESIGN_LIMITS.googleWaived, ctx.snapshot?.luma ?? null, googlePlanFor(p, ctx));
        if (ev.seen >= ROOF_DESIGN_LIMITS.minSeenDetermined) {
          sq = w;
          waived = true;
        }
      }
    }
    if (sq) {
      const ev = evidenceFor(sq.faces, p, sq.lines, sq.diff, imgLines, maxShareDiff, ctx.snapshot?.luma ?? null, googlePlanFor(p, ctx));
      cands.push({ source: "square-hip", faces: sq.faces, checks: sq.lines, moved: 0, gables: sq.gables.length, evidence: waived ? { ...ev, googleOk: false, googleStale: true } : ev });
    }
    // The height model only where no trigonometry reading is confirmed by
    // Google; a reading on the image alone competes with it on the image.
    const other = sq && !waived ? null : findOtherFaces([p], ctx);
    const stale = googleDataStale(ctx);
    const fallbackEvidence = (o: NonNullable<typeof other>) => {
      const ev = evidenceFor(o.faces, p, o.checks, segs ? googleDiffFor(o.faces, p, ctx) : Infinity, imgLines, maxShareDiff, ctx.snapshot?.luma ?? null, googlePlanFor(p, ctx));
      // Out-of-date Google data confirms nothing, its height model included.
      return stale ? { ...ev, googleOk: false, googleStale: true } : ev;
    };
    if (other) cands.push({ ...other, gables: 0, evidence: fallbackEvidence(other) });
    // The AI's reading of the image (Claude Opus 5.5), where one was had:
    // filled to this outline, lines moved onto the image's edges, scored like
    // the rest. A confirmed trigonometry reading still comes first.
    const ai = sq && !waived ? null : aiFacesFor(p, ctx);
    if (ai) cands.push({ ...ai, gables: 0, evidence: fallbackEvidence(ai) });
    if ((!sq || waived) && stale && other?.source === "height-model") {
      // The height model shows the roof as it was when Google flew over; the
      // plain hip split competes with it on the image alone.
      const hip = findOtherFaces([p], ctx, { hipOnly: true });
      cands.push({ ...hip, gables: 0, evidence: fallbackEvidence(hip) });
    }
    // A trigonometry reading Google and the image confirm is used; the height
    // model's lines are moved onto edges in the image before being checked
    // against it, so its scores can't overrule a confirmed reading (134 Old
    // Canterbury Rd: it drew a flat-topped north end on a hip roof). The
    // height model is used only where no reading is confirmed — and then the
    // roof's lines are reported as not determined.
    const firm = (c: (typeof cands)[number]) => (c.source === "square-hip" && !c.evidence.googleStale ? -1 : 0);
    cands.sort((x, y) => firm(x) - firm(y) || compareEvidence(x.evidence, y.evidence));
    (globalThis as { __roofDebug?: (k: string, v: unknown) => void }).__roofDebug?.(
      "face candidates",
      cands.map((c) => ({ source: c.source, faces: c.faces.length, ...c.evidence })),
    );
    const best = cands[0];
    faces.push(...best.faces);
    checks.push(...best.checks);
    // A trigonometry or AI reading can be determined (Google confirms it and the
    // image shows its lines); the height model and the hip split never are.
    evidence.push(best.source === "square-hip" || best.source === "ai-image" ? best.evidence : { ...best.evidence, googleOk: false });
    moved += best.moved;
    gables += best.gables;
    sources.add(best.source);
  }
  const obstructions = snap ? [...findRoofObstructions(snap.luma, faces.map((f) => f.ring)), ...findExistingArrays(snap.luma, faces.map((f) => f.ring))] : [];
  const source: FaceSource = sources.has("assumed-hip")
    ? "assumed-hip"
    : sources.has("height-model")
      ? "height-model"
      : sources.has("ai-image")
        ? "ai-image"
        : "square-hip";
  const determined = evidence.length > 0 && evidence.every((e) => e.googleOk && e.seen >= ROOF_DESIGN_LIMITS.minSeenDetermined);
  return { source, faces, interiorChecks: checks, moved, obstructions, gables, evidence, determined };
}

/** The AI's faces that belong to this roof must cover at least this share of it to be a reading. */
export const AI_MIN_COVERAGE = 0.6;

/**
 * The AI's reading of one roof: its faces whose centre is on this roof,
 * filled out to the outline on the image's 3 cm grid (gaps and overhangs
 * settled by the image's roof mask), lines moved onto the edges seen in the
 * image. Null when there is no AI reading, no image, or it covers too little
 * of this roof.
 */
function aiFacesFor(outline: LatLngRing, ctx: RoofDesignContext): { source: FaceSource; faces: RoofFace[]; checks: LineCheck[]; moved: number } | null {
  const snap = ctx.snapshot ?? null;
  if (!ctx.aiFaces?.length || !snap) return null;
  const mine = ctx.aiFaces.filter((f) => f.ring.length >= 3 && pointInRing(ringCentroid(f.ring), outline));
  if (mine.length === 0) return null;
  const roofM2 = ringAreaM2(outline);
  const coveredM2 = mine.reduce((s, f) => s + ringAreaM2(f.ring) * overlapShare(f.ring, outline), 0);
  if (roofM2 <= 0 || coveredM2 / roofM2 < AI_MIN_COVERAGE) return null;
  const rings = regularizeRoofOutlines(mine.map((f) => f.ring));
  let faces: RoofFace[] = mine.map((f, i) => {
    const az = f.azimuthDeg;
    const azRad = ((az ?? 0) * Math.PI) / 180;
    return {
      ring: rings[i] ?? f.ring,
      // The same convention as the height model's faces (roofFaceDetect).
      eaveDeg: az === undefined ? longestEdgeAngleDegrees(f.ring) : (Math.atan2(Math.sin(azRad), -Math.cos(azRad)) * 180) / Math.PI,
      azimuthDeg: az,
    };
  });
  faces = fillFacesOnRoofs(faces, [outline], snap.mask, snap.metresPerPixel);
  const corrected = correctInteriorLines(faces, [outline], lineLumaOf(ctx));
  return { source: "ai-image", faces: corrected.faces, checks: corrected.checks, moved: corrected.moved };
}

/** Faces of roofs with no square-walled reading: Google's height model filled to the outline, else the hip split; lines corrected on the image. */
function findOtherFaces(
  paths: LatLngRing[],
  ctx: RoofDesignContext,
  { hipOnly = false }: { hipOnly?: boolean } = {},
): { source: FaceSource; faces: RoofFace[]; checks: LineCheck[]; moved: number } {
  const snap = ctx.snapshot ?? null;
  const detected = hipOnly ? null : detectRoofFaces(ctx.dsm ?? null, paths, ctx.mask ?? null);
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
  return { source, faces: corrected.faces, checks: corrected.checks, moved: corrected.moved };
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
  const kept = dedupePanels(keepPanelsClear(packed, faces.map((f) => f.ring), paths, dims, { clearM: DESIGN_RULES.edgeSetbackM }));
  // Nothing on what isn't the roof's surface (a courtyard, a gap, an existing array).
  const luma = ctx.snapshot?.luma;
  if (!luma) return kept;
  const off = new Set(panelsOffRoof(luma, faces.map((f) => f.ring), kept.map((p) => panelCorners(p, dims))));
  return off.size ? kept.filter((_, i) => !off.has(i)) : kept;
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
  return rankSquareReadings(rings, segs, snap.luma, { ...ROOF_DESIGN_LIMITS.relook, googleStale: googleDataStale(ctx) });
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
  /** Every roof's lines passed the priority tests (Google, then the image). */
  determined: boolean;
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
/**
 * Opus's border, straightened; as traced when straightening throws corners
 * far outside it (66 Frances St south-east row, 9 Nov 2026: a corner landed
 * 100+ m away and the border crossed itself).
 */
function straightenedOrAsTraced(outline: LatLngRing): LatLngRing[] {
  const rings = regularizeRoofOutlines([outline]);
  const lat0 = outline[0].lat;
  const mLat = 111_320;
  const mLng = mLat * Math.cos((lat0 * Math.PI) / 180);
  const lats = outline.map((p) => p.lat);
  const lngs = outline.map((p) => p.lng);
  const [s0, n0, w0, e0] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const out = (p: { lat: number; lng: number }) =>
    Math.max(s0 - p.lat, p.lat - n0, 0) * mLat > 3 || Math.max(w0 - p.lng, p.lng - e0, 0) * mLng > 3;
  return rings.length && !rings.some((r) => r.some(out)) ? rings : [outline];
}

export function designRoof(ctx: RoofDesignContext, opts: DesignRoofOptions = {}): RoofDesign | null {
  // Owner's rule: Opus traces every roof first. Its border is the outline
  // (straightened, corners kept); a person's outline (Edit, the API) still wins.
  const trace = !opts.outline && ctx.aiTrace?.outline && ctx.aiTrace.faces.length ? ctx.aiTrace : null;
  const initial: InitialRoofs | null = opts.outline
    ? { rings: opts.outline, source: "snapshot", traced: true }
    : trace
      ? { rings: straightenedOrAsTraced(trace.outline!), source: "ai-trace", traced: true }
      : initialRoofs(ctx, { placeholder: false });
  if (!initial) return null;
  // An outline given by a person (Edit, or the API's `outline`) or traced by Opus is kept, not replaced by another reading.
  const outline = confirmRoofOutlines(initial.rings, ctx, { userEdit: Boolean(opts.outline) || Boolean(trace) });
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
  const t = faceSet.trace;
  const notes = [
    ctx.aiTrace === null && !opts.outline && ctx.aiTracePending
      ? "EasyLink AI is still tracing and checking this roof against the photo: the design refreshes when it's done. Lines below are the engine's own reading for now."
      : ctx.aiTrace === null && !opts.outline
      ? "EasyLink AI couldn't trace this roof in time: it needs a hand trace (Edit the roof) before quoting. Lines below are the engine's own reading."
      : null,
    t && (t.faint > 0 || t.unconfirmed > 0)
      ? `Traced by EasyLink AI: ${t.lines} roof lines; ${t.faint} seen only faintly and ${t.unconfirmed} not confirmed in the image: check on site.`
      : null,
    needsVerification ? "Roof outline from Google's data or a building footprint, not traced from the image: check the roof shape." : null,
    panels.length === 0 ? "Roof found, but no face is big enough for a panel." : null,
    faceSet.evidence.some((e) => e.googleStale)
      ? `Google's roof data for this address is from ${ctx.estimate?.imageryDate?.slice(0, 4) ?? "years ago"} and doesn't match today's satellite image, so it wasn't used to confirm the faces. Confirm on site.`
      : null,
    faceSet.determined
      ? null
      : "Roof lines not fully determined: a roof's faces don't match Google's roof data or its lines aren't seen in the image. Use Relook roof or Edit, or confirm on site.",
    faceSet.obstructions.length > 0 ? `${faceSet.obstructions.length} possible vents, fans, antennas or level differences packed around: check on site.` : null,
  ].filter((n): n is string => Boolean(n));
  return {
    pin: ctx.pin,
    outline,
    outlineSource: initial.source,
    needsVerification,
    roofAreaM2: Math.round(outline.reduce((s, r) => s + ringAreaM2(r), 0)),
    faceSet,
    determined: faceSet.determined,
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
