/**
 * Product catalogue for the design builder.
 *
 * The builder needs real product ids so the selection can be written as
 * DesignProduct rows — without them a custom design has no equipment, which is
 * why its equipment cards used to read N/A while a package's showed real kit.
 */
export type BuilderProductCategory =
  | "Solar Panel"
  | "Inverter"
  | "Battery"
  | "EV Charger"
  | "Heat Pump";

export type BuilderProduct = {
  id: string;
  name: string;
  brand: string;
  category: BuilderProductCategory;
  /** Watts for panels; inverters carry kW in specs instead. */
  wattage: number | null;
  price: number;
  specs?: unknown;
};

type BackendProduct = {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  wattage?: number | null;
  price?: number | null;
  specs?: unknown;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const UNKNOWN_BRAND = "Other";

function toBuilderProduct(
  product: BackendProduct,
  category: BuilderProductCategory,
): BuilderProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand?.trim() || UNKNOWN_BRAND,
    category,
    wattage: product.wattage ?? null,
    price: product.price ?? 0,
    ...(product.specs !== undefined ? { specs: product.specs } : {}),
  };
}

export const BUILDER_CATEGORIES: readonly BuilderProductCategory[] = [
  "Solar Panel",
  "Inverter",
  "Battery",
  "EV Charger",
  "Heat Pump",
] as const;

export type BuilderCatalogue = Record<
  BuilderProductCategory,
  BuilderProduct[]
>;

export const EMPTY_CATALOGUE: BuilderCatalogue = {
  "Solar Panel": [],
  Inverter: [],
  Battery: [],
  "EV Charger": [],
  "Heat Pump": [],
};

/**
 * Every dropdown's options in **one** request.
 *
 * The builder used to fetch per category, which meant three round trips for a
 * single step. `/products/equipment-options` returns them grouped and trimmed
 * to the fields the dropdowns and spec rows read.
 */
export async function fetchBuilderCatalogue(
  /**
   * Products that must appear in the options even if they fall outside the
   * per-category cap — pass the design's current equipment, otherwise its
   * dropdowns cannot show what is already selected.
   */
  includeIds: readonly string[] = [],
): Promise<BuilderCatalogue> {
  // 200 is the backend's maximum; the EasyLink catalogue has 100+ inverters.
  const params = new URLSearchParams({ perCategory: "200" });
  const ids = includeIds.filter(Boolean);
  if (ids.length > 0) params.set("ids", ids.join(","));

  const res = await fetch(`/api/products/equipment-options?${params}`, {
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<
    Record<string, BackendProduct[]>
  >;

  if (!res.ok) {
    throw new Error(json.message || "Could not load equipment options");
  }

  const grouped = json.data ?? {};

  return BUILDER_CATEGORIES.reduce<BuilderCatalogue>(
    (accumulator, category) => {
      const rows = grouped[category];
      accumulator[category] = Array.isArray(rows)
        ? rows.map((product) => toBuilderProduct(product, category))
        : [];
      return accumulator;
    },
    { ...EMPTY_CATALOGUE },
  );
}

/** Distinct brands, alphabetical, for the first dropdown. */
export function brandsOf(products: readonly BuilderProduct[]): string[] {
  return [...new Set(products.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Models for one brand, for the second dropdown. */
export function modelsOf(
  products: readonly BuilderProduct[],
  brand: string,
): BuilderProduct[] {
  return products
    .filter((p) => p.brand === brand)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function builderProductLabel(product: BuilderProduct): string {
  return `${product.brand} ${product.name}`;
}
