import { paybackYears as paybackYearsOf } from "@/lib/proposal/savingsProjection";
import type { CustomerDesign, CustomerDesignProduct } from "@/lib/customers/designs";
import type { DesignOptionCard, DesignOptions } from "@/lib/customers/design-options";
import {
  batteryCapacityKwh,
  inverterRatedKw,
  productLabel,
  productsByCategory,
  systemSizeKwFrom,
} from "@/lib/designs/product-specs";

/**
 * The "spec sheet" on My design: the selected system in one place, worked out
 * only from the stored design and its matching design option. A figure that
 * isn't in the data stays undefined so the page can say "at quote" instead of
 * showing a guess.
 */

export type PriceBasis = "after-stc" | "quoted" | "equipment";

export type DesignSpecSheet = {
  title: string;
  kw?: number;
  panelCount?: number;
  panelModel?: string;
  panelWatts?: number;
  inverterModel?: string;
  inverterKw?: number;
  batteryModel?: string;
  batteryKwh?: number;
  hasBattery: boolean;
  hasEvCharger: boolean;
  annualKwh?: number;
  savingsPerYear?: number;
  /** The price the customer pays, on `priceBasis`. */
  price?: number;
  priceBasis: PriceBasis | null;
  /** Price before the STC discount, when the discount is known. */
  priceBeforeStc?: number;
  stcDiscount?: number;
  paybackYears?: number;
};

const positive = (n: unknown): number | undefined =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;

/** The design option card that describes this stored design, if any. */
export function optionForDesign(
  options: DesignOptions | null | undefined,
  designId: string | null | undefined,
): DesignOptionCard | undefined {
  if (!options || !designId) return undefined;
  return options.options.find((o) => o.designId === designId);
}

function first(design: CustomerDesign, category: string): CustomerDesignProduct | undefined {
  return productsByCategory(design.products, category)[0];
}

export function buildDesignSpecSheet(
  design: CustomerDesign,
  option?: DesignOptionCard,
): DesignSpecSheet {
  const panel = first(design, "panel");
  const inverter = first(design, "inverter");
  const battery = first(design, "battery");
  const ev = first(design, "ev charger");

  const kw = positive(systemSizeKwFrom(panel, design.panelCount)) ?? positive(option?.kw);
  const panelCount = positive(design.panelCount ?? panel?.quantity) ?? positive(option?.panelCount);
  const batteryKwh = positive(batteryCapacityKwh(battery)) ?? positive(option?.batteryKwh);
  const batteryModel = productLabel(battery) ?? option?.batteryModel ?? undefined;

  const solar = design.solarData as { yearlyEnergyDcKwh?: number } | null | undefined;
  const annualKwh = positive(solar?.yearlyEnergyDcKwh) ?? positive(option?.annualOutputKwh);
  const savingsPerYear = positive(design.estimatedSavings) ?? positive(option?.estimatedSavings);

  const equipmentTotal = positive(
    design.products?.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0),
  );
  let price: number | undefined;
  let priceBasis: PriceBasis | null = null;
  let priceBeforeStc: number | undefined;
  let stcDiscount: number | undefined;
  if (positive(option?.priceAfterStc)) {
    price = option!.priceAfterStc!;
    priceBasis = "after-stc";
    priceBeforeStc = positive(option?.price);
    stcDiscount = positive(option?.stcDiscount) ?? (priceBeforeStc && priceBeforeStc > price ? priceBeforeStc - price : undefined);
  } else if (positive(option?.price)) {
    price = option!.price;
    priceBasis = "quoted";
  } else if (equipmentTotal) {
    price = equipmentTotal;
    priceBasis = "equipment";
  }

  const paybackYears = paybackYearsOf(price, savingsPerYear) ?? undefined;

  return {
    title: design.title?.trim() || option?.title || "Your design",
    kw,
    panelCount,
    panelModel: productLabel(panel) ?? option?.panelModel ?? undefined,
    panelWatts: positive(panel?.product?.wattage),
    inverterModel: productLabel(inverter) ?? option?.inverterModel ?? undefined,
    inverterKw: positive(inverterRatedKw(inverter)),
    batteryModel,
    batteryKwh,
    hasBattery: Boolean(battery || batteryKwh),
    hasEvCharger: Boolean(ev),
    annualKwh,
    savingsPerYear,
    price,
    priceBasis,
    priceBeforeStc,
    stcDiscount,
    paybackYears,
  };
}

