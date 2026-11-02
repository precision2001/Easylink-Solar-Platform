"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ProductsSystemStepper } from "@/components/pages/products/ProductsSystemStepper";
import { ProductsSidebar } from "@/components/pages/products/ProductsSidebar";
import { ProductsCategoryCards } from "@/components/pages/products/ProductsCategoryCards";
import { ProductsFilterStudio } from "@/components/pages/products/ProductsFilterStudio";
import { ProductsSearchBar } from "@/components/pages/products/ProductsSearchBar";
import { ProductsCatalogList } from "@/components/pages/products/ProductsCatalogList";
import { ProductsCompareBar } from "@/components/pages/products/ProductsCompareBar";
import { ProductsCompareModal } from "@/components/pages/products/ProductsCompareModal";
import { CustomerPaymentReturnNotice } from "@/components/customer/products/CustomerPaymentReturnNotice";
import { MAX_COMPARE_PRODUCTS } from "@/components/pages/products/productsData";
import type {
  FilterChipDef,
  Product,
  ProductCategoryKey,
} from "@/components/pages/products/types";
import {
  bandRange,
  domainOf,
  EMPTY_FILTERS,
  filterProducts,
  sameRange,
  sortProducts,
  SPEC_STEP,
  type FilterState,
} from "@/components/pages/products/filterModel";
import {
  CATALOG_CATEGORY_TO_BACKEND,
  fetchCatalogIndex,
  fetchCatalogProducts,
  fetchCategoryCatalog,
  type CatalogIndex,
} from "@/lib/public/products";

const DEFAULT_PAGE_SIZE = 12;

/** The ProductsCatalogList filter props are unused now: filtering happens here. */
const NO_CHIP_FILTERS: FilterChipDef[] = [{ key: "all", label: "All", kind: "all" }];

