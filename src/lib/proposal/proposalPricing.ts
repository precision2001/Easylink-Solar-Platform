/**
 * Prices a Designs-page proposal with the EasyLink pricing engine v2, which
 * runs in the backend (POST /api/pricing/proposal → /pricing/proposal) so the
 * trade price book never reaches the browser.
 *
 * The backend applies EasyLink's rules: supplier trade costs + margin + GST,
 * EasyLink installation rates, inverter sizing at 200% DC:AC with a hybrid
 * inverter or battery (133% string only), 10 kW per phase, built-in-inverter
 * battery packages, matching inverter brands, and solar + tiered battery STCs.
 *
 * Savings are still estimated here from the design (`estimateSavings`).
 *
 * Tariff defaults (NSW, Ausgrid area, 2026–27) — change in TARIFF_DEFAULTS:
 *  - AER Default Market Offer: $1,899 a year for 3,900 kWh flat rate, which
 *    is about 38 c/kWh with a supply charge of about $1.10 a day;
 *  - IPART all-day solar feed-in benchmark: 3.4–6.5 c/kWh (5 c used).
 */
import { ZONE_RATINGS } from "@/lib/pricing/quote-engine";

export const TARIFF_DEFAULTS = {
  /** Usage price, $/kWh. */
  usagePerKwh: 0.38,
  /** Supply charge, $/day. */
  supplyPerDay: 1.1,
  /** Feed-in tariff, $/kWh. */
  feedInPerKwh: 0.05,
  /**
   * Share of solar generation used in the home as it's made, without a
   * battery — and never more than this share of the home's own use.
   */
  directUseOfGeneration: 0.3,
  directUseOfConsumption: 0.45,
  /** Battery cycles a year, and usable round-trip share. */
  batteryCyclesPerYear: 300,
  batteryRoundTrip: 0.9,
  /** CER zone for Sydney. */
  zone: 3,
};

export type ProposalPricingRequest = {
  panelCount: number;
  panelTierId?: string;
  /** Usable kWh, or 0 for no battery. */
  batteryKwh?: number;
  installDate?: string;
  zone?: number;
  tiers?: string[];
  batteryOptionsKwh?: number[];
};

/** Customer prices only — the backend never returns costs or suppliers. */
export type ProposalQuote = {
  items: { item: string; qty: number }[];
  itemTotal: number;
  installTotal: number;
  priceBeforeStcs: number;
  stcCount: number;
  stcValue: number;
  stcLines: { label: string; count: number; value: number }[];
  net: number;
  arrayKw: number;
  phase: 1 | 3;
  panel: { model: string; w: number } | null;
  inverter: { model: string; kw: number; phase: 1 | 3 } | null;
  battery: { model: string; kwh: number; inverterBuiltIn: boolean } | null;
  blocks: string[];
  notes: string[];
  /** Battery priced by estimate (no single product that size in the price list). */
  estimated?: boolean;
};

export type ProposalPricingResponse = {
  selected: ProposalQuote;
  /** Net price for each panel tier, same battery. */
  tierTotals: Record<string, number>;
  /** The panel behind each tier. */
  tierInfo: Record<string, { model: string; w: number }>;
  /**
   * Net price for each battery option (keyed by kWh), same tier: a product in
   * the price list where one fits, else an estimate from the nearest range.
   */
  batteryTotals: Record<string, number>;
  /** The product behind each battery option, and whether its price is an estimate. */
  batteryInfo?: Record<string, { model: string; kwh: number; estimated?: boolean }>;
  /** Largest home battery in the price list (usable kWh). */
  largestBatteryKwh?: number;
  installDate: string;
  zone: number;
};

/** Asks the backend for customer prices for a design. */
export async function fetchProposalPricing(
  req: ProposalPricingRequest,
  signal?: AbortSignal,
): Promise<ProposalPricingResponse> {
  const res = await fetch("/api/pricing/proposal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  const payload = (await res.json().catch(() => null)) as { data?: ProposalPricingResponse; message?: string } | null;
  if (!res.ok || !payload?.data) {
    throw new Error(payload?.message || `Pricing failed (${res.status})`);
  }
  return payload.data;
}

export type SavingsEstimate = {
  consumptionKwh: number;
  generationKwh: number;
  selfUsedKwh: number;
  batteryKwh: number;
  exportedKwh: number;
  /** Monthly, $. */
  currentBill: number;
  newBill: number;
  monthlySavings: number;
  yearlySavings: number;
};

/**
 * Annual energy balance for a monthly bill and a design. Generation is the
 * CER zone rating per kW (Sydney: 1.382 MWh per kW a year).
 */
export function estimateSavings(
  monthlyBill: number,
  arrayKw: number,
  batteryKwh = 0,
  t = TARIFF_DEFAULTS,
): SavingsEstimate {
  const annualBill = Math.max(0, monthlyBill) * 12;
  const supply = t.supplyPerDay * 365;
  const consumption = Math.max(0, annualBill - supply) / t.usagePerKwh;
  const generation = arrayKw * (ZONE_RATINGS[t.zone] ?? 1.382) * 1000;
  const direct = Math.min(generation * t.directUseOfGeneration, consumption * t.directUseOfConsumption);
  const stored =
    batteryKwh > 0
      ? Math.min(
          batteryKwh * t.batteryCyclesPerYear * t.batteryRoundTrip,
          Math.max(0, consumption - direct),
          Math.max(0, generation - direct) * t.batteryRoundTrip,
        )
      : 0;
  const exported = Math.max(0, generation - direct - stored / t.batteryRoundTrip);
  const gridKwh = Math.max(0, consumption - direct - stored);
  // The bill keeps the supply charge; feed-in credits can bring it to zero but not below.
  const newAnnual = Math.max(0, supply + gridKwh * t.usagePerKwh - exported * t.feedInPerKwh);
  const yearly = Math.max(0, annualBill - newAnnual);
  return {
    consumptionKwh: Math.round(consumption),
    generationKwh: Math.round(generation),
    selfUsedKwh: Math.round(direct),
    batteryKwh: Math.round(stored),
    exportedKwh: Math.round(exported),
    currentBill: monthlyBill,
    newBill: newAnnual / 12,
    monthlySavings: yearly / 12,
    yearlySavings: yearly,
  };
}
