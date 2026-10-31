import { describe, expect, it } from "vitest";

import { BATTERY_CURVE_SIZES_KWH, EV_FUTURE_DAILY_KWH, evReadyBatteryKwh } from "./energySimulation";

describe("evReadyBatteryKwh", () => {
  it("adds the EV / future-load allowance and snaps up to a curve size", () => {
    expect(evReadyBatteryKwh(13)).toBe(25);
    expect(evReadyBatteryKwh(20)).toBe(30);
    for (const home of [0, 8, 16, 40]) {
      const ev = evReadyBatteryKwh(home);
      expect(ev).toBeGreaterThanOrEqual(home + EV_FUTURE_DAILY_KWH);
      expect(BATTERY_CURVE_SIZES_KWH).toContain(ev);
    }
  });

  it("caps at the largest size", () => {
    expect(evReadyBatteryKwh(95)).toBe(100);
  });
});
