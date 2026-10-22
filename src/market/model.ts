/**
 * EasyLink Marketplace: Ready Sites and Ready Deals.
 *
 * Ready Site: a customer who is ready for installation (payment and/or
 * installation confirmed), offered to installers for a fixed amount. EasyLink
 * creates them from customers with no installer (direct, or from lead lists),
 * and installers with more leads than they can install pass theirs on. Whoever
 * buys first gets the customer, as a job on the normal journey.
 *
 * Ready Deal: an installer's promotion (one item, a bundle, solar, battery or
 * both) that customers buy on the website. EasyLink approves every deal before
 * it goes live. The customer pays 50% when they accept the deal and 50% before
 * installation starts; refunds follow EasyLink's standard policy.
 */
import { batteryStcs, solarStcs } from "../jobs/stc.js";
import { STC_PRICE } from "../jobs/docs.js";

export type SiteStatus = "draft" | "review" | "live" | "sold" | "withdrawn";
export type DealStatus = "draft" | "review" | "live" | "paused" | "ended" | "rejected";

export type MarketSystem = {
  panels?: { model: string; watts: number; count: number };
  inverter?: { model: string; kw: number; hybrid?: boolean };
  battery?: { model: string; usableKwh: number };
  extras: { name: string; qty: number }[];
};

