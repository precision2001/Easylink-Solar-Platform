"use client";

import { useEffect, useState } from "react";
import classNames from "classnames";
import Icon from "@/components/ui/Icons";
import { matchesFilter } from "@/components/pages/products/matchesFilter";
import {
  BAND_GROUP_LABEL,
  FILTERS_BY_CATEGORY,
  PRODUCT_CATEGORIES,
  PRODUCTS_BY_CATEGORY,
} from "@/components/pages/products/productsData";
import type { ProductCategoryKey } from "@/components/pages/products/types";
import {
  brandCounts,
  type CatalogIndex,
} from "@/lib/public/products";

type Props = {
  activeCategory: ProductCategoryKey;
  activeFilterKey: string;
  onSelectCategory: (category: ProductCategoryKey) => void;
  onSelectFilter: (filterKey: string) => void;
  /** Live brand/spec index; until it loads, band counts fall back to the sample data. */
  catalogIndex?: CatalogIndex | null;
  activeBrand: string;
  onSelectBrand: (brand: string) => void;
};

export function ProductsSidebar({
  activeCategory,
  activeFilterKey,
  onSelectCategory,
  onSelectFilter,
  catalogIndex,
  activeBrand,
  onSelectBrand,
}: Props) {
  const [expandedKeys, setExpandedKeys] = useState<Set<ProductCategoryKey>>(
    () => new Set([activeCategory]),
  );

  // Selecting a category elsewhere (e.g. the category cards) should reveal
  // its section here too, without collapsing whatever else is already open.
  useEffect(() => {
    setExpandedKeys((prev) => {
      if (prev.has(activeCategory)) return prev;
      const next = new Set(prev);
      next.add(activeCategory);
      return next;
    });
  }, [activeCategory]);

  const toggleExpanded = (key: ProductCategoryKey) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <nav
      aria-label="Product categories"
      className="hidden w-[260px] shrink-0 rounded-2xl bg-navy-800 p-3 lg:block"
    >
      <ul className="flex flex-col divide-y divide-white/10">
        {PRODUCT_CATEGORIES.map((category) => {
          const expanded = expandedKeys.has(category.key);
          const isActiveCategory = category.key === activeCategory;
          const bandFilters = FILTERS_BY_CATEGORY[category.key].filter(
            (filter) => filter.kind === "band",
          );
          const products = PRODUCTS_BY_CATEGORY[category.key];
          const liveEntries = catalogIndex?.[category.key];
          const brands = brandCounts(liveEntries);

          return (
            <li key={category.key} className="py-1">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggleExpanded(category.key)}
                className={classNames(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left font-dm-sans text-[13px] transition-colors",
                  isActiveCategory
                    ? "font-bold text-white"
                    : "font-medium text-white/70 hover:text-white",
                )}
              >
                {category.label}
                <Icon
                  name="ChevronDown"
                  className={classNames(
                    "size-3.5 shrink-0 transition-transform duration-300 ease-in-out",
                    expanded ? "rotate-180" : "",
                  )}
                />
              </button>

              <div
                className={classNames(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col gap-2 px-2.5 pb-3 pt-1">
                    <p className="font-dm-sans text-[11px] font-bold uppercase tracking-[0.05em] text-white/50">
                      {BAND_GROUP_LABEL[category.key]}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {bandFilters.map((filter) => {
                        const count = liveEntries
                          ? liveEntries.filter(
                              (entry) =>
                                (filter.min === undefined || entry.specValue >= filter.min) &&
                                (filter.max === undefined || entry.specValue < filter.max),
                            ).length
                          : products.filter((product) =>
                              matchesFilter(product, filter),
                            ).length;
                        const checked = isActiveCategory && activeFilterKey === filter.key;

                        return (
                          <li key={filter.key}>
                            <label className="flex cursor-pointer items-center gap-2 font-dm-sans text-[12px] text-white/80 hover:text-white">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  onSelectCategory(category.key);
                                  onSelectFilter(checked ? "all" : filter.key);
                                }}
                                className="size-3.5 rounded-sm border-white/40 bg-transparent accent-white"
                              />
                              {filter.label}
                              <span className="text-white/40">({count})</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>

                    {brands.length > 0 ? (
                      <>
                        <p className="mt-2 font-dm-sans text-[11px] font-bold uppercase tracking-[0.05em] text-white/50">
                          Brands
                        </p>
                        <ul className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                          {brands.map(({ brand, count }) => {
                            const checked = isActiveCategory && activeBrand === brand;
                            return (
                              <li key={brand}>
                                <label className="flex cursor-pointer items-center gap-2 font-dm-sans text-[12px] text-white/80 hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (!isActiveCategory) onSelectCategory(category.key);
                                      onSelectBrand(checked ? "" : brand);
                                    }}
                                    className="size-3.5 rounded-sm border-white/40 bg-transparent accent-white"
                                  />
                                  <span className="min-w-0 truncate">{brand}</span>
                                  <span className="text-white/40">({count})</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
