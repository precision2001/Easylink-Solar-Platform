import { describe, expect, it } from "vitest";
import { chosenProductsOf, designBatteryKwh, inverterMatchedToBattery } from "./proposalDocument";
import type { DesignProposalState } from "@/lib/store/designProposalSlice";

const B = "75020a62-b9a0-480f-b2ce-3df2b6dfc762";
const P = "8febd211-1723-4a2f-a99e-7cd15db1105e";
const proposal = (items: Partial<DesignProposalState["equipment"]["items"]>, batteryCapacityKwh?: number) =>
  ({
    equipment: {
      batteryCapacityKwh,
      items: { solarPanel: [], inverter: [], battery: [], evCharger: [], heatPump: [], ...items },
    },
  }) as unknown as DesignProposalState;
const battery = { productId: B, brand: "GoodWe", name: "ESA 17.7kWh (2 × 9.0 module)", quantity: 1, ratingLabel: "17.7 kWh" };

describe("the customer's picked products", () => {
  it("are sent to pricing (same battery added three times counts three)", () => {
    const p = proposal({ solarPanel: [{ productId: P, brand: "Aiko", name: "Neostar 475W", quantity: 1, ratingLabel: "475 W" }], battery: [battery, battery, battery] });
    expect(chosenProductsOf(p)).toEqual({ panelId: P, batteries: [{ id: B, qty: 3 }] });
  });

  it("set the battery size over the Energy step's", () => {
    expect(designBatteryKwh(proposal({ battery: [battery, battery, battery] }, 70))).toBeCloseTo(53.1, 1);
    expect(designBatteryKwh(proposal({}, 70))).toBe(70);
  });

  it("are left out when nothing was picked", () => {
    expect(chosenProductsOf(proposal({}))).toBeUndefined();
  });
});

describe("an inverter the customer didn't pick", () => {
  const quote = { inverter: { model: "GoodWe ESA (EHA) 8kW 1-phase", kw: 8, phase: 1 }, battery: { model: "GoodWe ESA 17.7kWh", kwh: 17.7, inverterBuiltIn: false } };
  it("is marked as matched to the battery", () => {
    expect(inverterMatchedToBattery(proposal({ battery: [battery] }), quote)).toBe(true);
  });
  it("is not marked when the customer picked one, or there's no battery", () => {
    const inv = { productId: B, brand: "GoodWe", name: "ESA 8kW", quantity: 1, ratingLabel: "8 kW" };
    expect(inverterMatchedToBattery(proposal({ inverter: [inv] }), quote)).toBe(false);
    expect(inverterMatchedToBattery(proposal({}), { ...quote, battery: null })).toBe(false);
  });
});
