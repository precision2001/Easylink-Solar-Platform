/**
 * The pricing engine behind the quote tester (PricingBody.dc.html, role
 * "operations" / screen "quote").
 *
 * This is the mock's own arithmetic, ported rather than reproduced: every
 * figure the screen shows is computed here from the controls, so changing a
 * panel count or an install date moves the money the way the real rules do.
 *
 * Sample data: the price book below is the mock's, which stands in for a real
 * one this app does not have yet. The CER rules are real as at Oct 2026 and
 * the battery factor needs checking each January and July.
 */

export type SystemType = "solar" | "combo" | "battery" | "expansion" | "inverter" | "ev";

export type InverterKind = "String" | "Hybrid" | "AC-coupled";

export type Panel = { id: string; model: string; w: number; supply: number; install: number };
export type Inverter = {
  id: string;
  kind: InverterKind;
  model: string;
  kw: number;
  phase: 1 | 3;
  supply: number;
  install: number;
};
export type Battery = { id: string; model: string; kwh: number; supply: number; install: number };
export type Extra = {
  id: string;
  label: string;
  per: "job" | "panel";
  supply: number;
  install: number;
};

export type Settings = {
  /** EasyLink margin on cost, as a percentage. */
  margin: number;
  gst: number;
  /** Dollars per STC passed on to the customer. */
  stcPrice: number;
  /** Whether a supply-only sale can still claim STCs. */
  supplyOnlyStc: boolean;
  /** Inverter kW ceilings by supply phase. */
  singleMax: number;
  threeMax: number;
  /** Array kW may not exceed inverter kW by more than this ratio. */
  dcac: number;
  jobFixed: number;
  threePhase: number;
  delivery: number;
  /** Installer trade margin on cost, as a percentage. */
  trade: number;
};

export type PriceBook = {
  settings: Settings;
  panels: Panel[];
  inverters: Inverter[];
  batteries: Battery[];
  extras: Extra[];
};

/* ------------------------------------------------------------------ rules */

/** CER zone ratings, MWh per kW — the multiplier on array kW for solar STCs. */
export const ZONE_RATINGS: Record<number, number> = { 1: 1.622, 2: 1.536, 3: 1.382, 4: 1.185 };

/** Solar deeming years remaining, by install year. The scheme ends after 2030. */
export const DEEMING_YEARS: Record<number, number> = {
  2026: 5,
  2027: 4,
  2028: 3,
  2029: 2,
  2030: 1,
};

/** Battery certificate factor per usable kWh, by install date. */
export const BATTERY_FACTORS: ReadonlyArray<readonly [string, string, number]> = [
  ["2026-01-01", "2026-04-30", 8.4],
  ["2026-05-01", "2026-12-31", 6.8],
  ["2027-01-01", "2027-06-30", 5.7],
  ["2027-07-01", "2027-12-31", 5.2],
  ["2028-01-01", "2028-06-30", 4.6],
  ["2028-07-01", "2028-12-31", 4.1],
  ["2029-01-01", "2029-06-30", 3.6],
  ["2029-07-01", "2029-12-31", 3.1],
  ["2030-01-01", "2030-06-30", 2.6],
  ["2030-07-01", "2030-12-31", 2.1],
];

/**
 * Tiered battery bands: [upper kWh bound, proportion that counts]. Capacity
 * above the last bound earns nothing.
 */
export const BATTERY_BANDS: ReadonlyArray<readonly [number, number]> = [
  [14, 1],
  [28, 0.6],
  [50, 0.15],
];

/** The date the tiered bands replaced the flat per-kWh rate. */
const TIERED_FROM = "2026-05-01";

/** Minimum usable capacity that earns any certificates at all. */
export const MIN_BATTERY_KWH = 5;

/** Capacity above this earns nothing, tiered or flat. */
const MAX_BATTERY_KWH = 50;

export function deemingYearsFor(date: string): number {
  return DEEMING_YEARS[Number(date.slice(0, 4))] ?? 0;
}

export function batteryFactorFor(date: string): number {
  for (const [from, to, factor] of BATTERY_FACTORS) {
    if (date >= from && date <= to) return factor;
  }
  return 0;
}

export type BatteryBandSplit = { kwh: number; proportion: number };

export type BatteryStcResult = {
  count: number;
  factor: number;
  /** How the capacity was split across the bands, for the workings line. */
  bands: BatteryBandSplit[];
  /** Band-weighted capacity the factor is applied to. */
  weightedKwh: number;
};

