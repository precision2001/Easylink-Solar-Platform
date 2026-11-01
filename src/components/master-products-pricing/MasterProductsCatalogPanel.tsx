"use client";

import { useEffect, useMemo, useState } from "react";
import Icon, { type IconType } from "@/components/ui/Icons";
import {
  MASTER_PRODUCT_ADD_LABEL,
  MASTER_PRODUCT_CATEGORIES,
  MASTER_PRODUCT_CATEGORY_BACKEND,
  MASTER_PRODUCT_SEARCH_PLACEHOLDER,
  MASTER_PRODUCT_TABLE_COLUMNS,
  type MasterProductCategoryId,
} from "@/utils/constant";
import {
  fetchAllActiveProductRows,
  type PublicProductRow,
} from "@/lib/public/products";
import { productImage } from "@/lib/designs/product-specs";

type Props = {
  categoryId: MasterProductCategoryId;
  onCategoryChange: (id: MasterProductCategoryId) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

const ROW_ICON: Record<string, IconType> = {
  "Solar Panel": "Sun",
  Inverter: "Cpu",
  Battery: "Battery",
  "EV Charger": "Zap",
  "Heat Pump": "HeatPump",
  "Portable Power": "Battery",
};

const money = (n: number | null | undefined) =>
  typeof n === "number" && n > 0
    ? n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
    : "—";

function specsOf(row: PublicProductRow): Record<string, unknown> {
  return (row.specs ?? {}) as Record<string, unknown>;
}

/** One-line headline spec, e.g. "475 W · TOPCon bifacial" or "13.5 kWh". */
function subtitle(row: PublicProductRow): string {
  const s = specsOf(row);
  const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : undefined);
  const parts: string[] = [row.category];
  if (row.category === "Solar Panel" && row.wattage) parts.push(`${row.wattage} W`);
  else if (n("ratedKw")) parts.push(`${n("ratedKw")} kW`);
  if (n("usableCapacityKwh")) parts.push(`${n("usableCapacityKwh")} kWh`);
  if (n("capacityL")) parts.push(`${n("capacityL")} L`);
  if (typeof s.type === "string") parts.push(s.type);
  if (s.cecApproved === true) parts.push("CEC listed");
  return parts.join(" · ");
}

/**
 * Admin product catalogue: every active product from the live catalogue.
 * Retail is the product's sell price (estimated until supplier price lists are
 * loaded — flagged per row); trade prices and margins live in the Price book.
 */
export function MasterProductsCatalogPanel({
  categoryId,
  onCategoryChange,
  search,
  onSearchChange,
}: Props) {
  const [rows, setRows] = useState<PublicProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllActiveProductRows()
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load products");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const backend = categoryId === "all" ? null : MASTER_PRODUCT_CATEGORY_BACKEND[categoryId];
    return (rows ?? [])
      .filter((row) => !backend || row.category === backend)
      .filter((row) => {
        if (!q) return true;
        return `${row.name} ${row.brand ?? ""} ${row.sku ?? ""} ${subtitle(row)}`
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a, b) =>
          (a.brand ?? "").localeCompare(b.brand ?? "") || a.name.localeCompare(b.name),
      );
  }, [rows, categoryId, search]);

  const countFor = (id: MasterProductCategoryId) =>
    id === "all"
      ? rows?.length
      : rows?.filter((r) => r.category === MASTER_PRODUCT_CATEGORY_BACKEND[id]).length;

  return (
    <div className="master-pp-card">
      <div className="master-pp-catalog-toolbar">
        <div className="master-pp-chip-row">
          {MASTER_PRODUCT_CATEGORIES.map((cat) => {
            const active = cat.id === categoryId;
            const count = countFor(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                className={active ? "master-pp-chip-active" : "master-pp-chip-inactive"}
                onClick={() => onCategoryChange(cat.id)}
              >
                {cat.label}
                {count !== undefined ? <span className="ml-1 opacity-60">{count}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="master-pp-catalog-actions w-full lg:w-auto">
          <div className="master-pp-search-wrap w-full lg:max-w-[320px]">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={MASTER_PRODUCT_SEARCH_PLACEHOLDER}
              className="master-pp-search-field"
              aria-label={MASTER_PRODUCT_SEARCH_PLACEHOLDER}
            />
            <span className="master-pp-search-icon" aria-hidden>
              <Icon name="Search" className="size-[18px]" />
            </span>
          </div>
          <button type="button" className="master-pp-add-button shrink-0">
            <Icon name="Plus" className="size-3.5 shrink-0" />
            {MASTER_PRODUCT_ADD_LABEL}
          </button>
        </div>
      </div>

      <div className="master-pp-table-scroll">
        <div className="min-w-0">
          <div className="master-pp-table-grid master-pp-table-head">
            <span aria-hidden className="block" />
            {MASTER_PRODUCT_TABLE_COLUMNS.map((col) => (
              <span key={col.id} className={col.align === "right" ? "text-right" : "text-left"}>
                {col.label}
              </span>
            ))}
          </div>

          {rows === null && !error ? (
            <p className="master-pp-product-sub px-4 py-6">Loading products…</p>
          ) : null}
          {error ? <p className="master-pp-product-sub px-4 py-6">{error}</p> : null}
          {rows !== null && filtered.length === 0 ? (
            <p className="master-pp-product-sub px-4 py-6">No products match.</p>
          ) : null}

          {filtered.map((row) => {
            const photo = productImage(row);
            const s = specsOf(row);
            const estimated = s.priceEstimate === true;
            const retail = row.retailPrice ?? row.basePrice ?? null;
            const wholesale = row.wholesalePrice ?? null;
            const margin =
              retail && wholesale ? `${Math.round(((retail - wholesale) / retail) * 100)}%` : "—";
            return (
              <div key={row.id} className="master-pp-table-grid master-pp-table-row">
                <div className="master-pp-row-icon-well overflow-hidden" aria-hidden>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                    <img
                      src={photo.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="size-full bg-white object-contain p-0.5"
                    />
                  ) : (
                    <Icon name={ROW_ICON[row.category] ?? "Box"} className="size-4 shrink-0" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="master-pp-product-name truncate" title={row.name}>
                    {row.name}
                  </p>
                  <p className="master-pp-product-sub truncate">{subtitle(row)}</p>
                </div>
                <span className="master-pp-table-cell-muted truncate">{row.sku ?? "—"}</span>
                <span className="master-pp-table-cell-muted truncate">{row.brand ?? "—"}</span>
                <span
                  className="master-pp-price-retail text-right tabular-nums"
                  title={estimated ? "Estimated — load the supplier price list to replace it" : undefined}
                >
                  {money(retail)}
                  {estimated ? <span className="ml-1 text-[10px] opacity-60">est.</span> : null}
                </span>
                <span className="master-pp-price-wholesale text-right tabular-nums">
                  {money(wholesale)}
                </span>
                <span className="master-pp-margin text-right tabular-nums">{margin}</span>
                <div className="master-pp-actions-cell">
                  <button type="button" className="master-pp-action-btn" aria-label={`Edit ${row.name}`}>
                    <Icon name="Pencil" className="size-4" />
                  </button>
                  <button type="button" className="master-pp-action-btn" aria-label={`Delete ${row.name}`}>
                    <Icon name="Trash2" className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
