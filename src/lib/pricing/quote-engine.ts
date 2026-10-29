/**
 * EasyLink quote engine (v2) — the same rules as the backend's
 * src/modules/pricing/quote-engine.ts (keep the two in step).
 *
 * The real price book lives in the private backend database. The website
 * never ships it: the Designs page asks POST /api/pricing/proposal for
 * customer prices, and only the Master portal (admin sign-in) loads the full
 * book to edit it and run the quote tester. SAMPLE_PRICE_BOOK below is a
 * placeholder with made-up costs, used only when the real book can't load.
 *
 * Rules (as at Oct 2026):
 *  - Item price = trade cost × (1 + margin) × (1 + GST).
 *  - Installation is EasyLink's own rate, charged as entered (inc GST, no
 *    margin): panels $/W, inverter free with panels, battery base price up to
 *    a size then a step per extra block, EV charger and inverter-swap flat fees.
 *  - Inverter sizing: 200% DC:AC with a hybrid inverter or any battery, 133%
 *    with a string inverter and no battery. Export/inverter limit 10 kW per phase.
 *  - Batteries with a built-in inverter (BLUETTI packages, Powerwall 3) add no
 *    separate inverter; battery families locked to their own brand of inverter
 *    get a matching inverter when auto-sizing.
 *  - Solar STCs = floor(array kW × zone rating × deeming years).
 *  - Battery STCs (installed from 1 May 2026) = floor(usable kWh tiered
 *    100% to 14 kWh, 60% to 28 kWh, 15% to 50 kWh, × STC factor for the date).
 */

export type SystemType = 'solar' | 'combo' | 'battery' | 'expansion' | 'inverter' | 'ev';
export type InverterKind = 'String' | 'Hybrid' | 'AC-coupled';

type Sourced = { sup?: string; sku?: string; src?: string };
export type Panel = Sourced & { id: string; model: string; w: number; supply: number };
export type Inverter = Sourced & {
  id: string;
  kind: InverterKind;
  model: string;
  kw: number;
  phase: 1 | 3;
  supply: number;
  builtin?: boolean;
};
export type Battery = Sourced & {
  id: string;
  model: string;
  /** Usable kWh — the figure STCs and sizing use. */
  kwh: number;
  supply: number;
  /** Inverter built in (package or AC battery): no separate inverter is added. */
  inv?: boolean;
  invKw?: number;
  /** Maximum PV the built-in inverter accepts, kW. Defaults to invKw × 200%. */
  pvKw?: number;
  phase?: 1 | 3;
  nominal?: number;
};
export type EvCharger = Sourced & { id: string; model: string; kw: number; phase: 1 | 3; supply: number };
export type Extra = Sourced & {
  id: string;
  label: string;
  per: 'job' | 'panel';
  /** Trade cost ex GST (margin and GST added). */
  supply: number;
  /** Installation price charged as entered, inc GST. */
  install: number;
};

export type Settings = {
  margin: number;
  gst: number;
  stcPrice: number;
  supplyOnlyStc: boolean;
  /** Inverter kW limits by supply (10 kW per phase). */
  singleMax: number;
  threeMax: number;
  dcacStandard: number;
  dcacHybrid: number;
  /** Supply-only delivery, inc GST. */
  delivery: number;
  /* Installation rates, inc GST. */
  panelPerW: number;
  invWithPanels: number;
  batteryBase: number;
  batteryBaseKwh: number;
  batteryStep: number;
  batteryStepKwh: number;
  evInstall: number;
  invSwap: number;
  threePhase: number;
  /** Installer trade margin on cost, % (Master price book display). */
  trade?: number;
};

export type ProposalSettings = {
  /** Proposal panel tier → panel id in the book. */
  tiers: Record<string, string>;
  /** CER zone used when the site's zone isn't known. */
  defaultZone: number;
};

export type PriceBook = {
  settings: Settings;
  proposal: ProposalSettings;
  panels: Panel[];
  inverters: Inverter[];
  batteries: Battery[];
  evChargers: EvCharger[];
  extras: Extra[];
};

/* ------------------------------------------------------------------ rules */

