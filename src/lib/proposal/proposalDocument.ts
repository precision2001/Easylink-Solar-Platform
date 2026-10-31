/**
 * Everything the 10-page customer proposal prints, worked out from one design.
 *
 * Pure (no fetches, no DOM) so every figure is testable. The async loader
 * (`loadProposalDocument`) gathers the inputs: the backend price for the
 * design, QR codes and images.
 *
 * Numbers follow the Designs page's proposal step so the PDF matches what the
 * customer saw on screen: savings from `estimateSavings` (same tariffs), price
 * from the pricing engine, and the battery size the step reads.
 */
import {
  CONSUMPTION_SEASONALITY,
  GENERATION_SEASONALITY,
} from "@/lib/designs/energySimulation";
import {
  estimateSavings,
  TARIFF_DEFAULTS,
  type ProposalPricingResponse,
  type ProposalQuote,
  type SavingsEstimate,
} from "@/lib/proposal/proposalPricing";
import {
  BATTERY_CAPACITY_OPTIONS,
  DEFAULT_BATTERY_CAPACITY_ID,
} from "@/lib/designs/proposalOptions";
import {
  EQUIPMENT_CATEGORY_KEYS,
  type DesignBillPeriod,
  type DesignProposalState,
  type EquipmentCategoryKey,
} from "@/lib/store/designProposalSlice";

export const PREPARED_BY = {
  name: "Sujay Salvi",
  phone: "+61 481 857 508",
  email: "sujay@easylinksolar.com.au",
};

export const COMPANY = {
  name: "EasyLink Solar",
  address: "1909 / 8 Uhrig Road, Lidcombe NSW 2141",
  phone: "+61 481 857 508",
  email: "sales@easylinksolar.com.au",
  web: "easylinksolar.com.au",
};

/** NSW grid emissions, kg CO2-e per kWh (National Greenhouse Accounts). */
const NSW_KG_CO2_PER_KWH = 0.64;
const PRICE_HELD_DAYS = 30;
const PROJECTION_YEARS = 25;
const PRICE_RISE_A_YEAR = 0.03;
const PANEL_LOSS_A_YEAR = 0.004;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const CATEGORY_LABEL: Record<EquipmentCategoryKey, string> = {
  solarPanel: "Solar panels",
  inverter: "Inverter",
  battery: "Battery",
  evCharger: "EV charger",
  heatPump: "Heat pump",
};

export type ProposalLinks = {
  /** Where the customer books the site check and sees their design. */
  portalUrl: string;
  portalLabel: string;
  /** Link a friend opens; carries the referral code when there is one. */
  referralUrl: string;
  referralCode: string | null;
};

export type ProposalOption = {
  key: string;
  label: string;
  title: string;
  batteryKwh: number;
  price: number;
  yearlySavings: number;
  paybackYears: number | null;
  selfPoweredPct: number;
  isDesign: boolean;
};

export type EquipmentLine = {
  category: EquipmentCategoryKey;
  label: string;
  title: string;
  detail: string;
};

export type ProposalDocument = {
  firstName: string;
  fullName: string;
  address: string;
  quoteRef: string;
  preparedOn: string;
  validUntil: string;
  rebatesAsAt: string;

  systemKw: number;
  panelCount: number;
  panelLine: string;
  inverterLine: string | null;
  batteryKwh: number;
  batteryLine: string | null;
  phase: 1 | 3 | null;
  equipment: EquipmentLine[];

  billPeriod: DesignBillPeriod;
  billPeriodLabel: string;
  billBefore: number;
  billAfter: number;
  annualBillBefore: number;
  annualBillAfter: number;

  generationKwh: number;
  consumptionKwh: number;
  usedAtHomeKwh: number;
  exportedKwh: number;
  storedKwh: number;
  selfPoweredPct: number;

  yearlyGain: number;
  powerNotBought: number;
  exportIncome: number;

  price: number | null;
  priceBeforeRebates: number | null;
  rebateLines: { label: string; value: number }[];
  gst: number | null;
  paybackYears: number | null;
  savings25Years: number;
  cumulative: { label: string; value: number }[];

  months: { label: string; solarPerDay: number; usePerDay: number }[];

  co2TonnesYear: number;
  co2Tonnes25: number;

  options: ProposalOption[];
  roofAreaM2: number | null;
  panelOrientation: "portrait" | "landscape";

  links: ProposalLinks;
};

