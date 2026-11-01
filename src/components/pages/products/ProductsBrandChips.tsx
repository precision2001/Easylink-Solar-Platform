"use client";

import classNames from "classnames";
import type { BrandCount } from "@/lib/public/products";

type Props = {
  brands: BrandCount[];
  activeBrand: string;
  onSelect: (brand: string) => void;
};

/**
 * Brand menu above the product grid. Same pill style as the filter chips but
 * on one scrollable line, since a category can have 20 brands. Shown on every
 * screen size — the sidebar's brand list is desktop-only.
 */
export function ProductsBrandChips({ brands, activeBrand, onSelect }: Props) {
  if (brands.length === 0) return null;

  const pill = (active: boolean) =>
    classNames(
      "shrink-0 rounded-full px-3.5 py-1.5 font-dm-sans text-[12px] font-semibold transition-colors",
      active
        ? "bg-navy-800 text-white shadow-sm"
        : "border border-warm-border bg-white/80 text-warm-gray hover:text-warm-ink",
    );

  return (
    <div className="flex w-full items-center gap-2">
      <span className="shrink-0 font-dm-sans text-[11px] font-bold uppercase tracking-[0.05em] text-warm-ink/60">
        Brands
      </span>
      <div
        role="toolbar"
        aria-label="Filter by brand"
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      >
        <button
          type="button"
          aria-pressed={activeBrand === ""}
          onClick={() => onSelect("")}
          className={pill(activeBrand === "")}
        >
          All brands
        </button>
        {brands.map(({ brand, count }) => (
          <button
            key={brand}
            type="button"
            aria-pressed={activeBrand === brand}
            onClick={() => onSelect(activeBrand === brand ? "" : brand)}
            className={pill(activeBrand === brand)}
          >
            {brand}
            <span className="ml-1 opacity-60">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
