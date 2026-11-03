import { describe, expect, it } from "vitest";
import {
  batteryCapacityKwh,
  cecApprovedLabel,
  inverterRatedKw,
  productLabel,
  productSeries,
  productsByCategory,
  isHybridInverter,
  panelInverterRatio,
  systemSizeKwFrom,
} from "./product-specs";

const panelItem = {
  quantity: 16,
  product: {
    name: "TSM-415",
    brand: "Trina",
    category: "Solar Panel",
    wattage: 415,
    specs: { cecApproved: true },
  },
};

const batteryItem = {
  quantity: 2,
  product: {
    name: "HVS 10.2",
    brand: "BYD",
    category: "Battery",
    wattage: null,
    specs: {
      cecApproved: true,
      series: "Battery-Box Premium",
      nominalCapacityKwh: 10.24,
      usableCapacityKwh: 9.2,
    },
  },
};

describe("productLabel", () => {
  it("combines brand and model", () => {
    expect(productLabel(panelItem)).toBe("Trina TSM-415");
  });

  it("falls back to the name when there is no brand", () => {
    expect(
      productLabel({ quantity: 1, product: { name: "Solo", category: "X" } }),
    ).toBe("Solo");
  });

  it("returns undefined for an empty category, so callers can show N/A", () => {
    expect(productLabel(undefined)).toBeUndefined();
    expect(productLabel(null)).toBeUndefined();
    expect(productLabel({ quantity: 1, product: null })).toBeUndefined();
  });
});

describe("batteryCapacityKwh", () => {
  it("prefers usable capacity and multiplies by quantity", () => {
    expect(batteryCapacityKwh(batteryItem)).toBeCloseTo(18.4);
  });

  it("falls back to nominal capacity", () => {
    expect(
      batteryCapacityKwh({
        quantity: 1,
        product: {
          name: "B",
          category: "Battery",
          specs: { nominalCapacityKwh: 5 },
        },
      }),
    ).toBe(5);
  });

  it("is undefined when the design has no battery", () => {
    expect(batteryCapacityKwh(undefined)).toBeUndefined();
  });

  it("is undefined when the product carries no capacity spec", () => {
    expect(
      batteryCapacityKwh({
        quantity: 1,
        product: { name: "B", category: "Battery", specs: {} },
      }),
    ).toBeUndefined();
  });
});

describe("inverterRatedKw", () => {
  it("reads ratedKw from specs", () => {
    expect(
      inverterRatedKw({
        quantity: 1,
        product: { name: "P5", category: "Inverter", specs: { ratedKw: 5 } },
      }),
    ).toBe(5);
  });

  it("converts wattage when specs carry no rating", () => {
    expect(
      inverterRatedKw({
        quantity: 1,
        product: { name: "P5", category: "Inverter", wattage: 7600 },
      }),
    ).toBeCloseTo(7.6);
  });

  it("is undefined when there is no inverter", () => {
    expect(inverterRatedKw(undefined)).toBeUndefined();
  });
});

describe("cecApprovedLabel / productSeries", () => {
  it("maps the boolean spec to Yes/No", () => {
    expect(cecApprovedLabel(batteryItem)).toBe("Yes");
    expect(
      cecApprovedLabel({
        quantity: 1,
        product: { name: "x", category: "Battery", specs: { cecApproved: false } },
      }),
    ).toBe("No");
  });

  it("is undefined when the spec is absent rather than assuming approval", () => {
    expect(
      cecApprovedLabel({
        quantity: 1,
        product: { name: "x", category: "Battery", specs: {} },
      }),
    ).toBeUndefined();
    expect(cecApprovedLabel(undefined)).toBeUndefined();
  });

  it("reads the series when present", () => {
    expect(productSeries(batteryItem)).toBe("Battery-Box Premium");
    expect(productSeries(panelItem)).toBeUndefined();
  });
});

describe("systemSizeKwFrom", () => {
  it("uses the attached panel wattage and the design's panel count", () => {
    expect(systemSizeKwFrom(panelItem, 16)).toBeCloseTo(6.64);
  });

  it("falls back to the line item quantity when the design has no count", () => {
    expect(systemSizeKwFrom(panelItem, null)).toBeCloseTo(6.64);
  });

  it("does not invent a wattage when no panel product is attached", () => {
    // The old behaviour assumed 412W here and reported a system size for a
    // design that has no panels at all.
    expect(systemSizeKwFrom(undefined, 16)).toBeUndefined();
    expect(
      systemSizeKwFrom(
        { quantity: 16, product: { name: "p", category: "Solar Panel" } },
        16,
      ),
    ).toBeUndefined();
  });

  it("is undefined when the count is missing or zero", () => {
    expect(systemSizeKwFrom({ ...panelItem, quantity: 0 }, 0)).toBeUndefined();
  });
});

