/**
 * Readers for `Product.specs`, shared by the customer design page and the
 * installer home dashboard so both describe the same equipment identically.
 *
 * Every reader returns undefined when the value is genuinely absent. Callers
 * render "N/A" or "—" from that — nothing here invents a default, because a
 * fabricated spec is indistinguishable from a real one once it reaches the UI.
 */
export const NOT_AVAILABLE = "N/A";
export const NO_VALUE = "—";

type SpecRecord = Record<string, unknown>;

export type SpecProduct = {
  name: string;
  brand?: string | null;
  category: string;
  wattage?: number | null;
  sku?: string | null;
  imageUrl?: string | null;
  specs?: unknown;
} | null | undefined;

export type SpecLineItem = {
  quantity: number;
  product?: SpecProduct;
} | null | undefined;

function specsOf(product: SpecProduct): SpecRecord | undefined {
  const specs = product?.specs;
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    return undefined;
  }
  return specs as SpecRecord;
}

export function numberSpec(product: SpecProduct, key: string): number | undefined {
  const value = specsOf(product)?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function stringSpec(product: SpecProduct, key: string): string | undefined {
  const value = specsOf(product)?.[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function booleanSpec(product: SpecProduct, key: string): boolean | undefined {
  const value = specsOf(product)?.[key];
  return typeof value === "boolean" ? value : undefined;
}

/** "Brand Model", or undefined when nothing is attached for the category. */
export function productLabel(item: SpecLineItem): string | undefined {
  const product = item?.product;
  if (!product) return undefined;
  return product.brand ? `${product.brand} ${product.name}` : product.name;
}

export type ProductImage = { url: string; thumbUrl: string };

/**
 * The product's photo from the image library (specs.image: compressed WebP in
 * S3, with a 400 px thumbnail), falling back to a bare imageUrl. Undefined when
 * the product has no photo — callers keep their own placeholder for that.
 */
export function productImage(product: SpecProduct): ProductImage | undefined {
  const image = specsOf(product)?.image;
  if (image && typeof image === "object" && !Array.isArray(image)) {
    const { url, thumbUrl } = image as Record<string, unknown>;
    if (typeof url === "string" && url.startsWith("http")) {
      return {
        url,
        thumbUrl: typeof thumbUrl === "string" && thumbUrl.startsWith("http") ? thumbUrl : url,
      };
    }
  }
  const fallback = product?.imageUrl;
  if (typeof fallback === "string" && fallback.startsWith("http")) {
    return { url: fallback, thumbUrl: fallback };
  }
  return undefined;
}

export function productType(item: SpecLineItem): string | undefined {
  return stringSpec(item?.product, "type");
}

/** Usable capacity is the meaningful figure; nominal is the fallback. */
export function batteryCapacityKwh(item: SpecLineItem): number | undefined {
  const product = item?.product;
  if (!product) return undefined;
  const perUnit =
    numberSpec(product, "usableCapacityKwh") ??
    numberSpec(product, "nominalCapacityKwh");
  if (perUnit === undefined) return undefined;
  return perUnit * Math.max(item?.quantity ?? 1, 1);
}

export function inverterRatedKw(item: SpecLineItem): number | undefined {
  const product = item?.product;
  if (!product) return undefined;
  const rated = numberSpec(product, "ratedKw");
  if (rated !== undefined) return rated;
  // Inverters carry kW in specs; wattage is only populated for panels.
  return product.wattage ? product.wattage / 1000 : undefined;
}

export function cecApprovedLabel(item: SpecLineItem): string | undefined {
  const approved = booleanSpec(item?.product, "cecApproved");
  if (approved === undefined) return undefined;
  return approved ? "Yes" : "No";
}

export function productSeries(item: SpecLineItem): string | undefined {
  return stringSpec(item?.product, "series");
}

/**
 * System size from the panels actually attached. Returns undefined when either
 * the panel product or its wattage is missing, rather than assuming a wattage —
 * an assumed figure would silently misstate the size of the system.
 */
/** Every item in `items` whose product's category matches (case-insensitive substring). */
export function productsByCategory<T extends { product?: SpecProduct }>(
  items: T[] | null | undefined,
  category: string,
): T[] {
  return (items ?? []).filter((item) =>
    item?.product?.category.toLowerCase().includes(category),
  );
}

export function systemSizeKwFrom(
  panelItem: SpecLineItem,
  panelCount: number | null | undefined,
): number | undefined {
  const wattage = panelItem?.product?.wattage;
  if (!wattage) return undefined;

  const count = panelCount ?? panelItem?.quantity;
  if (!count || count <= 0) return undefined;

  return (count * wattage) / 1000;
}

/** STC rules stop crediting a system once panel DC exceeds this much of inverter AC. */
export const STC_PANEL_INVERTER_LIMIT_PCT = 133;

export type PanelInverterRatio = {
  pct: number;
  overLimit: boolean;
  /** Largest panel count that still sits inside the limit. */
  maxPanels: number;
  message: string;
};

/**
 * Panel-to-inverter ratio against the STC limit. Oversizing panels past it
 * costs the customer their rebate, so the design card warns before a quote
 * goes out. Returns undefined when either side is unknown — an assumed
 * wattage or inverter rating would give a confidently wrong verdict.
 */
export function panelInverterRatio(
  panelItem: SpecLineItem,
  inverterItem: SpecLineItem,
  panelCount: number | null | undefined,
): PanelInverterRatio | undefined {
  const panelKw = systemSizeKwFrom(panelItem, panelCount);
  const inverterKw = inverterRatedKw(inverterItem);
  const wattage = panelItem?.product?.wattage;
  if (!panelKw || !inverterKw || !wattage) return undefined;

  const pct = Math.round((panelKw / inverterKw) * 100);
  const overLimit = pct > STC_PANEL_INVERTER_LIMIT_PCT;
  const maxPanels = Math.floor(
    (inverterKw * (STC_PANEL_INVERTER_LIMIT_PCT / 100) * 1000) / wattage,
  );

  return {
    pct,
    overLimit,
    maxPanels,
    message: overLimit
      ? `Panels are ${pct}% of inverter size. STC rules allow up to ${STC_PANEL_INVERTER_LIMIT_PCT}%, so reduce to ${maxPanels} panels or use a larger inverter.`
      : `Panel-to-inverter ratio is within the ${STC_PANEL_INVERTER_LIMIT_PCT}% STC limit.`,
  };
}
