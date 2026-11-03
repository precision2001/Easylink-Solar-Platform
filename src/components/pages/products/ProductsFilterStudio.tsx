"use client";

import { useMemo, useRef } from "react";
import classNames from "classnames";
import Icon from "@/components/ui/Icons";
import {
  FILTERS_BY_CATEGORY,
  PRODUCT_CATEGORIES,
  SPEC_LABEL_BY_CATEGORY,
  SPEC_UNIT_BY_CATEGORY,
} from "@/components/pages/products/productsData";
import type { Product, ProductCategoryKey } from "@/components/pages/products/types";
import {
  bandRange,
  domainOf,
  FIXED_PRICE_DOMAIN,
  FIXED_SPEC_DOMAIN,
  sameRange,
  SPEC_STEP,
  EMPTY_FILTERS,
  filterProducts,
  histogram,
  niceStep,
  SORT_OPTIONS,
  type FilterState,
  type Range,
} from "@/components/pages/products/filterModel";

/** CEC listing only applies to panels, inverters and batteries. */
const HAS_CEC: Record<ProductCategoryKey, boolean> = {
  "solar-panels": true,
  inverters: true,
  batteries: true,
  "ev-chargers": false,
  "heat-pumps": false,
  "portable-power": false,
};

const BINS = 40;

const aud = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

const fmt = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("en-AU") : n.toLocaleString("en-AU", { maximumFractionDigits: 1 });

type Props = {
  categoryKey: ProductCategoryKey;
  /** Every product in the category (the facets are computed from these). */
  products: Product[];
  search: string;
  state: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
};

/**
 * The product filter "studio": one panel that filters the whole category
 * instantly. Capacity and price are dual-handle sliders over a live histogram
 * (bars show how many products sit at each size given the other choices),
 * brands are photo tiles, and every active filter shows as a removable tag.
 */
