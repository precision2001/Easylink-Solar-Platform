import { describe, expect, it } from "vitest";

import { batteryStcs, discountFor, nextStep, solarStcs, stepAt } from "./rebate-schedule";

describe("rebate schedule", () => {
  const nov2026 = new Date("2026-11-16T10:00:00Z");

  it("uses this year's rates in November 2026", () => {
    const step = stepAt(nov2026);
    expect(step.batteryFactor).toBe(6.8);
    expect(step.solarYears).toBe(5);
  });

  it("steps down at midnight Sydney time on 1 January 2027", () => {
    const next = nextStep(nov2026);
    expect(next?.from.toISOString()).toBe("2026-12-31T13:00:00.000Z");
    expect(next?.batteryFactor).toBe(5.7);
    expect(next?.solarYears).toBe(4);
    expect(stepAt(new Date("2026-12-31T12:59:59Z")).batteryFactor).toBe(6.8);
    expect(stepAt(new Date("2026-12-31T13:00:00Z")).batteryFactor).toBe(5.7);
  });

  it("matches the blog's published figures", () => {
    expect(batteryStcs(13.5, 6.8)).toBe(91);
    expect(batteryStcs(20, 6.8)).toBe(119);
    expect(batteryStcs(30, 5.7)).toBe(129);
    expect(solarStcs(10, 5)).toBe(69);
    expect(solarStcs(6.6, 4)).toBe(36);
    const now = stepAt(nov2026);
    const jan = nextStep(nov2026)!;
    expect(discountFor(now, 10, 20)).toBe(7144);
    expect(discountFor(jan, 10, 20)).toBe(5890);
  });

  it("only discounts the first 50 kWh", () => {
    expect(batteryStcs(80, 6.8)).toBe(batteryStcs(50, 6.8));
  });

  it("keeps the deeming period through mid-year battery steps", () => {
    const jul2027 = stepAt(new Date("2027-07-02T00:00:00Z"));
    expect(jul2027.batteryFactor).toBe(5.2);
    expect(jul2027.solarYears).toBe(4);
  });
});
