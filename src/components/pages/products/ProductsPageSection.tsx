"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { ProductsSystemStepper } from "@/components/pages/products/ProductsSystemStepper";
import { ProductsSidebar } from "@/components/pages/products/ProductsSidebar";
import { ProductsCategoryCards } from "@/components/pages/products/ProductsCategoryCards";
import { ProductsFilterChips } from "@/components/pages/products/ProductsFilterChips";
import { ProductsBrandChips } from "@/components/pages/products/ProductsBrandChips";
import { ProductsSearchBar } from "@/components/pages/products/ProductsSearchBar";
import { ProductsCatalogList } from "@/components/pages/products/ProductsCatalogList";
import { ProductsCompareBar } from "@/components/pages/products/ProductsCompareBar";
import { ProductsCompareModal } from "@/components/pages/products/ProductsCompareModal";
import { CustomerPaymentReturnNotice } from "@/components/customer/products/CustomerPaymentReturnNotice";
import {
  FILTERS_BY_CATEGORY,
  MAX_COMPARE_PRODUCTS,
} from "@/components/pages/products/productsData";
import type { Product, ProductCategoryKey } from "@/components/pages/products/types";
import {
  brandCounts,
  CATALOG_CATEGORY_TO_BACKEND,
  fetchCatalogIndex,
  fetchCatalogProducts,
  type CatalogIndex,
} from "@/lib/public/products";

const DEFAULT_PAGE_SIZE = 12;
/** Debounce so search doesn't fire an API call on every keystroke. */
const SEARCH_DEBOUNCE_MS = 400;

export function ProductsPageSection() {
  const [activeCategory, setActiveCategory] =
    useState<ProductCategoryKey>("batteries");
  const [activeFilterKey, setActiveFilterKey] = useState("all");
  const [activeBrand, setActiveBrand] = useState("");
  const [catalogIndex, setCatalogIndex] = useState<CatalogIndex | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Fetched products stay here across page/category switches so a product
  // already added to comparison stays resolvable even after it scrolls off.
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const [categoryCounts, setCategoryCounts] = useState<
    Partial<Record<ProductCategoryKey, number>>
  >({});

  const filters = FILTERS_BY_CATEGORY[activeCategory];
  const compareProducts = Array.from(compareIds)
    .map((id) => productCache[id])
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  // Debounce the raw search input.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const loadCategory = useCallback(
    async (
      params: {
        categoryKey: ProductCategoryKey;
        page: number;
        pageSize: number;
        search: string;
        brand: string;
      },
      signal: { cancelled: boolean },
    ) => {
      setLoading(true);
      setLoadError(null);
      try {
        const {
          products: fetched,
          total: fetchedTotal,
          totalPages: fetchedTotalPages,
        } = await fetchCatalogProducts({
          categoryKey: params.categoryKey,
          page: params.page,
          limit: params.pageSize,
          search: params.search,
          brand: params.brand,
        });
        if (signal.cancelled) return;
        setProducts(fetched);
        setTotal(fetchedTotal);
        setTotalPages(fetchedTotalPages);
        setCategoryCounts((prev) =>
          params.search || params.brand
            ? prev
            : { ...prev, [params.categoryKey]: fetchedTotal },
        );
        setProductCache((prev) => {
          const next = { ...prev };
          for (const product of fetched) next[product.id] = product;
          return next;
        });
      } catch (err) {
        if (signal.cancelled) return;
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
        setLoadError(
          err instanceof Error ? err.message : "Could not load products",
        );
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void loadCategory(
      { categoryKey: activeCategory, page, pageSize, search: debouncedSearch, brand: activeBrand },
      signal,
    );
    return () => {
      signal.cancelled = true;
    };
  }, [activeCategory, page, pageSize, debouncedSearch, activeBrand, loadCategory]);

  // Brands (and live band counts) for the sidebar and brand row, in one request.
  useEffect(() => {
    let cancelled = false;
    fetchCatalogIndex()
      .then((index) => {
        if (!cancelled) setCatalogIndex(index);
      })
      .catch(() => {
        // Menus simply show no brands; the product grid still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCategoryCounts = useCallback(async (signal: { cancelled: boolean }) => {
    const entries = await Promise.all(
      (Object.keys(CATALOG_CATEGORY_TO_BACKEND) as ProductCategoryKey[]).map(
        (categoryKey) =>
          fetchCatalogProducts({ categoryKey, limit: 1 })
            .then(({ total: categoryTotal }) => [categoryKey, categoryTotal] as const)
            .catch(() => [categoryKey, undefined] as const),
      ),
    );
    if (signal.cancelled) return;
    setCategoryCounts((prev) => {
      const next = { ...prev };
      for (const [categoryKey, categoryTotal] of entries) {
        if (categoryTotal !== undefined) next[categoryKey] = categoryTotal;
      }
      return next;
    });
  }, []);

  // Load the real per-category totals once, for the category cards.
  useEffect(() => {
    const signal = { cancelled: false };
    void loadCategoryCounts(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadCategoryCounts]);

  const handleSelectCategory = (category: ProductCategoryKey) => {
    if (category !== activeCategory) setActiveBrand("");
    setActiveCategory(category);
    setActiveFilterKey("all");
    setPage(1);
  };

  const handleSelectBrand = (brand: string) => {
    setActiveBrand(brand);
    setPage(1);
  };

  const handleSelectFilter = (filterKey: string) => {
    setActiveFilterKey(filterKey);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE_PRODUCTS) {
        next.add(id);
      }
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
        <ProductsSystemStepper
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />
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
          activeFilterKey={activeFilterKey}
          onSelectCategory={handleSelectCategory}
          onSelectFilter={handleSelectFilter}
          catalogIndex={catalogIndex}
          activeBrand={activeBrand}
          onSelectBrand={handleSelectBrand}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ProductsSearchBar
            search={search}
            onSearchChange={setSearch}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
          <ProductsFilterChips
            filters={filters}
            activeFilterKey={activeFilterKey}
            onSelect={handleSelectFilter}
          />
          <ProductsBrandChips
            brands={brandCounts(catalogIndex?.[activeCategory])}
            activeBrand={activeBrand}
            onSelect={handleSelectBrand}
          />
          {loading ? (
            <div className="w-full rounded-2xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
              <p className="font-dm-sans text-[13px] text-warm-gray">
                Loading products…
              </p>
            </div>
          ) : loadError ? (
            <div className="w-full rounded-2xl border border-dashed border-danger/30 bg-danger/5 px-6 py-12 text-center">
              <p className="font-inter text-[15px] font-semibold text-danger">
                Could not load products
              </p>
              <p className="mt-1 font-dm-sans text-[12px] text-warm-gray">
                {loadError}
              </p>
            </div>
          ) : (
            <ProductsCatalogList
              products={products}
              filters={filters}
              activeFilterKey={activeFilterKey}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              page={page}
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
