import type {
  DesignSummaryItem,
  SolarProduct,
  SolarProductCategory,
} from "@/components/customer/products/types";
import { productImage } from "@/lib/designs/product-specs";
import type {
  Product as CatalogProduct,
  ProductCategoryKey,
} from "@/components/pages/products/types";

type BackendProduct = {
  id: string;
  name: string;
  category: string;
  basePrice?: number;
  retailPrice?: number | null;
  wholesalePrice?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  bestSeller?: boolean | null;
  brand?: string | null;
  imageUrl?: string | null;
  specs?: Record<string, unknown> | null;
};

function normalizeCategory(category: string): SolarProductCategory {
  const normalized = category.toLowerCase();
  if (normalized.includes("inverter")) return "inverter";
  if (normalized.includes("battery")) return "battery";
  if (normalized.includes("ev")) return "ev-charger";
  if (normalized.includes("heat")) return "heat-pump";
  if (normalized.includes("portable")) return "portable-power";
  return "panel";
}

function formatPrice(value?: number | null) {
  if (!value) return "Price on request";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toSolarProduct(product: BackendProduct): SolarProduct {
  return {
    id: product.id,
    category: normalizeCategory(product.category),
    name: product.name,
    rating: product.rating ?? 4.7,
    reviewCount: product.reviewCount ?? 0,
    price: formatPrice(product.retailPrice ?? product.basePrice),
    priceValue: product.retailPrice ?? product.basePrice,
    bestSeller: product.bestSeller ?? false,
    imageUrl: productImage(product)?.thumbUrl,
    brand: product.brand?.trim() || undefined,
  };
}

/** A product row as the public /products API returns it. */
export type PublicProductRow = BackendProduct & {
  category: string;
  wattage?: number | null;
  sku?: string | null;
};

/**
 * Every active product in the catalogue, all categories. The API pages at
 * 100 rows, so this walks the pages (the catalogue is a few hundred rows).
 */
export async function fetchAllActiveProductRows(): Promise<PublicProductRow[]> {
  const rows: PublicProductRow[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`/api/products?limit=100&page=${page}&active=true`, {
      cache: "no-store",
    });
    const json = (await res.json()) as CatalogApiEnvelope<PublicProductRow[]>;
    if (!res.ok) throw new Error(json.message || "Failed to load products");
    const batch = Array.isArray(json.data) ? json.data : [];
    rows.push(...batch);
    const totalPages = json.meta?.pagination?.totalPages ?? 1;
    if (batch.length === 0 || page >= totalPages) break;
  }
  return rows;
}

/** Every active product for the customer portal; best sellers first, then category and name. */
export async function fetchPublicProducts(): Promise<SolarProduct[]> {
  const rows = await fetchAllActiveProductRows();
  return rows
    .map(toSolarProduct)
    .sort(
      (a, b) =>
        Number(b.bestSeller ?? false) - Number(a.bestSeller ?? false) ||
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.name.localeCompare(b.name),
    );
}

const CATEGORY_ORDER: SolarProductCategory[] = [
  "panel",
  "inverter",
  "battery",
  "ev-charger",
  "heat-pump",
  "portable-power",
];

// ---------------------------------------------------------------------------
// /products (the full "Build Your System" catalog page) — richer product
// shape than the SolarProduct summary above, backed by the same real
// backend Product rows.
// ---------------------------------------------------------------------------

type CatalogApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: { pagination?: { page: number; limit: number; total: number; totalPages: number } };
};

type BackendCatalogRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  wattage: number | null;
  basePrice: number;
  sku: string | null;
  retailPrice: number | null;
  wholesalePrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  bestSeller: boolean | null;
  imageUrl: string | null;
  active: boolean;
  specs: Record<string, unknown> | null;
};

export const CATALOG_CATEGORY_TO_BACKEND: Record<ProductCategoryKey, string> = {
  batteries: "Battery",
  "solar-panels": "Solar Panel",
  inverters: "Inverter",
  "ev-chargers": "EV Charger",
  "heat-pumps": "Heat Pump",
  "portable-power": "Portable Power",
};

