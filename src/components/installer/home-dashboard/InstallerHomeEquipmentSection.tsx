"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icons";
import { useInstallerConfirm } from "@/components/installer/home-dashboard/InstallerConfirmDialog";
import {
  brandsOf,
  fetchBuilderCatalogue,
  modelsOf,
  type BuilderCatalogue,
  type BuilderProduct,
  type BuilderProductCategory,
} from "@/lib/designs/catalogue";
import {
  batteryCapacityKwh,
  cecApprovedLabel,
  inverterRatedKw,
  numberSpec,
  productLabel,
  productImage,
  productSeries,
  productsByCategory,
  NO_VALUE,
} from "@/lib/designs/product-specs";
import {
  buildEquipmentWizardPatch,
  mergeEquipmentWithWizardData,
  type EquipmentRow,
  type InstallerHomeEquipment,
} from "@/lib/installers/design-equipment";
import {
  addProductToInstallerDesign,
  removeProductFromInstallerDesign,
  updateInstallerDesign,
  type InstallerCustomerDesign,
  type InstallerDesignProduct,
} from "@/lib/installers/designs";

function IconBattery({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
      <path d="M22 11v2" strokeLinecap="round" />
    </svg>
  );
}

function IconCpu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
}

type ProductCardKey = "solar" | "battery" | "equipment" | "evCharger" | "heatPump";

/** category substring for `productsByCategory`, and the catalogue category the "+ Add" picker fetches from. */
const PRODUCT_CARD_CONFIG: {
  key: ProductCardKey;
  title: string;
  icon: ReactNode;
  categorySubstring: string;
  builderCategory: BuilderProductCategory;
}[] = [
  {
    key: "solar",
    title: "Solar Panels",
    icon: <Icon name="Sun" className="text-warm-ink" />,
    categorySubstring: "panel",
    builderCategory: "Solar Panel",
  },
  {
    key: "battery",
    title: "Battery",
    icon: <IconBattery className="text-warm-ink" />,
    categorySubstring: "battery",
    builderCategory: "Battery",
  },
  {
    key: "equipment",
    title: "Inverter",
    icon: <IconCpu className="text-warm-ink" />,
    categorySubstring: "inverter",
    builderCategory: "Inverter",
  },
  {
    key: "evCharger",
    title: "EV Charger",
    icon: <Icon name="Zap" className="text-warm-ink" />,
    categorySubstring: "ev charger",
    builderCategory: "EV Charger",
  },
  {
    key: "heatPump",
    title: "Heat Pump",
    icon: <Icon name="HeatPump" className="text-warm-ink" />,
    categorySubstring: "heat pump",
    builderCategory: "Heat Pump",
  },
];

const SITE_CARD = {
  title: "Site Details",
  icon: <Icon name="LocationPin" className="text-warm-ink" />,
};

/** Site row backed by `design.address` rather than the wizardData snapshot. */
const SITE_ADDRESS_LABEL = "Address";
/** Matches the placeholder the design card and the base site rows both use. */
const SITE_ADDRESS_EMPTY = "-";

function addressRowValue(address?: string | null) {
  return address?.trim() || SITE_ADDRESS_EMPTY;
}

/** Placeholder dashes are "no address", not a literal value to store. */
function addressFromRow(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === SITE_ADDRESS_EMPTY || trimmed === NO_VALUE) {
    return null;
  }
  return trimmed;
}

/** One spec-row set per category, built from a single attached product. */
function specRowsFor(key: ProductCardKey, item: InstallerDesignProduct): EquipmentRow[] {
  const model = productLabel(item) ?? NO_VALUE;
  switch (key) {
    case "solar":
      return [
        { label: "Model", value: model },
        {
          label: "Watts",
          value: item.product?.wattage ? `${item.product.wattage}W` : NO_VALUE,
        },
      ];
    case "battery": {
      const kwh = batteryCapacityKwh(item);
      return [
        { label: "Model", value: model },
        { label: "Capacity", value: kwh !== undefined ? `${kwh} kWh` : NO_VALUE },
        { label: "Series", value: productSeries(item) ?? NO_VALUE },
        { label: "CEC Approved", value: cecApprovedLabel(item) ?? NO_VALUE },
      ];
    }
    case "equipment": {
      const kw = inverterRatedKw(item);
      return [
        { label: "Model", value: model },
        { label: "Rated Output", value: kw !== undefined ? `${kw} kW` : NO_VALUE },
        { label: "CEC Approved", value: cecApprovedLabel(item) ?? NO_VALUE },
      ];
    }
    case "evCharger": {
      const kw = inverterRatedKw(item);
      return [
        { label: "Model", value: model },
        { label: "Rating", value: kw !== undefined ? `${kw} kW` : NO_VALUE },
      ];
    }
    case "heatPump": {
      const litres = numberSpec(item.product, "capacityL");
      return [
        { label: "Model", value: model },
        { label: "Capacity", value: litres !== undefined ? `${litres} L` : NO_VALUE },
      ];
    }
  }
}

