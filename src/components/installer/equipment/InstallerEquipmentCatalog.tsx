"use client";

import { productImage } from "@/lib/designs/product-specs";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icons";
import {
  type InstallerProductSummary,
  useInstallerProductsList,
} from "@/lib/installers/products";

type CategoryKey =
  | "Solar Panel"
  | "Inverter"
  | "Battery"
  | "EV Charger"
  | "Heat Pump"
  | "Portable Power";

const CATEGORY_TABS: {
  key: CategoryKey;
  label: string;
  iconName: "Sun" | "Cpu" | "Battery" | "Zap" | "HeatPump";
  blurb: string;
}[] = [
  {
    key: "Solar Panel",
    label: "PV Modules",
    iconName: "Sun",
    blurb: "CEC-approved photovoltaic modules",
  },
  {
    key: "Inverter",
    label: "Inverters",
    iconName: "Cpu",
    blurb: "CEC-approved string & micro inverters",
  },
  {
    key: "Battery",
    label: "Batteries",
    iconName: "Battery",
    blurb: "CEC-approved home battery systems",
  },
  {
    key: "EV Charger",
    label: "EV Chargers",
    iconName: "Zap",
    blurb: "Home and workplace EV charging equipment",
  },
  {
    key: "Heat Pump",
    label: "Heat Pumps",
    iconName: "HeatPump",
    blurb: "Heat pump hot water systems",
  },
  {
    key: "Portable Power",
    label: "Portable Power",
    iconName: "Battery",
    blurb: "BLUETTI and EcoFlow portable power stations",
  },
];

const SPEC_LABEL_BY_CATEGORY: Record<CategoryKey, string> = {
  "Solar Panel": "Wattage",
  Inverter: "Rated",
  Battery: "Capacity",
  "EV Charger": "Rated",
  "Heat Pump": "Capacity",
  "Portable Power": "Capacity",
};

