import { describe, expect, it } from "vitest";
import { estimateSavings, priceProposal } from "./proposalPricing";

describe("priceProposal", () => {
  it("prices a 22.8 kW design (57 × 440 W) on three phase after STCs, not the old $11,200 default", () => {
    const p = priceProposal({ panelCount: 57, panelTierId: "standard", installDate: "2026-11-27" });
    expect(p.quote.blocks).toEqual([]);
    expect(p.phase).toBe(3);
    expect(p.quote.stcCount).toBeGreaterThan(150);
    expect(p.total).toBeGreaterThan(9000);
    expect(p.total).toBeLessThan(16000);
  });
  it("uses a hybrid inverter at 200% when a string inverter at 133% can't carry the array", () => {
    const p = priceProposal({ panelCount: 57, panelTierId: "premium", installDate: "2026-11-27" });
    expect(p.quote.blocks).toEqual([]);
    expect(p.quote.inverter?.model).toMatch(/Hybrid/);
  });
  it("adds the battery and its STCs", () => {
    const a = priceProposal({ panelCount: 15, installDate: "2026-11-27" });
    const b = priceProposal({ panelCount: 15, batteryKwh: 9.2, installDate: "2026-11-27" });
    expect(b.total).toBeGreaterThan(a.total);
    expect(b.quote.stcCount).toBeGreaterThan(a.quote.stcCount);
  });
});

describe("estimateSavings", () => {
  it("grows with system size and never takes the bill below zero", () => {
    const small = estimateSavings(300, 3);
    const big = estimateSavings(300, 22.8);
    expect(big.monthlySavings).toBeGreaterThan(small.monthlySavings);
    expect(big.newBill).toBeGreaterThanOrEqual(0);
    expect(big.monthlySavings).toBeLessThanOrEqual(300);
  });
  it("a battery saves more on the same system", () => {
    expect(estimateSavings(300, 6.6, 13.5).yearlySavings).toBeGreaterThan(estimateSavings(300, 6.6).yearlySavings);
  });
});