export const ZONE_RATINGS: Record<number, number> = { 1: 1.622, 2: 1.536, 3: 1.382, 4: 1.185 };
export const DEEMING_YEARS: Record<number, number> = { 2026: 5, 2027: 4, 2028: 3, 2029: 2, 2030: 1 };
export const BATTERY_FACTORS: ReadonlyArray<readonly [string, string, number]> = [
  ['2026-01-01', '2026-04-30', 8.4],
  ['2026-05-01', '2026-12-31', 6.8],
  ['2027-01-01', '2027-06-30', 5.7],
  ['2027-07-01', '2027-12-31', 5.2],
  ['2028-01-01', '2028-06-30', 4.6],
  ['2028-07-01', '2028-12-31', 4.1],
  ['2029-01-01', '2029-06-30', 3.6],
  ['2029-07-01', '2029-12-31', 3.1],
  ['2030-01-01', '2030-06-30', 2.6],
  ['2030-07-01', '2030-12-31', 2.1],
];
export const BATTERY_BANDS: ReadonlyArray<readonly [number, number]> = [
  [14, 1],
  [28, 0.6],
  [50, 0.15],
];
const TIERED_FROM = '2026-05-01';
export const MIN_BATTERY_KWH = 5;
const MAX_BATTERY_KWH = 50;

/** Battery families that only run with their own brand's inverter. */
export const LOCKED_BRANDS = [
  'Sigenergy', 'AlphaESS', 'ESY', 'Sungrow', 'FOX', 'GoodWe', 'SolarEdge', 'Fronius', 'Anker', 'SAJ', 'Kstar', 'SOL',
];
export const brandOf = (model: string) => (model || '').split(' ')[0];

export function deemingYearsFor(date: string): number {
  return DEEMING_YEARS[Number(date.slice(0, 4))] ?? 0;
}

export function batteryFactorFor(date: string): number {
  for (const [from, to, factor] of BATTERY_FACTORS) if (date >= from && date <= to) return factor;
  return 0;
}

export type BatteryStcResult = {
  count: number;
  factor: number;
  bands: { kwh: number; proportion: number }[];
  weightedKwh: number;
};

export function batteryStcs(kwh: number, date: string): BatteryStcResult {
  const factor = batteryFactorFor(date);
  if (kwh < MIN_BATTERY_KWH || !factor) return { count: 0, factor, bands: [], weightedKwh: 0 };
  if (date < TIERED_FROM) {
    const capped = Math.min(kwh, MAX_BATTERY_KWH);
    return { count: Math.floor(capped * factor + 1e-9), factor, bands: [], weightedKwh: capped };
  }
  const bands: BatteryStcResult['bands'] = [];
  let weightedKwh = 0;
  let prev = 0;
  for (const [bound, proportion] of BATTERY_BANDS) {
    const inBand = Math.max(0, Math.min(kwh, bound) - prev);
    if (inBand > 0) {
      bands.push({ kwh: Math.round(inBand * 100) / 100, proportion });
      weightedKwh += inBand * proportion;
    }
    prev = bound;
  }
  return { count: Math.floor(weightedKwh * factor + 1e-9), factor, bands, weightedKwh };
}

/** Certificates one panel contributes, unrounded (indicative — a system's total is floored once). */
export function panelStcEstimate(watts: number, zone: number, date: string): number {
  return (watts / 1000) * (ZONE_RATINGS[zone] ?? 0) * deemingYearsFor(date);
}

export function solarStcs(arrayKw: number, zone: number, date: string): number {
  return Math.floor(arrayKw * (ZONE_RATINGS[zone] ?? 0) * deemingYearsFor(date) + 1e-9);
}

/* -------------------------------------------------------------- helpers */

export const usesPanels = (t: SystemType) => t === 'solar' || t === 'combo' || t === 'expansion';
export const usesBattery = (t: SystemType) => t === 'combo' || t === 'battery';

export function inverterKinds(type: SystemType): InverterKind[] | null {
  switch (type) {
    case 'solar':
      return ['String'];
    case 'combo':
      return ['Hybrid'];
    case 'battery':
      return ['AC-coupled', 'Hybrid'];
    case 'inverter':
      return ['String', 'Hybrid'];
    default:
      return null;
  }
}

export const itemPrice = (cost: number, s: Settings) => cost * (1 + s.margin / 100) * (1 + s.gst / 100);
export const panelInstall = (count: number, w: number, s: Settings) => count * w * s.panelPerW;

