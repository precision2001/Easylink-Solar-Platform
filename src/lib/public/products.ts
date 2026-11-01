import type {
  DesignSummaryItem,
  SolarProduct,
  SolarProductCategory,
} from "@/components/customer/products/types";
import type {
  Product as CatalogProduct,
  ProductCategoryKey,
} from "@/components/pages/products/types";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

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
};

function normalizeCategory(category: string): SolarProductCategory {
  const normalized = category.toLowerCase();
  if (normalized.includes("inverter")) return "inverter";
  if (normalized.includes("battery")) return "battery";
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
    bestSeller: product.bestSeller ?? false,
  };
}

export async function fetchPublicProducts(): Promise<SolarProduct[]> {
  const res = await fetch("/api/products?limit=24&active=true&bestSeller=true", {
    cache: "no-store",
  });
  const json = (await res.json()) as ApiEnvelope<BackendProduct[]>;
  if (!res.ok) throw new Error(json.message || "Failed to load products");
  return Array.isArray(json.data) ? json.data.map(toSolarProduct) : [];
}

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
    case "heat-pumps":
      // No comparable kW rating captured for heat pumps yet — band filters
      // for this category won't match anything until that data exists.
      return 0;
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
    inStock: row.active,
    features: catalogFeatures(row),
    price: row.retailPrice ?? row.basePrice,
  };
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
}): Promise<CatalogPage> {
  const sp = new URLSearchParams();
  sp.set("category", CATALOG_CATEGORY_TO_BACKEND[params.categoryKey]);
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? 12));
  sp.set("active", "true");
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

export function selectedDesignProductsFromCatalog(products: SolarProduct[]): DesignSummaryItem[] {
  return products.slice(0, 2).map((product) => ({
    id: product.id,
    name: product.name,
    detail: product.category === "panel" ? "Panel" : product.category === "inverter" ? "Inverter" : "Battery",
    icon: product.category === "panel" ? "sun" : "cpu",
  }));
}
