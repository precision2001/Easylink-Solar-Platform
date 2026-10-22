/**
 * The solar designer's sizing and savings engine, ported from the Easylink
 * Designer mock (DesignerBody.dc.html).
 *
 * This is the arithmetic the "Savings" step runs on every keystroke: a
 * month-by-month energy balance that turns a power bill into consumption, then
 * splits each month's load between direct solar, battery and the grid.
 *
 * It is deliberately a pure module with no React in it, because these are the
 * numbers a customer makes a purchase decision on and they need to be pinned
 * by tests rather than eyeballed in a browser.
 */

export type Role = "public" | "customer" | "installer" | "distributor";
export type BatteryMode = "self" | "export";
export type Period = "day" | "week" | "month" | "quarter" | "year";

/** Daily supply charge in dollars, before any usage. */
const SUPPLY = 1.1;
/** Relative irradiance by month — Australian seasons, peaking in summer. */
const IRRADIANCE = [1.25, 1.15, 1.05, 0.9, 0.75, 0.65, 0.7, 0.85, 1.0, 1.1, 1.2, 1.3];
/** Share of yearly household load falling in each month. */
const LOAD_WEIGHT = [0.095, 0.085, 0.075, 0.07, 0.075, 0.095, 0.1, 0.09, 0.075, 0.07, 0.075, 0.095];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Yearly generation per kW of panels, in Sydney. */
const YIELD_PER_KW = 1460;
/** Panel output degrades about half a percent a year. */
const PANEL_DEGRADATION = 0.995;
/** Battery usable capacity fades faster than panels do. */
const BATTERY_DEGRADATION = 0.965;
export const PANEL_KW = 0.44;
/** Battery sizes the recommendation search walks, in kWh. */
export const BATTERY_SIZES = [0, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100];
/** Days in each reporting period, for scaling yearly figures. */
export const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30.44,
  quarter: 91.25,
  year: 365,
};

