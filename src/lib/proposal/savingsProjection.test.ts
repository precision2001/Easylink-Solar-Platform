import { describe, expect, it } from "vitest";
import { cumulativeGain, netSavings, paybackLabel, paybackYears } from "./savingsProjection";

describe("the shared savings projection", () => {
  it("pays back where the 25-year curve crosses zero, so the two figures agree", () => {
    const y = paybackYears(26_081, 1_800)!;
    const curve = cumulativeGain(1_800, 26_081);
    expect(curve[Math.floor(y) - 1]!).toBeLessThan(0);
    expect(curve[Math.floor(y)]!).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(26_081 / 1_800); // rising power prices pay it back sooner than price ÷ year one
  });
  it("ages the panels: 25 years saves less than with the price rise alone", () => {
    let rise = 0;
    for (let i = 0; i < 25; i++) rise += 1_800 * 1.03 ** i;
    expect(netSavings(1_800, 26_081)!).toBeLessThan(rise - 26_081);
    expect(netSavings(1_800, 26_081)!).toBeGreaterThan(0);
  });
  it("shows nothing without a price or savings", () => {
    expect(netSavings(1_800, null)).toBeNull();
    expect(netSavings(0, 20_000)).toBeNull();
    expect(paybackYears(null, 1_000)).toBeNull();
    expect(paybackLabel(20_000, 0)).toBe("");
    expect(paybackYears(1_000_000, 100)).toBeNull();
  });
});
