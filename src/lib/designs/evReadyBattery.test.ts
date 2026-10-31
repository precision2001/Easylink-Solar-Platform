import { describe, expect, it } from "vitest";

import {
  BATTERY_CURVE_SIZES_KWH,
  DEFAULT_EV_BATTERY_KWH,
  EV_CHARGE_EFFICIENCY,
  evReadyBatteryKwh,
} from "./energySimulation";

describe("evReadyBatteryKwh", () => {
  it("adds a full charge of the car's battery (with charging losses) and snaps up to a curve size", () => {
    // 13 + 60 / 0.9 = 79.7 → 80
    expect(evReadyBatteryKwh(13)).toBe(80);
    // 20 + 82.5 / 0.9 = 111.7 → 120 (BYD Sealion 7 Premium)
    expect(evReadyBatteryKwh(20, 82.5)).toBe(120);
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
