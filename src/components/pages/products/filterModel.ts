import type { Product } from "@/components/pages/products/types";

export type SortKey = "recommended" | "price-asc" | "price-desc" | "spec-desc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
  { key: "spec-desc", label: "Biggest" },
];

export type Range = [number, number];

/** Everything the filter studio controls. `null` ranges mean "no limit". */
export type FilterState = {
  brands: string[];
  spec: Range | null;
  price: Range | null;
  cecOnly: boolean;
  sort: SortKey;
};

export const EMPTY_FILTERS: FilterState = {
  brands: [],
  spec: null,
  price: null,
  cecOnly: false,
  sort: "recommended",
};

type Facet = "brands" | "spec" | "price" | "cec" | "search";

const inRange = (v: number, r: Range | null) => !r || (v >= r[0] && v <= r[1]);

/**
 * Products passing every filter except `skip` — used for faceted counts, so
 * each control shows what choosing it would give given the other choices.
 */
export function filterProducts(
  products: Product[],
  state: FilterState,
  search: string,
  skip?: Facet,
): Product[] {
  const q = search.trim().toLowerCase();
  return products.filter((p) => {
    if (skip !== "search" && q && !`${p.brand} ${p.name} ${p.model}`.toLowerCase().includes(q)) return false;
    if (skip !== "brands" && state.brands.length && !state.brands.includes(p.brand)) return false;
    if (skip !== "spec" && state.spec && !(p.specValue > 0 && inRange(p.specValue, state.spec))) return false;
    if (skip !== "price" && state.price && !inRange(p.price, state.price)) return false;
    if (skip !== "cec" && state.cecOnly && !p.cecApproved) return false;
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "spec-desc":
      return list.sort((a, b) => b.specValue - a.specValue || a.price - b.price);
    default:
      // Photo first, then a real (not estimated) price, then CEC listed, then brand A–Z.
      return list.sort(
        (a, b) =>
          Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
          Number(!b.priceEstimate) - Number(!a.priceEstimate) ||
          Number(Boolean(b.cecApproved)) - Number(Boolean(a.cecApproved)) ||
          a.brand.localeCompare(b.brand) ||
          a.name.localeCompare(b.name),
      );
  }
}

/** Min/max of positive values, padded to tidy steps. */
export function domainOf(values: number[], step: number): Range | null {
  const v = values.filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return null;
  const lo = Math.floor(Math.min(...v) / step) * step;
  const hi = Math.ceil(Math.max(...v) / step) * step;
  return lo === hi ? [lo, lo + step] : [lo, hi];
}

/** Equal-width bins over `domain`; returns counts per bin. */
export function histogram(values: number[], domain: Range, bins: number): number[] {
  const counts = new Array<number>(bins).fill(0);
  const width = (domain[1] - domain[0]) / bins || 1;
  for (const v of values) {
    if (!(v > 0)) continue;
    const i = Math.min(bins - 1, Math.max(0, Math.floor((v - domain[0]) / width)));
    counts[i]++;
  }
  return counts;
}

/** A sensible slider step for a domain: ~100 steps, rounded to 1/2/5 × 10^n. */
export function niceStep(domain: Range): number {
  const raw = (domain[1] - domain[0]) / 100;
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

/** A band chip ("10-20kWh") as a slider range, clipped to the category's domain. */
export function bandRange(band: object, domain: Range | null): Range | null {
  if (!domain) return null;
  const { min, max } = band as { min?: number; max?: number };
  const lo = Math.max(min ?? domain[0], domain[0]);
  const hi = Math.min(max ?? domain[1], domain[1]);
  return lo < hi ? [lo, hi] : null;
}

export const sameRange = (a: Range | null, b: Range | null) =>
  Boolean(a && b && a[0] === b[0] && a[1] === b[1]);

/** Slider granularity per category, in the category's own unit. */
export const SPEC_STEP: Record<string, number> = {
  "solar-panels": 5,
  inverters: 0.5,
  batteries: 0.5,
  "ev-chargers": 0.5,
  "heat-pumps": 0.5,
  "portable-power": 0.1,
};
