import { describe, expect, it } from "vitest";
import { batteryOptionRows, optionKwh, sortOptions, tapBatteryOption } from "./batteryOptions";

describe("battery options", () => {
  it("reads the size from an option id", () => {
    expect(optionKwh("14.6kwh")).toBe(14.6);
    expect(optionKwh("none")).toBe(0);
  });

  it("adds up to three sizes, shows the one tapped, and keeps them in size order", () => {
    let s = { ids: ["none"], shown: "none" };
    s = tapBatteryOption(s.ids, s.shown, "40kwh");
    expect(s).toEqual({ ids: ["none", "40kwh"], shown: "40kwh" });
    s = tapBatteryOption(s.ids, s.shown, "20kwh");
    expect(s).toEqual({ ids: ["none", "20kwh", "40kwh"], shown: "20kwh" });
    expect(tapBatteryOption(s.ids, s.shown, "60kwh")).toMatchObject({ full: true, ids: ["none", "20kwh", "40kwh"] });
  });

  it("shows an option on a tap, and takes the shown one out on a second tap", () => {
    const ids = ["none", "20kwh", "40kwh"];
    expect(tapBatteryOption(ids, "20kwh", "40kwh")).toEqual({ ids, shown: "40kwh" });
    expect(tapBatteryOption(ids, "40kwh", "40kwh")).toEqual({ ids: ["none", "20kwh"], shown: "none" });
    expect(tapBatteryOption(["20kwh"], "20kwh", "20kwh")).toEqual({ ids: ["20kwh"], shown: "20kwh" });
  });

  it("sorts and de-duplicates", () => {
    expect(sortOptions(["40kwh", "none", "9.2kwh", "40kwh"])).toEqual(["none", "9.2kwh", "40kwh"]);
  });

  it("prices each option and recommends the quickest payback", () => {
    const priced = {
      batteryTotals: { "0": 20000, "20": 30000, "40": 60000 },
      batteryInfo: { "20": { model: "Sigen 20", kwh: 20 }, "40": { model: "FOX 41.8", kwh: 41.8, estimated: true } },
    };
    const rows = batteryOptionRows(["40kwh", "none", "20kwh"], priced, 400, 10);
    expect(rows.map((r) => [r.letter, r.kwh, r.total])).toEqual([
      ["A", 0, 20000],
      ["B", 20, 30000],
      ["C", 40, 60000],
    ]);
    expect(rows[1].model).toBe("Sigen 20");
    expect(rows[2].estimated).toBe(true);
    expect(rows[1].yearlySavings).toBeGreaterThan(rows[0].yearlySavings);
    expect(rows.filter((r) => r.recommended)).toHaveLength(1);
    const best = rows.find((r) => r.recommended)!;
    for (const r of rows) if (r.paybackYears != null && !r.estimated) expect(best.paybackYears!).toBeLessThanOrEqual(r.paybackYears);
  });

  it("leaves an option unpriced when the price list has nothing for it", () => {
    const rows = batteryOptionRows(["none", "100kwh"], { batteryTotals: { "0": 20000 } }, 300, 8);
    expect(rows[1]).toMatchObject({ total: null, paybackYears: null, net25: null });
    expect(rows[0].recommended).toBe(true);
  });
});
