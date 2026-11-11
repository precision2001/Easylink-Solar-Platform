/**
 * One savings projection for every figure the customer sees (12 Nov 2026):
 * the proposal's Payback and 25-Year Net Savings, the PDF, the battery
 * comparison, the customer's design pages and the call screen all used to work
 * these out differently (simple payback on one card, a 3% rise on another, a
 * 3.5% rise with no panel ageing on a third), so the numbers disagreed.
 *
 * Year 1 saves `yearly`; each later year power prices rise 3% and the panels
 * lose 0.4% of their output. Payback is the point where the savings to date
 * have paid for the system, on that same curve, so it always agrees with the
 * 25-year figure.
 */
export const PRICE_RISE_A_YEAR = 0.03;
export const PANEL_LOSS_A_YEAR = 0.004;
export const PROJECTION_YEARS = 25;
/** Past this, a system is not shown as paying for itself. */
const PAYBACK_LIMIT_YEARS = 40;

/** Savings in year `i` (0 = the first year). */
export function yearSaving(yearly: number, i: number): number {
  return yearly * (1 + PRICE_RISE_A_YEAR) ** i * (1 - PANEL_LOSS_A_YEAR) ** i;
}

/** Savings to date less the price, at the end of each year. */
export function cumulativeGain(yearly: number, price: number | null, years = PROJECTION_YEARS): number[] {
  const out: number[] = [];
  let total = -(price ?? 0);
  for (let i = 0; i < years; i++) {
    total += yearSaving(yearly, i);
    out.push(total);
  }
  return out;
}

/** Net savings over the projection (25 years), or null without a price or savings. */
export function netSavings(yearly: number, price: number | null, years = PROJECTION_YEARS): number | null {
  if (price == null || !(price > 0) || !(yearly > 0)) return null;
  return cumulativeGain(yearly, price, years).at(-1) ?? null;
}

/** Years until the savings have paid for the system (to 0.1), or null. */
export function paybackYears(price: number | null | undefined, yearly: number | null | undefined): number | null {
  if (price == null || !(price > 0) || yearly == null || !(yearly > 0)) return null;
  let left = price;
  for (let i = 0; i < PAYBACK_LIMIT_YEARS; i++) {
    const s = yearSaving(yearly, i);
    if (s >= left) return Math.round((i + left / s) * 10) / 10;
    left -= s;
  }
  return null;
}

/** "12.2 yrs", or "" when it doesn't pay back. */
export function paybackLabel(price: number | null | undefined, yearly: number | null | undefined): string {
  const y = paybackYears(price, yearly);
  return y == null ? "" : `${y.toFixed(1)} yrs`;
}
