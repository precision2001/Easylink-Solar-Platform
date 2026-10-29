import { describe, expect, it } from "vitest";
import { panelInverterRatio } from "./product-specs";

const panel = (wattage: number | null) => ({
  quantity: 1,
  product: { name: "Test panel", category: "Solar Panels", wattage, specs: {} },
});

const inverter = (ratedKw: number) => ({
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
    const result = panelInverterRatio(panel(440), inverter(9.9), 33);

    expect(result?.pct).toBe(147);
    expect(result?.overLimit).toBe(true);
    expect(result?.maxPanels).toBe(29);
    expect(result?.message).toContain("reduce to 29 panels");
  });

  it("passes a design inside the limit", () => {
    const result = panelInverterRatio(panel(440), inverter(9.9), 29);

    expect(result?.pct).toBe(129);
    expect(result?.overLimit).toBe(false);
    expect(result?.message).toContain("within the 133% STC limit");
  });

  it("treats exactly 133% as within the limit", () => {
    const result = panelInverterRatio(panel(1000), inverter(10), 13.3);

    expect(result?.pct).toBe(133);
    expect(result?.overLimit).toBe(false);
  });

  it("returns undefined rather than guessing when panel wattage is unknown", () => {
    expect(panelInverterRatio(panel(null), inverter(9.9), 33)).toBeUndefined();
  });

  it("returns undefined when no inverter is attached", () => {
    expect(panelInverterRatio(panel(440), undefined, 33)).toBeUndefined();
  });

  it("returns undefined when no panels are attached", () => {
    expect(panelInverterRatio(undefined, inverter(9.9), 33)).toBeUndefined();
  });

  it("returns undefined when the panel count is zero", () => {
    expect(panelInverterRatio(panel(440), inverter(9.9), 0)).toBeUndefined();
  });
});
