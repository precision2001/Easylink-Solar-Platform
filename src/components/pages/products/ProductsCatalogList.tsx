"use client";

import { ProductCard } from "@/components/pages/products/ProductCard";
import { ProductsPagination } from "@/components/pages/products/ProductsPagination";
import { matchesFilter } from "@/components/pages/products/matchesFilter";
import { MAX_COMPARE_PRODUCTS } from "@/components/pages/products/productsData";
import type { FilterChipDef, Product } from "@/components/pages/products/types";

type Props = {
  /** Already the current server-side page — this component does not paginate client-side. */
  products: Product[];
  filters: FilterChipDef[];
  activeFilterKey: string;
  compareIds: Set<string>;
  onToggleCompare: (id: string) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function ProductsCatalogList({
  products,
  filters,
  activeFilterKey,
  compareIds,
  onToggleCompare,
  page,
  pageSize,
  totalPages,
  total,
  onPageChange,
}: Props) {
  const activeFilter = filters.find((filter) => filter.key === activeFilterKey);
  // The band/segment chips filter within this page only — the catalog runs
  // to thousands of rows per category, so true pagination has to come from
  // the server, and combining that with a full-dataset client-side filter
  // isn't possible without the backend supporting spec-range queries too.
  const visibleProducts = products.filter((product) =>
    matchesFilter(product, activeFilter),
  );

  if (visibleProducts.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
        <p className="font-inter text-[15px] font-semibold text-warm-ink">
          No matching products
        </p>
        <p className="mt-1 font-dm-sans text-[12px] text-warm-gray">
          Try a different filter, category, or search term.
        </p>
      </div>
    );
  }

  const compareFull = compareIds.size >= MAX_COMPARE_PRODUCTS;
  const pageStart = (page - 1) * pageSize;

  return (
    <div className="flex w-full flex-col gap-5">
      <p className="font-dm-sans text-[12px] text-warm-ink/70">
        Showing {pageStart + 1}–{pageStart + visibleProducts.length} of{" "}
        {total.toLocaleString("en-AU")} products
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleProducts.map((product) => {
          const inCompare = compareIds.has(product.id);
          return (
            <ProductCard
              key={product.id}
              product={product}
              inCompare={inCompare}
              compareDisabled={compareFull && !inCompare}
              onToggleCompare={() => onToggleCompare(product.id)}
            />
          );
        })}
      </div>

      <ProductsPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
