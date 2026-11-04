"use client";

import { SHOP_CATEGORY_LABEL, type ShopCategory } from "@/lib/customers/shop-products";

export type FilterValue = "all" | ShopCategory;

type Props = {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  /** Categories that have products, with counts (from the live catalogue). */
  categories: { category: ShopCategory; count: number }[];
  total: number;
};

/** Category filter built from the categories the catalogue actually has. */
export function CategoryFilterChips({ value, onChange, categories, total }: Props) {
  const options: { value: FilterValue; label: string; count: number }[] = [
    { value: "all", label: "All products", count: total },
    ...categories.map((c) => ({ value: c.category, label: SHOP_CATEGORY_LABEL[c.category].many, count: c.count })),
  ];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="group" aria-label="Filter by category">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
              active ? "bg-[#0B1A2E] text-white" : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]"
            }`}
          >
            {opt.label}
            <span className={`text-[12.5px] tabular-nums ${active ? "text-[#FFE866]" : "text-[#5B6B80]"}`}>{opt.count}</span>
          </button>
        );
      })}
    </div>
  );
}