export type ProposalDocumentInput = {
  proposal: DesignProposalState;
  pricing: ProposalPricingResponse | null;
  links: ProposalLinks;
  today?: Date;
  quoteRef?: string;
};

function money(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function auDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function firstWord(name: string): string {
  const t = name.trim();
  return t ? (t.split(/\s+/)[0] ?? "there") : "there";
}

function periodMonths(p: DesignBillPeriod): number {
  return p === "month" ? 1 : p === "year" ? 12 : 3;
}

function periodLabel(p: DesignBillPeriod): string {
  return p === "month" ? "month" : p === "year" ? "year" : "quarter";
}

function capacityKwhOf(id: string): number {
  const n = Number.parseFloat(id);
  return Number.isFinite(n) ? n : 0;
}

/** The battery size the proposal step prices — same order of precedence. */
export function designBatteryKwh(proposal: DesignProposalState): number {
  if (proposal.equipment.batteryCapacityKwh !== undefined) {
    return Math.max(0, proposal.equipment.batteryCapacityKwh);
  }
  const items = proposal.equipment.items?.battery ?? [];
  const fromItems = items.reduce((sum, it) => {
    const kwh = Number.parseFloat(it.ratingLabel);
    return Number.isFinite(kwh) && /kwh/i.test(it.ratingLabel)
      ? sum + kwh * Math.max(1, it.quantity)
      : sum;
  }, 0);
  if (fromItems > 0) return fromItems;
  return capacityKwhOf(proposal.equipment.batteryCapacityId ?? DEFAULT_BATTERY_CAPACITY_ID);
}

function panelCountOf(proposal: DesignProposalState): number {
  const n = Number.parseInt(
    (proposal.equipment.numberOfPanels || proposal.summary.totalPanels || "0").replace(/\D/g, ""),
    10,
  );
  return Number.isFinite(n) ? n : 0;
}

function systemKwOf(proposal: DesignProposalState, quote: ProposalQuote | null, panels: number): number {
  if (quote?.arrayKw) return quote.arrayKw;
  const m = proposal.summary.systemSize.match(/([\d.]+)\s*kW/i);
  if (m) {
    const kw = Number.parseFloat(m[1]);
    if (Number.isFinite(kw) && kw > 0) return kw;
  }
  return (panels * 440) / 1000;
}

function equipmentLines(proposal: DesignProposalState): EquipmentLine[] {
  return EQUIPMENT_CATEGORY_KEYS.flatMap((key) =>
    (proposal.equipment.items?.[key] ?? []).map((it) => ({
      category: key,
      label: CATEGORY_LABEL[key],
      title: `${it.quantity > 1 ? `${it.quantity} × ` : ""}${[it.brand, it.name].filter(Boolean).join(" ").trim() || CATEGORY_LABEL[key]}`,
      detail: it.ratingLabel,
    })),
  );
}

function selfPowered(s: SavingsEstimate): number {
  if (s.consumptionKwh <= 0) return 0;
  return Math.min(100, Math.round(((s.selfUsedKwh + s.batteryKwh) / s.consumptionKwh) * 100));
}

/** Splits the yearly gain into power not bought + export credit, summing exactly. */
function splitGain(s: SavingsEstimate): { notBought: number; exportIncome: number } {
  const avoided = (s.selfUsedKwh + s.batteryKwh) * TARIFF_DEFAULTS.usagePerKwh;
  const notBought = Math.min(s.yearlySavings, avoided);
  return { notBought, exportIncome: Math.max(0, s.yearlySavings - notBought) };
}

function payback(price: number | null, yearly: number): number | null {
  if (price == null || price <= 0 || yearly <= 0) return null;
  return Math.round((price / yearly) * 10) / 10;
}

/** Cumulative gain after paying for the system, rising 3% a year, panels losing 0.4%. */
export function cumulativeGain(yearly: number, price: number | null, years = PROJECTION_YEARS): number[] {
  const out: number[] = [];
  let total = -(price ?? 0);
  for (let i = 0; i < years; i++) {
    total += yearly * (1 + PRICE_RISE_A_YEAR) ** i * (1 - PANEL_LOSS_A_YEAR) ** i;
    out.push(total);
  }
  return out;
}

function buildOptions(
  monthly: number,
  arrayKw: number,
  designKwh: number,
  pricing: ProposalPricingResponse | null,
): ProposalOption[] {
  const totals = pricing?.batteryTotals ?? {};
  const sizes = BATTERY_CAPACITY_OPTIONS.map((b) => capacityKwhOf(b.id))
    .filter((k) => totals[String(k)] != null)
    .sort((a, b) => a - b);
  if (sizes.length === 0 || !pricing) return [];

  const nearest = (target: number) =>
    sizes.reduce((best, k) => (Math.abs(k - target) < Math.abs(best - target) ? k : best), sizes[0]);
  const designSize = nearest(designKwh);
  const bigger = sizes.find((k) => k > designSize && k > 0) ?? null;
  const picks: number[] = [];
  if (designSize > 0) picks.push(0);
  picks.push(designSize);
  if (bigger != null) picks.push(bigger);
  if (picks.length < 3) {
    const next = sizes.find((k) => k > (bigger ?? designSize) && !picks.includes(k));
    if (next != null) picks.push(next);
  }

  let extraBatteries = 0;
  return picks.slice(0, 3).map((kwh) => {
    const isDesign = kwh === designSize;
    const upgradeTitle =
      !isDesign && kwh > 0 ? (extraBatteries++ === 0 && designSize === 0 ? "Power all evening" : "Power longer at night") : "";
    const price = isDesign ? pricing.selected.net : (totals[String(kwh)] ?? 0);
    const s = estimateSavings(monthly, arrayKw, kwh);
    return {
      key: `b${kwh}`,
      label: kwh === 0 ? "Solar only" : `Solar + ${kwh} kWh battery`,
      title: isDesign ? "Your design" : kwh === 0 ? "Start saving" : upgradeTitle,
      batteryKwh: kwh,
      price,
      yearlySavings: Math.round(s.yearlySavings),
      paybackYears: payback(price, s.yearlySavings),
      selfPoweredPct: selfPowered(s),
      isDesign,
    };
  });
}

export function buildProposalDocument(input: ProposalDocumentInput): ProposalDocument {
  const { proposal, pricing, links } = input;
  const today = input.today ?? new Date();
  const quote = pricing?.selected ?? null;

  const panelCount = panelCountOf(proposal);
  const systemKw = Math.round(systemKwOf(proposal, quote, panelCount) * 100) / 100;
  const batteryKwh = designBatteryKwh(proposal);
  const monthly = money(proposal.pricing.currentBill) ?? 0;
  const s = estimateSavings(monthly, systemKw, batteryKwh);
  const { notBought } = splitGain(s);

  const storedPrice = money(proposal.pricing.totalSystemPrice);
  const price = quote?.net ?? (storedPrice && storedPrice > 0 ? storedPrice : null);
  const yearlyGain = Math.round(s.yearlySavings);

  const cum = cumulativeGain(yearlyGain, price);
  const milestones = [1, 5, 10, 15, 20, 25];

  const genWeights = GENERATION_SEASONALITY.map((w) => w / GENERATION_SEASONALITY.reduce((a, b) => a + b, 0));
  const useWeights = CONSUMPTION_SEASONALITY.map((w) => w / CONSUMPTION_SEASONALITY.reduce((a, b) => a + b, 0));

  const billPeriod = proposal.pricing.billPeriod ?? "quarter";
  const months = periodMonths(billPeriod);

  const valid = new Date(today);
  valid.setDate(valid.getDate() + PRICE_HELD_DAYS);

  const firstPanel = proposal.equipment.items?.solarPanel?.[0];
  const firstInverter = proposal.equipment.items?.inverter?.[0];
  const firstBattery = proposal.equipment.items?.battery?.[0];

  const panelModel =
    quote?.panel?.model ??
    ([firstPanel?.brand, firstPanel?.name].filter(Boolean).join(" ").trim() || null);
  const panelW = quote?.panel?.w ?? null;

  const co2Year = (s.generationKwh * NSW_KG_CO2_PER_KWH) / 1000;
  const co225 = Array.from(
    { length: PROJECTION_YEARS },
    (_, i) => co2Year * (1 - PANEL_LOSS_A_YEAR) ** i,
  ).reduce((a, b) => a + b, 0);

  return {
    firstName: firstWord(proposal.customer.name),
    fullName: proposal.customer.name.trim(),
    address: proposal.customer.address?.trim() ?? "",
    quoteRef: input.quoteRef ?? `EL-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`,
    preparedOn: auDate(today),
    validUntil: auDate(valid),
    rebatesAsAt: auDate(today),

    systemKw,
    panelCount,
    panelLine: `${panelCount} × ${panelModel ?? "solar panels"}${panelW ? ` ${panelW} W` : ""}`,
    inverterLine: quote?.inverter
      ? `${quote.inverter.model} · ${quote.inverter.kw} kW`
      : firstInverter
        ? `${[firstInverter.brand, firstInverter.name].filter(Boolean).join(" ")} · ${firstInverter.ratingLabel}`
        : null,
    batteryKwh,
    batteryLine:
      batteryKwh > 0
        ? quote?.battery
          ? `${quote.battery.model} · ${quote.battery.kwh} kWh`
          : firstBattery
            ? `${[firstBattery.brand, firstBattery.name].filter(Boolean).join(" ")} · ${batteryKwh} kWh`
            : `${batteryKwh} kWh battery`
        : null,
    phase: quote?.phase ?? quote?.inverter?.phase ?? null,
    equipment: equipmentLines(proposal),

    billPeriod,
    billPeriodLabel: periodLabel(billPeriod),
    billBefore: Math.round(monthly * months),
    billAfter: Math.round(s.newBill * months),
    annualBillBefore: Math.round(monthly * 12),
    annualBillAfter: Math.round(s.newBill * 12),

    generationKwh: s.generationKwh,
    consumptionKwh: s.consumptionKwh,
    usedAtHomeKwh: s.selfUsedKwh + s.batteryKwh,
    exportedKwh: s.exportedKwh,
    storedKwh: s.batteryKwh,
    selfPoweredPct: selfPowered(s),

    yearlyGain,
    powerNotBought: Math.round(notBought),
    exportIncome: yearlyGain - Math.round(notBought),

    price,
    priceBeforeRebates: quote?.priceBeforeStcs ?? null,
    rebateLines: (quote?.stcLines ?? [])
      .filter((l) => l.value > 0)
      .map((l) => ({ label: l.label, value: l.value })),
    gst: price != null ? Math.round((price / 11) * 100) / 100 : null,
    paybackYears: payback(price, yearlyGain),
    savings25Years: Math.round(cum[cum.length - 1] ?? 0),
    cumulative: milestones.map((y) => ({
      label: y === 1 ? "Year 1" : `Year ${y}`,
      value: Math.round(cum[y - 1] ?? 0),
    })),

    months: MONTH_SHORT.map((label, i) => ({
      label,
      solarPerDay: Math.round(((s.generationKwh * genWeights[i]) / DAYS_IN_MONTH[i]) * 10) / 10,
      usePerDay: Math.round(((s.consumptionKwh * useWeights[i]) / DAYS_IN_MONTH[i]) * 10) / 10,
    })),

    co2TonnesYear: Math.round(co2Year * 10) / 10,
    co2Tonnes25: Math.round(co225),

    options: buildOptions(monthly, systemKw, batteryKwh, pricing),
    roofAreaM2: proposal.solarDesign?.polygonTotalAreaM2
      ? Math.round(proposal.solarDesign.polygonTotalAreaM2)
      : null,
    panelOrientation: proposal.solarDesign?.panelOrientation === "LANDSCAPE" ? "landscape" : "portrait",

    links,
  };
}

export function formatAud(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
}

export function formatKwh(n: number): string {
  return `${Math.round(n).toLocaleString("en-AU")} kWh`;
}