/** Certificates earned by a battery of `kwh` usable capacity installed on `date`. */
export function batteryStcs(kwh: number, date: string): BatteryStcResult {
  const factor = batteryFactorFor(date);
  if (kwh < MIN_BATTERY_KWH || !factor) {
    return { count: 0, factor, bands: [], weightedKwh: 0 };
  }

  // Before the tiers came in, every usable kWh up to the cap counted in full.
  if (date < TIERED_FROM) {
    const capped = Math.min(kwh, MAX_BATTERY_KWH);
    return { count: Math.floor(capped * factor), factor, bands: [], weightedKwh: capped };
  }

  const bands: BatteryBandSplit[] = [];
  let weightedKwh = 0;
  let previousBound = 0;
  for (const [bound, proportion] of BATTERY_BANDS) {
    const inBand = Math.max(0, Math.min(kwh, bound) - previousBound);
    if (inBand > 0) {
      bands.push({ kwh: Math.round(inBand * 100) / 100, proportion });
      weightedKwh += inBand * proportion;
    }
    previousBound = bound;
  }
  return { count: Math.floor(weightedKwh * factor), factor, bands, weightedKwh };
}

/** Certificates earned by a solar array. */
export function solarStcs(arrayKw: number, zone: number, date: string): number {
  return Math.floor(arrayKw * (ZONE_RATINGS[zone] ?? 0) * deemingYearsFor(date));
}

/**
 * Certificates one panel contributes, unrounded.
 *
 * Indicative only: a real system's total is floored once, across the whole
 * array, so these per-panel figures don't sum to the quoted number.
 */
export function panelStcEstimate(watts: number, zone: number, date: string): number {
  return (watts / 1000) * (ZONE_RATINGS[zone] ?? 0) * deemingYearsFor(date);
}

/** What an installer pays: EasyLink cost plus the trade margin. */
export function tradePrice(cost: number, settings: Settings): number {
  return Math.round(cost * (1 + settings.trade / 100));
}

/** A cost taken all the way to a retail price, margin then GST. */
export function sellIncGst(cost: number, settings: Settings): number {
  return cost * (1 + settings.margin / 100) * (1 + settings.gst / 100);
}

/** Reverses an ISO date into the Australian form the price book shows. */
export function auDate(date: string): string {
  return date.split("-").reverse().join("/");
}

/* ------------------------------------------------- system type capability */

/** System types that include panels in the price. */
export function usesPanels(type: SystemType): boolean {
  return type === "solar" || type === "combo" || type === "expansion";
}

/** System types that include a battery. */
export function usesBattery(type: SystemType): boolean {
  return type === "combo" || type === "battery";
}

/**
 * The inverter kinds each system type can be fitted with, or null where the
 * job doesn't include one — a panel add-on reuses the existing inverter, and
 * an EV charger has none.
 */
export function inverterKinds(type: SystemType): InverterKind[] | null {
  switch (type) {
    case "solar":
      return ["String"];
    case "combo":
      return ["Hybrid"];
    case "battery":
      return ["AC-coupled", "Hybrid"];
    case "inverter":
      return ["String", "Hybrid"];
    default:
      return null;
  }
}

/** Whether the panel count control is shown — an inverter swap needs the existing array. */
export function showsPanels(type: SystemType): boolean {
  return usesPanels(type) || type === "inverter";
}

export const SYSTEM_TYPES: ReadonlyArray<{ id: SystemType; label: string; desc: string }> = [
  { id: "solar", label: "Panels only", desc: "Panels + string inverter" },
  { id: "combo", label: "Solar + battery", desc: "Panels + hybrid inverter + battery" },
  { id: "battery", label: "Battery only", desc: "Retrofit to existing solar" },
  { id: "expansion", label: "Panel add-on", desc: "Extra panels, existing inverter" },
  { id: "inverter", label: "Inverter swap", desc: "Replace inverter only" },
  { id: "ev", label: "EV charger", desc: "Charger supply and install" },
];

const SYSTEM_LABELS = new Map(SYSTEM_TYPES.map((t) => [t.id, t.label]));

export function systemLabel(type: SystemType): string {
  return SYSTEM_LABELS.get(type) ?? type;
}

/** The label on the panel count field, which changes with the job. */
export function countLabel(type: SystemType): string {
  if (type === "inverter") return "Existing panels";
  if (type === "expansion") return "Panels to add";
  return "Panels";
}

/**
 * Smallest eligible inverter that can carry `arrayKw` within the DC:AC ratio,
 * or the largest available if nothing fits. Three-phase inverters are only
 * offered on a three-phase supply, and ties in kW go to the preferred kind.
 */
