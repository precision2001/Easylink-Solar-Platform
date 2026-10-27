/**
 * The calling database behind "Contact lists", ported from the Easylink
 * Designer mock (ContactListsBody.dc.html).
 *
 * Two things here carry real consequence and so live in a tested module
 * rather than in the component:
 *
 *  - whether a contact may legally be called. A number on the Do Not Call
 *    Register is an offence to cold-call, and a contact can be blocked on one
 *    line while still reachable on the other.
 *  - the four solar options quoted on the call, which reuse the Solar
 *    designer's energy model so the same roof and bill always price the same
 *    way in both tools.
 */

import {
  generation,
  priceSystem,
  simulate,
  yearlyConsumption,
} from "@/lib/designer/simulation";
import { dcAcLimitPercent } from "@/lib/designer/designRules";

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

export type RawContact = {
  name: string;
  mobile: string;
  landline: string;
  suburb: string;
  postcode: string;
  /** On the Do Not Call Register for that line. */
  dncrMobile: boolean;
  dncrLandline: boolean;
  outcome: string;
};

/** Reserved test numbers — never real subscribers. */
export const CONTACTS: RawContact[] = [
  { name: "Mia Thompson", mobile: "0491 570 006", landline: "02 5550 0101", suburb: "Parramatta", postcode: "2150", dncrMobile: false, dncrLandline: false, outcome: "" },
  { name: "Liam Nguyen", mobile: "0491 570 156", landline: "", suburb: "Blacktown", postcode: "2148", dncrMobile: false, dncrLandline: false, outcome: "" },
  { name: "Olivia Patel", mobile: "0491 570 157", landline: "02 5550 0102", suburb: "Liverpool", postcode: "2170", dncrMobile: true, dncrLandline: false, outcome: "" },
  { name: "Noah Wilson", mobile: "", landline: "02 5550 0103", suburb: "Penrith", postcode: "2750", dncrMobile: false, dncrLandline: true, outcome: "" },
  { name: "Ava Chen", mobile: "0491 570 158", landline: "", suburb: "Ryde", postcode: "2112", dncrMobile: false, dncrLandline: false, outcome: "Call back" },
  { name: "Charlotte Singh", mobile: "0491 570 110", landline: "", suburb: "Bankstown", postcode: "2200", dncrMobile: false, dncrLandline: false, outcome: "Appointment booked" },
  { name: "Henry Kelly", mobile: "0491 571 266", landline: "", suburb: "Wollongong", postcode: "2500", dncrMobile: true, dncrLandline: false, outcome: "" },
  { name: "Amelia Wright", mobile: "0491 571 491", landline: "02 5550 0106", suburb: "Newcastle", postcode: "2300", dncrMobile: false, dncrLandline: false, outcome: "Interested" },
];

/** Contacts 0-5 came from the purchased list; the rest from an expo. */
const EXPO_FROM = 6;
/** Shown where a contact has no number on that line. */
const DASH = "—";

export type Contact = RawContact & {
  index: number;
  email: string;
  mobileText: string;
  landlineText: string;
  list: string;
  /** "Clear", "Mobile", "Landline" or "Mobile + landline". */
  dncrLabel: string;
  outcomeLabel: string;
  /** True when at least one line is reachable and not on the register. */
  callable: boolean;
};

/**
 * A contact is callable when at least one of their numbers exists and is not
 * on the register. Being listed on the mobile does not block the landline,
 * which is why each line is checked separately.
 */
export function isCallable(c: RawContact): boolean {
  return (!!c.mobile && !c.dncrMobile) || (!!c.landline && !c.dncrLandline);
}

export function dncrLabel(c: RawContact): string {
  if (c.dncrMobile && c.dncrLandline) return "Mobile + landline";
  if (c.dncrMobile) return "Mobile";
  if (c.dncrLandline) return "Landline";
  return "Clear";
}

export function toEmail(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
}

export function buildContacts(raw: RawContact[] = CONTACTS): Contact[] {
  return raw.map((c, index) => ({
    ...c,
    index,
    email: toEmail(c.name),
    mobileText: c.mobile || DASH,
    landlineText: c.landline || DASH,
    list: index < EXPO_FROM ? "ARD NSW" : "Expo leads Oct",
    dncrLabel: dncrLabel(c),
    outcomeLabel: c.outcome || "Not called",
    callable: isCallable(c),
  }));
}

export type FilterKey = "all" | "callable" | "dncr" | "callback";

export const FILTERS: [FilterKey, string][] = [
  ["all", "Everyone"],
  ["callable", "Callable now"],
  ["dncr", "On DNCR"],
  ["callback", "Callbacks due"],
];

