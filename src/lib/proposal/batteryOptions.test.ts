import { describe, expect, it } from "vitest";
import { batteryOptionRows, batteryTiles, choiceKwh, optionKwh, shownBatteryItems, sortOptions, tapBatteryOption } from "./batteryOptions";

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

describe("picked batteries, one option each (10 Nov 2026)", () => {
  const sizes = ["none", "9.2kwh", "14.6kwh", "20kwh", "40kwh", "60kwh", "80kwh", "100kwh"].map((id) => ({ id, label: id === "none" ? "None" : id.replace("kwh", "kWh") }));
  const picks = [
    { productId: "a", brand: "Sigenergy", name: "SigenStor 20", quantity: 1, ratingLabel: "20 kWh" },
    { productId: "b", brand: "FOX ESS", name: "EQ4800 20", quantity: 1, ratingLabel: "20 kWh" },
  ];

  it("gives every picked battery its own tile, keeping eight tiles", () => {
    const tiles = batteryTiles(sizes, picks, ["pick:0", "pick:1"]);
    expect(tiles).toHaveLength(8);
    expect(tiles.map((t) => t.id)).toEqual(["none", "9.2kwh", "14.6kwh", "pick:0", "pick:1", "40kwh", "60kwh", "80kwh"]);
    expect(tiles[3]).toMatchObject({ kwh: 20, label: "20kWh", pick: { name: "Sigenergy SigenStor 20" } });
  });

  it("keeps a chosen size even when a picked battery is that size", () => {
    expect(batteryTiles(sizes, picks, ["20kwh", "pick:0"]).map((t) => t.id)).toContain("20kwh");
  });

  it("prices the design with the shown pick only; older designs add them together", () => {
    const items = { battery: picks };
    expect(shownBatteryItems({ batteryCapacityId: "pick:1", batteryOptionIds: ["pick:0", "pick:1"], items })).toEqual([picks[1]]);
    expect(shownBatteryItems({ batteryCapacityId: "40kwh", batteryOptionIds: ["pick:0", "40kwh"], items })).toEqual([]);
    expect(shownBatteryItems({ batteryCapacityId: "20kwh", items })).toEqual(picks);
    expect(choiceKwh("pick:1", picks)).toBe(20);
    expect(choiceKwh("60kwh", picks)).toBe(60);
  });
});