export function ProductsFilterStudio({
  categoryKey,
  products,
  search,
  state,
  onChange,
  resultCount,
}: Props) {
  const category = PRODUCT_CATEGORIES.find((c) => c.key === categoryKey);
  const specUnit = SPEC_UNIT_BY_CATEGORY[categoryKey];
  const specLabel = SPEC_LABEL_BY_CATEGORY[categoryKey];

  const specDomain = useMemo(
    () =>
      FIXED_SPEC_DOMAIN[categoryKey] ??
      domainOf(products.map((p) => p.specValue), SPEC_STEP[categoryKey]),
    [products, categoryKey],
  );
  const priceDomain = useMemo(
    () =>
      FIXED_PRICE_DOMAIN[categoryKey] ??
      domainOf(products.map((p) => p.price), categoryKey === "solar-panels" ? 10 : 100),
    [products, categoryKey],
  );

  // Facets: each control counts what it would give with the *other* filters applied.
  const specValues = useMemo(
    () => filterProducts(products, state, search, "spec").map((p) => p.specValue),
    [products, state, search],
  );
  const priceValues = useMemo(
    () => filterProducts(products, state, search, "price").map((p) => p.price),
    [products, state, search],
  );
  const brandFacet = useMemo(() => {
    const pool = filterProducts(products, state, search, "brands");
    const live = new Map<string, number>();
    for (const p of pool) live.set(p.brand, (live.get(p.brand) ?? 0) + 1);
    const all = new Map<string, { total: number; photo?: string }>();
    for (const p of products) {
      const entry = all.get(p.brand) ?? { total: 0 };
      entry.total++;
      if (!entry.photo && p.imageThumbUrl) entry.photo = p.imageThumbUrl;
      all.set(p.brand, entry);
    }
    return [...all.entries()]
      .map(([brand, { total, photo }]) => ({ brand, total, photo, live: live.get(brand) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.brand.localeCompare(b.brand));
  }, [products, state, search]);

  const presets = FILTERS_BY_CATEGORY[categoryKey].filter((f) => f.kind === "band");

  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });
  const toggleBrand = (brand: string) =>
    set({
      brands: state.brands.includes(brand)
        ? state.brands.filter((b) => b !== brand)
        : [...state.brands, brand],
    });

  const tags: { key: string; label: string; clear: () => void }[] = [
    ...state.brands.map((b) => ({ key: `b-${b}`, label: b, clear: () => toggleBrand(b) })),
    ...(state.spec
      ? [{ key: "spec", label: `${fmt(state.spec[0])}–${fmt(state.spec[1])} ${specUnit}`, clear: () => set({ spec: null }) }]
      : []),
    ...(state.price
      ? [{ key: "price", label: `${aud(state.price[0])}–${aud(state.price[1])}`, clear: () => set({ price: null }) }]
      : []),
    ...(state.cecOnly ? [{ key: "cec", label: "CEC approved", clear: () => set({ cecOnly: false }) }] : []),
  ];

  return (
    <section
      aria-label={`Filter ${category?.label ?? "products"}`}
      className="relative w-full overflow-hidden rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-[0_14px_40px_rgba(140,80,0,0.16)] backdrop-blur-md sm:p-5"
    >
      {/* Header: live result count, sort, CEC toggle */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            key={resultCount}
            className="font-inter text-[34px] font-extrabold leading-none tracking-[-0.02em] text-warm-ink tabular-nums motion-safe:animate-[fs-pop_260ms_ease-out]"
          >
            {resultCount}
          </span>
          <span className="font-dm-sans text-[13px] text-warm-gray">
            {resultCount === 1 ? "match" : "matches"} in {category?.label ?? "this category"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Sort" className="flex rounded-full bg-cream-50 p-1 ring-1 ring-warm-border">
            {SORT_OPTIONS.map((o) => {
              const on = state.sort === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ sort: o.key })}
                  className={classNames(
                    "rounded-full px-3 py-1.5 font-dm-sans text-[12px] font-semibold transition-colors",
                    on ? "bg-navy-800 text-white shadow-sm" : "text-warm-gray hover:text-warm-ink",
                  )}
                >
                  {o.key === "spec-desc" ? (categoryKey === "solar-panels" ? "Most watts" : "Biggest") : o.label}
                </button>
              );
            })}
          </div>
          {HAS_CEC[categoryKey] ? (
            <button
              type="button"
              role="switch"
              aria-checked={state.cecOnly}
              onClick={() => set({ cecOnly: !state.cecOnly })}
              className="flex items-center gap-2 rounded-full bg-cream-50 py-1 pl-1 pr-3 ring-1 ring-warm-border"
            >
              <span
                className={classNames(
                  "relative h-6 w-10 rounded-full transition-colors",
                  state.cecOnly ? "bg-success" : "bg-warm-border",
                )}
              >
                <span
                  className={classNames(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
                    state.cecOnly ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
              <span className="font-dm-sans text-[12px] font-semibold text-warm-ink">CEC approved</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Sliders with histograms */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {specDomain ? (
          <RangeHistogram
            id={`fs-spec-${categoryKey}`}
            label={specLabel}
            domain={specDomain}
            step={SPEC_STEP[categoryKey]}
            values={specValues}
            value={state.spec}
            onChange={(spec) => set({ spec })}
            format={(n) => `${fmt(n)} ${specUnit}`}
          >
            {presets.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((f) => {
                  const r = bandRange(f, specDomain);
                  if (!r) return null;
                  const [lo, hi] = r;
                  const on = sameRange(state.spec, r);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ spec: on ? null : [lo, hi] })}
                      className={classNames(
                        "rounded-full px-2.5 py-1 font-dm-sans text-[11px] font-semibold transition-colors",
                        on
                          ? "bg-orange-amber text-white"
                          : "bg-cream-50 text-warm-gray ring-1 ring-warm-border hover:text-warm-ink",
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </RangeHistogram>
        ) : null}
        {priceDomain ? (
          <RangeHistogram
            id={`fs-price-${categoryKey}`}
            label="Price"
            domain={priceDomain}
            step={niceStep(priceDomain)}
            values={priceValues}
            value={state.price}
            onChange={(price) => set({ price })}
            format={aud}
          />
        ) : null}
      </div>

      {/* Brand tiles */}
      <BrandCarousel
        brands={brandFacet}
        selected={state.brands}
        onToggle={toggleBrand}
        onClear={() => set({ brands: [] })}
      />

      {/* Active filters */}
      {tags.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-warm-border/70 pt-3">
          {tags.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={t.clear}
              aria-label={`Remove filter ${t.label}`}
              className="group flex items-center gap-1 rounded-full bg-navy-800 py-1 pl-3 pr-1.5 font-dm-sans text-[12px] font-semibold text-white"
            >
              {t.label}
              <span className="flex size-4 items-center justify-center rounded-full bg-white/15 group-hover:bg-white/30">
                <svg viewBox="0 0 10 10" width={8} height={8} fill="none" aria-hidden>
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
                </svg>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS, sort: state.sort })}
            className="ml-1 font-dm-sans text-[12px] font-semibold text-warm-gray underline-offset-2 hover:text-warm-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </section>
  );
}

function RangeHistogram({
  id,
  label,
  domain,
  step,
  values,
  value,
  onChange,
  format,
  children,
}: {
  id: string;
  label: string;
  domain: Range;
  step: number;
  values: number[];
  value: Range | null;
  onChange: (next: Range | null) => void;
  format: (n: number) => string;
  children?: React.ReactNode;
}) {
  const [lo, hi] = value ?? domain;
  const counts = useMemo(() => histogram(values, domain, BINS), [values, domain]);
  const peak = Math.max(1, ...counts);
  const span = domain[1] - domain[0] || 1;
  const pct = (v: number) => ((v - domain[0]) / span) * 100;
  const binWidth = span / BINS;

  const commit = (nextLo: number, nextHi: number) => {
    const a = Math.min(nextLo, nextHi);
    const b = Math.max(nextLo, nextHi);
    onChange(a <= domain[0] && b >= domain[1] ? null : [a, b]);
  };

  return (
    <div className="rounded-2xl bg-linear-to-b from-cream-50 to-white p-3 ring-1 ring-warm-border/80">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-dm-sans text-[11px] font-bold uppercase tracking-[0.06em] text-warm-gray">
          {label}
        </span>
        <span className="font-inter text-[13px] font-bold text-warm-ink tabular-nums">
          {format(lo)} – {format(hi)}
        </span>
      </div>

      <div aria-hidden className="mt-2 flex h-14 items-end gap-[2px]">
        {counts.map((c, i) => {
          const binLo = domain[0] + i * binWidth;
          const binHi = binLo + binWidth;
          const active = binHi > lo && binLo < hi;
          return (
            <span
              key={i}
              className={classNames(
                "flex-1 rounded-t-[3px] transition-[height,background-color] duration-300 ease-out",
                active ? "bg-linear-to-t from-orange-amber to-yellow-lemon" : "bg-warm-border/60",
              )}
              style={{ height: c ? `${Math.max(8, (c / peak) * 100)}%` : "3px" }}
            />
          );
        })}
      </div>

      <div className="fs-range relative -mt-1 h-7">
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-warm-border/70" />
        <span
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-linear-to-r from-yellow-lemon to-orange-amber"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          id={`${id}-min`}
          type="range"
          aria-label={`${label} minimum`}
          min={domain[0]}
          max={domain[1]}
          step={step}
          value={lo}
          onChange={(e) => commit(Math.min(Number(e.target.value), hi), hi)}
        />
        <input
          id={`${id}-max`}
          type="range"
          aria-label={`${label} maximum`}
          min={domain[0]}
          max={domain[1]}
          step={step}
          value={hi}
          onChange={(e) => commit(lo, Math.max(Number(e.target.value), lo))}
        />
      </div>
      <div className="flex justify-between font-dm-sans text-[10px] text-warm-gray tabular-nums">
        <span>{format(domain[0])}</span>
        <span>{format(domain[1])}</span>
      </div>
      {children}
    </div>
  );
}

function BrandCarousel({
  brands,
  selected,
  onToggle,
  onClear,
}: {
  brands: { brand: string; total: number; live: number; photo?: string }[];
  selected: string[];
  onToggle: (brand: string) => void;
  onClear: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: 1 | -1) =>
    scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  if (!brands.length) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-dm-sans text-[11px] font-bold uppercase tracking-[0.06em] text-warm-gray">
          Brands <span className="font-medium normal-case tracking-normal">· pick one or more</span>
        </span>
        <div className="flex items-center gap-1.5">
          {selected.length ? (
            <button
              type="button"
              onClick={onClear}
              className="mr-1 font-dm-sans text-[12px] font-semibold text-warm-gray hover:text-warm-ink"
            >
              All brands
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Scroll brands left"
            onClick={() => nudge(-1)}
            className="flex size-8 items-center justify-center rounded-full bg-white text-warm-ink shadow-sm ring-1 ring-warm-border hover:bg-cream-50"
          >
            <Icon name="ChevronDown" className="size-4 rotate-90" />
          </button>
          <button
            type="button"
            aria-label="Scroll brands right"
            onClick={() => nudge(1)}
            className="flex size-8 items-center justify-center rounded-full bg-white text-warm-ink shadow-sm ring-1 ring-warm-border hover:bg-cream-50"
          >
            <Icon name="ChevronDown" className="size-4 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scroller}
          role="group"
          aria-label="Filter by brand"
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {brands.map(({ brand, total, live, photo }) => {
            const on = selected.includes(brand);
            const empty = live === 0 && !on;
            return (
              <button
                key={brand}
                type="button"
                aria-pressed={on}
                disabled={empty}
                onClick={() => onToggle(brand)}
                title={`${brand}: ${live} of ${total}`}
                className={classNames(
                  "group relative flex w-[124px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl text-left transition-all duration-200",
                  on
                    ? "bg-navy-800 text-white shadow-[0_8px_20px_rgba(11,26,46,0.35)] ring-2 ring-orange-amber"
                    : "bg-white text-warm-ink ring-1 ring-warm-border hover:-translate-y-0.5 hover:shadow-md",
                  empty && "cursor-not-allowed opacity-40 hover:translate-y-0 hover:shadow-none",
                )}
              >
                <span className="flex h-[72px] items-center justify-center bg-linear-to-b from-white to-cream-50">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                    <img
                      src={photo}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex size-11 items-center justify-center rounded-full bg-linear-to-br from-yellow-lemon to-orange-amber font-inter text-[15px] font-extrabold text-white shadow-inner">
                      {brand
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-1 px-2.5 py-2">
                  <span className="min-w-0 truncate font-inter text-[13px] font-bold">{brand}</span>
                  <span
                    className={classNames(
                      "shrink-0 rounded-full px-1.5 font-dm-sans text-[11px] font-bold tabular-nums",
                      on ? "bg-orange-amber text-white" : "bg-cream-50 text-warm-gray",
                    )}
                  >
                    {live}
                  </span>
                </span>
                {on ? (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-orange-amber text-white shadow">
                    <Icon name="Check" className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-white/90 to-transparent" />
      </div>
    </div>
  );
}
