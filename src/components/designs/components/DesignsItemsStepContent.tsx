"use client";

import Image from "next/image";
import classNames from "classnames";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import Icon, { type IconType } from "@/components/ui/Icons";
import {
  brandsOf,
  modelsOf,
  type BuilderProduct,
  type BuilderProductCategory,
} from "@/lib/designs/catalogue";
import { selectBuilderCatalogue } from "@/lib/store/builderCatalogueSlice";
import {
  batteryCapacityKwh,
  cecApprovedLabel as cecApprovedLabelFor,
  productImage,
  inverterRatedKw,
  numberSpec,
  productType,
} from "@/lib/designs/product-specs";
import {
  EQUIPMENT_CATEGORY_KEYS,
  legacyEquipmentToItems,
  mergeProposalData,
  type DesignProposalEquipment,
  type EquipmentCategoryKey,
  type EquipmentItem,
  type EquipmentItemsByCategory,
} from "@/lib/store/designProposalSlice";
import {
  DesignsSelectField,
  type DesignsSelectOption,
} from "./DesignsSelectField";
import {
  CEC_LABEL,
  batteryBrands,
  brandSizeOptions,
  findSize,
  isSizeId,
  sizeLayout,
  useBatteryOptions,
  type BatteryOptions,
} from "@/lib/batteries/batteryOptions";

const SECTION_CATEGORY: Record<EquipmentCategoryKey, BuilderProductCategory> = {
  solarPanel: "Solar Panel",
  inverter: "Inverter",
  battery: "Battery",
  evCharger: "EV Charger",
  heatPump: "Heat Pump",
};

const SECTION_TITLE: Record<EquipmentCategoryKey, string> = {
  solarPanel: "Select Solar Panels",
  inverter: "Select Inverter",
  battery: "Select Battery",
  evCharger: "Select EV Charger",
  heatPump: "Select Heat Pump",
};

/** Photos exist only for the three original categories; the two new ones fall back to an icon glyph. */
const SECTION_IMAGE: Partial<
  Record<EquipmentCategoryKey, { src: string; width: number; height: number }>
> = {
  solarPanel: { src: "/images/designs/solarPanel.png", width: 67, height: 99 },
  battery: { src: "/images/designs/battery.png", width: 57, height: 93 },
  inverter: { src: "/images/designs/equipment.png", width: 47, height: 103 },
};

const SECTION_ICON: Partial<Record<EquipmentCategoryKey, IconType>> = {
  evCharger: "Zap",
  heatPump: "HeatPump",
};

/** Panels advertise watts; batteries kWh; inverters/EV chargers rated kW; heat pumps tank litres. */
function ratingLabel(product: BuilderProduct): string {
  if (product.category === "Solar Panel") {
    return product.wattage ? `${product.wattage} W` : "—";
  }
  if (product.category === "Battery") {
    const kwh = batteryCapacityKwh({ quantity: 1, product });
    return kwh !== undefined ? `${kwh} kWh` : "—";
  }
  if (product.category === "Heat Pump") {
    const litres = numberSpec(product, "capacityL");
    return litres !== undefined ? `${litres} L` : "—";
  }
  // Inverter and EV Charger both carry their rating as a "ratedKw" spec.
  const kw = inverterRatedKw({ quantity: 1, product });
  return kw !== undefined ? `${kw} kW` : "—";
}

type SpecLine = { label: string; value: string };

/** An item plus a stable id assigned once at creation — lets the stack animate
 *  reorders instead of remounting, without touching a ref during render. */
type StackEntry = { key: string; item: EquipmentItem };

function toEntry(item: EquipmentItem): StackEntry {
  return { key: crypto.randomUUID(), item };
}

function entriesToItems(
  entriesByCategory: Record<EquipmentCategoryKey, StackEntry[]>,
): EquipmentItemsByCategory {
  return Object.fromEntries(
    EQUIPMENT_CATEGORY_KEYS.map((key) => [
      key,
      entriesByCategory[key].map((entry) => entry.item),
    ]),
  ) as EquipmentItemsByCategory;
}

