/**
 * EasyLink design rules — the defaults every roof layout and system size on
 * the Designs page follows. Kept in one place so the installer and master
 * tools can adopt the same numbers later.
 *
 * The full process (outline, faces, line checks, obstructions, packing) and
 * the lessons log of what went wrong on real roofs and why is in
 * docs/ROOF_DESIGN_PROCESS.md — add to it whenever a design comes out wrong.
 */

export type PanelOrientation = "PORTRAIT" | "LANDSCAPE";

export const DESIGN_RULES = {
  /** Clearance kept between every panel and the roof outline (eaves, hips, ridges, edges). */
  edgeSetbackM: 0.1,
  /** Gap between neighbouring panels in a row or column (mid-clamp width). */
  panelGapM: 0.02,
  /**
   * One orientation for the whole design: every panel on every roof is either
   * portrait or landscape, never mixed. Portrait is the starting choice.
   */
  defaultOrientation: "PORTRAIT" as PanelOrientation,
  /**
   * Panel (DC) to inverter (AC) ratio allowed with a hybrid inverter (battery
   * optional — hybrid makers rate them for 200%) or with any AC- or
   * DC-coupled battery (CEC design guidelines from 21 June 2024). EasyLink
   * treats these as STC-eligible up to this ratio.
   */
  dcAcRatioHybridOrBattery: 2.0,
  /** Panel to inverter ratio for a standard inverter with no battery — CEC 133% rule for STCs. */
  dcAcRatioStandard: 1.33,
  /** Network export limit per phase — Ausgrid and Endeavour Energy. */
  exportLimitKwPerPhase: 10,
  /** Pitch assumed when Google has no roof data — a typical Australian tiled roof. */
  defaultRoofPitchDeg: 22.5,
  /** Pitches above this are treated as data noise and capped. */
  maxRoofPitchDeg: 45,
  /**
   * Alignment rule: every array's rows run parallel to the building's main
   * walls. A roof whose own edge is within this many degrees of the main axis
   * (or of the axis at 90° to it) is snapped onto it; only a genuinely angled
   * wing beyond this keeps its own edge.
   */
  alignmentSnapDeg: 30,
  /**
   * Roof-line rule: traced roof edges within this many degrees of the main
   * walls, of 90° to them, or of 45° (hips and valleys) are straightened onto
   * that direction, and each corner is rebuilt where its two lines meet.
   */
  roofLineSnapDeg: 20,
  /** Corners of neighbouring roofs closer than this are merged into one shared corner. */
  roofCornerMergeM: 0.3,
  /**
   * Roof-line check: a line is confirmed when it sits within this distance of
   * the edge found in Google's imagery — the roof mask for eaves, a brightness
   * change between faces for hips, valleys and ridges.
   */
  roofLineToleranceM: 0.1,
  /** Eaves found further than the tolerance (but within this) are moved onto the roof edge. */
  eaveMaxShiftM: 2.0,
  /**
   * PRIORITY RULE — intersection points (owner, 9 Nov 2026, 12 Fursorb St,
   * Marayong): roof lines meet at points — an apex, where hips meet a ridge,
   * where a wing's ridge meets a valley, a hip at an eave corner. Each such
   * point is ONE point shared by every line that meets there, and it is
   * placed where those lines meet in the image: moved (up to `maxShiftM`)
   * to where all its lines together best match the edges and capping lines
   * seen, never line by line. Lines stay straight and connected; faces stay
   * simple and inside the roof. Applied to every roof design, whatever
   * produced the faces (Google's segments, the height model, the hip split,
   * the AI's reading, a relook). Outline corners stay on the border's
   * corners (`moveCorners`), which the border rules set.
   */
  /**
   * Flat roofs (owner, 9 Nov 2026, 66 Frances St): a roof under this pitch
   * keeps only the lines the image shows — faces either side of a line that
   * isn't visible are one face, and a roof with no visible lines is one flat
   * face. ("If there is no visible roof line connecting two intersection
   * points, do not consider a split. Roof can be flat too.")
   */
  flatRoofMaxPitchDeg: 5,
  /**
   * MOST IMPORTANT RULE (owner, 9 Nov 2026): on every roof, identify the
   * visible lines and the visible intersections first; faces follow them.
   * - Flat roofs (under flatRoofMaxPitchDeg): only visible lines are roof
   *   lines — sections are the closed shapes the visible lines make, meeting
   *   at their intersections (flatSections.ts).
   * - Pitched roofs (owner's choice "a"): a hip, valley or ridge the roof's
   *   shape needs stays even where the image shows it only faintly (two
   *   faces lit alike), marked "check on site" — never dropped, because a
   *   panel must never sit across one.
   */
  visibleLinesFirst: true,
  /**
   * Shadows (owner, 9 Nov 2026): a shadow means something higher beside it.
   * Roof lines take priority — the edge casting a shadow is a roof line when
   * it meets the border or another roof line at an intersection point (a
   * step, raised box, parapet); only a shadow whose edge connects to no line
   * is an obstruction (vent, fan, antenna).
   */
  shadowEdgesAreRoofLines: true,
  roofJunctions: {
    maxShiftM: 1.0,
    /** A point moves only when its lines' match improves by this share. */
    minGain: 0.1,
    moveCorners: false,
    cornerMaxShiftM: 0.5,
  },
} as const;