export function autoSizeInverter(
  pb: PriceBook,
  kinds: InverterKind[],
  arrayKw: number,
  phase: 1 | 3,
): Inverter | null {
  const pool = pb.inverters
    .filter((i) => kinds.includes(i.kind) && (phase === 3 || i.phase === 1))
    .sort((a, b) => a.kw - b.kw || (a.kind === kinds[0] ? -1 : 1));
  if (pool.length === 0) return null;
  return pool.find((i) => i.kw * pb.settings.dcac >= arrayKw) ?? pool[pool.length - 1];
}

/* ------------------------------------------------------------ price book */

/** The mock's sample price book. Replace wholesale when a real one exists. */
export const SAMPLE_PRICE_BOOK: PriceBook = {
  settings: {
    margin: 15,
    gst: 10,
    stcPrice: 37.5,
    supplyOnlyStc: false,
    singleMax: 10,
    threeMax: 30,
    dcac: 1.33,
    jobFixed: 950,
    threePhase: 450,
    delivery: 150,
    trade: 8,
  },
  panels: [
    { id: "p1", model: "Trina Vertex 440W (Standard)", w: 440, supply: 95, install: 85 },
    { id: "p2", model: "Sigenergy N-type 480W (Premium)", w: 480, supply: 135, install: 85 },
    { id: "p3", model: "All-black 440W", w: 440, supply: 125, install: 85 },
  ],
  inverters: [
    { id: "i1", kind: "String", model: "String inverter 5 kW", kw: 5, phase: 1, supply: 900, install: 350 },
    { id: "i2", kind: "String", model: "String inverter 8 kW", kw: 8, phase: 1, supply: 1150, install: 350 },
    { id: "i3", kind: "String", model: "String inverter 10 kW", kw: 10, phase: 1, supply: 1350, install: 350 },
    { id: "i4", kind: "String", model: "String inverter 15 kW 3-phase", kw: 15, phase: 3, supply: 1900, install: 450 },
    { id: "i5", kind: "String", model: "String inverter 20 kW 3-phase", kw: 20, phase: 3, supply: 2400, install: 450 },
    { id: "i6", kind: "Hybrid", model: "Hybrid inverter 5 kW", kw: 5, phase: 1, supply: 1500, install: 400 },
    { id: "i7", kind: "Hybrid", model: "Hybrid inverter 8 kW", kw: 8, phase: 1, supply: 1800, install: 400 },
    { id: "i8", kind: "Hybrid", model: "Hybrid inverter 10 kW", kw: 10, phase: 1, supply: 2100, install: 400 },
    { id: "i9", kind: "Hybrid", model: "Hybrid inverter 15 kW 3-phase", kw: 15, phase: 3, supply: 3000, install: 500 },
    { id: "i10", kind: "Hybrid", model: "Hybrid inverter 20 kW 3-phase", kw: 20, phase: 3, supply: 3700, install: 500 },
    { id: "i11", kind: "AC-coupled", model: "AC-coupled battery inverter 5 kW", kw: 5, phase: 1, supply: 1400, install: 400 },
  ],
  // $430 per usable kWh of supply, with install stepping at 20 and 50 kWh.
  batteries: [5, 9.2, 13.5, 14.6, 20, 28, 40, 50, 60, 100].map((kwh, i) => ({
    id: `b${i + 1}`,
    model: `LFP battery ${kwh} kWh`,
    kwh,
    supply: Math.round(kwh * 430),
    install: kwh <= 20 ? 1100 : kwh <= 50 ? 1600 : 2200,
  })),
  extras: [
    { id: "x1", label: "Backup gateway", per: "job", supply: 900, install: 200 },
    { id: "x2", label: "Switchboard upgrade", per: "job", supply: 0, install: 1200 },
    { id: "x3", label: "Tilt frames", per: "panel", supply: 25, install: 15 },
    { id: "x4", label: "Tile roof adder", per: "panel", supply: 0, install: 15 },
    { id: "x5", label: "Double-storey adder", per: "job", supply: 0, install: 400 },
    { id: "x6", label: "Bird proofing", per: "panel", supply: 12, install: 8 },
    { id: "ev", label: "EV charger 7 kW", per: "job", supply: 900, install: 600 },
  ],
};

/* ---------------------------------------------------------------- quoting */

export type QuoteInputs = {
  type: SystemType;
  panelId: string;
  count: number;
  /** An inverter id, or "auto" to size it against the array. */
  inverterId: string;
  batteryId: string;
  /** Whether the site already has panels — needed for battery-only STCs. */
  existing: boolean;
  zone: number;
  phase: 1 | 3;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  install: boolean;
  stc: boolean;
  extras: Record<string, boolean>;
};