describe("productsByCategory", () => {
  const evChargerItem = {
    quantity: 1,
    product: { name: "Wall Connector", category: "EV Charger", specs: { ratedKw: 11 } },
  };
  const items = [panelItem, batteryItem, evChargerItem];

  it("returns every match, not just the first", () => {
    const batteries = [
      batteryItem,
      { quantity: 1, product: { name: "HVS 5.1", category: "Battery" } },
    ];
    expect(productsByCategory(batteries, "battery")).toHaveLength(2);
  });

  it("matches the item's category case-insensitively as a substring", () => {
    // The query itself is expected lowercase, matching how every real call
    // site passes it (e.g. "ev charger", never "EV Charger").
    expect(productsByCategory(items, "ev charger")).toEqual([evChargerItem]);
    expect(productsByCategory(items, "charger")).toEqual([evChargerItem]);
  });

  it("returns an empty array when nothing matches or items is missing", () => {
    expect(productsByCategory(items, "heat pump")).toEqual([]);
    expect(productsByCategory(undefined, "battery")).toEqual([]);
    expect(productsByCategory(null, "battery")).toEqual([]);
  });

  it("skips entries with no attached product", () => {
    expect(
      productsByCategory([{ quantity: 1, product: null }, panelItem], "panel"),
    ).toEqual([panelItem]);
  });
});

describe("malformed specs", () => {
  it("ignores non-object specs instead of throwing", () => {
    for (const specs of ["nope", 42, null, [1, 2]]) {
      const item = { quantity: 1, product: { name: "x", category: "Battery", specs } };
      expect(batteryCapacityKwh(item)).toBeUndefined();
      expect(cecApprovedLabel(item)).toBeUndefined();
      expect(productSeries(item)).toBeUndefined();
    }
  });

  it("parses numeric specs stored as strings", () => {
    expect(
      batteryCapacityKwh({
        quantity: 1,
        product: {
          name: "x",
          category: "Battery",
          specs: { usableCapacityKwh: "9.2" },
        },
      }),
    ).toBeCloseTo(9.2);
  });
});

const ratioPanel = (wattage: number | null) => ({
  quantity: 1,
  product: { name: "Test panel", category: "Solar Panels", wattage, specs: {} },
});

const ratioInverter = (ratedKw: number) => ({
  quantity: 1,
  product: {
    name: "Test inverter",
    category: "Inverter",
    wattage: null,
    specs: { ratedKw },
  },
});

describe("panelInverterRatio", () => {
  it("flags a design over the 133% STC limit", () => {
    // 33 x 440 W = 14.52 kW against a 9.9 kW inverter.
    const result = panelInverterRatio(ratioPanel(440), ratioInverter(9.9), 33);

    expect(result?.pct).toBe(147);
    expect(result?.overLimit).toBe(true);
    expect(result?.maxPanels).toBe(29);
    expect(result?.message).toContain("reduce to 29 panels");
  });

  it("passes a design inside the limit", () => {
    const result = panelInverterRatio(ratioPanel(440), ratioInverter(9.9), 29);

    expect(result?.pct).toBe(129);
    expect(result?.overLimit).toBe(false);
    expect(result?.message).toContain("within the 133% STC limit");
  });

  it("treats exactly 133% as within the limit", () => {
    const result = panelInverterRatio(ratioPanel(1000), ratioInverter(10), 13.3);

    expect(result?.pct).toBe(133);
    expect(result?.overLimit).toBe(false);
  });

  it("returns undefined rather than guessing when panel wattage is unknown", () => {
    expect(panelInverterRatio(ratioPanel(null), ratioInverter(9.9), 33)).toBeUndefined();
  });

  it("returns undefined when no inverter is attached", () => {
    expect(panelInverterRatio(ratioPanel(440), undefined, 33)).toBeUndefined();
  });

  it("returns undefined when no panels are attached", () => {
    expect(panelInverterRatio(undefined, ratioInverter(9.9), 33)).toBeUndefined();
  });

  it("returns undefined when the panel count is zero", () => {
    expect(panelInverterRatio(ratioPanel(440), ratioInverter(9.9), 0)).toBeUndefined();
  });
});

const hybridInverter = (ratedKw: number) => ({
  quantity: 1,
  product: {
    name: "Test hybrid",
    category: "Inverter",
    wattage: null,
    specs: { ratedKw, type: "Hybrid" },
  },
});

describe("panelInverterRatio · EasyLink 200% rule", () => {
  it("allows up to 200% with a hybrid inverter and no battery", () => {
    // 33 x 440 W = 14.52 kW on 9.9 kW hybrid = 147%: fine under 200%.
    const result = panelInverterRatio(ratioPanel(440), hybridInverter(9.9), 33);
    expect(result?.limitPct).toBe(200);
    expect(result?.overLimit).toBe(false);
    expect(result?.message).toContain("200% hybrid / battery limit");
  });

  it("allows up to 200% with a standard inverter when there is a battery", () => {
    const result = panelInverterRatio(ratioPanel(440), ratioInverter(9.9), 33, true);
    expect(result?.limitPct).toBe(200);
    expect(result?.overLimit).toBe(false);
  });

  it("flags a hybrid design over 200% and gives the 200% panel count", () => {
    // 50 x 440 W = 22 kW on 9.9 kW = 222%.
    const result = panelInverterRatio(ratioPanel(440), hybridInverter(9.9), 50);
    expect(result?.overLimit).toBe(true);
    expect(result?.maxPanels).toBe(45);
    expect(result?.message).toContain("reduce to 45 panels");
  });

  it("keeps 133% for a standard inverter with no battery", () => {
    expect(panelInverterRatio(ratioPanel(440), ratioInverter(9.9), 33)?.limitPct).toBe(133);
  });

  it("reads the hybrid flag from the catalogue type", () => {
    expect(isHybridInverter(hybridInverter(5))).toBe(true);
    expect(isHybridInverter(ratioInverter(5))).toBe(false);
    expect(isHybridInverter(undefined)).toBe(false);
  });
});
