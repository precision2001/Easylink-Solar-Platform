"use client";

import Image from "next/image";
import classNames from "classnames";
import { PRODUCT_CATEGORIES } from "@/components/pages/products/productsData";
import type { ProductCategoryKey } from "@/components/pages/products/types";

type Props = {
  activeCategory: ProductCategoryKey;
  onSelect: (category: ProductCategoryKey) => void;
  /** Real backend totals, keyed by category — falls back to the static estimate while loading. */
  counts?: Partial<Record<ProductCategoryKey, number>>;
};

export function ProductsCategoryCards({ activeCategory, onSelect, counts }: Props) {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {PRODUCT_CATEGORIES.map((category) => {
        const active = category.key === activeCategory;
        return (
          <button
            key={category.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(category.key)}
            className={classNames(
              "flex flex-col items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left shadow-sm transition-all",
              active
                ? "border-orange-amber bg-linear-to-b from-white to-[#fff3df] shadow-[0_8px_20px_rgba(247,141,0,0.18)]"
                : "border-transparent bg-white hover:border-warm-border",
            )}
          >
            <div
              className={classNames(
                "flex size-11 items-center justify-center overflow-hidden rounded-xl border-2",
                active
                  ? "border-orange-amber bg-white text-orange-amber"
                  : "border-warm-border bg-cream-50 text-warm-ink",
              )}
            >
              <div className="relative size-7 shrink-0">
                <Image
                  src={category.iconSrc}
                  alt={category.label}
                  fill
                  sizes="28px"
                  className="object-contain"
                />
              </div>
            </div>
            <div>
              <p className="font-inter text-[14px] font-bold leading-[18px] text-warm-ink">
                {category.label}
              </p>
              <p className="mt-0.5 font-dm-sans text-[12px] leading-[16px] text-warm-gray">
                {(counts?.[category.key] ?? category.count).toLocaleString("en-AU")}{" "}
                products
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
