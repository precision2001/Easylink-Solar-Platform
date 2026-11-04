import type { SolarProductCategory } from "@/components/customer/products/types";
import type { CustomerDesign } from "@/lib/customers/designs";
import {
  batteryCapacityKwh,
  numberSpec,
  productImage,
  productsByCategory,
  systemSizeKwFrom,
  type SpecProduct,
} from "@/lib/designs/product-specs";

/**
 * The customer portal shop: catalogue rows (and the customer's own design
 * lines) mapped to what a product card shows. Pure, and every figure comes
 * from the product's own data; nothing is filled in when it is missing.
 */

export type ShopCategory = SolarProductCategory;

export const SHOP_CATEGORY_ORDER: ShopCategory[] = ["panel", "inverter", "battery", "ev-charger", "heat-pump", "portable-power"];

export const SHOP_CATEGORY_LABEL: Record<ShopCategory, { one: string; many: string }> = {
  panel: { one: "Solar panel", many: "Solar panels" },
  inverter: { one: "Inverter", many: "Inverters" },
  battery: { one: "Battery", many: "Batteries" },
  "ev-charger": { one: "EV charger", many: "EV chargers" },
  "heat-pump": { one: "Heat pump", many: "Heat pumps" },
  "portable-power": { one: "Portable power", many: "Portable power" },
};

/** Backend category text ("Solar Panel", "EV Charger", "SOLAR_PANEL") to a shop category. */
export function shopCategory(category: string | null | undefined): ShopCategory {
  const c = (category ?? "").toLowerCase();
  if (c.includes("inverter")) return "inverter";
  if (c.includes("batter")) return "battery";
  if (/\bev\b|ev[-_ ]?charger|charger/.test(c)) return "ev-charger";
  if (c.includes("heat")) return "heat-pump";
  if (c.includes("portable")) return "portable-power";
  return "panel";
}

/** Any product-like row: a catalogue row or a design line's product. */
export type ShopSource = {
  id: string;
  name: string;
  category: string;
  brand?: string | null;
  wattage?: number | null;
  sku?: string | null;
  imageUrl?: string | null;
  specs?: unknown;
  retailPrice?: number | null;
  basePrice?: number | null;
  price?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  bestSeller?: boolean | null;
};

export type ShopProduct = {
  id: string;
  category: ShopCategory;
  name: string;
  brand?: string;
  /** "Brand Name" without repeating a brand the name already starts with. */
  fullName: string;
  /** The one figure that matters for this kind of product, when the data has it. */
  keySpec?: string;
  /** Inc. GST, in dollars. Undefined when there is no price. */
  price?: number;
  imageUrl?: string;
  bestSeller: boolean;
  /** Only when the catalogue has real reviews. */
  rating?: { value: number; count: number };
};

function fmt(n: number, max = 1): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: max }).format(n);
}

/** The headline spec per category, e.g. "440 W", "5 kW hybrid", "13.5 kWh usable". */
export function keySpecFor(source: ShopSource): string | undefined {
  const p = source as SpecProduct;
  const type = (() => {
    const specs = source.specs;
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) return undefined;
    const t = (specs as Record<string, unknown>).type;
    return typeof t === "string" && t.trim() && t.trim().length <= 16 ? t.trim().toLowerCase() : undefined;
  })();
  switch (shopCategory(source.category)) {
    case "panel":
      return source.wattage && source.wattage > 0 ? `${fmt(source.wattage, 0)} W` : undefined;
    case "inverter": {
      const kw = numberSpec(p, "ratedKw") ?? (source.wattage ? source.wattage / 1000 : undefined);
      if (!kw) return undefined;
      return type ? `${fmt(kw)} kW ${type}` : `${fmt(kw)} kW`;
    }
    case "battery": {
      const usable = numberSpec(p, "usableCapacityKwh");
      if (usable) return `${fmt(usable)} kWh usable`;
      const nominal = numberSpec(p, "nominalCapacityKwh");
      return nominal ? `${fmt(nominal)} kWh` : undefined;
    }
    case "ev-charger": {
      const kw = numberSpec(p, "ratedKw");
      return kw ? `${fmt(kw)} kW` : undefined;
    }
    case "heat-pump": {
      const litres = numberSpec(p, "capacityL");
      const cop = numberSpec(p, "cop");
      const parts = [litres ? `${fmt(litres, 0)} L tank` : null, cop ? `COP ${fmt(cop)}` : null].filter(Boolean);
      return parts.length ? parts.join(" · ") : undefined;
    }
    case "portable-power": {
      const kwh = numberSpec(p, "capacityKwh");
      return kwh ? `${fmt(kwh, 2)} kWh` : undefined;
    }
  }
}