export function applyFilter(rows: Contact[], key: FilterKey): Contact[] {
  if (key === "callable") return rows.filter((r) => r.callable);
  if (key === "dncr") return rows.filter((r) => r.dncrMobile || r.dncrLandline);
  if (key === "callback") return rows.filter((r) => r.outcome === "Call back");
  return rows;
}

/** An outcome that means the lead is warm. */
export function isWarmOutcome(outcome: string): boolean {
  return outcome === "Appointment booked" || outcome === "Interested";
}

export const OUTCOMES = [
  "No answer",
  "Left voicemail",
  "Call back",
  "Interested",
  "Appointment booked",
  "Not interested",
  "Wrong number",
  "Asked not to be called",
];

/**
 * The next contact a calling queue should load: the one after this index among
 * the callable contacts, wrapping back to the start at the end of the list.
 */
export function nextInQueue(rows: Contact[], currentIndex: number): number {
  const callables = rows.filter((r) => r.callable);
  if (callables.length === 0) return -1;
  const pos = callables.findIndex((r) => r.index === currentIndex);
  return callables[(pos + 1) % callables.length].index;
}

/* ------------------------------------------------------------------ */
/* The four options quoted on the call                                 */
/* ------------------------------------------------------------------ */

/** The sample lead's bill, which every option is sized against. */
export const LEAD_BILL = 1150;
export const LEAD_DAYS = 91;
export const LEAD_RATE = 0.37;
export const LEAD_FIT = 0.05;

/** Installed cost of the optional extras, quoted on top of the system. */
const EV_CHARGER_COST = 2200;
const HEAT_PUMP_COST = 3900;

export type OptionSpec = {
  key: string;
  n: string;
  d: string;
  panels: number;
  inverterKw: number;
  inverter: string;
  /** A hybrid inverter — allowed up to 200% even without a battery. */
  hybrid: boolean;
  battery: number;
  batterySku: string;
  ev: boolean;
  heatPump: boolean;
  /** The one the caller leads with. */
  recommended: boolean;
};

export const OPTION_SPECS: OptionSpec[] = [
  {
    key: "essential",
    n: "Essential",
    d: "Lowest upfront cost. Covers daytime use.",
    panels: 15,
    inverterKw: 5,
    inverter: "5 kW · INV-S5",
    hybrid: false,
    battery: 0,
    batterySku: "",
    ev: false,
    heatPump: false,
    recommended: false,
  },
  {
    key: "bill",
    n: "Bill-Buster",
    d: "Sized to your bill, with a battery for evenings.",
    panels: 25,
    inverterKw: 9.9,
    inverter: "9.9 kW hybrid · INV-FX99",
    hybrid: true,
    battery: 10,
    batterySku: "BAT-100S",
    ev: false,
    heatPump: false,
    recommended: true,
  },
  {
    key: "electrify",
    n: "Electrify-Ready",
    d: "Bigger battery plus EV charging and heat-pump hot water.",
    panels: 29,
    inverterKw: 9.9,
    inverter: "9.9 kW hybrid · INV-FX99",
    hybrid: true,
    battery: 20,
    batterySku: "BAT-100S × 2",
    ev: true,
    heatPump: true,
    recommended: false,
  },
  {
    key: "max",
    n: "Maximum",
    d: "The most a single-phase home can take, close to $0 grid bills.",
    panels: 29,
    inverterKw: 9.9,
    inverter: "9.9 kW hybrid · INV-FX99",
    hybrid: true,
    battery: 32.61,
    batterySku: "BAT-FX4660",
    ev: true,
    heatPump: true,
    recommended: false,
  },
];

export type PricedOption = OptionSpec & {
  kw: number;
  ratio: number;
  /** Panel : inverter limit (%) for this option — 200 with a hybrid inverter or a battery, else 133. */
  limitPercent: number;
  /** Everything installed, including the extras. */
  price: number;
  /** Savings a year from solar and battery only. */
  yearly: number;
  generation: number;
  /** Years for the system alone to pay for itself — extras excluded, since
   *  their savings (fuel, hot water) are not counted in `yearly`. */
  payback: number;
};

/**
 * Prices the four options against one bill. Reuses the Solar designer's
 * engine so a given roof and bill quote identically in both places.
 */
