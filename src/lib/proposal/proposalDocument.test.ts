import { describe, expect, it } from "vitest";

import { buildProposalDocument, cumulativeGain, designBatteryKwh, greetingName } from "./proposalDocument";
import { estimateSavings, type ProposalPricingResponse } from "./proposalPricing";
import { DESIGN_PROPOSAL_DEFAULTS, emptyEquipmentItems, type DesignProposalState } from "@/lib/store/designProposalSlice";

const links = {
  portalUrl: "https://easylinksolar.com.au/customers/design",
  portalLabel: "easylinksolar.com.au/customers/design",
  referralUrl: "https://easylinksolar.com.au/designs",
  referralCode: null,
};

function design(over: Partial<DesignProposalState["equipment"]> = {}, bill = "$270"): DesignProposalState {
  return {
    ...DESIGN_PROPOSAL_DEFAULTS,
    customer: { ...DESIGN_PROPOSAL_DEFAULTS.customer, name: "Alex Smith", address: "12 Sample St, Sans Souci NSW 2219" },
    summary: { ...DESIGN_PROPOSAL_DEFAULTS.summary, systemSize: "10.56 kW", totalPanels: "24" },
    equipment: { ...DESIGN_PROPOSAL_DEFAULTS.equipment, numberOfPanels: "24", items: emptyEquipmentItems(), ...over },
    pricing: { ...DESIGN_PROPOSAL_DEFAULTS.pricing, currentBill: bill, billPeriod: "quarter", totalSystemPrice: "$19,290" },
  };
}

function quote(net: number, batteryKwh: number) {
  return {
    items: [], itemTotal: 0, installTotal: 0,
    priceBeforeStcs: net + 8160, stcCount: 0, stcValue: 8160,
    stcLines: [{ label: "Solar STCs", count: 72, value: 2700 }, { label: "Battery STCs", count: 140, value: 5460 }],
    net, arrayKw: 10.56, phase: 1 as const,
    panel: { model: "AXITEC AC-440", w: 440 },
    inverter: { model: "FoxESS KH10", kw: 10, phase: 1 as const },
    battery: batteryKwh > 0 ? { model: "FoxESS CQ7", kwh: batteryKwh, inverterBuiltIn: false } : null,
    blocks: [], notes: [],
  };
}

const pricing: ProposalPricingResponse = {
  selected: quote(19290, 20),
  tierTotals: { standard: 19290 },
  tierInfo: {},
  batteryTotals: { "0": 8990, "9.2": 14990, "14.6": 17290, "20": 19290, "40": 26990 },
  installDate: "2026-11-01",
  zone: 3,
};

const today = new Date(2026, 9, 31);

describe("buildProposalDocument", () => {
  it("uses the same savings model as the proposal step", () => {
    const doc = buildProposalDocument({ proposal: design({ batteryCapacityKwh: 20 }), pricing, links, today });
    const s = estimateSavings(270, 10.56, 20);
    expect(doc.yearlyGain).toBe(Math.round(s.yearlySavings));
    expect(doc.generationKwh).toBe(s.generationKwh);
    expect(doc.exportedKwh).toBe(s.exportedKwh);
    expect(doc.powerNotBought + doc.exportIncome).toBe(doc.yearlyGain);
  });

  it("prices from the engine and holds it 30 days", () => {
    const doc = buildProposalDocument({ proposal: design({ batteryCapacityKwh: 20 }), pricing, links, today });
    expect(doc.price).toBe(19290);
    expect(doc.gst).toBeCloseTo(1753.64, 2);
    expect(doc.validUntil).toBe("30 November 2026");
    expect(doc.rebateLines.map((l) => l.value)).toEqual([2700, 5460]);
    expect(doc.paybackYears).toBe(Math.round((19290 / doc.yearlyGain) * 10) / 10);
  });

  it("shows bills in the customer's own period", () => {
    const doc = buildProposalDocument({ proposal: design({ batteryCapacityKwh: 20 }), pricing, links, today });
    expect(doc.billPeriodLabel).toBe("quarter");
    expect(doc.billBefore).toBe(810);
  });

  it("offers solar only, the design and a bigger battery, design marked", () => {
    const doc = buildProposalDocument({ proposal: design({ batteryCapacityKwh: 20 }), pricing, links, today });
    expect(doc.options.map((o) => o.batteryKwh)).toEqual([0, 20, 40]);
    expect(doc.options.filter((o) => o.isDesign).map((o) => o.price)).toEqual([19290]);
    expect(doc.options[0].price).toBe(8990);
  });

  it("offers two battery upgrades when the design has none", () => {
    const doc = buildProposalDocument({
      proposal: design({ batteryCapacityKwh: 0 }),
      pricing: { ...pricing, selected: quote(8990, 0) },
      links,
      today,
    });
    expect(doc.batteryLine).toBeNull();
    expect(doc.options.map((o) => o.batteryKwh)).toEqual([0, 9.2, 14.6]);
    expect(doc.options[0].isDesign).toBe(true);
  });

  it("still builds without the pricing engine, from the stored price", () => {
    const doc = buildProposalDocument({ proposal: design(), pricing: null, links, today });
    expect(doc.price).toBe(19290);
    expect(doc.options).toEqual([]);
    expect(doc.rebateLines).toEqual([]);
  });

  it("counts cumulative gain after paying for the system", () => {
    const c = cumulativeGain(2000, 10000, 25);
    expect(c[0]).toBeCloseTo(-8000, 0);
    expect(c[24]).toBeGreaterThan(2000 * 25 - 10000);
  });
});

describe("designBatteryKwh", () => {
  it("prefers the energy step size, then items, then the proposal pick", () => {
    expect(designBatteryKwh(design({ batteryCapacityKwh: 13 }))).toBe(13);
    expect(
      designBatteryKwh(
        design({
          items: { ...emptyEquipmentItems(), battery: [{ productId: "b", brand: "BYD", name: "HVM", quantity: 2, ratingLabel: "8.3 kWh" }] },
        }),
      ),
    ).toBeCloseTo(16.6);
    expect(designBatteryKwh(design({ batteryCapacityId: "14.6kwh" }))).toBe(14.6);
  });
});

describe("greetingName", () => {
  it("keeps a title with the name", () => {
    expect(greetingName("Mrs Elham")).toBe("Mrs Elham");
    expect(greetingName("dr. Jane Citizen")).toBe("dr. Citizen");
  });
  it("uses the first name otherwise", () => {
    expect(greetingName("Alex Smith")).toBe("Alex");
    expect(greetingName("  ")).toBe("there");
  });
});

describe("rebate lines", () => {
  it("shows customers the rebate, not the engine's working", () => {
    const p = {
      ...pricing,
      selected: {
        ...pricing.selected,
        stcLines: [
          { label: "Solar STCs: (18.48 kW × 1.382 × 5 yrs) = 127", count: 127, value: 4763 },
          { label: "Battery STCs: ((14 kWh @ 100%) × 6.8) = 119", count: 119, value: 4463 },
        ],
      },
    };
    const doc = buildProposalDocument({ proposal: design({ batteryCapacityKwh: 20 }), pricing: p, links, today });
    expect(doc.rebateLines.map((l) => l.label)).toEqual(["Federal solar rebate (127 STCs)", "Federal battery rebate (119 STCs)"]);
  });
});
