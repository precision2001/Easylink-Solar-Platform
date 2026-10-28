import type { DesignProposalState } from "@/lib/store/designProposalSlice";

/**
 * Year-by-year financial / energy projection for proposal PDFs.
 *
 * Source fields (Redux `designProposal`):
 * - `pricing.currentBill`, `pricing.newBill` — treated as **monthly** AUD (matches energy step + hero merge).
 * - `pricing.totalSystemPrice` — upfront system cost (year 1 only), net of dealer incentives label in PDF.
 * - `summary.systemSize` — "X.X kW" for estimated solar yield.
 *
 * Not stored in Redux (modelled with industry defaults below):
 * - **Grid effective price** ($/kWh): maps year-1 “before solar” spend → implied annual consumption (kWh).
 * - **Solar yield**: kWh generated per kW in year 1 (then annual degradation applied).
 * - **Utility escalation**: compound annual increase on grid bills (before & after columns).
 * - **Solar degradation**: compound annual loss on inverter-side generation output.
 *
 * Column logic (matches common proposal spreadsheet patterns):
 * - Utility (before)ᵧ = annualBefore₁ × (1 + utilityEscalation)ᵏ, k = yearIndex.
 * - Utility (after)ᵧ = annualAfter₁ × (1 + utilityEscalation)ᵏ — same escalation on the residual bill.
 * - Annual savingsᵧ = beforeᵧ − afterᵧ.
 * - System costsᵧ = upfront total in the **first projection year only**, else 0.
 * - Net savingsᵧ = annualSavingsᵧ − systemCostsᵧ + customerIncentivesᵧ.
 * - Cumulativeᵧ = Σ net savings over prior years including this row.
 */

export type FinancialProjectionYearRow = {
  calendarYear: number;
  electricityConsumptionKwh: number;
  solarGenerationKwh: number;
  utilityBillBefore: number;
  utilityBillAfter: number;
  annualSavings: number;
  systemCostsNet: number;
  customerIncentives: number;
  netSavings: number;
  cumulativeImpacts: number;
};

export type FinancialProjectionAssumptions = {
  projectionYears: number;
  startYear: number;
  /** Fraction per year, e.g. 0.03 */
  utilityEscalationAnnual: number;
  /** Fraction loss per year on generation, e.g. 0.004 */
  solarDegradationAnnual: number;
  /** Implied retail $/kWh for consumption estimate */
  gridEffectivePricePerKwh: number;
  /** Year-1 AC kWh per kW installed */
  solarYieldKwhPerKwYear1: number;
};

export const DEFAULT_FINANCIAL_PROJECTION_ASSUMPTIONS: FinancialProjectionAssumptions =
  {
    projectionYears: 14,
    startYear: new Date().getFullYear(),
    utilityEscalationAnnual: 0.03,
    solarDegradationAnnual: 0.004,
    // AER DMO 2026-27, Ausgrid flat rate: about 38 c/kWh.
    gridEffectivePricePerKwh: 0.38,
    // CER zone 3 (Sydney) rating: 1.382 MWh per kW a year. Was 3435, about 2.5x too high.
    solarYieldKwhPerKwYear1: 1382,
  };

function parseMoneyToNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseSystemKw(systemSize: string): number {
  const m = systemSize.match(/([\d.]+)\s*kW/i);
  if (m) {
    const n = Number.parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 6.6;
}

function roundMoney(n: number): number {
  return Math.round(n);
}

function roundKwh(n: number): number {
  return Math.round(n);
}

export function buildFinancialProjectionFromProposal(
  proposal: DesignProposalState,
  assumptions: FinancialProjectionAssumptions = DEFAULT_FINANCIAL_PROJECTION_ASSUMPTIONS,
): {
  rows: FinancialProjectionYearRow[];
  assumptions: FinancialProjectionAssumptions;
} {
  const monthlyBefore =
    parseMoneyToNumber(proposal.pricing.currentBill) ?? 500;
  const monthlyAfter = parseMoneyToNumber(proposal.pricing.newBill) ?? 368;
  const upfrontSystem =
    parseMoneyToNumber(proposal.pricing.totalSystemPrice) ?? 11200;

  const annualBefore1 = monthlyBefore * 12;
  const annualAfter1 = monthlyAfter * 12;

  const systemKw = parseSystemKw(proposal.summary.systemSize);
  const solarGenYear1 = systemKw * assumptions.solarYieldKwhPerKwYear1;

  const consumptionKwh = roundKwh(
    annualBefore1 / assumptions.gridEffectivePricePerKwh,
  );

  const incentivesYear1 = 0;

  const { projectionYears, startYear } = assumptions;
  const uEsc = assumptions.utilityEscalationAnnual;
  const deg = assumptions.solarDegradationAnnual;

  const rows: FinancialProjectionYearRow[] = [];
  let cumulative = 0;

  for (let i = 0; i < projectionYears; i++) {
    const calendarYear = startYear + i;
    const utilityBefore = annualBefore1 * (1 + uEsc) ** i;
    const utilityAfter = annualAfter1 * (1 + uEsc) ** i;
    const annualSavings = utilityBefore - utilityAfter;

    const solarGeneration =
      solarGenYear1 * (1 - deg) ** i;

    const systemCosts = i === 0 ? upfrontSystem : 0;
    const customerIncentives = i === 0 ? incentivesYear1 : 0;

    const netSavings =
      annualSavings - systemCosts + customerIncentives;
    cumulative += netSavings;

    rows.push({
      calendarYear,
      electricityConsumptionKwh: consumptionKwh,
      solarGenerationKwh: roundKwh(solarGeneration),
      utilityBillBefore: roundMoney(utilityBefore),
      utilityBillAfter: roundMoney(utilityAfter),
      annualSavings: roundMoney(annualSavings),
      systemCostsNet: roundMoney(systemCosts),
      customerIncentives: roundMoney(customerIncentives),
      netSavings: roundMoney(netSavings),
      cumulativeImpacts: roundMoney(cumulative),
    });
  }

  return { rows, assumptions };
}