export function priceOptions(
  bill = LEAD_BILL,
  days = LEAD_DAYS,
  rate = LEAD_RATE,
  fit = LEAD_FIT,
): PricedOption[] {
  const consumption = yearlyConsumption(bill, days, rate);
  return OPTION_SPECS.map((s) => {
    // Rounded to the cent of a kW, as the catalogue quotes it.
    const kw = Math.round(s.panels * 44) / 100;
    const ratio = Math.round((kw / s.inverterKw) * 100);
    const limitPercent = dcAcLimitPercent(s.hybrid || s.battery > 0);
    const gen = generation(kw, 0);
    const r = simulate({ battery: s.battery, consumption, generation: gen, mode: "self", age: 0 });
    const yearly = r.exported * fit + r.selfUsed * rate;
    const system = priceSystem({
      arrayKw: kw,
      panels: s.panels,
      battery: s.battery,
      tier: "prem",
      ratioPercent: ratio,
      limitPercent,
    }).total;
    const extras = (s.ev ? EV_CHARGER_COST : 0) + (s.heatPump ? HEAT_PUMP_COST : 0);
    return { ...s, kw, ratio, limitPercent, price: system + extras, yearly, generation: gen, payback: system / yearly };
  });
}

/* ------------------------------------------------------------------ */
/* The deal panel on the call                                          */
/* ------------------------------------------------------------------ */

/** Default probability for a lead at the Appointment stage. */
export const STAGE_PROBABILITY = 25;
/** The battery the CRM's System tab assumes. */
export const CRM_BATTERY_KWH = 20;
const CRM_INVERTER_KW = 9.9;
/** The CRM's 9.9 kW inverter is a hybrid (with a battery), so the 200% limit applies. */
export const CRM_LIMIT_PERCENT = dcAcLimitPercent(true);

export type DealValue = {
  kw: number;
  ratio: number;
  price: number;
  weighted: number;
  /** Over the panel : inverter limit (200% with a hybrid inverter or battery), so the array would earn no certificates. */
  oversized: boolean;
};

export function dealValue(panels: number): DealValue {
  const kw = Math.round(panels * 44) / 100;
  const ratio = Math.round((kw / CRM_INVERTER_KW) * 100);
  const price = priceSystem({
    arrayKw: kw,
    panels,
    battery: CRM_BATTERY_KWH,
    tier: "prem",
    ratioPercent: ratio,
    limitPercent: CRM_LIMIT_PERCENT,
  }).total;
  return {
    kw,
    ratio,
    price,
    weighted: (price * STAGE_PROBABILITY) / 100,
    oversized: ratio > CRM_LIMIT_PERCENT,
  };
}

/** Interests a lead can be tagged with. */
export const INTERESTS = [
  "Solar",
  "Battery",
  "EV charger",
  "Heat pump",
  "Upgrade existing system",
  "Maintenance plan",
  "Drone inspection",
  "Backup power (BLUETTI)",
  "Commercial solar",
];

/** Filename stem for roof images saved against a contact. */
export function fileStem(name: string): string {
  return (name || "customer").toLowerCase().replace(/[^a-z]+/g, "-");
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export const ACCEPTED_FORMATS = [
  "Excel .xlsx",
  "Excel .xls",
  "CSV",
  "Tab or semicolon .txt",
  "OpenDocument .ods",
];

/** Spreadsheet heading → the field it was matched to. */
export const COLUMN_MAP: [string, string][] = [
  ["ID", "Source ID"],
  ["Full-name", "Full name"],
  ["StreetAddress", "Street address"],
  ["Locality", "Suburb / locality"],
  ["Postcode", "Postcode"],
  ["State", "State"],
  ["Region", "Region"],
  ["Phone-Fixed", "Landline"],
  ["Phone-Mobile", "Mobile"],
  ["DNCR-Phone-Fixed", "DNCR flag · landline"],
  ["DNCR-Mobile", "DNCR flag · mobile"],
  ["Email", "Email"],
  ["Status", "Status / lead quality"],
];

export const IMPORT_RESULT: [string, string][] = [
  ["Added", "726,322"],
  ["Duplicates skipped", "0"],
  ["Without a valid number", "2,422"],
  ["On DNCR (blocked)", "197,260"],
  ["Callable right now", "529,062"],
];

export const SAVED_FORMATS: [string, string][] = [
  [
    "ARD NSW",
    "Full-name → Full name · Phone-Mobile → Mobile · Phone-Fixed → Landline · DNCR-Mobile → DNCR flag · mobile · 9 more",
  ],
  [
    "Expo leads Oct",
    "First Name → First name · Surname → Last name · Contact No. → Phone (any type) · On DNCR? → DNCR flag · Opt In → Consent",
  ],
];

/** Headline counts across the whole database, not just the examples shown. */
export const TILES: [string, string, string][] = [
  ["Contacts", "726,330", "2 lists"],
  ["Callable now", "529,066", "Open now · weekdays 9 am–8 pm (NSW time)"],
  ["On Do Not Call Register", "197,262", "Blocked without consent"],
  ["Callbacks due", "1", "Today or overdue"],
];

export const TOTAL_CONTACTS = "726,330";