function catalogSpecValue(categoryKey: ProductCategoryKey, row: BackendCatalogRow): number {
  const specs = row.specs ?? {};
  switch (categoryKey) {
    case "solar-panels":
      return row.wattage ?? 0;
    case "inverters":
      return typeof specs.ratedKw === "number"
        ? specs.ratedKw
        : row.wattage != null
          ? row.wattage / 1000
          : 0;
    case "batteries":
      return typeof specs.usableCapacityKwh === "number"
        ? specs.usableCapacityKwh
        : typeof specs.nominalCapacityKwh === "number"
          ? specs.nominalCapacityKwh
          : 0;
    case "ev-chargers":
      return typeof specs.ratedKw === "number" ? specs.ratedKw : 0;
    case "portable-power":
      return typeof specs.capacityKwh === "number" ? specs.capacityKwh : 0;
    case "heat-pumps":
      // Heating capacity in kW, when the catalogue has it.
      return typeof specs.heatingKw === "number" ? specs.heatingKw : 0;
    default:
      return 0;
  }
}

function catalogFeatures(row: BackendCatalogRow): string[] {
  const specs = row.specs ?? {};
  const features: string[] = [];
  if (specs.cecApproved) features.push("CEC approved");
  if (typeof specs.connector === "string") features.push(`${specs.connector} connector`);
  if (typeof specs.cop === "number") features.push(`COP ${specs.cop}`);
  if (typeof specs.capacityL === "number") features.push(`${specs.capacityL}L tank`);
  if (typeof specs.series === "string" && specs.series !== "NA") features.push(specs.series);
  return features.slice(0, 3);
}

function toCatalogProduct(
  categoryKey: ProductCategoryKey,
  row: BackendCatalogRow,
): CatalogProduct {
  const specs = row.specs ?? {};
  return {
    id: row.id,
    categoryKey,
    segment: "residential",
    specValue: catalogSpecValue(categoryKey, row),
    badge: row.bestSeller ? "Best Seller" : undefined,
    brand: row.brand?.trim() || "Unbranded",
    name: row.name,
    model: row.sku || (typeof specs.series === "string" ? specs.series : row.name),
    rating: row.rating ?? 0,
    hasDatasheet: typeof specs.datasheetUrl === "string" && specs.datasheetUrl.startsWith("http"),
    datasheetUrl:
      typeof specs.datasheetUrl === "string" && specs.datasheetUrl.startsWith("http")
        ? specs.datasheetUrl
        : undefined,
    imageUrl: productImage(row)?.url,
    imageThumbUrl: productImage(row)?.thumbUrl,
    inStock: row.active,
    features: catalogFeatures(row),
    price: row.retailPrice ?? row.basePrice,
    cecApproved: specs.cecApproved === true,
    priceEstimate: specs.priceEstimate === true,
  };
}

/**
 * Every active product in one category, mapped for the /products page. The
 * curated catalogue is at most a couple of hundred rows per category, so the
 * page filters, sorts and paginates on the client for instant results.
 */
export async function fetchCategoryCatalog(
  categoryKey: ProductCategoryKey,
): Promise<CatalogProduct[]> {
  const rows: BackendCatalogRow[] = [];
  for (let page = 1; page <= 10; page++) {
    const sp = new URLSearchParams({
      category: CATALOG_CATEGORY_TO_BACKEND[categoryKey],
      page: String(page),
      limit: "100",
      active: "true",
    });
    const res = await fetch(`/api/products?${sp}`, { cache: "no-store" });
    const json = (await res.json()) as CatalogApiEnvelope<BackendCatalogRow[]>;
    if (!res.ok) throw new Error(json.message || "Failed to load products");
    const batch = Array.isArray(json.data) ? json.data : [];
    rows.push(...batch);
    if (batch.length === 0 || page >= (json.meta?.pagination?.totalPages ?? 1)) break;
  }
  return rows.map((row) => toCatalogProduct(categoryKey, row));
}