/** The minus sign is U+2212, not a hyphen — it aligns with digits. */
export function money(n: number): string {
  return `${n < 0 ? "−$" : "$"}${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

/** Yearly household consumption in kWh, backed out of a power bill. */
export function yearlyConsumption(bill: number, days: number, rate: number): number {
  return (Math.max(0, bill - SUPPLY * days) / Math.max(0.05, rate)) * (365 / days);
}

export type SimInput = {
  /** Usable battery capacity in kWh. */
  battery: number;
  consumption: number;
  generation: number;
  mode: BatteryMode;
  age: number;
};

export type SimResult = {
  /** kWh bought from the grid over a year. */
  imported: number;
  /** kWh sent to the grid over a year. */
  exported: number;
  /** kWh of own generation used on site. */
  selfUsed: number;
  /** Monthly load and monthly import, for the charts. */
  monthlyLoad: number[];
  monthlyImport: number[];
  /** Extra income from discharging into the evening peak. */
  peakIncome: number;
};

const loadWeightSum = LOAD_WEIGHT.reduce((a, b) => a + b, 0);
const irradianceSum = IRRADIANCE.map((x, i) => x * DAYS_IN_MONTH[i]).reduce((a, b) => a + b, 0);

/** Yearly generation for an array of this size at this age. */
export function generation(arrayKw: number, age: number): number {
  return arrayKw * YIELD_PER_KW * Math.pow(PANEL_DEGRADATION, age);
}

/**
 * Walks the year month by month. Each month the house uses some solar as it is
 * made, the battery soaks up what it can of the surplus, and whatever is left
 * of the load comes off the grid.
 */
export function simulate({ battery, consumption, generation: gen, mode, age }: SimInput): SimResult {
  const usable = battery * Math.pow(BATTERY_DEGRADATION, age);
  let imported = 0;
  let exported = 0;
  let selfUsed = 0;
  const monthlyLoad: number[] = [];
  const monthlyImport: number[] = [];

  for (let m = 0; m < 12; m++) {
    const load = (consumption * LOAD_WEIGHT[m]) / loadWeightSum;
    const made = (gen * IRRADIANCE[m] * DAYS_IN_MONTH[m]) / irradianceSum;
    // Only part of the load lands while the sun is up, and only part of what
    // is generated coincides with it.
    const direct = Math.min(0.35 * load, 0.55 * made);
    const surplus = made - direct;
    let stored = Math.min(surplus * 0.9, 0.65 * load, usable * 0.9 * DAYS_IN_MONTH[m] * 0.8);
    // Export-optimised holds charge back for the peak, so less covers the house.
    if (mode === "export") stored *= 0.85;

    const fromGrid = load - direct - stored;
    imported += fromGrid;
    exported += surplus - stored / 0.9;
    selfUsed += direct + stored;
    monthlyLoad.push(load);
    monthlyImport.push(fromGrid);
  }

  // Evening-peak arbitrage only pays in export-optimised mode.
  const peakIncome = mode === "export" ? usable * 0.15 * 365 * 0.9 * 0.2 : 0;
  return { imported, exported, selfUsed, monthlyLoad, monthlyImport, peakIncome };
}

/**
 * The battery size past which another kWh stops buying much. Walks up the
 * sizes and stops at the knee, where the marginal grid import saved per kWh
 * of battery falls below 1.5% of yearly consumption.
 */
export function recommendedBattery(consumption: number, gen: number, mode: BatteryMode, age: number): number {
  const imports = BATTERY_SIZES.map(
    (kwh) => simulate({ battery: kwh, consumption, generation: gen, mode, age }).imported,
  );
  for (let i = 1; i < BATTERY_SIZES.length; i++) {
    const saved = (imports[i - 1] - imports[i]) / (BATTERY_SIZES[i] - BATTERY_SIZES[i - 1]);
    if (saved < 0.015 * consumption) return BATTERY_SIZES[i - 1];
  }
  return BATTERY_SIZES[BATTERY_SIZES.length - 1];
}

/** Grid import at each of the sizes above, for the chart. */
export function importCurve(consumption: number, gen: number, mode: BatteryMode, age: number): number[] {
  return BATTERY_SIZES.map(
    (kwh) => simulate({ battery: kwh, consumption, generation: gen, mode, age }).imported,
  );
}

/* ------------------------------------------------------------------ */
/* Catalogue — the same SKUs the rest of the portal prices and orders. */
/* ------------------------------------------------------------------ */

export type Inverter = {
  brand: string;
  name: string;
  short: string;
  sku: string;
  kw: number;
  hybrid: boolean;
};

export const INVERTERS: Record<string, Inverter> = {
  fx99: {
    brand: "FOXESS",
    name: "FOXESS 1K5-1P-HI-9.9 hybrid",
    short: "1K5-1P-HI-9.9 · 9.9 kW hybrid",
    sku: "INV-FX99",
    kw: 9.9,
    hybrid: true,
  },
  s5: {
    brand: "Single-phase range",
    name: "5 kW single-phase inverter",
    short: "5 kW single-phase",
    sku: "INV-S5",
    kw: 5,
    hybrid: false,
  },
};

export type Battery = { brand: string; name: string; short: string; sku: string; kwh: number };

export const BATTERIES: Record<string, Battery> = {
  none: { brand: "", name: "No battery", short: "None", sku: "—", kwh: 0 },
  b100: {
    brand: "Stackable range",
    name: "10 kWh stackable battery",
    short: "10 kWh",
    sku: "BAT-100S",
    kwh: 10,
  },
  b200: {
    brand: "Stackable range",
    name: "2 × 10 kWh stackable",
    short: "20 kWh",
    sku: "BAT-100S × 2",
    kwh: 20,
  },
  fx4660: {
    brand: "FOX ESS",
    name: "FOX ESS 1K5-BAT-4660-L7 · 32.61 kWh",
    short: "32.61 kWh",
    sku: "BAT-FX4660",
    kwh: 32.61,
  },
  b500: {
    brand: "Stackable range",
    name: "5 × 10 kWh stackable",
    short: "50 kWh",
    sku: "BAT-100S × 5",
    kwh: 50,
  },
  fx2: {
    brand: "FOX ESS",
    name: "2 × FOX ESS 1K5-BAT-4660-L7 · 65.22 kWh",
    short: "65.22 kWh",
    sku: "BAT-FX4660 × 2",
    kwh: 65.22,
  },
  b1000: {
    brand: "Stackable range",
    name: "10 × 10 kWh stackable",
    short: "100 kWh",
    sku: "BAT-100S × 10",
    kwh: 100,
  },
};

export type Tier = { n: string; d: string; per: number; badge: string };

export const TIERS: Record<string, Tier> = {
  std: { n: "Standard", d: "440 W · silver frame", per: -15, badge: "" },
  prem: { n: "Premium", d: "AXITEC 440 W · PNL-AX440", per: 0, badge: "RECOMMENDED" },
  black: { n: "All-black", d: "440 W · black frame and backsheet", per: 25, badge: "" },
};

/* ------------------------------------------------------------------ */
/* Pricing — indicative, from the shared price list.                   */
/* ------------------------------------------------------------------ */

/** Dollars per certificate. */
export const STC_PRICE = 38;
/** Zone 3 rating, the zone these sample properties sit in. */
const ZONE_RATING = 1.382;
const DEEMING_YEARS = 5;
/** Battery certificates per kWh under Cheaper Home Batteries. */
const BATTERY_STC_PER_KWH = 6.8;
/** Certificates are only earned up to this battery size. */
export const BATTERY_STC_CAP = 50;
/** Panels may exceed inverter capacity by this much and still earn STCs. */
export const DCAC_LIMIT = 1.33;

export function solarStcs(arrayKw: number, ratioPercent: number): number {
  // An oversized array earns nothing, so the check has to come first.
  if (ratioPercent > 133) return 0;
  return Math.floor(arrayKw * ZONE_RATING * DEEMING_YEARS);
}

export function batteryStcs(kwh: number): number {
  return Math.floor(Math.min(kwh, BATTERY_STC_CAP) * BATTERY_STC_PER_KWH);
}

export type PriceInput = {
  arrayKw: number;
  panels: number;
  battery: number;
  tier: string;
  ratioPercent: number;
};

export type PriceResult = {
  solarGross: number;
  batteryGross: number;
  solarStcs: number;
  batteryStcs: number;
  total: number;
};

export function priceSystem({ arrayKw, panels, battery, tier, ratioPercent }: PriceInput): PriceResult {
  const sStc = solarStcs(arrayKw, ratioPercent);
  const bStc = batteryStcs(battery);
  const solarGross = arrayKw * 1100 + TIERS[tier].per * panels;
  const batteryGross = battery * 900;
  return {
    solarGross,
    batteryGross,
    solarStcs: sStc,
    batteryStcs: bStc,
    total: solarGross + batteryGross - (sStc + bStc) * STC_PRICE,
  };
}

/** Savings over 25 years, with output fading half a percent a year. */
export function lifetimeSavings(yearly: number): number {
  let total = 0;
  for (let y = 0; y < 25; y++) total += yearly * Math.pow(PANEL_DEGRADATION, y);
  return total;
}

/* ------------------------------------------------------------------ */
/* Property profiles — who the design is for.                          */
/* ------------------------------------------------------------------ */

export type RoofFace = { n: string; max: number; cols: number };

export type Profile = {
  title: string;
  address: string;
  network: string;
  /** Most panels the roof can physically hold. */
  roofMax: number;
  faces: RoofFace[];
  /** Square metres. */
  usable: number;
  total: number;
};

export const PROFILES: Record<"raj" | "daniel", Profile> = {
  raj: {
    title: "Raj Malhotra",
    address: "[Street], Seven Hills NSW 2147",
    network: "Endeavour Energy",
    roofMax: 24,
    faces: [
      { n: "North", max: 14, cols: 7 },
      { n: "East", max: 10, cols: 5 },
    ],
    usable: 48,
    total: 161,
  },
  daniel: {
    title: "Daniel Moretti",
    address: "[Street], Yagoona NSW 2198",
    network: "Ausgrid",
    roofMax: 38,
    faces: [
      { n: "North", max: 22, cols: 11 },
      { n: "West", max: 16, cols: 8 },
    ],
    usable: 72,
    total: 188,
  },
};

/** Operations works the lead from Quotes & Leads; everyone else gets Daniel. */
export function profileFor(role: Role): Profile {
  return role === "distributor" ? PROFILES.raj : PROFILES.daniel;
}

export type Defaults = {
  bill: number;
  panels: number;
  inverter: string;
  battery: number;
  batterySel: string;
  ev: boolean;
  heatPump: boolean;
  name: string;
  email: string;
  phone: string;
};

export function defaultsFor(role: Role): Defaults {
  const daniel: Defaults = {
    bill: 1150,
    panels: 29,
    inverter: "fx99",
    battery: 32.61,
    batterySel: "fx4660",
    ev: true,
    heatPump: true,
    name: "Daniel Moretti",
    email: "daniel@example.com",
    phone: "4XX XXX XXX",
  };
  const raj: Defaults = {
    bill: 620,
    panels: 15,
    inverter: "s5",
    battery: 0,
    batterySel: "none",
    ev: false,
    heatPump: false,
    name: "Raj Malhotra",
    email: "raj@example.com",
    phone: "4XX XXX XXX",
  };
  const base = role === "distributor" ? raj : daniel;
  // The public website has nobody signed in, so the contact fields start empty.
  return role === "public" ? { ...base, name: "", email: "", phone: "" } : base;
}

export const STEP_NAMES = [
  "Welcome",
  "Property type",
  "Contact details",
  "Address",
  "Your roof",
  "Savings",
  "Equipment",
  "Proposal",
] as const;

/** The last step is named for what that role does with the finished design. */
export function finalStepName(role: Role): string {
  if (role === "public") return "Sign in";
  if (role === "customer") return "Save";
  return role === "distributor" ? "Save & send" : "Share";
}