export function ProductsPageSection() {
  const [activeCategory, setActiveCategory] = useState<ProductCategoryKey>("batteries");
  // Filters are remembered per category, so switching tabs and back keeps them.
  const [filtersByCategory, setFiltersByCategory] = useState<
    Partial<Record<ProductCategoryKey, FilterState>>
  >({});
  const [catalogs, setCatalogs] = useState<Partial<Record<ProductCategoryKey, Product[]>>>({});
  const [errors, setErrors] = useState<Partial<Record<ProductCategoryKey, string>>>({});
  const [catalogIndex, setCatalogIndex] = useState<CatalogIndex | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<
    Partial<Record<ProductCategoryKey, number>>
  >({});

  const filters = filtersByCategory[activeCategory] ?? EMPTY_FILTERS;
  const all = catalogs[activeCategory];
  const loadError = errors[activeCategory] ?? null;
  const loading = all === undefined && !loadError;

  // Load each category's whole catalogue once (a couple of hundred rows at most).
  useEffect(() => {
    if (catalogs[activeCategory] !== undefined) return;
    let cancelled = false;
    fetchCategoryCatalog(activeCategory)
      .then((rows) => {
        if (cancelled) return;
        setCatalogs((prev) => ({ ...prev, [activeCategory]: rows }));
        setCategoryCounts((prev) => ({ ...prev, [activeCategory]: rows.length }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrors((prev) => ({
          ...prev,
          [activeCategory]: err instanceof Error ? err.message : "Could not load products",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, catalogs]);

  // Live counts for the sidebar's other categories (brands, size bands).
  useEffect(() => {
    let cancelled = false;
    fetchCatalogIndex()
      .then((index) => {
        if (!cancelled) setCatalogIndex(index);
      })
      .catch(() => {
        // The sidebar falls back to sample counts; the page still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCategoryCounts = useCallback(async (signal: { cancelled: boolean }) => {
    const entries = await Promise.all(
      (Object.keys(CATALOG_CATEGORY_TO_BACKEND) as ProductCategoryKey[]).map((categoryKey) =>
        fetchCatalogProducts({ categoryKey, limit: 1 })
          .then(({ total }) => [categoryKey, total] as const)
          .catch(() => [categoryKey, undefined] as const),
      ),
    );
    if (signal.cancelled) return;
    setCategoryCounts((prev) => {
      const next = { ...prev };
      for (const [categoryKey, total] of entries) {
        if (total !== undefined && next[categoryKey] === undefined) next[categoryKey] = total;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadCategoryCounts(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadCategoryCounts]);

  const filtered = useMemo(
    () => sortProducts(filterProducts(all ?? [], filters, search), filters.sort),
    [all, filters, search],
  );
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Every loaded product, so items added to compare stay resolvable across categories.
  const productById = useMemo(() => {
    const map: Record<string, Product> = {};
    for (const list of Object.values(catalogs)) for (const p of list ?? []) map[p.id] = p;
    return map;
  }, [catalogs]);
  const compareProducts = Array.from(compareIds)
    .map((id) => productById[id])
    .filter((p): p is Product => Boolean(p));

  const setFilters = (category: ProductCategoryKey, next: FilterState) => {
    setFiltersByCategory((prev) => ({ ...prev, [category]: next }));
    setPage(1);
  };
  const filtersFor = (category: ProductCategoryKey) => filtersByCategory[category] ?? EMPTY_FILTERS;

  const handleSelectCategory = (category: ProductCategoryKey) => {
    setActiveCategory(category);
    setPage(1);
  };

  // Sidebar shortcuts drive the same filter state as the studio.
  const domainFor = (category: ProductCategoryKey) =>
    domainOf((catalogs[category] ?? []).map((p) => p.specValue), SPEC_STEP[category] ?? 1);
  const isBandActive = (category: ProductCategoryKey, band: FilterChipDef) =>
    sameRange(filtersFor(category).spec, bandRange(band, domainFor(category)));
  const toggleBand = (category: ProductCategoryKey, band: FilterChipDef) => {
    const r = bandRange(band, domainFor(category));
    const current = filtersFor(category);
    setFilters(category, { ...current, spec: sameRange(current.spec, r) ? null : r });
    handleSelectCategory(category);
  };
  const isBrandActive = (category: ProductCategoryKey, brand: string) =>
    filtersFor(category).brands.includes(brand);
  const toggleBrand = (category: ProductCategoryKey, brand: string) => {
    const current = filtersFor(category);
    setFilters(category, {
      ...current,
      brands: current.brands.includes(brand)
        ? current.brands.filter((b) => b !== brand)
        : [...current.brands, brand],
    });
    handleSelectCategory(category);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE_PRODUCTS) next.add(id);
      return next;
    });
  };

  const handleRemoveFromCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearCompare = () => {
    setCompareIds(new Set());
    setCompareModalOpen(false);
  };

  return (
    <section className="bg-linear-to-br from-yellow-lemon to-orange-amber py-10 sm:py-14">
      <Suspense fallback={null}>
        <CustomerPaymentReturnNotice />
      </Suspense>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-4 sm:px-6">
        <h1 className="font-inter text-[22px] font-extrabold uppercase leading-[28px] tracking-[0.02em] text-warm-ink sm:text-[26px]">
          Build Your System
        </h1>
      </div>

      <div className="mt-8 px-4 sm:px-6">
        <ProductsSystemStepper activeCategory={activeCategory} onSelectCategory={handleSelectCategory} />
      </div>

      <div className="mx-auto mt-8 w-full max-w-[1360px] px-4 sm:px-6">
        <ProductsCategoryCards
          activeCategory={activeCategory}
          onSelect={handleSelectCategory}
          counts={categoryCounts}
        />
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-[1360px] flex-col gap-6 px-4 sm:px-6 lg:flex-row">
        <ProductsSidebar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          catalogIndex={catalogIndex}
          isBandActive={isBandActive}
          onToggleBand={toggleBand}
          isBrandActive={isBrandActive}
          onToggleBrand={toggleBrand}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ProductsSearchBar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          {all && all.length ? (
            <ProductsFilterStudio
              key={activeCategory}
              categoryKey={activeCategory}
              products={all}
              search={search}
              state={filters}
              onChange={(next) => setFilters(activeCategory, next)}
              resultCount={total}
            />
          ) : null}
          {loading ? (
            <div className="w-full rounded-2xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
              <p className="font-dm-sans text-[13px] text-warm-gray">Loading products…</p>
            </div>
          ) : loadError ? (
            <div className="w-full rounded-2xl border border-dashed border-danger/30 bg-danger/5 px-6 py-12 text-center">
              <p className="font-inter text-[15px] font-semibold text-danger">Could not load products</p>
              <p className="mt-1 font-dm-sans text-[12px] text-warm-gray">{loadError}</p>
            </div>
          ) : (
            <ProductsCatalogList
              products={pageProducts}
              filters={NO_CHIP_FILTERS}
              activeFilterKey="all"
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              page={safePage}
              pageSize={pageSize}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

      {compareProducts.length > 0 ? <div className="h-20" aria-hidden /> : null}

      <ProductsCompareBar
        products={compareProducts}
        onRemove={handleRemoveFromCompare}
        onClear={handleClearCompare}
        onOpenCompare={() => setCompareModalOpen(true)}
      />

      {compareModalOpen ? (
        <ProductsCompareModal
          products={compareProducts}
          onClose={() => setCompareModalOpen(false)}
          onRemove={handleRemoveFromCompare}
        />
      ) : null}
    </section>
  );
}