/** $2,000 up to 20 kWh, then $500 for each 10 kWh (or part) above — as configured. */
export function batteryInstall(kwh: number, s: Settings): number {
  if (kwh <= s.batteryBaseKwh) return s.batteryBase;
  return s.batteryBase + Math.ceil((kwh - s.batteryBaseKwh) / s.batteryStepKwh - 1e-9) * s.batteryStep;
}

/** DC:AC ratio allowed for an inverter: 200% for hybrid / with battery, else 133%. */
export function dcacFor(kind: InverterKind | 'builtin', withBattery: boolean, s: Settings): number {
  return kind === 'Hybrid' || kind === 'builtin' || withBattery ? s.dcacHybrid : s.dcacStandard;
}

/** Cheapest inverter of the preferred kind that can carry the array on this supply. */
export function autoInverter(
  pb: PriceBook,
  kinds: InverterKind[],
  arrayKw: number,
  phase: 1 | 3,
  withBattery: boolean,
  batteryBrand?: string,
): Inverter | null {
  let pool = pb.inverters.filter((i) => !i.builtin && kinds.includes(i.kind) && (phase === 3 || i.phase === 1));
  if (batteryBrand && LOCKED_BRANDS.includes(batteryBrand)) {
    const same = pool.filter((i) => brandOf(i.model) === batteryBrand);
    if (same.length) pool = same;
  }
  if (!pool.length) return null;
  const limit = phase === 3 ? pb.settings.threeMax : pb.settings.singleMax;
  const rank = (a: Inverter, b: Inverter) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.supply - b.supply;
  const fits = pool
    .filter((i) => i.kw <= limit && i.kw * dcacFor(i.kind, withBattery, pb.settings) >= arrayKw)
    .sort(rank);
  return fits[0] ?? [...pool].sort((a, b) => b.kw - a.kw)[0];
}

/* --------------------------------------------------------------- quoting */

export type QuoteInputs = {
  type: SystemType;
  panelId?: string;
  count: number;
  inverterId?: string;
  batteryId?: string;
  evId?: string;
  existing?: boolean;
  zone: number;
  phase: 1 | 3;
  date: string;
  install: boolean;
  stc: boolean;
  extras?: Record<string, boolean>;
};

export type QuoteLine = {
  item: string;
  kind: 'panel' | 'inverter' | 'battery' | 'ev' | 'extra' | 'fixed';
  qty: number;
  /** Trade cost ex GST (internal only). */
  cost: number;
  /** Customer item price inc GST. */
  itemPrice: number;
  /** Installation inc GST. */
  install: number;
  installNote: string;
  /** Compatibility: trade cost (same as `cost`). */
  supply: number;
  /** Item + installation, inc GST. */
  sellInc: number;
  /** Item + installation, ex GST. */
  sellEx: number;
};

export type StcLine = { label: string; count: number; value: number };

