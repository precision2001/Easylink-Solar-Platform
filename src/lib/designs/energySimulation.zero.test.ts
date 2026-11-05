import { describe, expect, it } from "vitest";
import { BATTERY_CURVE_SIZES_KWH, findBatteryKnee } from "./energySimulation";

describe("a $0 bill", () => {
  it("recommends the smallest battery, not the largest", () => {
    expect(findBatteryKnee(0, 9000).recommendedKwh).toBe(BATTERY_CURVE_SIZES_KWH[0]);
  });
});