export type CatalogPage = {
  products: CatalogProduct[];
  total: number;
  totalPages: number;
  page: number;
};

/**
 * One page of one category's real product catalog, mapped into the
 * /products display shape. Backed by the backend's own page/limit/search —
 * categories run to thousands of rows, so this must stay a real server-side
 * page, not a client-side slice of some larger pre-fetched batch.
 */
export async function fetchCatalogProducts(params: {
  categoryKey: ProductCategoryKey;
  page?: number;
  limit?: number;
  search?: string;
  /** Exact brand to show; matched server-side (case-insensitive). */
  brand?: string;
}): Promise<CatalogPage> {
  const sp = new URLSearchParams();
  sp.set("category", CATALOG_CATEGORY_TO_BACKEND[params.categoryKey]);
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 12));
  sp.set("active", "true");
  if (params.brand?.trim()) sp.set("brand", params.brand.trim());
  if (params.search?.trim()) sp.set("search", params.search.trim());

  const res = await fetch(`/api/products?${sp.toString()}`, { cache: "no-store" });
  const json = (await res.json()) as CatalogApiEnvelope<BackendCatalogRow[]>;
  if (!res.ok) throw new Error(json.message || "Failed to load products");

  const rows = Array.isArray(json.data) ? json.data : [];
  const pagination = json.meta?.pagination;
  return {
    products: rows.map((row) => toCatalogProduct(params.categoryKey, row)),
    total: pagination?.total ?? rows.length,
    totalPages: pagination?.totalPages ?? 1,
    page: pagination?.page ?? params.page ?? 1,
  };
}

const CUSTOMER_CATEGORY_LABEL: Record<SolarProductCategory, string> = {
  panel: "Panel",
  inverter: "Inverter",
  battery: "Battery",
  "ev-charger": "EV charger",
  "heat-pump": "Heat pump",
  "portable-power": "Portable power",
};

export function selectedDesignProductsFromCatalog(products: SolarProduct[]): DesignSummaryItem[] {
  return products.slice(0, 2).map((product) => ({
    id: product.id,
    name: product.name,
    detail: CUSTOMER_CATEGORY_LABEL[product.category],
    icon: product.category === "panel" ? "sun" : "cpu",
  }));
}

// ---------------------------------------------------------------------------
// Brand index for the /products menus — every active product's brand and
// headline spec value, per category, from one request.
// ---------------------------------------------------------------------------

export type CatalogIndexEntry = { brand: string; specValue: number };
export type CatalogIndex = Record<ProductCategoryKey, CatalogIndexEntry[]>;

export type BrandCount = { brand: string; count: number };

/** Brands in a category, most products first, then A–Z. */
export function brandCounts(entries: CatalogIndexEntry[] | undefined): BrandCount[] {
  const counts = new Map<string, number>();
  for (const { brand } of entries ?? []) counts.set(brand, (counts.get(brand) ?? 0) + 1);
  return Array.from(counts, ([brand, count]) => ({ brand, count })).sort(
    (a, b) => b.count - a.count || a.brand.localeCompare(b.brand),
  );
}

export async function fetchCatalogIndex(): Promise<CatalogIndex> {
  const res = await fetch("/api/products/equipment-options?perCategory=200", {
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as CatalogApiEnvelope<
    Record<string, BackendCatalogRow[]>
  >;
  if (!res.ok) throw new Error(json.message || "Could not load brands");
  const grouped = json.data ?? {};
  const index = {} as CatalogIndex;
  for (const [categoryKey, backendCategory] of Object.entries(
    CATALOG_CATEGORY_TO_BACKEND,
  ) as [ProductCategoryKey, string][]) {
    const rows = Array.isArray(grouped[backendCategory]) ? grouped[backendCategory] : [];
    index[categoryKey] = rows.map((row) => ({
      brand: row.brand?.trim() || "Unbranded",
      specValue: catalogSpecValue(categoryKey, row),
    }));
  }
  return index;
}