function EquipmentSpecRow({ label, value }: EquipmentRow) {
  return (
    <div className="flex min-h-[19.875px] min-w-0 items-start justify-between gap-2 font-dm-sans">
      <span className="shrink-0 text-[13.25px] leading-[19.875px] text-warm-gray">
        {label}
      </span>
      <span
        className="min-w-0 truncate text-right text-[13.25px] font-medium leading-[19.875px] text-warm-ink"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function CardShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[11px] border-[1.157px] border-warm-border bg-cream-50 p-[13.24px]">
      <div className="flex items-center gap-[8.825px] pr-[52px]">
        <span className="flex size-[30.907px] shrink-0 items-center justify-center rounded-[8.833px] bg-linear-to-b from-yellow-lemon to-orange-amber text-warm-ink [&_svg]:size-[15.445px]">
          {icon}
        </span>
        <h4 className="min-w-0 truncate font-inter text-[13.25px] font-bold uppercase leading-[19.875px] tracking-[0.33px] text-warm-ink">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function ProductEquipmentCard({
  cardKey,
  title,
  icon,
  item,
  disabled,
  onChangeQuantity,
  onRemove,
}: {
  cardKey: ProductCardKey;
  title: string;
  icon: ReactNode;
  item: InstallerDesignProduct;
  disabled?: boolean;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const photo = productImage(item?.product);
  return (
    <CardShell title={title} icon={icon}>
      <div className="absolute right-[13.24px] top-[8.83px]">
        <button
          type="button"
          className="flex size-[22.082px] items-center justify-center rounded-[4.417px] text-danger hover:bg-black/5 disabled:opacity-50"
          aria-label={`Remove ${title}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <Icon name="Trash" className="size-[13.24px]" />
        </button>
      </div>
      {photo ? (
        <div className="mt-[10px] flex h-20 items-center justify-center rounded-md bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail */}
          <img
            src={photo.thumbUrl}
            alt={productLabel(item) ?? title}
            loading="lazy"
            className="h-full w-auto max-w-[80%] object-contain p-1.5"
          />
        </div>
      ) : null}
      <div className="mt-[13px] flex flex-col gap-[4.413px]">
        {specRowsFor(cardKey, item).map((row) => (
          <EquipmentSpecRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-warm-border pt-2">
        <span className="font-dm-sans text-[11px] text-warm-gray">Qty</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={disabled || item.quantity <= 1}
            onClick={() => onChangeQuantity(item.quantity - 1)}
            className="flex size-6 items-center justify-center rounded-md border border-warm-border text-warm-ink hover:bg-white disabled:opacity-40"
          >
            −
          </button>
          <span className="w-5 text-center font-dm-sans text-[13px] font-semibold text-warm-ink">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={disabled}
            onClick={() => onChangeQuantity(item.quantity + 1)}
            className="flex size-6 items-center justify-center rounded-md border border-warm-border text-warm-ink hover:bg-white disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </CardShell>
  );
}

function AddProductTile({
  title,
  icon,
  disabled,
  onClick,
}: {
  title: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[100px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-warm-border bg-white text-warm-gray hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex size-[26px] items-center justify-center rounded-full border border-warm-border [&_svg]:size-3">
        {icon}
      </span>
      <span className="font-dm-sans text-[12px] font-medium">+ Add {title}</span>
    </button>
  );
}

function AddProductModal({
  open,
  category,
  catalogue,
  loadingCatalogue,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  category: (typeof PRODUCT_CARD_CONFIG)[number] | null;
  catalogue: BuilderCatalogue | null;
  loadingCatalogue: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (productId: string, quantity: number) => void;
}) {
  const titleId = useId();
  // Freshly initialized on every open: the parent remounts this component
  // (via a `key` on the JSX below) each time it opens, rather than resetting
  // state in an effect.
  const [brand, setBrand] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open, saving]);

  if (!open || !category || typeof document === "undefined") return null;

  const products = catalogue?.[category.builderCategory] ?? [];
  const brandOptions = brandsOf(products);
  const modelOptions: BuilderProduct[] = modelsOf(products, brand);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex w-full max-w-[420px] flex-col overflow-hidden rounded-[12px] border border-warm-border bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="border-b border-warm-border bg-linear-to-b from-yellow-lemon to-orange-amber px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="font-inter text-[14px] font-bold leading-[21px] text-warm-black">
              Add {category.title}
            </h2>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full bg-[rgba(28,26,23,0.1)] text-warm-black hover:bg-[rgba(28,26,23,0.18)]"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <Icon name="X" className="size-[14px]" />
            </button>
          </div>
        </div>

        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!productId) return;
            onSubmit(productId, quantity);
          }}
        >
          {loadingCatalogue ? (
            <p className="font-dm-sans text-sm text-warm-gray">Loading catalogue…</p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block font-dm-sans text-[10px] font-semibold uppercase tracking-wide text-warm-gray">
                  Brand
                </span>
                <select
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setProductId("");
                  }}
                  disabled={saving}
                  className="w-full rounded-lg border border-warm-border bg-white px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                >
                  <option value="" disabled>
                    Select brand
                  </option>
                  {brandOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-dm-sans text-[10px] font-semibold uppercase tracking-wide text-warm-gray">
                  Model
                </span>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={saving || !brand}
                  className="w-full rounded-lg border border-warm-border bg-white px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select model
                  </option>
                  {modelOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-dm-sans text-[10px] font-semibold uppercase tracking-wide text-warm-gray">
                  Quantity
                </span>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  disabled={saving}
                  className="w-full rounded-lg border border-warm-border bg-white px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                />
              </label>
            </>
          )}

          {error ? <p className="font-dm-sans text-sm text-red-600">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-warm-border px-4 py-2 font-dm-sans text-sm font-medium text-warm-ink hover:bg-cream-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !productId}
              className="rounded-lg bg-linear-to-b from-yellow-lemon to-orange-amber px-4 py-2 font-dm-sans text-sm font-bold uppercase tracking-wide text-warm-black hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function EditEquipmentModal({
  open,
  cardTitle,
  rows,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  cardTitle: string;
  rows: EquipmentRow[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (rows: EquipmentRow[]) => void;
}) {
  const titleId = useId();
  const [draftRows, setDraftRows] = useState<EquipmentRow[]>(rows);

  useEffect(() => {
    if (!open) return;
    setDraftRows(rows.map((row) => ({ ...row })));
  }, [open, rows]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, open, saving]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(47,47,47,0.67)] backdrop-blur-[1px]"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(90vh,640px)] w-full max-w-[480px] flex-col overflow-hidden rounded-[12px] border border-warm-border bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        <div className="border-b border-warm-border bg-linear-to-b from-yellow-lemon to-orange-amber px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="font-inter text-[14px] font-bold leading-[21px] text-warm-black"
            >
              Edit {cardTitle}
            </h2>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-full bg-[rgba(28,26,23,0.1)] text-warm-black hover:bg-[rgba(28,26,23,0.18)]"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <Icon name="X" className="size-[14px]" />
            </button>
          </div>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(
              draftRows
                .map((row) => ({
                  label: row.label.trim(),
                  value: row.value.trim(),
                }))
                .filter((row) => row.label.length > 0),
            );
          }}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {draftRows.map((row, index) => (
              <div
                key={`${row.label}-${index}`}
                className="grid gap-2 rounded-lg border border-warm-border bg-cream-50 p-3 sm:grid-cols-2"
              >
                <label className="block">
                  <span className="mb-1 block font-dm-sans text-[10px] font-semibold uppercase tracking-wide text-warm-gray">
                    Label
                  </span>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => {
                      setDraftRows((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, label: e.target.value }
                            : item,
                        ),
                      );
                    }}
                    disabled={saving}
                    className="w-full rounded-lg border border-warm-border bg-white px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-dm-sans text-[10px] font-semibold uppercase tracking-wide text-warm-gray">
                    Value
                  </span>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => {
                      setDraftRows((current) =>
                        current.map((item, i) =>
                          i === index
                            ? { ...item, value: e.target.value }
                            : item,
                        ),
                      );
                    }}
                    disabled={saving}
                    className="w-full rounded-lg border border-warm-border bg-white px-3 py-2 font-dm-sans text-sm text-warm-ink outline-none focus:border-brand-blue"
                  />
                </label>
              </div>
            ))}
          </div>

          {error ? (
            <p className="px-4 font-dm-sans text-sm text-red-600">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-warm-border px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-warm-border px-4 py-2 font-dm-sans text-sm font-medium text-warm-ink hover:bg-cream-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || draftRows.every((row) => !row.label.trim())}
              className="rounded-lg bg-linear-to-b from-yellow-lemon to-orange-amber px-4 py-2 font-dm-sans text-sm font-bold uppercase tracking-wide text-warm-black hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function SiteDetailsCard({
  title,
  icon,
  rows,
  disabled,
  deleting,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: ReactNode;
  rows: EquipmentRow[];
  disabled?: boolean;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <CardShell title={title} icon={icon}>
      <div className="absolute right-[13.24px] top-[8.83px] flex gap-[4.413px]">
        <button
          type="button"
          className="flex size-[22.082px] items-center justify-center rounded-[4.417px] text-warm-gray hover:bg-black/5 disabled:opacity-50"
          aria-label={`Edit ${title}`}
          disabled={disabled || deleting}
          onClick={onEdit}
        >
          <Icon name="Pencil" className="size-[13.24px]" />
        </button>
        <button
          type="button"
          className="flex size-[22.082px] items-center justify-center rounded-[4.417px] text-danger hover:bg-black/5 disabled:opacity-50"
          aria-label={`Delete ${title}`}
          disabled={disabled || deleting}
          onClick={onDelete}
        >
          <Icon name="Trash" className="size-[13.24px]" />
        </button>
      </div>
      <div className="mt-[13px] flex flex-col gap-[4.413px]">
        {rows.map((row) => (
          <EquipmentSpecRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </CardShell>
  );
}

type Props = {
  design: InstallerCustomerDesign | null;
  baseEquipment: InstallerHomeEquipment;
  onDesignUpdated: (design: InstallerCustomerDesign) => void;
};

/** Patches one product in/out of a design's product list without a full refetch. */
function withProduct(
  design: InstallerCustomerDesign,
  next: InstallerDesignProduct,
): InstallerCustomerDesign {
  const products = design.products ?? [];
  const withoutExisting = products.filter(
    (item) => item.product?.id !== next.product?.id,
  );
  return { ...design, products: [...withoutExisting, next] };
}

function withoutProduct(
  design: InstallerCustomerDesign,
  productId: string,
): InstallerCustomerDesign {
  return {
    ...design,
    products: (design.products ?? []).filter((item) => item.product?.id !== productId),
  };
}

export function InstallerHomeEquipmentSection({
  design,
  baseEquipment,
  onDesignUpdated,
}: Props) {
  const { equipment, hidden } = useMemo(() => {
    const merged = mergeEquipmentWithWizardData(baseEquipment, design?.wizardData);
    // The wizardData snapshot of the site card would otherwise freeze the
    // address taken at edit time, drifting from `design.address` — which the
    // solar design card shows. The design column is the single source.
    return {
      ...merged,
      equipment: {
        ...merged.equipment,
        site: merged.equipment.site.map((row) =>
          row.label === SITE_ADDRESS_LABEL
            ? { ...row, value: addressRowValue(design?.address) }
            : row,
        ),
      },
    };
  }, [baseEquipment, design?.wizardData, design?.address]);
  const siteHidden = hidden.has("site");

  const [catalogue, setCatalogue] = useState<BuilderCatalogue | null>(null);
  const [loadingCatalogue, setLoadingCatalogue] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoadingCatalogue(true);
    fetchBuilderCatalogue()
      .then((result) => {
        if (!cancelled) setCatalogue(result);
      })
      .catch(() => {
        // The add-product picker just shows empty options; not fatal to the page.
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogue(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [addingCategoryKey, setAddingCategoryKey] = useState<ProductCardKey | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [editingSite, setEditingSite] = useState(false);
  const [siteFormError, setSiteFormError] = useState<string | null>(null);
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteDeleting, setSiteDeleting] = useState(false);

  const { confirm, confirmDialog } = useInstallerConfirm();

  async function handleChangeQuantity(
    item: InstallerDesignProduct,
    quantity: number,
  ) {
    if (!design?.id || !item.product?.id) return;
    setPendingProductId(item.product.id);
    try {
      const updated = await addProductToInstallerDesign(design.id, {
        productId: item.product.id,
        quantity,
      });
      onDesignUpdated(withProduct(design, updated));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to update quantity");
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleRemoveProduct(item: InstallerDesignProduct, categoryTitle: string) {
    if (!design?.id || !item.product?.id) return;
    const confirmed = await confirm({
      title: `Remove ${categoryTitle}`,
      description: `Remove "${productLabel(item) ?? categoryTitle}" from this customer's design?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!confirmed) return;

    setPendingProductId(item.product.id);
    try {
      await removeProductFromInstallerDesign(design.id, item.product.id);
      onDesignUpdated(withoutProduct(design, item.product.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to remove product");
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleAddProduct(productId: string, quantity: number) {
    if (!design?.id) return;
    setAddSaving(true);
    setAddError(null);
    try {
      const updated = await addProductToInstallerDesign(design.id, { productId, quantity });
      onDesignUpdated(withProduct(design, updated));
      setAddingCategoryKey(null);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setAddSaving(false);
    }
  }

  async function persistSiteWizardData(
    wizardData: Record<string, unknown>,
    address?: string | null,
  ): Promise<void> {
    if (!design?.id) {
      throw new Error("Save a customer design before editing equipment.");
    }
    const updated = await updateInstallerDesign(design.id, {
      wizardData,
      ...(address !== undefined ? { address } : {}),
    });
    onDesignUpdated(updated);
  }

  async function handleSaveSite(rows: EquipmentRow[]) {
    if (!design) return;
    setSiteSaving(true);
    setSiteFormError(null);
    try {
      const wizardData = buildEquipmentWizardPatch(design.wizardData, {
        cardKey: "site",
        rows,
      });
      // Address lives on the design record, not only in the card snapshot, so
      // the solar design card above shows the same value.
      const addressRow = rows.find((row) => row.label === SITE_ADDRESS_LABEL);
      const address = addressRow ? addressFromRow(addressRow.value) : undefined;
      await persistSiteWizardData(wizardData, address);
      setEditingSite(false);
    } catch (err) {
      setSiteFormError(err instanceof Error ? err.message : "Failed to save equipment");
    } finally {
      setSiteSaving(false);
    }
  }

  async function handleDeleteSite() {
    if (!design?.id) return;
    const confirmed = await confirm({
      title: "Remove equipment",
      description: `Remove "${SITE_CARD.title}" from this customer?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!confirmed) return;

    setSiteDeleting(true);
    try {
      const wizardData = buildEquipmentWizardPatch(design.wizardData, {
        hideCardKey: "site",
      });
      await persistSiteWizardData(wizardData);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete equipment card");
    } finally {
      setSiteDeleting(false);
    }
  }

  const addingCategory = addingCategoryKey
    ? PRODUCT_CARD_CONFIG.find((cfg) => cfg.key === addingCategoryKey) ?? null
    : null;

  return (
    <section className="mt-5 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PRODUCT_CARD_CONFIG.flatMap((cfg) => {
          const items = productsByCategory(design?.products, cfg.categorySubstring);
          return [
            ...items.map((item) => (
              <ProductEquipmentCard
                key={`${cfg.key}-${item.product?.id ?? item.id}`}
                cardKey={cfg.key}
                title={cfg.title}
                icon={cfg.icon}
                item={item}
                disabled={!design?.id || pendingProductId === item.product?.id}
                onChangeQuantity={(quantity) => void handleChangeQuantity(item, quantity)}
                onRemove={() => void handleRemoveProduct(item, cfg.title)}
              />
            )),
            <AddProductTile
              key={`${cfg.key}-add`}
              title={cfg.title}
              icon={cfg.icon}
              disabled={!design?.id}
              onClick={() => {
                setAddError(null);
                setAddingCategoryKey(cfg.key);
              }}
            />,
          ];
        })}
      </div>

      {!siteHidden ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SiteDetailsCard
            title={SITE_CARD.title}
            icon={SITE_CARD.icon}
            rows={equipment.site}
            disabled={!design?.id || siteSaving}
            deleting={siteDeleting}
            onEdit={() => {
              setSiteFormError(null);
              setEditingSite(true);
            }}
            onDelete={() => void handleDeleteSite()}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-warm-border bg-cream-50 py-3 font-inter text-sm font-medium text-warm-ink hover:bg-cream-100"
      >
        <span className="text-lg leading-none">+</span>
        Create New Deal / System
      </button>

      <AddProductModal
        key={addingCategoryKey ?? "none"}
        open={addingCategoryKey != null}
        category={addingCategory}
        catalogue={catalogue}
        loadingCatalogue={loadingCatalogue}
        saving={addSaving}
        error={addError}
        onClose={() => {
          if (!addSaving) {
            setAddingCategoryKey(null);
            setAddError(null);
          }
        }}
        onSubmit={(productId, quantity) => void handleAddProduct(productId, quantity)}
      />

      <EditEquipmentModal
        open={editingSite}
        cardTitle={SITE_CARD.title}
        rows={equipment.site}
        saving={siteSaving}
        error={siteFormError}
        onClose={() => {
          if (!siteSaving) {
            setEditingSite(false);
            setSiteFormError(null);
          }
        }}
        onSubmit={(rows) => void handleSaveSite(rows)}
      />

      {confirmDialog}
    </section>
  );
}
