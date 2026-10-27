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
  /** Panel (DC) to inverter (AC) ratio allowed when the system includes a battery. */
  dcAcRatioWithBattery: 2.0,
  /** Panel to inverter ratio allowed without a battery (CEC 133% rule for STCs). */
  dcAcRatioWithoutBattery: 1.33,
  /** Network export limit per phase — Ausgrid and Endeavour Energy. */
  exportLimitKwPerPhase: 10,
} as const;

export type InverterSizing = {
  arrayKw: number;
  /** Smallest inverter that keeps the array within the oversizing allowance. */
  minInverterKwWithBattery: number;
  minInverterKwWithoutBattery: number;
  /** Phases needed so the inverter's full output stays within the per-phase export limit. */
  phasesWithBattery: 1 | 3;
  phasesWithoutBattery: 1 | 3;
};

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
