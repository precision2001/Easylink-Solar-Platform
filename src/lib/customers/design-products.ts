import type { DesignSummaryItem } from "@/components/customer/products/types";
import type { CustomerDesign } from "@/lib/customers/designs";

/** "solar-panel" / "SOLAR_PANEL" → "Solar panel". */
export function humaniseCategory(category: string): string {
  const words = category.trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").toLowerCase();
  if (!words) return "";
  const cased = words.replace(/\b(ev|pv|ac|dc)\b/g, (w) => w.toUpperCase());
  return cased.charAt(0).toUpperCase() + cased.slice(1);
}

/**
 * Equipment lines for "Products in your selected design", taken from the
 * customer's primary design. Lines whose product no longer exists are skipped,
 * and no design (or a design with no products) yields an empty list so the
 * caller can hide the section.
 */
export function designProductSummaryItems(
  design: CustomerDesign | null | undefined,
): DesignSummaryItem[] {
  if (!design?.products?.length) return [];
  const items: DesignSummaryItem[] = [];
  for (const line of design.products) {
    const product = line.product;
    if (!product?.name?.trim()) continue;
    const brand = product.brand?.trim();
    const name = product.name.trim();
    const category = humaniseCategory(product.category ?? "");
    const qty = line.quantity > 1 ? `× ${line.quantity}` : "";
    items.push({
      id: line.id,
      name: brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name,
      detail: [category, qty].filter(Boolean).join(" · "),
      icon: /panel|solar|module/i.test(product.category ?? "") ? "sun" : "cpu",
    });
  }
  return items;
}