export type QuoteLine = {
  item: string;
  qty: number;
  supply: number;
  install: number;
  sellEx: number;
  sellInc: number;
};

export type StcLine = { label: string; count: number; value: number };

export type QuoteResult = {
  lines: QuoteLine[];
  supplyTotal: number;
  installTotal: number;
  cost: number;
  /** Cost plus margin, ex GST. */
  sellEx: number;
  /** Sell inc GST, before any STC discount. */
  priceBeforeStcs: number;
  stcLines: StcLine[];
  stcCount: number;
  stcValue: number;
  /** What the customer pays. */
  net: number;
  marginDollars: number;
  arrayKw: number;
  inverter: Inverter | null;
  battery: Battery | null;
  blocks: string[];
  warns: string[];
  notes: string[];
  install: boolean;
  stc: boolean;
};

export const QUOTE_DEFAULTS: QuoteInputs = {
  type: "combo",
  panelId: "p1",
  count: 19,
  inverterId: "auto",
  batteryId: "b3",
  existing: true,
  zone: 3,
  phase: 1,
  date: "2026-11-15",
  install: true,
  stc: true,
  extras: {},
};

/**
 * Formats money to the nearest dollar.
 *
 * The magnitude is rounded before the sign is reapplied: rounding the signed
 * value would send −2137.5 to −2137 (JS rounds halves toward +∞) and show a
 * certificate discount a dollar light.
 */
export function money(n: number): string {
  return `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;
}

/**
 * Formats money keeping any cents, for rates rather than totals — the STC
 * price is $37.50 and must not read as $38.
 */
export function rate(n: number): string {
  const abs = Math.abs(n);
  const text = Number.isInteger(abs)
    ? abs.toLocaleString("en-AU")
    : abs.toLocaleString("en-AU", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${n < 0 ? "−" : ""}$${text}`;
}

/**
 * Prices one configuration. `type`, `install` and `stc` are passed separately
 * from `q` so the comparison matrix and the all-types grid can re-price the
 * same inputs under different modes without cloning the input state.
 */