export function toShopProduct(source: ShopSource): ShopProduct {
  const brand = source.brand?.trim() || undefined;
  const name = source.name.trim();
  const price = [source.retailPrice, source.basePrice, source.price].find((v): v is number => typeof v === "number" && v > 0);
  const rating =
    typeof source.rating === "number" && source.rating > 0 && typeof source.reviewCount === "number" && source.reviewCount > 0
      ? { value: source.rating, count: source.reviewCount }
      : undefined;
  return {
    id: source.id,
    category: shopCategory(source.category),
    name,
    brand,
    fullName: brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name,
    keySpec: keySpecFor(source),
    price,
    imageUrl: productImage(source as SpecProduct)?.thumbUrl,
    bestSeller: source.bestSeller === true,
    rating,
  };
}

/** Best sellers first, then category order, then name — the same order as the public catalogue. */
export function sortShopProducts(products: ShopProduct[]): ShopProduct[] {
  return [...products].sort(
    (a, b) =>
      Number(b.bestSeller) - Number(a.bestSeller) ||
      SHOP_CATEGORY_ORDER.indexOf(a.category) - SHOP_CATEGORY_ORDER.indexOf(b.category) ||
      a.fullName.localeCompare(b.fullName),
  );
}

/** Categories that actually have products, in shop order, with counts. */
export function categoryCounts(products: ShopProduct[]): { category: ShopCategory; count: number }[] {
  return SHOP_CATEGORY_ORDER.map((category) => ({ category, count: products.filter((p) => p.category === category).length })).filter(
    (c) => c.count > 0,
  );
}

export function filterShopProducts(products: ShopProduct[], category: ShopCategory | "all", query: string): ShopProduct[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (!words.length) return true;
    const hay = `${p.fullName} ${p.keySpec ?? ""} ${SHOP_CATEGORY_LABEL[p.category].one}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export type DesignSystemSize = { solarKw?: number; panelCount?: number; batteryKwh?: number };

/** Solar and battery size from the design's own products. Missing data stays undefined. */
export function designSystemSize(design: CustomerDesign | null | undefined): DesignSystemSize {
  const lines = design?.products ?? [];
  const panels = lines.filter((l) => l.product && shopCategory(l.product.category) === "panel");
  const panelCount = panels.reduce((n, l) => n + Math.max(0, l.quantity || 0), 0) || undefined;
  const solarKw = panels.reduce<number | undefined>((sum, l) => {
    const kw = systemSizeKwFrom(l, l.quantity);
    return kw === undefined ? sum : (sum ?? 0) + kw;
  }, undefined);
  const batteryKwh = productsByCategory(lines, "batter").reduce<number | undefined>((sum, l) => {
    const kwh = batteryCapacityKwh(l);
    return kwh === undefined ? sum : (sum ?? 0) + kwh;
  }, undefined);
  return { solarKw, panelCount, batteryKwh };
}

export function describeSystem(size: DesignSystemSize): string | undefined {
  if (!size.solarKw) return undefined;
  const solar = `${fmt(size.solarKw)} kW solar system`;
  return size.batteryKwh ? `${solar} with a ${fmt(size.batteryKwh)} kWh battery` : solar;
}

export type SystemLine = { lineId: string; quantity: number; product: ShopProduct };

/**
 * The design's own products, enriched from the live catalogue when the same
 * product is there (for its photo), else from the design line itself.
 */
export function designShopLines(design: CustomerDesign | null | undefined, catalogue: ShopProduct[]): SystemLine[] {
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const out: SystemLine[] = [];
  for (const line of design?.products ?? []) {
    const product = line.product;
    if (!product?.name?.trim()) continue;
    const fromLine = toShopProduct(product);
    const live = byId.get(product.id);
    out.push({
      lineId: line.id,
      quantity: Math.max(1, line.quantity || 1),
      product: live ? { ...fromLine, ...live, keySpec: live.keySpec ?? fromLine.keySpec, imageUrl: live.imageUrl ?? fromLine.imageUrl } : fromLine,
    });
  }
  return out.sort((a, b) => SHOP_CATEGORY_ORDER.indexOf(a.product.category) - SHOP_CATEGORY_ORDER.indexOf(b.product.category));
}

/** The pre-filled question behind each product's "Ask AI" action. */
export function productQuestion(product: ShopProduct, size: DesignSystemSize): string {
  const system = describeSystem(size);
  const name = product.fullName + (product.keySpec ? ` (${product.keySpec})` : "");
  if (product.category === "battery") {
    return system
      ? `Which battery suits me? Is the ${name} a good fit for my ${system}?`
      : `Which battery suits me? Is the ${name} a good fit for my home? I haven't designed a system yet.`;
  }
  return system
    ? `Is the ${name} compatible with my ${system}?`
    : `Is the ${name} right for my home? I haven't designed a solar system yet.`;
}

/** Question for a product already in the customer's design. */
export function designLineQuestion(line: SystemLine, size: DesignSystemSize): string {
  const system = describeSystem(size);
  const qty = line.quantity > 1 ? `${line.quantity} × ` : "";
  return `What does the ${qty}${line.product.fullName} do in my ${system ?? "solar design"}, and why was it chosen?`;
}
