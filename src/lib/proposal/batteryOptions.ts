/**
 * Battery options (owner, 9 Nov 2026): the customer can pick up to three
 * battery sizes for the same roof design and compare them side by side;
 * each option is quoted on its own (one quote version per option, and
 * accepting one supersedes the others).
 */
import { estimateSavings, type ProposalPricingResponse } from "./proposalPricing";

export const MAX_BATTERY_OPTIONS = 3;
export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/** Usable kWh of a battery option id ("14.6kwh" → 14.6, "none" → 0). */
export function optionKwh(id: string): number {
  const n = Number.parseFloat(id);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * The options after a tap on a battery tile:
 *  - a size not in the options is added (up to three) and shown;
 *  - a size in the options but not shown is shown;
 *  - the shown size is taken out (the next option is shown), unless it's the only one.
 */
export function tapBatteryOption(
  ids: string[],
  shown: string,
  id: string,
  max = MAX_BATTERY_OPTIONS,
): { ids: string[]; shown: string; full?: boolean } {
  if (!ids.includes(id)) {
    if (ids.length >= max) return { ids, shown, full: true };
    return { ids: sortOptions([...ids, id]), shown: id };
  }
  if (id !== shown) return { ids, shown: id };
  if (ids.length === 1) return { ids, shown };
  const rest = ids.filter((x) => x !== id);
  return { ids: rest, shown: rest[0] };
}

/** Options in size order (None first), so A is always the smallest. */
export function sortOptions(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => optionKwh(a) - optionKwh(b));
}

export type BatteryOptionRow = {
  id: string;
  letter: string;
  kwh: number;
  /** The battery the price list has for this size, if any. */
  model: string | null;
  estimated: boolean;
  /** Total price after STCs and rebates; null when it can't be priced. */
  total: number | null;
  monthlySavings: number;
  newBill: number;
  yearlySavings: number;
  paybackYears: number | null;
  /** 25 years of savings less the price, savings growing with power prices. */
  net25: number | null;
  recommended: boolean;
};

/** Yearly power-price rise used for the 25-year figure (same as the proposal's projection). */
export const PRICE_RISE = 0.035;

export function batteryOptionRows(
  ids: string[],
  priced: Pick<ProposalPricingResponse, "batteryTotals" | "batteryInfo"> | null,
  monthlyBill: number,
  arrayKw: number,
): BatteryOptionRow[] {
  const rows = sortOptions(ids).map((id, i): BatteryOptionRow => {
    const kwh = optionKwh(id);
    const key = String(kwh);
    const total = priced?.batteryTotals?.[key] ?? null;
    const info = priced?.batteryInfo?.[key];
    const s = estimateSavings(monthlyBill, arrayKw, kwh);
    const payback = total != null && s.yearlySavings > 0 ? total / s.yearlySavings : null;
    let saved = 0;
    for (let y = 0; y < 25; y++) saved += s.yearlySavings * (1 + PRICE_RISE) ** y;
    return {
      id,
      letter: OPTION_LETTERS[i] ?? String(i + 1),
      kwh,
      model: kwh > 0 ? info?.model ?? null : null,
      estimated: Boolean(kwh > 0 && info?.estimated),
      total,
      monthlySavings: s.monthlySavings,
      newBill: s.newBill,
      yearlySavings: s.yearlySavings,
      paybackYears: payback,
      net25: total != null ? saved - total : null,
      recommended: false,
    };
  });
  // Recommended: the quickest payback (a price-list battery over an estimate).
  const best = rows
    .filter((r) => r.paybackYears != null)
    .sort((a, b) => Number(a.estimated) - Number(b.estimated) || a.paybackYears! - b.paybackYears!)[0];
  if (best && rows.length > 1) best.recommended = true;
  return rows;
}