/** What one stacked card shows — resolved at render time from the live catalogue, not stored on the item. */
function itemToSummary(
  item: EquipmentItem,
  product: BuilderProduct | undefined,
  batteryOptions: BatteryOptions | null = null,
): { leftCol: SpecLine[]; rightCol: SpecLine[] } {
  // A battery picked by size (range + modules): its system and CEC status from the size list.
  const picked = findSize(batteryOptions, item.productId);
  if (picked) {
    return {
      leftCol: [
        { label: "Brand -", value: item.brand },
        { label: "Model -", value: item.name },
        { label: "Type -", value: `${picked.size.phase === 1 ? "Single" : "Three"}-phase system` },
        { label: "CEC Approved -", value: CEC_LABEL[picked.range.cecStatus] },
      ],
      rightCol: [
        { label: "Rating -", value: item.ratingLabel || "—" },
        { label: "Qty -", value: String(item.quantity) },
      ],
    };
  }
  return {
    leftCol: [
      { label: "Brand -", value: item.brand },
      { label: "Model -", value: item.name },
      { label: "Type -", value: product ? productType({ quantity: 1, product }) ?? "—" : "—" },
      {
        label: "CEC Approved -",
        value: product ? cecApprovedLabelFor({ quantity: 1, product }) ?? "—" : "—",
      },
    ],
    rightCol: [
      { label: "Rating -", value: item.ratingLabel || "—" },
      { label: "Qty -", value: String(item.quantity) },
    ],
  };
}

/**
 * Figma 3:4448 — nested panel: 135px height, 10px radius, 2px #00b0f0 border,
 * gradient fill; inner row 309× centered, image 67×99 + 14px + text columns 119 / 111.
 */