const PAGE_SIZE = 24;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value)}`;
  }
}

function specsRecord(product: InstallerProductSummary): Record<string, unknown> {
  const specs = product.specs;
  if (specs && typeof specs === "object" && !Array.isArray(specs)) {
    return specs as Record<string, unknown>;
  }
  return {};
}

function getCapacityKwh(product: InstallerProductSummary): number | null {
  const specs = specsRecord(product);
  const v = specs.nominalCapacityKwh ?? specs.usableCapacityKwh;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getCapacityL(product: InstallerProductSummary): number | null {
  const specs = specsRecord(product);
  const v = specs.capacityL;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getRatedKw(product: InstallerProductSummary): number | null {
  const specs = specsRecord(product);
  const v = specs.ratedKw;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getCecDates(product: InstallerProductSummary): {
  approved: string | null;
  expires: string | null;
} {
  const specs = specsRecord(product);
  const approved =
    typeof specs.cecApprovedDate === "string" ? specs.cecApprovedDate : null;
  const expires =
    typeof specs.cecExpiryDate === "string" ? specs.cecExpiryDate : null;
  return { approved, expires };
}

/** The headline spec for a product, in the units its category is measured in. */
function keySpecLabel(product: InstallerProductSummary): string {
  const category = product.category as CategoryKey;
  if (category === "Solar Panel" && product.wattage) return `${product.wattage} W`;
  if (category === "Inverter" || category === "EV Charger") {
    const kw = getRatedKw(product);
    return kw ? `${kw} kW` : "—";
  }
  if (category === "Battery") {
    const kwh = getCapacityKwh(product);
    return kwh ? `${kwh} kWh` : "—";
  }
  if (category === "Heat Pump") {
    const litres = getCapacityL(product);
    return litres ? `${litres} L` : "—";
  }
  return "—";
}

/**
 * Table view of the same catalogue, matching the Easylink Designer
 * "Equipment & datasheets" artboard. The artboard also lists SKU, stock and a
 * datasheet link per row; the products API carries none of those, so those
 * columns are left out rather than filled with placeholders.
 */
function ProductTable({ products }: { products: InstallerProductSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-warm-border bg-white">
      <table className="w-full min-w-[720px] border-collapse font-inter text-[13px]">
        <thead>
          <tr className="text-left text-warm-gray">
            <th className="border-b border-warm-border p-2.5 font-semibold">Type</th>
            <th className="border-b border-warm-border p-2.5 font-semibold">Model</th>
            <th className="border-b border-warm-border p-2.5 font-semibold">Brand</th>
            <th className="border-b border-warm-border p-2.5 font-semibold">Key spec</th>
            <th className="border-b border-warm-border p-2.5 font-semibold">CEC</th>
            <th className="border-b border-warm-border p-2.5 text-right font-semibold">
              Indicative price
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const { approved } = getCecDates(product);
            const meta =
              CATEGORY_TABS.find((t) => t.key === product.category) ??
              CATEGORY_TABS[0];
            return (
              <tr key={product.id}>
                <td className="border-b border-cream-150 p-2.5">
                  <span className="rounded-full bg-cream-50 px-2 py-0.5 text-[12px] font-semibold text-warm-ink">
                    {meta.label}
                  </span>
                </td>
                <td className="border-b border-cream-150 p-2.5 font-semibold text-warm-ink">
                  {product.name}
                </td>
                <td className="border-b border-cream-150 p-2.5 text-warm-gray">
                  {product.brand || "—"}
                </td>
                <td className="border-b border-cream-150 p-2.5 text-warm-ink">
                  {keySpecLabel(product)}
                </td>
                <td className="border-b border-cream-150 p-2.5">
                  {approved ? (
                    <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[12px] font-bold text-[#166534]">
                      Approved
                    </span>
                  ) : (
                    <span className="text-warm-gray">—</span>
                  )}
                </td>
                <td className="border-b border-cream-150 p-2.5 text-right font-semibold text-warm-ink">
                  {formatCurrency(product.basePrice)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductCard({ product }: { product: InstallerProductSummary }) {
  const category = product.category as CategoryKey;
  const meta = CATEGORY_TABS.find((t) => t.key === category) ?? CATEGORY_TABS[0];
  const { approved, expires } = getCecDates(product);

  let primaryFigure: string | null = null;
  if (category === "Solar Panel" && product.wattage) {
    primaryFigure = `${Math.round(product.wattage)} W`;
  } else if (category === "Inverter" || category === "EV Charger") {
    const kw = getRatedKw(product) ?? (product.wattage ? product.wattage / 1000 : null);
    if (kw) primaryFigure = `${kw} kW`;
  } else if (category === "Battery" || category === "Portable Power") {
    const kwh = getCapacityKwh(product);
    if (kwh) primaryFigure = `${kwh} kWh`;
  } else if (category === "Heat Pump") {
    const litres = getCapacityL(product);
    if (litres) primaryFigure = `${litres} L`;
  }

  const photo = productImage(product);
  const cecApproved = specsRecord(product).cecApproved === true;

  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-warm-border bg-white p-4 shadow-sm">
      {photo ? (
        <div className="-mx-4 -mt-4 flex h-36 items-center justify-center rounded-t-xl bg-cream-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail */}
          <img
            src={photo.thumbUrl}
            alt={`${product.brand ?? ""} ${product.name}`.trim()}
            loading="lazy"
            className="h-full w-auto max-w-[80%] object-contain p-3"
          />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-wash/80 text-warm-ink"
          aria-hidden
        >
          <Icon name={meta.iconName} className="size-5" />
        </div>
        {cecApproved ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-wash/60 px-2 py-0.5 font-dm-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-navy-800">
            <Icon name="CheckCircle" className="size-3" /> CEC approved
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <p
          className="truncate font-dm-sans text-[10px] font-semibold uppercase tracking-[0.08em] text-warm-gray"
          title={product.brand ?? undefined}
        >
          {product.brand ?? "Unknown brand"}
        </p>
        <p
          className="line-clamp-2 wrap-break-word font-inter text-[14px] font-semibold leading-[20px] text-warm-ink"
          title={product.name}
        >
          {product.name}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        {primaryFigure ? (
          <div className="rounded-md bg-cream-50 px-2 py-1.5">
            <dt className="font-dm-sans text-[10px] uppercase tracking-[0.06em] text-warm-gray">
              {SPEC_LABEL_BY_CATEGORY[category]}
            </dt>
            <dd className="font-inter text-[13px] font-semibold text-warm-ink">
              {primaryFigure}
            </dd>
          </div>
        ) : null}
        <div className="rounded-md bg-cream-50 px-2 py-1.5">
          <dt className="font-dm-sans text-[10px] uppercase tracking-[0.06em] text-warm-gray">
            Indicative price
          </dt>
          <dd className="font-inter text-[13px] font-semibold text-warm-ink">
            {formatCurrency(product.basePrice)}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-end justify-between gap-2">
        {approved || expires ? (
          <p className="font-dm-sans text-[10px] leading-[14px] text-warm-gray">
            {approved ? <>Approved {approved}</> : null}
            {approved && expires ? <> · </> : null}
            {expires ? <>Expires {expires}</> : null}
          </p>
        ) : (
          <span />
        )}
        <AddToCartButton
          label="Add"
          disabled={!(product.basePrice > 0) || product.active === false}
          line={{
            productId: product.id,
            quantity: 1,
            name: product.name,
            brand: product.brand ?? null,
            category: product.category,
            price: product.basePrice,
            imageUrl: photo?.thumbUrl ?? null,
          }}
        />
      </div>
    </article>
  );
}

export function InstallerEquipmentCatalog() {
  const [category, setCategory] = useState<CategoryKey>("Solar Panel");
  const [searchInput, setSearchInput] = useState("");
  const [brandInput, setBrandInput] = useState("");
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");

  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const debouncedBrand = useDebouncedValue(brandInput.trim(), 300);

  // Reset to first page whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [category, debouncedSearch, debouncedBrand, activeOnly]);

  const { products, meta, loading, error, refetch } = useInstallerProductsList({
    category,
    brand: debouncedBrand || undefined,
    search: debouncedSearch || undefined,
    active: activeOnly ? true : undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalCount = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;
  const pageStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalCount);
  const activeTab = CATEGORY_TABS.find((t) => t.key === category) ?? CATEGORY_TABS[0];

  const filterChips = useMemo(() => {
    const chips: { label: string; onClear: () => void }[] = [];
    if (debouncedSearch) {
      chips.push({
        label: `Search: "${debouncedSearch}"`,
        onClear: () => setSearchInput(""),
      });
    }
    if (debouncedBrand) {
      chips.push({
        label: `Brand: "${debouncedBrand}"`,
        onClear: () => setBrandInput(""),
      });
    }
    if (!activeOnly) {
      chips.push({
        label: "Including inactive listings",
        onClear: () => setActiveOnly(true),
      });
    }
    return chips;
  }, [debouncedSearch, debouncedBrand, activeOnly]);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-dm-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-warm-gray">
          <Icon name="Package" className="size-3.5" />
          Equipment catalog
        </div>
        <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div>
            <h1 className="font-inter text-[22px] font-bold leading-[28px] text-warm-ink">
              CEC Approved Equipment
            </h1>
            <p className="mt-1 font-dm-sans text-[13px] leading-[20px] text-warm-gray">
              Every panel, inverter and battery available in your portal is on the
              Clean Energy Council approved list. Filter, search and select with
              confidence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-warm-border bg-white px-3 py-2 font-inter text-[12px] font-medium text-warm-ink shadow-sm hover:bg-cream-50"
          >
            <Icon name="ArrowRight" className="size-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Equipment category"
        className="flex flex-wrap gap-2"
      >
        {CATEGORY_TABS.map((tab) => {
          const selected = category === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(tab.key)}
              className={classNames(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 font-inter text-[13px] font-medium shadow-sm transition-colors",
                selected
                  ? "bg-linear-to-b from-yellow-lemon to-orange-amber text-warm-black"
                  : "border border-warm-border bg-white text-warm-gray hover:text-warm-ink",
              )}
            >
              <Icon name={tab.iconName} className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="font-dm-sans text-[12px] leading-[18px] text-warm-gray">
        {activeTab.blurb}
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-warm-border bg-white p-3 md:flex-row md:items-center md:gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-warm-border bg-cream-50 px-3 py-2 focus-within:bg-white focus-within:ring-1 focus-within:ring-warm-ink/20">
          <Icon name="Search" className="size-4 text-warm-gray" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${activeTab.label.toLowerCase()} by name, description or brand`}
            className="min-w-0 flex-1 bg-transparent font-inter text-[13px] text-warm-ink outline-none placeholder:text-warm-gray"
            aria-label="Search equipment"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-warm-border bg-cream-50 px-3 py-2 md:w-[260px]">
          <Icon name="Tag" className="size-4 text-warm-gray" />
          <input
            type="text"
            value={brandInput}
            onChange={(e) => setBrandInput(e.target.value)}
            placeholder="Brand (e.g. Jinko, Fronius)"
            className="min-w-0 flex-1 bg-transparent font-inter text-[13px] text-warm-ink outline-none placeholder:text-warm-gray"
            aria-label="Filter by brand"
          />
        </label>
        <label className="flex shrink-0 items-center gap-2 px-2 py-2 font-inter text-[12px] text-warm-ink">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="size-4 rounded border-warm-border accent-warm-ink"
          />
          Active only
        </label>
        <div
          role="group"
          aria-label="View"
          className="flex shrink-0 gap-1 rounded-lg border border-warm-border bg-cream-50 p-1"
        >
          {(["cards", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={classNames(
                "rounded-md px-2.5 py-1 font-inter text-[12px] font-semibold",
                view === v
                  ? "bg-warm-ink text-white"
                  : "text-warm-gray hover:text-warm-ink",
              )}
            >
              {v === "cards" ? "Cards" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {filterChips.length ? (
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClear}
              className="inline-flex items-center gap-1 rounded-full bg-sky-wash/70 px-3 py-1 font-dm-sans text-[11px] font-medium text-navy-800 hover:bg-sky-wash"
            >
              {chip.label}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="font-dm-sans text-[12px] text-warm-gray">
          {loading && !meta
            ? "Loading…"
            : totalCount === 0
              ? "No matching equipment"
              : `Showing ${pageStart}–${pageEnd} of ${totalCount.toLocaleString("en-AU")} ${activeTab.label.toLowerCase()}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-md border border-warm-border bg-white px-2.5 py-1 font-inter text-[12px] text-warm-ink shadow-sm enabled:hover:bg-cream-50 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-dm-sans text-[12px] text-warm-gray">
            Page {page} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-md border border-warm-border bg-white px-2.5 py-1 font-inter text-[12px] text-warm-ink shadow-sm enabled:hover:bg-cream-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/40 bg-red-50 px-4 py-3 font-inter text-[13px] text-red-700">
          {error}
        </div>
      ) : null}

      {products.length === 0 && !loading && !error ? (
        <div className="rounded-xl border border-dashed border-warm-border bg-white px-6 py-12 text-center">
          <p className="font-inter text-[15px] font-semibold text-warm-ink">
            No matching equipment
          </p>
          <p className="mt-1 font-dm-sans text-[12px] text-warm-gray">
            Try a different category or clear the filters.
          </p>
        </div>
      ) : view === "table" ? (
        <ProductTable products={products} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
