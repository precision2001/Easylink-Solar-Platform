import { describe, expect, it } from "vitest";
import type { CustomerDesign } from "./designs";
import { designProductSummaryItems, humaniseCategory } from "./design-products";

function design(products: CustomerDesign["products"]): CustomerDesign {
  return {
    id: "d1",
    userId: "u1",
    title: "My design",
    status: "IN_PROGRESS",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    products,
  };
}

describe("humaniseCategory", () => {
  it("turns slugs and enums into sentence case", () => {
    expect(humaniseCategory("solar-panel")).toBe("Solar panel");
    expect(humaniseCategory("EV_CHARGER")).toBe("EV charger");
    expect(humaniseCategory("  ")).toBe("");
  });
});

describe("designProductSummaryItems", () => {
  it("returns nothing without a design or products", () => {
    expect(designProductSummaryItems(null)).toEqual([]);
    expect(designProductSummaryItems(design([]))).toEqual([]);
    expect(designProductSummaryItems(design(undefined))).toEqual([]);
  });

  it("lists the design's own products with brand, category and quantity", () => {
    const items = designProductSummaryItems(
      design([
        {
          id: "l1",
          quantity: 16,
          totalPrice: 0,
          product: { id: "p1", name: "Tiger Neo 440W", brand: "Jinko", category: "panel", price: 0 },
        },
        {
          id: "l2",
          quantity: 1,
          totalPrice: 0,
          product: { id: "p2", name: "Fronius Primo 5.0", brand: "Fronius", category: "inverter", price: 0 },
        },
        { id: "l3", quantity: 1, totalPrice: 0, product: null },
      ]),
    );
    expect(items).toEqual([
      { id: "l1", name: "Jinko Tiger Neo 440W", detail: "Panel · × 16", icon: "sun" },
      { id: "l2", name: "Fronius Primo 5.0", detail: "Inverter", icon: "cpu" },
    ]);
  });
});