const num = (n: number) => new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(n);
export const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
export const kwLabel = (kw: number) => `${kw.toFixed(1)} kW`;
export const kwhLabel = (kwh: number) => `${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(kwh)} kWh`;

export function priceBasisLabel(basis: PriceBasis | null): string {
  switch (basis) {
    case "after-stc":
      return "after STCs, incl. GST";
    case "quoted":
      return "incl. GST";
    case "equipment":
      return "equipment total; STCs confirmed at quote";
    default:
      return "";
  }
}

export type DesignAiQuestion = { key: string; label: string; question: string };

/**
 * Pre-filled questions for EasyLink AI, built from the figures on screen so
 * the answer is about this system rather than solar in general. A question is
 * left out when the numbers it needs aren't there.
 */
export function designAiQuestions(s: DesignSpecSheet): DesignAiQuestion[] {
  const out: DesignAiQuestion[] = [];

  if (s.kw) {
    const panels = s.panelCount
      ? ` (${s.panelCount}${s.panelWatts ? ` × ${s.panelWatts} W` : ""} panels${s.panelModel ? `, ${s.panelModel}` : ""})`
      : "";
    const inverter = s.inverterModel
      ? ` with a ${s.inverterModel}${s.inverterKw ? ` ${s.inverterKw} kW` : ""} inverter`
      : "";
    const battery = s.batteryKwh ? ` and a ${kwhLabel(s.batteryKwh)} battery` : "";
    const output = s.annualKwh ? ` It's modelled to make ${num(s.annualKwh)} kWh a year.` : "";
    out.push({
      key: "size",
      label: "Why this size?",
      question: `Why is my ${s.title} system sized at ${kwLabel(s.kw)}${panels}${inverter}${battery}?${output} Is that right for my home?`,
    });
  }

  if (s.savingsPerYear) {
    const price = s.price ? ` and costs ${aud(s.price)} ${priceBasisLabel(s.priceBasis)}` : "";
    const stc = s.stcDiscount ? ` (STCs take ${aud(s.stcDiscount)} off)` : "";
    const payback = s.paybackYears ? `, so it pays for itself in about ${s.paybackYears} years` : "";
    out.push({
      key: "savings",
      label: "Explain my savings",
      question: `Explain my savings: my ${s.title} design is estimated to save ${aud(s.savingsPerYear)} a year${price}${stc}${payback}. What is that based on, and what could change it?`,
    });
  }

  if (s.kw) {
    out.push(
      s.hasBattery && s.batteryKwh
        ? {
            key: "battery",
            label: "Is my battery the right size?",
            question: `Is a ${kwhLabel(s.batteryKwh)} battery the right size for my ${kwLabel(s.kw)} solar system? How much does it add to my savings?`,
          }
        : {
            key: "battery",
            label: "What if I add a battery?",
            question: `What if I add a battery to my ${kwLabel(s.kw)} solar system? What size would suit my home, what would it add to my savings, and would the federal Cheaper Home Batteries rebate apply?`,
          },
    );
    if (!s.hasEvCharger) {
      out.push({
        key: "ev",
        label: "What if I add an EV charger?",
        question: `What if I add an EV charger to my ${kwLabel(s.kw)} solar system${s.batteryKwh ? ` with a ${kwhLabel(s.batteryKwh)} battery` : ""}? How much of my car's charging could my solar cover?`,
      });
    }
  }

  return out;
}