export function priceQuote(
  pb: PriceBook,
  q: QuoteInputs,
  type: SystemType = q.type,
  install: boolean = q.install,
  stc: boolean = q.stc,
): QuoteResult {
  const s = pb.settings;
  const lines: QuoteLine[] = [];
  const blocks: string[] = [];
  const warns: string[] = [];
  const notes: string[] = [];

  const panel = pb.panels.find((p) => p.id === q.panelId) ?? pb.panels[0];
  const count = Math.max(0, Math.floor(q.count || 0));
  // Held for every type: an inverter swap is sized against the array that is
  // already on the roof, even though no panels are in the price.
  const arrayKw = (count * panel.w) / 1000;

  const add = (item: string, qty: number, unitSupply: number, unitInstall: number) => {
    const supply = qty * unitSupply;
    const installCost = install ? qty * unitInstall : 0;
    const sellEx = (supply + installCost) * (1 + s.margin / 100);
    lines.push({
      item,
      qty,
      supply,
      install: installCost,
      sellEx,
      sellInc: sellEx * (1 + s.gst / 100),
    });
  };

  if (usesPanels(type)) {
    if (!count) blocks.push("Enter a panel count.");
    add(panel.model, count, panel.supply, panel.install);
  }

  let inverter: Inverter | null = null;
  const kinds = inverterKinds(type);
  if (kinds) {
    inverter =
      q.inverterId !== "auto"
        ? (pb.inverters.find((i) => i.id === q.inverterId && kinds.includes(i.kind)) ?? null)
        : null;
    // Battery-only jobs size the inverter for the battery, not the array.
    if (!inverter) inverter = autoSizeInverter(pb, kinds, type === "battery" ? 0 : arrayKw, q.phase);

    if (inverter) {
      add(inverter.model, 1, inverter.supply, inverter.install);
      if (
        (type === "solar" || type === "combo" || type === "inverter") &&
        arrayKw > inverter.kw * s.dcac
      ) {
        blocks.push(
          `${arrayKw.toFixed(2)} kW of panels is more than ${Math.round(s.dcac * 100)}% of the ${inverter.kw} kW inverter. Pick a bigger inverter or fewer panels.`,
        );
      }
      if (inverter.phase === 3 && q.phase === 1) {
        blocks.push(`${inverter.model} needs a three-phase supply.`);
      }
      const limit = q.phase === 3 ? s.threeMax : s.singleMax;
      if (inverter.kw > limit) {
        blocks.push(`${inverter.kw} kW is over the ${limit} kW inverter limit for this supply.`);
      }
    } else {
      blocks.push("No inverter in the price book fits this system type.");
    }
  }

  if (type === "expansion") {
    warns.push(
      "Check the existing inverter can take the extra panels (array up to 133% of inverter kW).",
    );
  }

  let battery: Battery | null = null;
  if (usesBattery(type)) {
    battery = pb.batteries.find((b) => b.id === q.batteryId) ?? pb.batteries[0];
    if (battery) {
      add(battery.model, 1, battery.supply, battery.install);
      if (battery.kwh > MAX_BATTERY_KWH) {
        warns.push(
          `Battery is ${battery.kwh} kWh: capacity above ${MAX_BATTERY_KWH} kWh gets no federal rebate.`,
        );
      } else if (battery.kwh > 28) {
        warns.push(
          `Battery is ${battery.kwh} kWh: capacity above 28 kWh gets only 15% of the STC factor.`,
        );
      }
      if (battery.kwh < MIN_BATTERY_KWH) {
        warns.push(`Batteries under ${MIN_BATTERY_KWH} kWh usable get no federal rebate.`);
      }
    }
  }

  for (const x of pb.extras) {
    const on = (x.id === "ev" && type === "ev") || !!q.extras[x.id];
    if (!on) continue;
    if (x.per === "panel" && !usesPanels(type)) continue;
    add(x.label, x.per === "panel" ? count : 1, x.supply, x.install);
  }

  if (install && ["solar", "combo", "battery", "expansion"].includes(type)) {
    add("Design, permits, DNSP approval, metering", 1, 0, s.jobFixed);
  }
  if (install && q.phase === 3 && type !== "ev") {
    add("Three-phase works", 1, 0, s.threePhase);
  }
  if (!install) {
    add("Delivery (supply only)", 1, s.delivery, 0);
  }

  const supplyTotal = lines.reduce((t, l) => t + l.supply, 0);
  const installTotal = lines.reduce((t, l) => t + l.install, 0);
  const cost = supplyTotal + installTotal;
  const sellEx = cost * (1 + s.margin / 100);
  const priceBeforeStcs = sellEx * (1 + s.gst / 100);

  /* ----- certificates ----- */

  const canClaim = install || s.supplyOnlyStc;
  const years = deemingYearsFor(q.date);
  const rating = ZONE_RATINGS[q.zone] ?? 0;
  const stcLines: StcLine[] = [];

  if (stc && (usesPanels(type) || usesBattery(type)) && !canClaim) {
    notes.push(
      "Supply only: no STCs. They are created only when an accredited installer installs the system.",
    );
  }
  if (stc && canClaim && usesPanels(type)) {
    const c = solarStcs(arrayKw, q.zone, q.date);
    if (c > 0) {
      stcLines.push({
        label: `Solar STCs: ⌊${arrayKw.toFixed(2)} kW × ${rating} × ${years} yrs⌋ = ${c} × ${rate(s.stcPrice)}`,
        count: c,
        value: c * s.stcPrice,
      });
    }
  }
  if (stc && canClaim && battery) {
    if (type === "battery" && !q.existing) {
      notes.push("No battery STCs: the battery must connect to solar panels on the site.");
    } else {
      const r = batteryStcs(battery.kwh, q.date);
      if (r.count > 0) {
        const split =
          r.bands
            .map((b) => `${b.kwh} kWh @ ${Math.round(b.proportion * 100)}%`)
            .join(" + ") || `${r.weightedKwh} kWh`;
        stcLines.push({
          label: `Battery STCs: ⌊(${split}) × ${r.factor}⌋ = ${r.count} × ${rate(s.stcPrice)}`,
          count: r.count,
          value: r.count * s.stcPrice,
        });
      }
    }
  }
  if (type === "inverter" || type === "ev") {
    notes.push(
      `${type === "ev" ? "EV chargers" : "Inverter-only jobs"} don’t earn STCs.`,
    );
  }

  const stcCount = stcLines.reduce((t, l) => t + l.count, 0);
  const stcValue = stcLines.reduce((t, l) => t + l.value, 0);

  return {
    lines,
    supplyTotal,
    installTotal,
    cost,
    sellEx,
    priceBeforeStcs,
    stcLines,
    stcCount,
    stcValue,
    net: priceBeforeStcs - stcValue,
    marginDollars: sellEx - cost,
    arrayKw,
    inverter,
    battery,
    blocks,
    warns,
    notes,
    install,
    stc,
  };
}
