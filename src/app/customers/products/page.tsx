"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import type { FilterValue } from "@/components/customer/products/CategoryFilterChips";
import { CategoryFilterChips } from "@/components/customer/products/CategoryFilterChips";
import { SelectedDesignProductsSection } from "@/components/customer/products/SelectedDesignProductsSection";
import { SolarProductCard } from "@/components/customer/products/SolarProductCard";
import type { SolarProduct } from "@/components/customer/products/types";
import {
  fetchPublicProducts,
  selectedDesignProductsFromCatalog,
} from "@/lib/public/products";
import { useAppSelector } from "@/lib/store/hooks";
import { addLineToCart } from "@/components/cart/AddToCartButton";
import { MyOrders } from "@/components/cart/MyOrders";
import { CUSTOMER_PORTAL } from "@/utils/constant";

export default function SolarProductsPage() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [products, setProducts] = useState<SolarProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    fetchPublicProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load products");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => p.category === filter);
  }, [filter, products]);

  const selectedDesignProducts = useMemo(
    () => selectedDesignProductsFromCatalog(products),
    [products],
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader
        firstName={user?.firstName}
        lastName={user?.lastName}
        activeNav="products"
      />

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="font-inter text-lg font-bold leading-[27px] customer-text-on-dark">
              {CUSTOMER_PORTAL.products.title}
            </h1>
            <p
              className="mt-0.5 font-dm-sans text-xs font-normal leading-[18px] customer-text-muted"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              {CUSTOMER_PORTAL.products.subtitle}
            </p>
          </div>
          <CategoryFilterChips value={filter} onChange={setFilter} />
        </div>

        {error ? (
          <div className="customer-cream-card-bg customer-cream-card-border rounded-[10px] border p-6 text-sm text-warm-ink">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <SolarProductCard
                key={product.id}
                product={product}
                favorited={favorites.has(product.id)}
                onToggleFavorite={() => toggleFavorite(product.id)}
                onAdd={() =>
                  addLineToCart({
                    productId: product.id,
                    quantity: 1,
                    name: product.name,
                    brand: product.brand ?? null,
                    category: product.category,
                    price: product.priceValue ?? null,
                    imageUrl: product.imageUrl ?? null,
                  })
                }
              />
            ))}
          </div>
        )}

        <SelectedDesignProductsSection items={selectedDesignProducts} />

        <div className="customer-cream-card-bg customer-cream-card-border rounded-[10px] border p-4">
          <MyOrders portal="customer" />
        </div>
      </main>
    </div>
  );
}
