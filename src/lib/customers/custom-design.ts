import { shownBatteryItems } from "@/lib/proposal/batteryOptions";
import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";
import type { CustomerDesign, CustomerDesignProduct } from "@/lib/customers/designs";
import {
  EQUIPMENT_CATEGORY_KEYS,
  emptyEquipmentItems,
  type DesignProposalPayload,
  type DesignProposalState,
  type EquipmentCategoryKey,
  type EquipmentItem,
  type EquipmentItemsByCategory,
} from "@/lib/store/designProposalSlice";
import {
  batteryCapacityKwh,
  inverterRatedKw,
  numberSpec,
  productLabel,
  productsByCategory,
  systemSizeKwFrom,
} from "@/lib/designs/product-specs";

/** design.products' category substring for each equipment category key. */
const CATEGORY_SUBSTRING: Record<EquipmentCategoryKey, string> = {
  solarPanel: "panel",
  inverter: "inverter",
  battery: "battery",
  evCharger: "ev charger",
  heatPump: "heat pump",
};

/** Mirrors the items step's ratingLabel(), but for a saved design's attached products. */
function ratingLabelFor(
  item: CustomerDesignProduct,
  category: EquipmentCategoryKey,
): string {
  if (category === "solarPanel") {
    return item.product?.wattage ? `${item.product.wattage} W` : "—";
  }
  if (category === "battery") {
    const kwh = batteryCapacityKwh(item);
    return kwh !== undefined ? `${kwh} kWh` : "—";
  }
  if (category === "heatPump") {
    const litres = numberSpec(item.product, "capacityL");
    return litres !== undefined ? `${litres} L` : "—";
  }
  const kw = inverterRatedKw(item);
  return kw !== undefined ? `${kw} kW` : "—";
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

/** Wizard fields are display strings ("6.6 kW", "$11,200"); the API takes numbers. */
function toNumber(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveInt(value: string | undefined | null): number | undefined {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  const rounded = Math.round(parsed);
  return rounded > 0 ? rounded : undefined;
}

export type SaveCustomDesignInput = {
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  roofArea?: number;
  annualSunlight?: number;
  panelCount?: number;
  estimatedSavings?: number;
  wizardData?: unknown;
  solarData?: unknown;
  /** Replaces the design's equipment when present. */
  products?: { productId: string; quantity: number }[];
};

/**
 * The catalogue selections, as DesignProduct rows — every item across every
 * category, not just one per category.
 *
 * Returns undefined when nothing was picked, so a save cannot wipe equipment
 * the installer attached just because the builder had no selection.
 */
export function proposalProducts(
  proposal: DesignProposalState,
): SaveCustomDesignInput["products"] | undefined {
  const panelCount = toPositiveInt(proposal.equipment.numberOfPanels);

  const picks = Object.entries(proposal.equipment.items).flatMap(
    ([category, all]) =>
      // Picked batteries are options of their own: the design keeps the shown one.
      (category === "battery" ? shownBatteryItems(proposal.equipment) : all).map((item, _i, entries) => ({
        productId: item.productId,
        // The panel count from the roof-layout step is more authoritative
        // than a manually-added quantity for the first solar panel entry.
        quantity:
          category === "solarPanel" && entries[0] === item && panelCount
            ? panelCount
            : Math.max(item.quantity, 1),
      })),
  );

  return picks.length > 0 ? picks : undefined;
}

/**
 * Maps the wizard's Redux state onto the Design columns.
 *
 * The full proposal state also rides along in `wizardData` so the builder can
 * be rehydrated exactly, including the roof outline and generated panel layout
 * which have no column of their own.
 */
export function proposalToDesignInput(
  proposal: DesignProposalState,
): SaveCustomDesignInput {
  const monthlySavings = toNumber(proposal.pricing.monthlySavings);
  const yearlySavings = toNumber(proposal.summary.yearlySavings);

  return {
    title: proposal.summary.systemSize
      ? `Custom design — ${proposal.summary.systemSize}`
      : "My custom design",
    ...(proposal.customer.address ? { address: proposal.customer.address } : {}),
    ...(proposal.customer.mapLat != null
      ? { latitude: proposal.customer.mapLat }
      : {}),
    ...(proposal.customer.mapLng != null
      ? { longitude: proposal.customer.mapLng }
      : {}),
    ...(proposal.solarDesign?.polygonTotalAreaM2
      ? { roofArea: proposal.solarDesign.polygonTotalAreaM2 }
      : {}),
    ...(toPositiveInt(proposal.equipment.numberOfPanels) != null
      ? { panelCount: toPositiveInt(proposal.equipment.numberOfPanels) }
      : {}),
    // Prefer the explicit yearly figure; fall back to annualising the monthly one.
    ...(yearlySavings != null
      ? { estimatedSavings: yearlySavings }
      : monthlySavings != null
        ? { estimatedSavings: monthlySavings * 12 }
        : {}),
    ...(proposalProducts(proposal)
      ? { products: proposalProducts(proposal) }
      : {}),
    wizardData: proposal,
  };
}

function currency(value: number | null | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function productFor(design: CustomerDesign, category: string) {
  return productsByCategory(design.products, category)[0];
}

/** Every attached product, grouped into the five equipment categories. */
function itemsFromDesign(design: CustomerDesign): EquipmentItemsByCategory {
  const items = emptyEquipmentItems();
  for (const key of EQUIPMENT_CATEGORY_KEYS) {
    const matches = productsByCategory(design.products, CATEGORY_SUBSTRING[key]);
    items[key] = matches
      .filter((item): item is CustomerDesignProduct & { product: NonNullable<CustomerDesignProduct["product"]> } =>
        Boolean(item.product),
      )
      .map(
        (item): EquipmentItem => ({
          productId: item.product.id,
          brand: item.product.brand ?? "",
          name: item.product.name,
          quantity: item.quantity,
          ratingLabel: ratingLabelFor(item, key),
        }),
      );
  }
  return items;
}

/**
 * Builds wizard state from the design's own columns, products and owner.
 *
 * This is what makes "update" mode show real data even for designs the builder
 * never created — a materialised package or an installer-authored design has no
 * `wizardData` at all, so deriving from columns is the only way to prefill it.
 */
function derivedFromDesign(design: CustomerDesign): DesignProposalPayload {
  const panel = productFor(design, "panel");
  const inverter = productFor(design, "inverter");
  const battery = productFor(design, "battery");

  const kw = systemSizeKwFrom(panel, design.panelCount);
  const batteryKwh = batteryCapacityKwh(battery);
  const inverterKw = inverterRatedKw(inverter);
  const equipmentCost =
    design.products?.reduce((total, item) => total + (item.totalPrice ?? 0), 0) ??
    0;

  const owner = design.user;
  const fullName = `${owner?.firstName ?? ""} ${owner?.lastName ?? ""}`.trim();

  return {
    customer: {
      ...(fullName ? { name: fullName } : {}),
      ...(owner?.email ? { email: owner.email } : {}),
      ...(owner?.phone ? { phoneNumber: owner.phone } : {}),
      // The design's address is the installation site; the account address is
      // only a fallback for a design that has none yet.
      ...(design.address?.trim()
        ? { address: design.address.trim() }
        : owner?.address
          ? { address: owner.address }
          : {}),
      ...(design.latitude != null ? { mapLat: design.latitude } : {}),
      ...(design.longitude != null ? { mapLng: design.longitude } : {}),
    },
    summary: {
      ...(kw ? { systemSize: `${kw.toFixed(1)} kW` } : {}),
      ...(design.panelCount != null
        ? { totalPanels: String(design.panelCount) }
        : {}),
      ...(currency(design.estimatedSavings)
        ? { yearlySavings: currency(design.estimatedSavings)! }
        : {}),
      ...(design.estimatedSavings && equipmentCost
        ? { payback: `${(equipmentCost / design.estimatedSavings).toFixed(1)} yrs` }
        : {}),
    },
    equipment: {
      ...(productLabel(panel) ? { solarPanelName: productLabel(panel)! } : {}),
      ...(panel?.product?.wattage
        ? { solarPanelWatts: `${panel.product.wattage} W` }
        : {}),
      ...(productLabel(inverter)
        ? { inverterName: productLabel(inverter)! }
        : {}),
      ...(inverterKw !== undefined
        ? { inverterWatts: `${inverterKw} kW` }
        : {}),
      ...(productLabel(battery) ? { batteryName: productLabel(battery)! } : {}),
      ...(batteryKwh !== undefined
        ? { batteryWatts: `${batteryKwh} kWh` }
        : {}),
      ...(design.panelCount != null
        ? { numberOfPanels: String(design.panelCount) }
        : {}),
      items: itemsFromDesign(design),
    },
    pricing: {
      ...(equipmentCost ? { totalSystemPrice: currency(equipmentCost)! } : {}),
      ...(design.estimatedSavings
        ? { monthlySavings: currency(design.estimatedSavings / 12)! }
        : {}),
    },
  };
}

/**
 * Rebuilds wizard state for editing an existing design.
 *
 * Precedence is deliberate: **the stored snapshot fills gaps, the design's own
 * record wins.** `derivedFromDesign` omits keys it cannot source, so spreading
 * it last means real products and columns override a stale `wizardData` while
 * still falling back to it where the design has nothing — which is the case for
 * a custom design whose equipment only ever lived in the wizard.
 *
 * That ordering matters: a saved snapshot can disagree with the attached
 * products (the builder's brand dropdowns are a fixed short list), and the
 * products are what both design pages and the installer render.
 *
 * `solarDesign` is snapshot-only — the roof outline and generated panel layout
 * have no columns to derive from.
 */
export function designToProposalPayload(
  design: CustomerDesign,
): DesignProposalPayload | null {
  const derived = derivedFromDesign(design);
  const stored = design.wizardData as DesignProposalState | null | undefined;

  if (!stored || typeof stored !== "object") return derived;

  return {
    summary: { ...stored.summary, ...derived.summary },
    equipment: { ...stored.equipment, ...derived.equipment },
    pricing: { ...stored.pricing, ...derived.pricing },
    customer: { ...stored.customer, ...derived.customer },
    ...(stored.solarDesign !== undefined
      ? { solarDesign: stored.solarDesign }
      : {}),
  };
}

/** One of the customer's designs by id, for editing it in the builder. */
export async function fetchDesignById(
  designId: string,
): Promise<CustomerDesign | null> {
  const res = await fetchWithCustomerSession(
    `/api/customers/designs/${encodeURIComponent(designId)}`,
  );
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<CustomerDesign>;
  if (!res.ok) {
    throw new Error(json.message || "Could not load this design");
  }
  return json.data ?? null;
}

/** Saves the builder output back to a specific design. */
export async function saveBuilderDesign(
  designId: string,
  input: SaveCustomDesignInput,
): Promise<CustomerDesign> {
  const res = await fetchWithCustomerSession(
    `/api/customers/designs/${encodeURIComponent(designId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<CustomerDesign>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Could not save your design");
  }
  return json.data;
}

export async function fetchCustomDesign(): Promise<CustomerDesign | null> {
  const res = await fetchWithCustomerSession("/api/customers/custom-design");
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<CustomerDesign | null>;
  if (!res.ok) {
    throw new Error(json.message || "Could not load your custom design");
  }
  return json.data ?? null;
}

export async function saveCustomDesign(
  input: SaveCustomDesignInput,
): Promise<CustomerDesign> {
  const res = await fetchWithCustomerSession("/api/customers/custom-design", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<CustomerDesign>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Could not save your design");
  }
  return json.data;
}