export type ReadySite = {
  id: string;
  ref: string;
  rev: number;
  status: SiteStatus;
  /** EasyLink (staff) or an installer passing on a lead they can't install. */
  createdBy: { kind: "easylink" | "installer"; id: string; name: string };
  /** Private until sold: only EasyLink, the seller and the buyer see these. */
  customer: { name: string; phone?: string; email?: string; street?: string; customerId?: string; leadId?: string };
  suburb: string;
  state: string;
  postcode: string;
  lat?: number;
  lng?: number;
  roof?: string;
  storeys?: string;
  phases?: 1 | 3;
  system: MarketSystem;
  /** What's already confirmed. A site can't go live without at least one. */
  confirmed: { payment: boolean; depositPaid: number; installation: boolean; windowFrom?: string; windowTo?: string };
  /** What the customer has agreed to pay the installer, AUD incl. GST, before STCs. */
  contractValue: number;
  /** What the buying installer pays for the site, AUD incl. GST. */
  siteFee: number;
  documents: { name: string; fileId?: string }[];
  notes?: string;
  visibility: { area: "service_area" | "everyone"; eliteHeadStartHours: number; endsAt?: string };
  review?: { by: string; at: string; note?: string };
  publishedAt?: string;
  buyer?: { id: string; name: string; at: string; jobId: string };
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type DealItem = { category: "panel" | "inverter" | "battery" | "ev_charger" | "heat_pump" | "portable" | "other"; model: string; qty: number; watts?: number; kw?: number; hybrid?: boolean; usableKwh?: number };

export type ReadyDeal = {
  id: string;
  ref: string;
  rev: number;
  status: DealStatus;
  installerId: string;
  installerName: string;
  type: "single" | "bundle" | "solar" | "battery" | "solar_battery" | "everything";
  title: string;
  description?: string;
  items: DealItem[];
  buildingTypes: ("house" | "townhouse" | "unit" | "business")[];
  /** What the customer pays, AUD incl. GST, after the STC discount. */
  price: number;
  wasPrice?: number;
  badge?: string;
  /** Where the equipment comes from: EasyLink stock, or the installer's own supplier. */
  stockSource: "easylink" | "own";
  /** Postcodes the installer will install in, e.g. "2145-2155, 2112". */
  serviceAreas: string;
  quantity: number;
  sold: number;
  endsAt?: string;
  review?: { by: string; at: string; note?: string };
  publishedAt?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type DealOrder = {
  id: string;
  ref: string;
  dealId: string;
  dealRef: string;
  installerId: string;
  jobId: string;
  customer: { name: string; phone: string; email: string; street: string; suburb: string; state: string; postcode: string; customerId: string };
  building: string;
  owner: true;
  consentAt: string;
  termsAt: string;
  price: number;
  depositInvoiceId: string;
  /** Lets the website pay the deposit for a buyer who has no portal login yet. */
  payToken: string;
  status: "deposit_due" | "active" | "cancelled" | "refunded";
  cancel?: { at: string; by: string; reason: string; refund: number };
  createdAt: string;
};

/** EasyLink's standard refund policy for Ready Deals (shown at checkout, in emails and on orders). Confirm the wording with your lawyer. */
export const REFUND_POLICY = [
  "Change your mind within 10 business days of buying: full refund of anything paid.",
  "If the installer's site check finds the system can't be installed as described: full refund.",
  "After that, before installation starts: refund of what you've paid, less costs already incurred for your job (such as equipment ordered for you), itemised by EasyLink.",
  "Refunds go back to the original payment method within 10 business days.",
];

export const MEMBERSHIP_LIVE_DEALS: Record<string, number> = { starter: 2, professional: 6, elite: 20 };

/** "2145-2155, 2112" → test for a postcode. */
export function inAreas(areas: string, postcode: string): boolean {
  const pc = Number(postcode);
  if (!/^\d{4}$/.test(postcode)) return false;
  return areas
    .split(/[,\s]+/)
    .filter(Boolean)
    .some((part) => {
      const [a, b] = part.split("-").map((x) => Number(x.trim()));
      if (!Number.isFinite(a)) return false;
      return b !== undefined && Number.isFinite(b) ? pc >= Math.min(a!, b) && pc <= Math.max(a!, b) : pc === a;
    });
}

export function validAreas(areas: string): boolean {
  const parts = areas.split(/[,\s]+/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => /^\d{4}(-\d{4})?$/.test(p));
}

/** STC zone rating by state until the installer confirms the postcode zone (zones 3 and 4 cover most homes). */
export function zoneFor(state: string): number {
  return { VIC: 1.185, TAS: 1.185, NT: 1.622 }[state.toUpperCase()] ?? 1.382;
}

export function systemOf(items: DealItem[]): MarketSystem {
  const panel = items.find((i) => i.category === "panel");
  const invs = items.filter((i) => i.category === "inverter");
  const bats = items.filter((i) => i.category === "battery");
  const usable = bats.reduce((t, b) => t + (b.usableKwh ?? 0) * b.qty, 0);
  return {
    panels: panel ? { model: panel.model, watts: panel.watts ?? 0, count: panel.qty } : undefined,
    inverter: invs.length ? { model: invs.map((i) => i.model).join(" + "), kw: invs.reduce((t, i) => t + (i.kw ?? 0) * i.qty, 0), hybrid: invs.some((i) => i.hybrid) } : undefined,
    battery: bats.length ? { model: bats.map((b) => (b.qty > 1 ? `${b.model} × ${b.qty}` : b.model)).join(" + "), usableKwh: Math.round(usable * 100) / 100 } : undefined,
    extras: items.filter((i) => !["panel", "inverter", "battery"].includes(i.category)).map((i) => ({ name: i.model, qty: i.qty })),
  };
}

export const kwOf = (s: MarketSystem) => (s.panels ? Math.round((s.panels.watts * s.panels.count) / 10) / 100 : 0);

/** The rules a system must meet, and the STC estimate. Errors block publishing; warnings are shown. */
export function checkSystem(s: MarketSystem, state = "NSW", at = new Date().toISOString()) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const kw = kwOf(s);
  const inv = s.inverter?.kw ?? 0;
  if (kw > 0 && !inv) errors.push("Solar panels need an inverter.");
  // CER: panel capacity can be up to 133% of the inverter's for STCs.
  const oversized = kw > 0 && inv > 0 && kw / inv > 1.33 + 1e-9;
  if (oversized) errors.push(`${kw} kW of panels is more than 133% of the ${inv} kW inverter, so it wouldn't qualify for STCs.`);
  if (s.battery && s.battery.usableKwh > 0 && s.inverter && !s.inverter.hybrid) warnings.push("The battery needs a hybrid inverter or its own battery inverter.");
  if (inv > 10) warnings.push("Inverters over 10 kVA usually need three-phase power and network approval.");
  if (s.battery && s.battery.usableKwh > 50) warnings.push("Only the first 50 kWh of battery attracts STCs.");
  const solar = kw > 0 && inv > 0 && !oversized ? solarStcs(kw, zoneFor(state), at) : 0;
  const battery = s.battery?.usableKwh ? batteryStcs(Math.min(s.battery.usableKwh, 50), at) : 0;
  return { kw, errors, warnings, stcs: { solar, battery, total: solar + battery, value: (solar + battery) * STC_PRICE, price: STC_PRICE } };
}

/** An installer's rough numbers on a Ready Site before buying (they can adjust kit and labour in the portal). */
export function siteEstimate(site: ReadySite, kitPerKw = 650, kitPerKwh = 600, labourPerKw = 350) {
  const c = checkSystem(site.system, site.state);
  const contractExGst = site.contractValue / 1.1;
  const kit = c.kw * kitPerKw + (site.system.battery?.usableKwh ?? 0) * kitPerKwh;
  const labour = Math.max(1200, c.kw * labourPerKw);
  const feeExGst = site.siteFee / 1.1;
  const r = (n: number) => Math.round(n);
  // The installer keeps the STC value as the registered agent's payment, on top of what the customer pays after STCs.
  return { contractExGst: r(contractExGst), stcValue: r(c.stcs.value), kit: r(kit), labour: r(labour), siteFeeExGst: r(feeExGst), margin: r(contractExGst - kit - labour - feeExGst), note: "Contract value is before the STC discount; the STC value offsets it. Kit and labour are typical figures; change them to yours." };
}