function DesignsItemProductSummary({
  category,
  leftCol,
  rightCol,
  onRemove,
  photoUrl,
}: {
  category: EquipmentCategoryKey;
  leftCol: SpecLine[];
  rightCol: SpecLine[];
  onRemove?: () => void;
  /** The selected product's own photo; falls back to the category image. */
  photoUrl?: string;
}) {
  const image = SECTION_IMAGE[category];
  const iconName = SECTION_ICON[category];
  const [ratingRow, qtyRow] = rightCol.slice(0, 2);

  return (
    <div className="relative h-[160px] w-full shrink-0 overflow-clip rounded-[10px] border-2 border-solid border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber">
      {/* Fixed-width Figma columns (67 image + 119 + 111) overflowed once cards
          got narrower than ~330px in the 5-column layout — leftCol/rightCol now
          flex to the available width instead, with ellipsis absorbing the rest. */}
      <div className="absolute inset-0 flex items-center justify-between gap-2 px-3">
        <div className="relative flex h-[99px] w-[50px] shrink-0 items-center justify-center overflow-hidden">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
            <img
              src={photoUrl}
              alt=""
              loading="lazy"
              className="h-full w-full rounded-md bg-white/70 object-contain p-0.5"
            />
          ) : image ? (
            <Image
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              className="h-full w-full object-contain object-left"
              unoptimized
            />
          ) : iconName ? (
            <Icon name={iconName} className="size-10 text-white" />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-[93px] min-w-0 flex-1 flex-col justify-center gap-[14px] leading-0">
            {leftCol.map((row) => (
              <p
                key={row.label}
                title={`${row.label} ${row.value}`}
                className="w-full min-w-0 truncate font-inter text-[10px] font-medium not-italic tracking-[-0.1504px] text-[#382bd6]"
              >
                <span className="leading-normal">{row.label} </span>
                <span className="leading-normal text-[#121212]">
                  {row.value}
                </span>
              </p>
            ))}
          </div>
          <div className="flex w-[70px] shrink-0 flex-col items-end justify-center gap-[33px] leading-0">
            <div className="flex h-[42px] w-full flex-col items-end gap-[14px] font-inter text-[10px] font-medium not-italic tracking-[-0.1504px] text-[#382bd6]">
              {ratingRow ? (
                <p className="w-full min-w-0 truncate text-right" title={`${ratingRow.label} ${ratingRow.value}`}>
                  <span className="leading-normal">{ratingRow.label} </span>
                  <span className="leading-normal text-[#020202]">
                    {ratingRow.value}
                  </span>
                </p>
              ) : null}
              {qtyRow ? (
                <p className="w-full min-w-0 truncate text-right" title={`${qtyRow.label} ${qtyRow.value}`}>
                  <span className="leading-normal">{qtyRow.label} </span>
                  <span className="leading-normal text-[#020202]">
                    {qtyRow.value}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label="Remove this item"
          className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-white/90 text-[#020202] shadow-sm hover:bg-white"
        >
          <svg viewBox="0 0 16 16" width={10} height={10} fill="none" aria-hidden>
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Stacked cards: newest on top, up to 2 older ones peeking behind it, capped
 * with a "+N more" chip. Clicking a peeking card brings it to the front.
 *
 * Each card animates to its new `top`/`scale` on reorder rather than jumping,
 * so bringing one forward reads as a physical shuffle. That only works if the
 * same DOM node persists across the reorder, which needs a key independent of
 * array position — `entry.key` is assigned once when the entry is created
 * (see `toEntry`), not derived during render.
 */
function DesignsItemsStack({
  category,
  entries,
  catalogueProducts,
  batteryOptions,
  onRemove,
  onBringToFront,
}: {
  category: EquipmentCategoryKey;
  entries: StackEntry[];
  catalogueProducts: BuilderProduct[];
  batteryOptions: BatteryOptions | null;
  onRemove: (index: number) => void;
  onBringToFront: (index: number) => void;
}) {
  if (entries.length === 0) return null;

  const MAX_PEEKS = 2;
  const orderedNewestFirst = entries
    .map((entry, index) => ({ entry, index }))
    .reverse();
  const visible = orderedNewestFirst.slice(0, 1 + MAX_PEEKS);
  const overflow = entries.length - visible.length;
  // Must clear the remove button on the card behind (size-5 = 20px + its
  // bottom-1.5 = 6px inset), or the card in front clips the button's top edge.
  const PEEK_OFFSET = 30;
  // 160 must match DesignsItemProductSummary's card height (h-[160px]).
  const stackHeight = 160 + (visible.length - 1) * PEEK_OFFSET;

  return (
    <div className="relative" style={{ height: stackHeight }}>
      {visible.map(({ entry, index }, stackPos) => {
        const isFront = stackPos === 0;
        const item = entry.item;
        const product = catalogueProducts.find((p) => p.id === item.productId);
        const { leftCol, rightCol } = itemToSummary(item, product, batteryOptions);
        return (
          <div
            key={entry.key}
            role={isFront ? undefined : "button"}
            tabIndex={isFront ? undefined : 0}
            onClick={isFront ? undefined : () => onBringToFront(index)}
            onKeyDown={
              isFront
                ? undefined
                : (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onBringToFront(index);
                    }
                  }
            }
            aria-label={isFront ? undefined : "Bring this item to the front"}
            className={classNames(
              "absolute inset-x-0 origin-top transition-[top,transform] duration-300 ease-out",
              !isFront && "cursor-pointer hover:brightness-105",
            )}
            style={{
              top: stackPos * PEEK_OFFSET,
              transform: `scale(${1 - stackPos * 0.02})`,
              zIndex: visible.length - stackPos,
            }}
          >
            <DesignsItemProductSummary
              category={category}
              leftCol={leftCol}
              rightCol={rightCol}
              onRemove={() => onRemove(index)}
              photoUrl={product ? productImage(product)?.thumbUrl : undefined}
            />
          </div>
        );
      })}
      {overflow > 0 ? (
        <span className="absolute -top-2 right-2 z-20 rounded-full bg-warm-black px-2 py-0.5 font-dm-sans text-[10px] font-bold text-white shadow-sm">
          +{overflow} more
        </span>
      ) : null}
    </div>
  );
}

function DesignsItemsGradientCard({
  category,
  firstSelectId,
  secondSelectId,
  draftBrand,
  draftSize,
  brandOptions,
  modelOptions,
  onBrandChange,
  onSizeChange,
  onAdd,
  entries,
  catalogueProducts,
  batteryOptions,
  secondPlaceholder = "Select Model",
  hint,
  onRemove,
  onBringToFront,
}: {
  category: EquipmentCategoryKey;
  batteryOptions: BatteryOptions | null;
  secondPlaceholder?: string;
  /** A line under the pickers (batteries: the inverters the picked size runs on). */
  hint?: string;
  firstSelectId: string;
  secondSelectId: string;
  draftBrand: string;
  draftSize: string;
  brandOptions: DesignsSelectOption[];
  modelOptions: DesignsSelectOption[];
  onBrandChange: (value: string) => void;
  onSizeChange: (value: string) => void;
  onAdd: () => void;
  entries: StackEntry[];
  catalogueProducts: BuilderProduct[];
  onRemove: (index: number) => void;
  onBringToFront: (index: number) => void;
}) {
  const title = SECTION_TITLE[category];

  return (
    <div className="relative z-10 h-full w-full min-w-0 overflow-hidden rounded-[24px] p-[3px] xl:rounded-[30px]">
      {/* Animated cycling border: an oversized spinning conic-gradient, clipped to a
          3px ring by the opaque card content covering everything but the padding gap. */}
      <span
        aria-hidden
        className="absolute inset-[-80%] motion-reduce:animate-none [animation:rainbow-trace-spin_5s_linear_infinite]"
        style={{
          backgroundImage:
            "conic-gradient(from 0deg, #FFEF62, #6BD6FF, #6BFF78, #BF61FF, #E7D95D, #FFEF62)",
        }}
      />
      <div className="relative z-20 flex h-full min-h-[300px] w-full shrink-0 flex-col rounded-[22px] bg-linear-to-r from-[#FFEF62] to-[#F78D00] xl:min-h-[353.565px] xl:rounded-[27px]">
        {entries.length > 0 ? (
          <span
            className="absolute right-3 top-3 z-30 rounded-full border border-[#FF7A1A]/60 bg-[#2a1000]/40 px-2 py-0.5 font-inter text-[11px] font-semibold text-[#FF7A1A]"
            style={{ textShadow: "0 0 8px rgba(255, 122, 26, 0.8)" }}
          >
            {entries.length} Selected
          </span>
        ) : null}
        <div className="flex w-full flex-col gap-[14px] px-4 pb-5 pt-5 xl:px-[20px] xl:pb-[22px] xl:pt-[20px]">
          <div className="flex w-full flex-col gap-[16px]">
            <div className="flex w-full flex-col items-center gap-2">
              <h2 className="text-center font-source-sans text-[19px] font-bold capitalize leading-normal tracking-[0.167px] text-white xl:text-[20px]">
                {title}
              </h2>
            </div>
            <div className="flex w-full flex-col gap-[8px]">
              <DesignsSelectField
                id={firstSelectId}
                ariaLabel={`${title}: select brand`}
                placeholder="Select Brand"
                value={draftBrand}
                onChange={onBrandChange}
                options={brandOptions}
              />
              <DesignsSelectField
                id={secondSelectId}
                ariaLabel={`${title}: select model`}
                placeholder={secondPlaceholder}
                value={draftSize}
                onChange={onSizeChange}
                options={modelOptions}
              />
              {hint ? (
                <p className="font-inter text-[12px] font-medium leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">{hint}</p>
              ) : null}
              <button
                type="button"
                onClick={onAdd}
                disabled={!draftSize}
                className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed border-white/70 px-2 py-2 text-center font-inter text-[13px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Add {title.replace("Select ", "")}
              </button>
            </div>
          </div>
          <DesignsItemsStack
            category={category}
            entries={entries}
            catalogueProducts={catalogueProducts}
            batteryOptions={batteryOptions}
            onRemove={onRemove}
            onBringToFront={onBringToFront}
          />
        </div>
      </div>
    </div>
  );
}

export type DesignsItemsStepValue = {
  items: EquipmentItemsByCategory;
};

export type DesignsItemsStepHandle = {
  getValues: () => DesignsItemsStepValue;
};

type Draft = { brand: string; size: string };

/** Under the battery pickers: the inverters the drafted size runs on, and whether its price is an estimate. */
function batteryHint(options: BatteryOptions | null, sizeId: string): string | undefined {
  const picked = isSizeId(sizeId) ? findSize(options, sizeId) : null;
  if (!picked) return undefined;
  const est = picked.size.priced === "estimate" ? " Price estimated from the range (no kit that exact size in our price list)." : "";
  return `Works with: ${picked.size.inverters.join("; ")}.${est}`;
}

const EMPTY_DRAFTS: Record<EquipmentCategoryKey, Draft> = {
  solarPanel: { brand: "", size: "" },
  inverter: { brand: "", size: "" },
  battery: { brand: "", size: "" },
  evCharger: { brand: "", size: "" },
  heatPump: { brand: "", size: "" },
};

/**
 * Figma Screen 18 (3:4410) — gradient cards, 45px gap, wrapping on desktop
 * now that there are five (was three, fixed side-by-side); inner padding
 * 28.98 / 25.98 per card is unchanged.
 */
export const DesignsItemsStepContent = forwardRef<
  DesignsItemsStepHandle,
  object
>(function DesignsItemsStepContent(_, ref) {
  // Seed from the store so editing an existing design shows its real equipment
  // instead of the placeholder specs. `legacyEquipmentToItems` also covers
  // designs saved before `items` existed (singular fields only).
  const dispatch = useAppDispatch();
  const storedEquipment = useAppSelector(
    (s) => s.designProposal.equipment,
  ) as DesignProposalEquipment;
  const groupedCatalogue = useAppSelector(selectBuilderCatalogue);
  /**
   * Batteries are picked by size (11 Nov 2026): brand, then one battery
   * system of that brand by usable kWh, modules and phase, from the makers'
   * datasheets, with the inverters it runs on. The home's supply (Energy
   * step) narrows the sizes; unknown shows both. The product catalogue's
   * battery models are the fallback when the size list can't load.
   */
  const supplyPhase = useAppSelector((s) => s.designProposal.customer.supplyPhase);
  const { options: batteryOptions } = useBatteryOptions();
  const bySize = Boolean(batteryOptions?.ranges.length);
  const [entriesByCategory, setEntriesByCategory] = useState<
    Record<EquipmentCategoryKey, StackEntry[]>
  >(() => {
    const seeded = legacyEquipmentToItems(storedEquipment);
    return Object.fromEntries(
      EQUIPMENT_CATEGORY_KEYS.map((key) => [key, seeded[key].map(toEntry)]),
    ) as Record<EquipmentCategoryKey, StackEntry[]>;
  });
  const [drafts, setDrafts] = useState<Record<EquipmentCategoryKey, Draft>>(
    EMPTY_DRAFTS,
  );

  /**
   * Keeps Redux in sync with every add/remove/reorder, not just on Next.
   * The wizard's Back button navigates away without calling `getValues()` the
   * way Next does, so without this, items added and then left via Back were
   * silently lost — the step remounts from stale Redux state next time.
   */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    dispatch(
      mergeProposalData({
        equipment: { items: entriesToItems(entriesByCategory) },
      }),
    );
  }, [dispatch, entriesByCategory]);

  const catalogue = useMemo(
    () =>
      Object.fromEntries(
        EQUIPMENT_CATEGORY_KEYS.map((key) => [
          key,
          groupedCatalogue[SECTION_CATEGORY[key]] ?? [],
        ]),
      ) as Record<EquipmentCategoryKey, BuilderProduct[]>,
    [groupedCatalogue],
  );

  useImperativeHandle(
    ref,
    () => ({
      getValues: () => ({ items: entriesToItems(entriesByCategory) }),
    }),
    [entriesByCategory],
  );

  /** Brand change clears the model draft: the previous model belongs to the old brand. */
  const handleBrandChange = (key: EquipmentCategoryKey, brand: string) => {
    setDrafts((prev) => ({ ...prev, [key]: { brand, size: "" } }));
  };

  const handleModelChange = (key: EquipmentCategoryKey, productId: string) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], size: productId } }));
  };

  /** Commits the draft into the category's list and resets the compose dropdowns. */
  const handleAdd = (key: EquipmentCategoryKey) => {
    const draft = drafts[key];
    const picked = key === "battery" ? findSize(batteryOptions, draft.size) : null;
    if (picked) {
      const sizeItem: EquipmentItem = {
        productId: picked.size.id,
        brand: picked.range.brand,
        name: `${picked.range.range} · ${sizeLayout(picked.size)}`,
        quantity: 1,
        ratingLabel: `${+picked.size.kwh.toFixed(2)} kWh`,
      };
      setEntriesByCategory((prev) => ({ ...prev, [key]: [...prev[key], toEntry(sizeItem)] }));
      setDrafts((prev) => ({ ...prev, [key]: { brand: "", size: "" } }));
      return;
    }
    const product = catalogue[key].find((p) => p.id === draft.size);
    if (!product) return;

    const newItem: EquipmentItem = {
      productId: product.id,
      brand: product.brand,
      name: product.name,
      quantity: 1,
      ratingLabel: ratingLabel(product),
    };

    setEntriesByCategory((prev) => ({
      ...prev,
      [key]: [...prev[key], toEntry(newItem)],
    }));
    setDrafts((prev) => ({ ...prev, [key]: { brand: "", size: "" } }));
  };

  const handleRemove = (key: EquipmentCategoryKey, index: number) => {
    setEntriesByCategory((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  /** "Front" is always the last array entry — moving one there is what surfaces it. */
  const handleBringToFront = (key: EquipmentCategoryKey, index: number) => {
    setEntriesByCategory((prev) => {
      const list = prev[key];
      const target = list[index];
      if (!target) return prev;
      const rest = list.filter((_, i) => i !== index);
      return { ...prev, [key]: [...rest, target] };
    });
  };

  const optionsFor = (key: EquipmentCategoryKey) => {
    const products = catalogue[key];
    const brand = drafts[key].brand;
    if (key === "battery" && bySize && batteryOptions) {
      return {
        brandOptions: batteryBrands(batteryOptions, supplyPhase).map((value) => ({ value, label: value })),
        modelOptions: brand ? brandSizeOptions(batteryOptions, brand, supplyPhase) : [],
      };
    }
    return {
      brandOptions: brandsOf(products).map((value) => ({
        value,
        label: value,
      })),
      modelOptions: modelsOf(products, brand).map((product) => ({
        value: product.id,
        label: product.name,
      })),
    };
  };

  return (
    <div className="relative isolate flex flex-1 flex-col">
      {/* Navy radial-gradient backdrop, scoped to this step only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-1 flex-col px-4 pt-8 sm:px-8 sm:pt-10 lg:px-[81px] lg:pt-[37px]">
        <div className="grid w-full grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
        {EQUIPMENT_CATEGORY_KEYS.map((key) => {
          const { brandOptions, modelOptions } = optionsFor(key);
          return (
            <DesignsItemsGradientCard
              key={key}
              category={key}
              firstSelectId={`items-${key}-brand`}
              secondSelectId={`items-${key}-size`}
              draftBrand={drafts[key].brand}
              draftSize={drafts[key].size}
              brandOptions={brandOptions}
              modelOptions={modelOptions}
              onBrandChange={(next) => handleBrandChange(key, next)}
              onSizeChange={(next) => handleModelChange(key, next)}
              onAdd={() => handleAdd(key)}
              entries={entriesByCategory[key]}
              catalogueProducts={catalogue[key]}
              batteryOptions={batteryOptions}
              secondPlaceholder={key === "battery" && bySize ? "Select Size" : "Select Model"}
              hint={key === "battery" ? batteryHint(batteryOptions, drafts.battery.size) : undefined}
              onRemove={(index) => handleRemove(key, index)}
              onBringToFront={(index) => handleBringToFront(key, index)}
            />
          );
        })}
        </div>
      </div>
    </div>
  );
});
