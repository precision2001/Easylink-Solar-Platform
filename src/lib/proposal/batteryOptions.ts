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

/*
 * Picked batteries (owner, 10 Nov 2026): every battery picked on the
 * equipment step is its own option card, two of the same size included,
 * not added together into one. Their option ids are "pick:<index>" (the
 * battery's place in the equipment step's list).
 */
export const PICK_PREFIX = "pick:";
export const isPickId = (id: string | undefined | null): id is string => typeof id === "string" && id.startsWith(PICK_PREFIX);
export const pickId = (index: number) => `${PICK_PREFIX}${index}`;
export const pickIndex = (id: string) => Number.parseInt(id.slice(PICK_PREFIX.length), 10);

type PickedItem = { productId: string; brand?: string; name?: string; quantity: number; ratingLabel: string };
type EquipmentLike = { batteryCapacityId?: string; batteryOptionIds?: string[]; items?: { battery?: PickedItem[] } | null };

/** A picked battery's usable kWh: its rating times how many ("13.5 kWh" × 2 → 27). */
export function itemKwh(it: Pick<PickedItem, "ratingLabel" | "quantity">): number {
  const k = Number.parseFloat(it.ratingLabel);
  return Number.isFinite(k) && /kwh/i.test(it.ratingLabel) ? +(k * Math.max(1, it.quantity)).toFixed(2) : 0;
}

/** Whether the picked batteries are options of their own (designs before 10 Nov 2026 added them together). */
export function pickMode(eq: EquipmentLike): boolean {
  if (!eq.items?.battery?.length) return false;
  return [eq.batteryCapacityId, ...(eq.batteryOptionIds ?? [])].some(isPickId);
}

/** The picked batteries the design is priced and saved with: the shown pick only (none for a plain size); all of them on older designs. */
export function shownBatteryItems<T extends PickedItem>(eq: { batteryCapacityId?: string; batteryOptionIds?: string[]; items?: { battery?: T[] } | null }): T[] {
  const items = eq.items?.battery ?? [];
  if (!pickMode(eq)) return items;
  if (!isPickId(eq.batteryCapacityId)) return [];
  const it = items[pickIndex(eq.batteryCapacityId)];
  return it ? [it] : [];
}

/** kWh of any option id: a pick is its battery's size, a size id its size. */
export function choiceKwh(id: string, picks: Pick<PickedItem, "ratingLabel" | "quantity">[]): number {
  if (isPickId(id)) {
    const it = picks[pickIndex(id)];
    return it ? itemKwh(it) : 0;
  }
  return optionKwh(id);
}

export type BatteryTile = {
  id: string;
  kwh: number;
  /** The size shown on the tile ("20kWh"). */
  label: string;
  /** The picked battery this tile is, if it's one. */
  pick?: { index: number; name: string; quantity: number; productId: string };
};

const kwhLabel = (kwh: number) => `${+kwh.toFixed(2)}kWh`;

/**
 * The battery card's tiles: None, every picked battery on its own tile, and
 * the standard sizes; a standard size the same as a picked battery gives way
 * to it, and the largest unchosen sizes give way until there are `max` tiles,
 * so the card keeps its eight tiles of one size.
 */
export function batteryTiles(
  sizes: { id: string; label: string }[],
  picks: PickedItem[],
  optionIds: string[],
  max = 8,
): BatteryTile[] {
  const picked: BatteryTile[] = picks.map((it, index) => ({
    id: pickId(index),
    kwh: itemKwh(it),
    label: kwhLabel(itemKwh(it)),
    pick: { index, name: [it.brand, it.name].filter(Boolean).join(" ") || "Battery", quantity: Math.max(1, it.quantity), productId: it.productId },
  }));
  let plain: BatteryTile[] = sizes.map((s) => ({ id: s.id, kwh: optionKwh(s.id), label: s.label }));
  const keep = (t: BatteryTile) => t.kwh === 0 || optionIds.includes(t.id);
  plain = plain.filter((t) => keep(t) || !picked.some((p) => Math.abs(p.kwh - t.kwh) < 0.6));
  while (picked.length + plain.length > max) {
    const drop = [...plain].reverse().find((t) => !keep(t));
    if (!drop) break;
    plain = plain.filter((t) => t !== drop);
  }
  return [...plain, ...picked].sort((a, b) => a.kwh - b.kwh || Number(Boolean(a.pick)) - Number(Boolean(b.pick)) || (a.pick?.index ?? 0) - (b.pick?.index ?? 0));
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
  kwhOf: (id: string) => number = optionKwh,
): { ids: string[]; shown: string; full?: boolean } {
  if (!ids.includes(id)) {
    if (ids.length >= max) return { ids, shown, full: true };
    return { ids: sortOptions([...ids, id], kwhOf), shown: id };
  }
  if (id !== shown) return { ids, shown: id };
  if (ids.length === 1) return { ids, shown };
  const rest = ids.filter((x) => x !== id);
  return { ids: rest, shown: rest[0] };
}

/** Options in size order (None first), so A is always the smallest. */
export function sortOptions(ids: string[], kwhOf: (id: string) => number = optionKwh): string[] {
  return [...new Set(ids)].sort((a, b) => kwhOf(a) - kwhOf(b) || Number(isPickId(a)) - Number(isPickId(b)) || a.localeCompare(b));
}

export type BatteryOptionRow = {
  id: string;
  letter: string;
  kwh: number;
  /** The usable kWh of the battery actually quoted for this option (can differ a little from the size asked). */
  quotedKwh: number;
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
  /** Picked batteries (for "pick:<index>" options): their size and name. */
  picks: PickedItem[] = [],
): BatteryOptionRow[] {
  const kwhOf = (id: string) => choiceKwh(id, picks);
  const rows = sortOptions(ids, kwhOf).map((id, i): BatteryOptionRow => {
    const kwh = kwhOf(id);
    const pick = isPickId(id) ? picks[pickIndex(id)] : undefined;
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
      quotedKwh: pick ? kwh : kwh > 0 && info?.kwh ? +info.kwh.toFixed(1) : kwh,
      model: pick ? [pick.quantity > 1 ? `${pick.quantity}×` : "", pick.brand, pick.name].filter(Boolean).join(" ") : kwh > 0 ? info?.model ?? null : null,
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
