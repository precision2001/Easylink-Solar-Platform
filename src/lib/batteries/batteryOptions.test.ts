import { describe, expect, it } from "vitest";
import { batteryBrands, brandSizeOptions, findSize, sizeLayout, type BatteryOptions } from "./batteryOptions";
import { chosenProductsOf, designBatteryKwh } from "@/lib/proposal/proposalDocument";
import { proposalProducts } from "@/lib/customers/custom-design";
import type { DesignProposalState } from "@/lib/store/designProposalSlice";

const size = (id: string, phase: 1 | 3, modules: number, kwh: number, priced: "exact" | "estimate" = "exact") => ({
  id, phase, stacks: 1, modulesPerStack: modules, modules, kwh, inverters: [phase === 1 ? "FOX KH7–KH10.5" : "FOX H3 Smart 5–15 kW"], label: `${kwh} kWh`, priced,
});
const OPTS: BatteryOptions = {
  checked: "2026-11-11",
  ranges: [
    { id: "fox-cq7", brand: "FoxESS", range: "CQ7", module: "CQ7-S", moduleKwh: 6.96, cecStatus: "listed", cec: "", sizes: [size("size:fox-cq7:1:1x4", 1, 4, 27.84), size("size:fox-cq7:1:1x5", 1, 5, 34.8, "estimate"), size("size:fox-cq7:3:1x8", 3, 8, 55.68)] },
    { id: "tesla-pw3", brand: "Tesla", range: "Powerwall 3", module: "PW3", moduleKwh: 13.5, cecStatus: "listed", cec: "", sizes: [size("size:tesla-pw3:1:1x1", 1, 1, 13.5)] },
  ],
};

describe("battery sizes on the Design Platform", () => {
  it("narrows brands and sizes to the home's supply", () => {
    expect(batteryBrands(OPTS)).toEqual(["FoxESS", "Tesla"]);
    expect(batteryBrands(OPTS, 3)).toEqual(["FoxESS"]);
    expect(brandSizeOptions(OPTS, "FoxESS", 1).map((o) => o.value)).toEqual(["size:fox-cq7:1:1x4", "size:fox-cq7:1:1x5"]);
    expect(brandSizeOptions(OPTS, "FoxESS", 1)[1].label).toMatch(/price estimated/);
  });

  it("finds the range and size behind an id", () => {
    const hit = findSize(OPTS, "size:fox-cq7:3:1x8");
    expect(hit?.range.range).toBe("CQ7");
    expect(sizeLayout(hit!.size)).toBe("8 modules · three phase");
    expect(findSize(OPTS, "75020a62-b9a0-480f-b2ce-3df2b6dfc762")).toBeNull();
  });

  const proposal = {
    equipment: {
      numberOfPanels: "19",
      items: {
        solarPanel: [],
        inverter: [],
        battery: [{ productId: "size:fox-cq7:1:1x4", brand: "FoxESS", name: "CQ7 · 4 modules · single phase", quantity: 1, ratingLabel: "27.84 kWh" }],
        evCharger: [],
        heatPump: [],
      },
    },
  } as unknown as DesignProposalState;

  it("sends a picked size to pricing, sized by its kWh", () => {
    expect(chosenProductsOf(proposal)).toEqual({ batteries: [{ id: "size:fox-cq7:1:1x4", qty: 1 }] });
    expect(designBatteryKwh(proposal)).toBeCloseTo(27.84, 2);
  });

  it("keeps a picked size out of the design's product rows", () => {
    expect(proposalProducts(proposal)).toBeUndefined();
  });
});
