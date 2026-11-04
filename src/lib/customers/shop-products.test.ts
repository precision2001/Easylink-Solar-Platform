import { describe, expect, it } from "vitest";
import type { CustomerDesign } from "./designs";
import {
  categoryCounts,
  designShopLines,
  designSystemSize,
  filterShopProducts,
  keySpecFor,
  productQuestion,
  shopCategory,
  sortShopProducts,
  toShopProduct,
} from "./shop-products";

const panelRow = { id: "p1", name: "Tiger Neo 440W", brand: "Jinko", category: "Solar Panel", wattage: 440, retailPrice: 189 };
const batteryRow = {
  id: "b1",
  name: "Powerwall 3",
  brand: "Tesla",
  category: "Battery",
  retailPrice: 13990,
  bestSeller: true,
  specs: { usableCapacityKwh: 13.5, image: { url: "https://cdn.example.com/pw3.webp", thumbUrl: "https://cdn.example.com/pw3-400.webp" } },
};
const inverterRow = { id: "i1", name: "Primo 5.0", brand: "Fronius", category: "Inverter", basePrice: 1650, specs: { ratedKw: 5 } };

describe("shopCategory", () => {
  it("maps backend category names", () => {
    expect(shopCategory("Solar Panel")).toBe("panel");
    expect(shopCategory("EV Charger")).toBe("ev-charger");
    expect(shopCategory("EV_CHARGER")).toBe("ev-charger");
    expect(shopCategory("Heat Pump")).toBe("heat-pump");
    expect(shopCategory("Battery")).toBe("battery");
    expect(shopCategory("Portable Power")).toBe("portable-power");
  });
});

describe("toShopProduct", () => {
  it("never invents a rating", () => {
    expect(toShopProduct(panelRow).rating).toBeUndefined();
    expect(toShopProduct({ ...panelRow, rating: 4.8, reviewCount: 0 }).rating).toBeUndefined();
    expect(toShopProduct({ ...panelRow, rating: 4.8, reviewCount: 12 }).rating).toEqual({ value: 4.8, count: 12 });
  });

  it("uses the real price and photo, and leaves them out when missing", () => {
    const b = toShopProduct(batteryRow);
    expect(b.price).toBe(13990);
    expect(b.imageUrl).toBe("https://cdn.example.com/pw3-400.webp");
    expect(b.fullName).toBe("Tesla Powerwall 3");
    const none = toShopProduct({ id: "x", name: "Thing", category: "Inverter" });
    expect(none.price).toBeUndefined();
    expect(none.imageUrl).toBeUndefined();
    expect(none.keySpec).toBeUndefined();
  });

  it("does not repeat the brand", () => {
    expect(toShopProduct({ ...panelRow, name: "Jinko Tiger Neo" }).fullName).toBe("Jinko Tiger Neo");
  });
});

describe("keySpecFor", () => {
  it("picks the headline figure per category", () => {
    expect(keySpecFor(panelRow)).toBe("440 W");
    expect(keySpecFor(batteryRow)).toBe("13.5 kWh usable");
    expect(keySpecFor(inverterRow)).toBe("5 kW");
    expect(keySpecFor({ ...inverterRow, specs: { ratedKw: 10, type: "Hybrid" } })).toBe("10 kW hybrid");
    expect(keySpecFor({ id: "e", name: "Wallbox", category: "EV Charger", specs: { ratedKw: 7.4 } })).toBe("7.4 kW");
    expect(keySpecFor({ id: "h", name: "Reclaim", category: "Heat Pump", specs: { capacityL: 315, cop: 4.5 } })).toBe("315 L tank · COP 4.5");
  });
});

describe("sorting, counts and filtering", () => {
  const all = sortShopProducts([panelRow, batteryRow, inverterRow].map(toShopProduct));

  it("puts best sellers first, then category order", () => {
    expect(all.map((p) => p.id)).toEqual(["b1", "p1", "i1"]);
  });

  it("counts only categories with products", () => {
    expect(categoryCounts(all)).toEqual([
      { category: "panel", count: 1 },
      { category: "inverter", count: 1 },
      { category: "battery", count: 1 },
    ]);
  });

  it("filters by category and words", () => {
    expect(filterShopProducts(all, "battery", "").map((p) => p.id)).toEqual(["b1"]);
    expect(filterShopProducts(all, "all", "fronius 5").map((p) => p.id)).toEqual(["i1"]);
    expect(filterShopProducts(all, "panel", "tesla")).toEqual([]);
  });
});

function design(products: CustomerDesign["products"]): CustomerDesign {
  return { id: "d1", userId: "u1", title: "My design", status: "IN_PROGRESS", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", products };
}

describe("designSystemSize and designShopLines", () => {
  const d = design([
    { id: "l2", quantity: 1, totalPrice: 0, product: { id: "i1", name: "Primo 5.0", brand: "Fronius", category: "Inverter", price: 1650, specs: { ratedKw: 5 } } },
    { id: "l1", quantity: 15, totalPrice: 0, product: { id: "p1", name: "Tiger Neo 440W", brand: "Jinko", category: "Solar Panel", wattage: 440, price: 189 } },
    { id: "l3", quantity: 1, totalPrice: 0, product: null },
  ]);

  it("works out size from the design's panels and batteries", () => {
    expect(designSystemSize(d)).toEqual({ solarKw: 6.6, panelCount: 15, batteryKwh: undefined });
    expect(designSystemSize(null)).toEqual({ solarKw: undefined, panelCount: undefined, batteryKwh: undefined });
  });

  it("lists the design's products in category order, with catalogue photos", () => {
    const lines = designShopLines(d, [toShopProduct({ ...panelRow, imageUrl: "https://cdn.example.com/p1.webp" })]);
    expect(lines.map((l) => l.lineId)).toEqual(["l1", "l2"]);
    expect(lines[0].quantity).toBe(15);
    expect(lines[0].product.imageUrl).toBe("https://cdn.example.com/p1.webp");
    expect(lines[1].product.keySpec).toBe("5 kW");
  });
});

describe("productQuestion", () => {
  it("names the product and the customer's system", () => {
    const b = toShopProduct(batteryRow);
    expect(productQuestion(b, { solarKw: 6.6 })).toBe("Which battery suits me? Is the Tesla Powerwall 3 (13.5 kWh usable) a good fit for my 6.6 kW solar system?");
    expect(productQuestion(toShopProduct(inverterRow), {})).toContain("I haven't designed a solar system yet");
  });
});