export type QuoteResult = {
  type: SystemType;
  lines: QuoteLine[];
  install: boolean;
  stc: boolean;
  /** Trade cost total (compatibility name). */
  supplyTotal: number;
  /** Price before STCs, ex GST. */
  sellEx: number;
  itemTotal: number;
  installTotal: number;
  priceBeforeStcs: number;
  cost: number;
  marginDollars: number;
  stcLines: StcLine[];
  stcCount: number;
  stcValue: number;
  net: number;
  arrayKw: number;
  panel: Panel | null;
  inverter: Inverter | null;
  battery: Battery | null;
  evCharger: EvCharger | null;
  blocks: string[];
  warns: string[];
  notes: string[];
};

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

  const panel = pb.panels.find((p) => p.id === q.panelId) ?? pb.panels[0] ?? null;
  const count = Math.max(0, Math.floor(q.count || 0));
  const arrayKw = panel ? (count * panel.w) / 1000 : 0;

  const push = (l: Omit<QuoteLine, 'supply' | 'sellInc' | 'sellEx'>) =>
    lines.push({ ...l, supply: l.cost, sellInc: l.itemPrice + l.install, sellEx: (l.itemPrice + l.install) / (1 + s.gst / 100) });
  const add = (item: string, kind: QuoteLine['kind'], qty: number, unitCost: number, installAmt: number, note: string) =>
    push({
      item,
      kind,
      qty,
      cost: qty * unitCost,
      itemPrice: itemPrice(qty * unitCost, s),
      install: install ? installAmt : 0,
      installNote: install ? note : 'Supply only',
    });

  if (usesPanels(type) && panel) {
    if (!count) blocks.push('Enter a panel count.');
    add(panel.model, 'panel', count, panel.supply, panelInstall(count, panel.w, s), `${count} × ${panel.w} W × $${s.panelPerW.toFixed(2)}/W`);
  }

  const battery: Battery | null = usesBattery(type)
    ? (pb.batteries.find((b) => b.id === q.batteryId) ?? pb.batteries[0] ?? null)
    : null;
  const builtIn = !!battery?.inv;

  if (builtIn && battery) {
    notes.push(`Inverter is built into ${battery.model}, so no separate inverter is added.`);
    const pv = battery.pvKw ?? (battery.invKw ?? 0) * s.dcacHybrid;
    if (type === 'combo' && arrayKw > pv) {
      blocks.push(`${arrayKw.toFixed(2)} kW of panels is more than the ${+pv.toFixed(1)} kW of PV this package's inverter accepts.`);
    }
    if (battery.phase === 3 && q.phase === 1) blocks.push(`${battery.model} is a three-phase package and the site is single phase.`);
  }

  let inverter: Inverter | null = null;
  const kinds = inverterKinds(type);
  if (kinds && !builtIn) {
    const picked = q.inverterId && q.inverterId !== 'auto'
      ? pb.inverters.find((i) => i.id === q.inverterId && kinds.includes(i.kind) && !i.builtin)
      : undefined;
    inverter = picked ?? autoInverter(pb, kinds, type === 'battery' ? 0 : arrayKw, q.phase, !!battery, battery ? brandOf(battery.model) : undefined);
    if (inverter) {
      const amt = type === 'inverter' ? s.invSwap : s.invWithPanels;
      const note = type === 'inverter' ? 'Inverter swap rate' : type === 'battery' ? 'Included in battery rate' : s.invWithPanels ? 'Inverter install' : 'Free with panel installation';
      add(inverter.model, 'inverter', 1, inverter.supply, amt, note);
      const ratio = dcacFor(inverter.kind, !!battery, s);
      if ((type === 'solar' || type === 'combo' || type === 'inverter') && arrayKw > inverter.kw * ratio) {
        blocks.push(`${arrayKw.toFixed(2)} kW of panels is more than ${Math.round(ratio * 100)}% of the ${inverter.kw} kW inverter.`);
      }
      if (inverter.phase === 3 && q.phase === 1) blocks.push(`${inverter.model} needs a three-phase supply.`);
      const limit = q.phase === 3 ? s.threeMax : s.singleMax;
      if (inverter.kw > limit) blocks.push(`${inverter.kw} kW is over the ${limit} kW inverter limit for this supply.`);
      if (battery && LOCKED_BRANDS.includes(brandOf(battery.model)) && brandOf(inverter.model) !== brandOf(battery.model)) {
        warns.push(`${battery.model} normally needs a ${brandOf(battery.model)} inverter, but ${inverter.model} is selected.`);
      }
    } else {
      blocks.push('No inverter in the price book fits this system type.');
    }
  }
  if (type === 'expansion') warns.push('Check the existing inverter can take the extra panels.');

  if (battery) {
    const bi = batteryInstall(battery.kwh, s);
    add(battery.model, 'battery', 1, battery.supply, bi,
      battery.kwh <= s.batteryBaseKwh ? `Up to ${s.batteryBaseKwh} kWh rate` : `$${s.batteryBase} + ${Math.round((bi - s.batteryBase) / s.batteryStep)} × $${s.batteryStep}`);
    if (battery.kwh > MAX_BATTERY_KWH) warns.push(`Battery is ${battery.kwh} kWh: capacity above ${MAX_BATTERY_KWH} kWh gets no federal rebate.`);
    else if (battery.kwh > 28) warns.push(`Battery is ${battery.kwh} kWh: capacity above 28 kWh gets only 15% of the STC factor.`);
    if (battery.kwh < MIN_BATTERY_KWH) warns.push(`Batteries under ${MIN_BATTERY_KWH} kWh usable get no federal rebate.`);
  }

  let evCharger: EvCharger | null = null;
  if (type === 'ev') {
    evCharger = pb.evChargers.find((e) => e.id === q.evId) ?? pb.evChargers[0] ?? null;
    if (evCharger) {
      add(evCharger.model, 'ev', 1, evCharger.supply, s.evInstall, 'EV charger rate');
      if (evCharger.phase === 3 && q.phase === 1) blocks.push(`${evCharger.model} needs a three-phase supply.`);
    } else blocks.push('Add an EV charger to the price book.');
  }

  for (const x of pb.extras) {
    if (!q.extras?.[x.id]) continue;
    if (x.per === 'panel' && !usesPanels(type)) continue;
    const qty = x.per === 'panel' ? count : 1;
    add(x.label, 'extra', qty, x.supply, qty * x.install, x.per === 'panel' ? `${qty} × $${x.install}` : 'Fixed');
  }
  if (install && q.phase === 3 && s.threePhase && type !== 'ev') {
    push({ item: 'Three-phase works', kind: 'fixed', qty: 1, cost: 0, itemPrice: 0, install: s.threePhase, installNote: 'Fixed' });
  }
  if (!install) push({ item: 'Delivery (supply only)', kind: 'fixed', qty: 1, cost: 0, itemPrice: s.delivery, install: 0, installNote: '' });

  const itemTotal = lines.reduce((t, l) => t + l.itemPrice, 0);
  const installTotal = lines.reduce((t, l) => t + l.install, 0);
  const cost = lines.reduce((t, l) => t + l.cost, 0);
  const priceBeforeStcs = itemTotal + installTotal;

  const canClaim = install || s.supplyOnlyStc;
  const stcLines: StcLine[] = [];
  if (stc && (usesPanels(type) || usesBattery(type)) && !canClaim) {
    notes.push('Supply only: no STCs. They are created only when an accredited installer installs the system.');
  }
  if (stc && canClaim && usesPanels(type)) {
    const c = solarStcs(arrayKw, q.zone, q.date);
    if (c > 0) {
      stcLines.push({
        label: `Solar STCs: ⌊${arrayKw.toFixed(2)} kW × ${ZONE_RATINGS[q.zone]} × ${deemingYearsFor(q.date)} yrs⌋ = ${c}`,
        count: c,
        value: c * s.stcPrice,
      });
    }
  }
  if (stc && canClaim && battery) {
    if (type === 'battery' && q.existing === false) {
      notes.push('No battery STCs: the battery must connect to solar panels on the site.');
    } else {
      const r = batteryStcs(battery.kwh, q.date);
      if (r.count > 0) {
        const split = r.bands.map((b) => `${b.kwh} kWh @ ${Math.round(b.proportion * 100)}%`).join(' + ') || `${r.weightedKwh} kWh`;
        stcLines.push({ label: `Battery STCs: ⌊(${split}) × ${r.factor}⌋ = ${r.count}`, count: r.count, value: r.count * s.stcPrice });
      }
    }
  }
  if (type === 'inverter' || type === 'ev') notes.push(`${type === 'ev' ? 'EV chargers' : 'Inverter-only jobs'} don't earn STCs.`);

  const stcCount = stcLines.reduce((t, l) => t + l.count, 0);
  const stcValue = stcLines.reduce((t, l) => t + l.value, 0);
  return {
    type,
    lines,
    install,
    stc,
    supplyTotal: cost,
    sellEx: priceBeforeStcs / (1 + s.gst / 100),
    itemTotal,
    installTotal,
    priceBeforeStcs,
    cost,
    marginDollars: itemTotal / (1 + s.gst / 100) - cost,
    stcLines,
    stcCount,
    stcValue,
    net: priceBeforeStcs - stcValue,
    arrayKw,
    panel,
    inverter,
    battery,
    evCharger,
    blocks,
    warns,
    notes,
  };
}

