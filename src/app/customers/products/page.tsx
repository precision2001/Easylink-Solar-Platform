"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addLineToCart } from "@/components/cart/AddToCartButton";
import { CustomerOrdersPanel } from "@/components/customer/payments/CustomerOrdersPanel";
import { usePayLaterOptions, waysToPayLabel } from "@/components/customer/payments/usePayLaterOptions";
import { CategoryFilterChips, type FilterValue } from "@/components/customer/products/CategoryFilterChips";
import { ForYourSystemSection } from "@/components/customer/products/ForYourSystemSection";
import { ShopProductCard } from "@/components/customer/products/ShopProductCard";
import { PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";
import { EmptyNote, Skeleton } from "@/components/customer/portal/PortalParts";
import { pickPrimaryDesign } from "@/lib/customers/customer-design-view";
import { fetchCustomerDesigns, type CustomerDesign } from "@/lib/customers/designs";
import {
  SHOP_CATEGORY_LABEL,
  categoryCounts,
  designShopLines,
  designSystemSize,
  filterShopProducts,
  sortShopProducts,
  toShopProduct,
  type ShopProduct,
} from "@/lib/customers/shop-products";
import { fetchAllActiveProductRows } from "@/lib/public/products";

const PAGE = 12;

export default function SolarProductsPage() {
  const [products, setProducts] = useState<ShopProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [design, setDesign] = useState<CustomerDesign | null>(null);
  const [designLoading, setDesignLoading] = useState(true);
  const { afterpay, zip } = usePayLaterOptions();
  const shopRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllActiveProductRows()
      .then((rows) => !cancelled && setProducts(sortShopProducts(rows.map(toShopProduct))))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load products"));
    return () => {
      cancelled = true;
    };
  }, []);

  // The customer's selected (primary) design. A failure just means the
  // "For your system" card offers to start a design; the shop still works.
  useEffect(() => {
    let cancelled = false;
    fetchCustomerDesigns({ limit: 20 })
      .then((designs) => !cancelled && setDesign(pickPrimaryDesign(designs)))
      .catch(() => undefined)
      .finally(() => !cancelled && setDesignLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const all = useMemo(() => products ?? [], [products]);
  const size = useMemo(() => designSystemSize(design), [design]);
  const lines = useMemo(() => designShopLines(design, all), [design, all]);
  const counts = useMemo(() => categoryCounts(all), [all]);
  const filtered = useMemo(() => filterShopProducts(all, filter, query), [all, filter, query]);
  const visible = filtered.slice(0, shown);
  const batteries = counts.find((c) => c.category === "battery")?.count ?? 0;

  function pick(next: FilterValue) {
    setFilter(next);
    setShown(PAGE);
  }

  function add(p: ShopProduct) {
    addLineToCart({
      productId: p.id,
      quantity: 1,
      name: p.name,
      brand: p.brand ?? null,
      category: p.category,
      price: p.price ?? null,
      imageUrl: p.imageUrl ?? null,
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
  <CustomerTopNav active="products" />
  <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
      <PortalPageHeader
        eyebrow="Buy and pay"
        title="Products"
        intro="Panels, batteries, inverters, EV chargers and heat pumps from our approved range. Pick up or get delivery from your nearest EasyLink warehouse."
      />

      <ForYourSystemSection
        loading={designLoading}
        designTitle={design?.title?.trim() || null}
        lines={lines}
        size={size}
        batteriesInShop={batteries}
        onBrowseBatteries={() => {
          pick("battery");
          setQuery("");
          shopRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }}
      />

      <section ref={shopRef} aria-labelledby="shop-title" className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="shop-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
              Shop the range
            </h2>
            <p className="m-0 text-[14.5px] leading-[1.5] text-[#475569]">
              Prices include GST. Pay by {waysToPayLabel(afterpay, zip).replace(/^Card/, "card")} at checkout.
            </p>
          </div>
          <div className="relative w-full sm:w-[300px]">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#5B6B80]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4 4" />
            </svg>
            <input
              id="shop-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search by brand or model"
              autoComplete="off"
              className="h-12 w-full rounded-[14px] border border-[#CBD5E1] bg-white pl-11 pr-4 text-[15px] text-[#0F172A] placeholder:text-[#7A8AA0] focus-visible:border-[#0B1A2E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B1A2E]/10"
            />
          </div>
        </div>

        {products && counts.length > 1 ? <CategoryFilterChips value={filter} onChange={pick} categories={counts} total={all.length} /> : null}

        {error ? (
          <div role="alert" className="rounded-[14px] bg-[#FEE2E2] p-4 text-[14px] text-[#991B1B]">
            <p className="m-0 font-bold">We couldn&apos;t load the products</p>
            <p className="m-0 mt-0.5">{error}</p>
          </div>
        ) : products === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[380px]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyNote icon="products" title={all.length === 0 ? "No products listed right now" : "Nothing matches that"}>
            {all.length === 0
              ? "We're updating the range. Check back soon, or ask EasyLink AI what would suit your home."
              : `Try another search${filter !== "all" ? ` or look in all products instead of ${SHOP_CATEGORY_LABEL[filter].many.toLowerCase()}` : ""}.`}
          </EmptyNote>
        ) : (
          <>
            <p className="m-0 text-[13.5px] text-[#5B6B80]" aria-live="polite">
              Showing {visible.length} of {filtered.length}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <ShopProductCard key={p.id} product={p} size={size} afterpay={afterpay} zip={zip} onAdd={() => add(p)} />
              ))}
            </div>
            {filtered.length > visible.length ? (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="min-h-[48px] self-center rounded-[14px] border border-[#CBD5E1] bg-white px-6 text-[14.5px] font-bold text-[#0F172A] hover:border-[#0B1A2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Show {Math.min(PAGE, filtered.length - visible.length)} more
              </button>
            ) : null}
          </>
        )}
      </section>

      <CustomerOrdersPanel limit={2} title="Your recent orders" />
      </main>
    </div>
  );
}
