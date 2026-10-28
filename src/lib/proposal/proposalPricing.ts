/**
 * Prices a Designs-page proposal with the quote engine (lib/pricing/quote-engine)
 * and estimates the bill savings from the design itself.
 *
 * Before this, the proposal showed a fixed $11,200 (the Redux default) for
 * every design and savings of a fixed 26% of the bill, whatever the system
 * size (reported on a 22.8 kW design: $11,200, $79/month). Now:
 *  - price: panels, inverter, battery, install, margin, GST, less solar and
 *    battery STCs, from the price book (SAMPLE_PRICE_BOOK until the real one
 *    is loaded from the Master price book);
 *  - inverter: sized under EasyLink's rules — 200% DC:AC with a hybrid
 *    inverter or battery, 133% otherwise; three-phase once the inverter is
 *    above 10 kW (export limit 10 kW per phase);
 *  - savings: generation (CER zone rating, kWh per kW) used in the home
 *    first, then stored in the battery, the rest exported at the feed-in
 *    tariff; the bill is what's left.
 *
 * Tariff defaults (NSW, Ausgrid area, 2026–27) — change in TARIFF_DEFAULTS:
 *  - AER Default Market Offer: $1,899 a year for 3,900 kWh flat rate, which
 *    is about 38 c/kWh with a supply charge of about $1.10 a day;
 *  - IPART all-day solar feed-in benchmark: 3.4–6.5 c/kWh (5 c used).
 */
import {
  SAMPLE_PRICE_BOOK,
  ZONE_RATINGS,
  priceQuote,
  type PriceBook,
  type QuoteInputs,
  type QuoteResult,
} from "@/lib/pricing/quote-engine";
import { DESIGN_RULES } from "@/lib/designer/designRules";

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

/** Panel tier ids on the proposal → panel ids in the price book. */
const TIER_PANEL: Record<string, string> = { standard: "p1", premium: "p2", allBlack: "p3" };

function withBattery(pb: PriceBook, kwh: number): PriceBook {
  if (pb.batteries.some((b) => b.kwh === kwh)) return pb;
  return {
    ...pb,
    batteries: [
      ...pb.batteries,
      { id: `b-${kwh}`, model: `LFP battery ${kwh} kWh`, kwh, supply: Math.round(kwh * 430), install: kwh <= 20 ? 1100 : kwh <= 50 ? 1600 : 2200 },
    ],
  };
}

export type ProposalPricingInput = {
  panelCount: number;
  panelTierId?: string;
  /** Usable kWh, or 0/undefined for no battery. */
  batteryKwh?: number;
  /** Install date (ISO); STCs depend on it. Default: 30 days from now. */
  installDate?: string;
  priceBook?: PriceBook;
};

export type ProposalPricing = {
  quote: QuoteResult;
  /** What the customer pays, inc GST, after STCs. */
  total: number;
  phase: 1 | 3;
};

/** Prices one design; tries single phase first, three phase if the inverter needs it. */
export function priceProposal(input: ProposalPricingInput): ProposalPricing {
  const kwh = input.batteryKwh && input.batteryKwh > 0 ? input.batteryKwh : 0;
  const base = input.priceBook ?? SAMPLE_PRICE_BOOK;
  const hybrid = kwh > 0;
  const pb0 = hybrid ? withBattery(base, kwh) : base;
  // EasyLink's oversizing rule: 200% with a hybrid inverter or battery, 133% otherwise.
  const pb: PriceBook = {
    ...pb0,
    settings: {
      ...pb0.settings,
      dcac: hybrid ? DESIGN_RULES.dcAcRatioHybridOrBattery : DESIGN_RULES.dcAcRatioStandard,
      singleMax: DESIGN_RULES.exportLimitKwPerPhase,
      threeMax: DESIGN_RULES.exportLimitKwPerPhase * 3,
    },
  };
  const date = input.installDate ?? new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);
  const battery = pb.batteries.find((b) => b.kwh === kwh);
  const q = (phase: 1 | 3): QuoteInputs => ({
    type: hybrid ? "combo" : "solar",
    panelId: TIER_PANEL[input.panelTierId ?? "standard"] ?? "p1",
    count: Math.max(0, Math.round(input.panelCount)),
    inverterId: "auto",
    batteryId: battery?.id ?? pb.batteries[0].id,
    existing: true,
    zone: TARIFF_DEFAULTS.zone,
    phase,
    date,
    install: true,
    stc: true,
    extras: {},
  });
  let phase: 1 | 3 = 1;
  let quote = priceQuote(pb, q(1));
  if (quote.blocks.length > 0) {
    phase = 3;
    quote = priceQuote(pb, q(3));
  }
  if (quote.blocks.length > 0 && !hybrid) {
    // Too many panels for a string inverter at 133%: a hybrid inverter
    // (battery-ready) carries up to 200% of its rating, so quote solar on
    // the hybrid range instead.
    const hybridOnly: PriceBook = {
      ...pb,
      settings: { ...pb.settings, dcac: DESIGN_RULES.dcAcRatioHybridOrBattery },
      inverters: pb.inverters.filter((i) => i.kind === "Hybrid").map((i) => ({ ...i, kind: "String" as const })),
    };
    for (const ph of [1, 3] as const) {
      const alt = priceQuote(hybridOnly, q(ph));
      if (alt.blocks.length === 0) {
        quote = alt;
        phase = ph;
        break;
      }
    }
  }
  return { quote, total: Math.round(quote.net), phase };
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
