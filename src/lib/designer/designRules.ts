/**
 * EasyLink design rules — the defaults every roof layout and system size on
 * the Designs page follows. Kept in one place so the installer and master
 * tools can adopt the same numbers later.
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
   * Panel (DC) to inverter (AC) ratio allowed when a battery is installed
   * (AC- or DC-coupled), per the CEC design guidelines from 21 June 2024 —
   * and only up to the inverter manufacturer's own oversizing limit.
   */
  dcAcRatioWithBattery: 2.0,
  /** Panel to inverter ratio allowed without a battery — CEC 133% rule for STCs. */
  dcAcRatioWithoutBattery: 1.33,
  /** Network export limit per phase — Ausgrid and Endeavour Energy. */
  exportLimitKwPerPhase: 10,
  /** Pitch assumed when Google has no roof data — a typical Australian tiled roof. */
  defaultRoofPitchDeg: 22.5,
  /** Pitches above this are treated as data noise and capped. */
  maxRoofPitchDeg: 45,
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
  minInverterKwWithBattery: number;
  minInverterKwWithoutBattery: number;
  /** Phases needed so the inverter's full output stays within the per-phase export limit. */
  phasesWithBattery: 1 | 3;
  phasesWithoutBattery: 1 | 3;
};

/** Panel : inverter limit (%) — 200% when a battery is installed, 133% otherwise. */
export function dcAcLimitPercent(withBattery: boolean): number {
  return Math.round(
    (withBattery
      ? DESIGN_RULES.dcAcRatioWithBattery
      : DESIGN_RULES.dcAcRatioWithoutBattery) * 100,
  );
}

/** How the limit is described on screen. */
export function dcAcLimitLabel(withBattery: boolean): string {
  return withBattery
    ? `${dcAcLimitPercent(true)}% limit with a battery`
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
  const withBattery = roundUp1dp(arrayKw / DESIGN_RULES.dcAcRatioWithBattery);
  const withoutBattery = roundUp1dp(
    arrayKw / DESIGN_RULES.dcAcRatioWithoutBattery,
  );
  return {
    arrayKw,
    minInverterKwWithBattery: withBattery,
    minInverterKwWithoutBattery: withoutBattery,
    phasesWithBattery: phasesFor(withBattery),
    phasesWithoutBattery: phasesFor(withoutBattery),
  };
}