/* ------------------------------------------------------------ UI helpers */

export const sellIncGst = (cost: number, s: Settings) => itemPrice(cost, s);
/** What an installer pays: EasyLink cost plus the installer trade margin. */
export const tradePrice = (cost: number, s: Settings) => Math.round(cost * (1 + (s.trade ?? 0) / 100));

export function auDate(date: string): string {
  return date.split('-').reverse().join('/');
}

/** Money to the nearest dollar (magnitude rounded before the sign is applied). */
export function money(n: number): string {
  return `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-AU')}`;
}

/** Money keeping cents, for rates ($37.50 must not read as $38). */
export function rate(n: number): string {
  const abs = Math.abs(n);
  const text = Number.isInteger(abs)
    ? abs.toLocaleString('en-AU')
    : abs.toLocaleString('en-AU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${n < 0 ? '−' : ''}$${text}`;
}

export const showsPanels = (t: SystemType) => usesPanels(t) || t === 'inverter';

export const SYSTEM_TYPES: ReadonlyArray<{ id: SystemType; label: string; desc: string }> = [
  { id: 'solar', label: 'Panels only', desc: 'Panels + string inverter' },
  { id: 'combo', label: 'Solar + battery', desc: 'Panels + hybrid inverter + battery' },
  { id: 'battery', label: 'Battery only', desc: 'Retrofit to existing solar' },
  { id: 'expansion', label: 'Panel add-on', desc: 'Extra panels, existing inverter' },
  { id: 'inverter', label: 'Inverter swap', desc: 'Replace inverter only' },
  { id: 'ev', label: 'EV charger', desc: 'Charger supply and install' },
];
const SYSTEM_LABELS = new Map(SYSTEM_TYPES.map((t) => [t.id, t.label]));
export const systemLabel = (t: SystemType) => SYSTEM_LABELS.get(t) ?? t;
export function countLabel(t: SystemType): string {
  if (t === 'inverter') return 'Existing panels';
  if (t === 'expansion') return 'Panels to add';
  return 'Panels';
}

/**
 * Placeholder book with made-up costs — never real trade prices (this repo
 * and the site bundle are public). The real book comes from the backend.
 */
export const SAMPLE_PRICE_BOOK: PriceBook = {
  settings: {
    margin: 15, gst: 10, stcPrice: 37.5, supplyOnlyStc: false, singleMax: 10, threeMax: 30,
    dcacStandard: 1.33, dcacHybrid: 2, delivery: 150, panelPerW: 0.3, invWithPanels: 0,
    batteryBase: 2000, batteryBaseKwh: 20, batteryStep: 500, batteryStepKwh: 10,
    evInstall: 1000, invSwap: 750, threePhase: 0, trade: 8,
  },
  proposal: { tiers: { standard: 'p1', premium: 'p2', allBlack: 'p3' }, defaultZone: 3 },
  panels: [
    { id: 'p1', model: 'Sample panel 440W', w: 440, supply: 90 },
    { id: 'p2', model: 'Sample premium panel 475W', w: 475, supply: 125 },
    { id: 'p3', model: 'Sample all-black panel 475W', w: 475, supply: 115 },
  ],
  inverters: [
    { id: 'i1', kind: 'String', model: 'Sample string inverter 5 kW', kw: 5, phase: 1, supply: 900 },
    { id: 'i2', kind: 'String', model: 'Sample string inverter 10 kW', kw: 10, phase: 1, supply: 1300 },
    { id: 'i3', kind: 'String', model: 'Sample string inverter 15 kW 3-phase', kw: 15, phase: 3, supply: 1900 },
    { id: 'i4', kind: 'Hybrid', model: 'Sample hybrid inverter 5 kW', kw: 5, phase: 1, supply: 1500 },
    { id: 'i5', kind: 'Hybrid', model: 'Sample hybrid inverter 10 kW', kw: 10, phase: 1, supply: 2000 },
    { id: 'i6', kind: 'Hybrid', model: 'Sample hybrid inverter 15 kW 3-phase', kw: 15, phase: 3, supply: 2500 },
    { id: 'i7', kind: 'AC-coupled', model: 'Sample AC-coupled inverter 5 kW', kw: 5, phase: 1, supply: 1300 },
  ],
  batteries: [10, 14, 20, 30, 40].map((kwh, i) => ({ id: `b${i + 1}`, model: `Sample battery ${kwh} kWh`, kwh, supply: kwh * 300 })),
  evChargers: [{ id: 'e1', model: 'Sample EV charger 7 kW', kw: 7, phase: 1, supply: 600 }],
  extras: [
    { id: 'x1', label: 'Backup gateway', per: 'job', supply: 500, install: 220 },
    { id: 'x2', label: 'Switchboard upgrade', per: 'job', supply: 0, install: 1320 },
  ],
};

export const QUOTE_DEFAULTS: QuoteInputs = {
  type: 'combo',
  panelId: 'p1',
  count: 19,
  inverterId: 'auto',
  batteryId: 'b2',
  evId: 'e1',
  existing: true,
  zone: 3,
  phase: 1,
  date: '2026-11-15',
  install: true,
  stc: true,
  extras: {},
};