/**
 * Pitch to lay panels out at: Google's roof segments, weighted by area, when
 * real (non-estimated) data exists — otherwise the default tiled-roof pitch.
 */
export function roofPitchDegrees(
  segments: { pitchDegrees: number; areaM2: number }[] | undefined,
  estimated = false,
): number {
  const usable = (segments ?? []).filter(
    (s) => Number.isFinite(s.pitchDegrees) && s.areaM2 > 0,
  );
  const totalArea = usable.reduce((sum, s) => sum + s.areaM2, 0);
  if (estimated || totalArea <= 0) return DESIGN_RULES.defaultRoofPitchDeg;
  const weighted =
    usable.reduce((sum, s) => sum + s.pitchDegrees * s.areaM2, 0) / totalArea;
  return Math.min(Math.max(weighted, 0), DESIGN_RULES.maxRoofPitchDeg);
}

export type InverterSizing = {
  arrayKw: number;
  /** Smallest inverter that keeps the array within the oversizing allowance. */
  minInverterKwHybridOrBattery: number;
  minInverterKwStandard: number;
  /** Phases needed so the inverter's full output stays within the per-phase export limit. */
  phasesHybridOrBattery: 1 | 3;
  phasesStandard: 1 | 3;
};

/** Panel : inverter limit (%) — 200% with a hybrid inverter or a battery, 133% otherwise. */
export function dcAcLimitPercent(hybridOrBattery: boolean): number {
  return Math.round(
    (hybridOrBattery
      ? DESIGN_RULES.dcAcRatioHybridOrBattery
      : DESIGN_RULES.dcAcRatioStandard) * 100,
  );
}

/** How the limit is described on screen. */
export function dcAcLimitLabel(hybridOrBattery: boolean): string {
  return hybridOrBattery
    ? `${dcAcLimitPercent(true)}% hybrid / battery limit`
    : `${dcAcLimitPercent(false)}% STC limit`;
}

const roundUp1dp = (n: number) => Math.ceil(n * 10 - 1e-9) / 10;

function phasesFor(inverterKw: number): 1 | 3 {
  return inverterKw <= DESIGN_RULES.exportLimitKwPerPhase + 1e-9 ? 1 : 3;
}

export function inverterSizingFor(
  panelCount: number,
  panelWatts: number,
): InverterSizing {
  const arrayKw = Math.max(0, (panelCount * panelWatts) / 1000);
  const withBattery = roundUp1dp(arrayKw / DESIGN_RULES.dcAcRatioHybridOrBattery);
  const withoutBattery = roundUp1dp(
    arrayKw / DESIGN_RULES.dcAcRatioStandard,
  );
  return {
    arrayKw,
    minInverterKwHybridOrBattery: withBattery,
    minInverterKwStandard: withoutBattery,
    phasesHybridOrBattery: phasesFor(withBattery),
    phasesStandard: phasesFor(withoutBattery),
  };
}
