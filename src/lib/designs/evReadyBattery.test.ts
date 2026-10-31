import { describe, expect, it } from "vitest";

import {
  BATTERY_CURVE_SIZES_KWH,
  DEFAULT_EV_BATTERY_KWH,
  EV_CHARGE_EFFICIENCY,
  evReadyBatteryKwh,
  futureReadyBatteryKwh,
} from "./energySimulation";

describe("evReadyBatteryKwh", () => {
  it("adds a full charge of the car's battery (with charging losses) and snaps up to a curve size", () => {
    // 13 + 60 / 0.99 = 73.6 → 80
    expect(evReadyBatteryKwh(13)).toBe(80);
    // 20 + 60 / 0.99 = 80.6 → 90
    expect(evReadyBatteryKwh(20)).toBe(90);
    // 20 + 82.5 / 0.99 = 103.3 → 110 (BYD Sealion 7 Premium)
    expect(evReadyBatteryKwh(20, 82.5)).toBe(110);
    for (const home of [0, 8, 16, 40]) {
      const ev = evReadyBatteryKwh(home);
      expect(ev).toBeGreaterThanOrEqual(home + DEFAULT_EV_BATTERY_KWH / EV_CHARGE_EFFICIENCY);
      expect(BATTERY_CURVE_SIZES_KWH).toContain(ev);
    }
  });

  it("caps at the largest size", () => {
    expect(evReadyBatteryKwh(95, 100)).toBe(150);
  });
});

describe("futureReadyBatteryKwh", () => {
  it("sits halfway between home-only and full-EV, on the nearest curve size", () => {
    expect(futureReadyBatteryKwh(20, 90)).toBe(60); // 55 → tie 50/60, rounds up
    expect(futureReadyBatteryKwh(13, 80)).toBe(50); // 46.5 → 50
    expect(BATTERY_CURVE_SIZES_KWH).toContain(futureReadyBatteryKwh(8, 70));
  });
});
