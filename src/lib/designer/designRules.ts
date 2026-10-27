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
  /** Panel (DC) to inverter (AC) ratio allowed with a hybrid inverter — a battery is not required. */
  dcAcRatioHybridInverter: 2.0,
  /** Panel to inverter ratio allowed with a standard (non-hybrid) inverter — CEC 133% rule for STCs. */
  dcAcRatioStandardInverter: 1.33,
  /** Network export limit per phase — Ausgrid and Endeavour Energy. */
  exportLimitKwPerPhase: 10,
} as const;

export type InverterSizing = {
  arrayKw: number;
  /** Smallest inverter that keeps the array within the oversizing allowance. */
  minHybridInverterKw: number;
  minStandardInverterKw: number;
  /** Phases needed so the inverter's full output stays within the per-phase export limit. */
  phasesHybrid: 1 | 3;
  phasesStandard: 1 | 3;
};

/** Panel : inverter limit (%) — 200% with a hybrid inverter (battery optional), 133% otherwise. */
export function dcAcLimitPercent(hybridInverter: boolean): number {
  return Math.round(
    (hybridInverter
      ? DESIGN_RULES.dcAcRatioHybridInverter
      : DESIGN_RULES.dcAcRatioStandardInverter) * 100,
  );
}

/** How the limit is described on screen. */
export function dcAcLimitLabel(hybridInverter: boolean): string {
  return hybridInverter
    ? `${dcAcLimitPercent(true)}% hybrid inverter limit`
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
  const withBattery = roundUp1dp(arrayKw / DESIGN_RULES.dcAcRatioHybridInverter);
  const withoutBattery = roundUp1dp(
    arrayKw / DESIGN_RULES.dcAcRatioStandardInverter,
  );
  return {
    arrayKw,
    minHybridInverterKw: withBattery,
    minStandardInverterKw: withoutBattery,
    phasesHybrid: phasesFor(withBattery),
    phasesStandard: phasesFor(withoutBattery),
  };
}
