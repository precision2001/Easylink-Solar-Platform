import { describe, expect, it } from "vitest";
import { buildDesignSpecSheet, designAiQuestions, optionForDesign } from "./design-spec-sheet";
import type { CustomerDesign } from "./designs";
import type { DesignOptionCard, DesignOptions } from "./design-options";

const design = {
  id: "d1",
  userId: "u1",
  title: "Our family home",
  status: "IN_PROGRESS",
  panelCount: 20,
  estimatedSavings: 2400,
  solarData: { yearlyEnergyDcKwh: 12500 },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  products: [
    { id: "p", quantity: 20, totalPrice: 6000, product: { id: "1", name: "Tiger Neo", brand: "Jinko", category: "Solar Panel", wattage: 440, price: 300 } },
    { id: "i", quantity: 1, totalPrice: 2000, product: { id: "2", name: "Primo 8.2", brand: "Fronius", category: "Inverter", price: 2000, specs: { ratedKw: 8.2 } } },
  ],
} as CustomerDesign;

const option: DesignOptionCard = {
  key: "custom",
  designId: "d1",
  title: "Your design",
  summary: "",
  kw: 8.8,
  panelCount: 20,
  price: 14000,
  priceAfterStc: 11000,
  stcDiscount: 3000,
  estimatedSavings: 2200,
  annualOutputKwh: 12000,
  imageSrc: "",
  isCustom: true,
  selected: true,
  editable: true,
  status: "IN_PROGRESS",
};

describe("buildDesignSpecSheet", () => {
  it("reads the stored design first and the option's price after STCs", () => {
    const s = buildDesignSpecSheet(design, option);
    expect(s.kw).toBeCloseTo(8.8);
    expect(s.panelModel).toBe("Jinko Tiger Neo");
    expect(s.inverterKw).toBe(8.2);
    expect(s.annualKwh).toBe(12500);
    expect(s.savingsPerYear).toBe(2400);
    expect(s.price).toBe(11000);
    expect(s.priceBasis).toBe("after-stc");
    expect(s.stcDiscount).toBe(3000);
    expect(s.paybackYears).toBe(4.6);
    expect(s.hasBattery).toBe(false);
  });

  it("falls back to the equipment total and invents nothing when data is missing", () => {
    const s = buildDesignSpecSheet({ ...design, estimatedSavings: null, solarData: null });
    expect(s.price).toBe(8000);
    expect(s.priceBasis).toBe("equipment");
    expect(s.annualKwh).toBeUndefined();
    expect(s.savingsPerYear).toBeUndefined();
    expect(s.paybackYears).toBeUndefined();
  });

  it("matches the option by design id only", () => {
    const opts = { options: [option], selectedKey: "custom", selectedDesignId: "d1", locked: false, hasCompletedDesignWizard: true } as DesignOptions;
    expect(optionForDesign(opts, "d1")).toBe(option);
    expect(optionForDesign(opts, "d2")).toBeUndefined();
    expect(optionForDesign(null, "d1")).toBeUndefined();
  });
});

describe("designAiQuestions", () => {
  it("builds questions from the real figures", () => {
    const qs = designAiQuestions(buildDesignSpecSheet(design, option));
    expect(qs.map((q) => q.key)).toEqual(["size", "savings", "battery", "ev"]);
    expect(qs[0].question).toContain("8.8 kW");
    expect(qs[0].question).toContain("12,500 kWh");
    expect(qs[1].question).toContain("$2,400");
    expect(qs[1].question).toContain("$11,000");
    expect(qs[2].label).toBe("What if I add a battery?");
  });

  it("asks about battery size when there is one, and skips size without kW", () => {
    const withBattery = designAiQuestions({ ...buildDesignSpecSheet(design), hasBattery: true, batteryKwh: 13.5 });
    expect(withBattery.find((q) => q.key === "battery")?.question).toContain("13.5 kWh");
    const bare = designAiQuestions({ title: "X", hasBattery: false, hasEvCharger: false, priceBasis: null });
    expect(bare).toEqual([]);
  });
});
