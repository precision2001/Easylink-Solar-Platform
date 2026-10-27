import { describe, expect, it } from "vitest";

import {
  BATTERY_SIZES,
  DCAC_LIMIT_WITH_BATTERY,
  PANEL_KW,
  PERIOD_DAYS,
  batteryStcs,
  defaultsFor,
  finalStepName,
  generation,
  importCurve,
  lifetimeSavings,
  money,
  priceSystem,
  profileFor,
  recommendedBattery,
  simulate,
  solarStcs,
  yearlyConsumption,
} from "./simulation";

/**
 * The screenshot is the Operations view: Raj Malhotra, $620 a quarter, 15
 * panels on a 5 kW inverter, no battery. Every figure below is read off that
 * render, so these tests are the contract with the design.
 */
const RAJ = {
  bill: 620,
  days: 91,
  rate: 0.37,
  fit: 0.05,
  panels: 15,
  inverterKw: 5,
  battery: 0,
  mode: "self" as const,
  age: 0,
};

function rajCase() {
  const consumption = yearlyConsumption(RAJ.bill, RAJ.days, RAJ.rate);
  const arrayKw = RAJ.panels * PANEL_KW;
  const gen = generation(arrayKw, RAJ.age);
  const r = simulate({
    battery: RAJ.battery,
    consumption,
    generation: gen,
    mode: RAJ.mode,
    age: RAJ.age,
  });
  const exportIncome = r.exported * RAJ.fit + r.peakIncome;
  const avoided = r.selfUsed * RAJ.rate;
  return { consumption, arrayKw, gen, r, exportIncome, avoided, yearly: exportIncome + avoided };
}

describe("array sizing", () => {
  it("sizes the array from the panel count", () => {
    expect(RAJ.panels * PANEL_KW).toBeCloseTo(6.6, 10);
  });

  it("reports the panel-to-inverter ratio the STC rule is checked against", () => {
    const ratio = Math.round(((RAJ.panels * PANEL_KW) / RAJ.inverterKw) * 100);
    expect(ratio).toBe(132);
  });
});

describe("consumption from a power bill", () => {
  it("backs 5,636 kWh a year out of $620 a quarter", () => {
    expect(Math.round(rajCase().consumption)).toBe(5636);
  });

  it("values that consumption at the usage rate", () => {
    expect(money(rajCase().consumption * RAJ.rate)).toBe("$2,085");
  });

  it("returns nothing when the bill is only the supply charge", () => {
    // 91 days of supply at $1.10 is just over $100, so a $100 bill is all
    // standing charge and no usage.
    expect(yearlyConsumption(100, 91, 0.37)).toBe(0);
  });

  it("floors the usage rate so a zero rate cannot divide by zero", () => {
    expect(Number.isFinite(yearlyConsumption(620, 91, 0))).toBe(true);
  });
});

describe("the yearly energy balance", () => {
  it("matches every figure on the Savings step", () => {
    const { consumption, r, exportIncome, avoided } = rajCase();
    const gridFree = Math.max(0, Math.round((1 - r.imported / consumption) * 100));

    expect(gridFree).toBe(35);
    expect(money(exportIncome)).toBe("$383");
    expect(money(avoided)).toBe("$730");
    expect(Math.round(r.exported)).toBe(7663);
  });

  it("splits the bill into supply, grid usage and export credit", () => {
    const { r, exportIncome } = rajCase();
    const f = PERIOD_DAYS.year / 365;
    const supply = 1.1 * 365 * f;
    const grid = r.imported * RAJ.rate * f;

    expect(money(supply)).toBe("$402");
    expect(money(grid)).toBe("$1,355");
    expect(money(exportIncome * f)).toBe("$383");
    // Still paying the grid, because there is no battery to carry the evening.
    expect(money(supply + grid - exportIncome * f)).toBe("$1,374");
    expect(money(-(supply + grid - exportIncome * f))).toBe("−$1,374");
  });

  it("covers all twelve months", () => {
    const { r } = rajCase();
    expect(r.monthlyLoad).toHaveLength(12);
    expect(r.monthlyImport).toHaveLength(12);
  });

  it("conserves energy: load equals direct solar, battery and grid", () => {
    const { consumption, r } = rajCase();
    expect(r.selfUsed + r.imported).toBeCloseTo(consumption, 6);
  });

  it("pays no peak income in self-consumption mode", () => {
    expect(rajCase().r.peakIncome).toBe(0);
  });
});

describe("battery behaviour", () => {
  const { consumption, gen } = rajCase();

  it("recommends 15 kWh for this home", () => {
    expect(recommendedBattery(consumption, gen, "self", 0)).toBe(15);
  });

  it("imports less from the grid as the battery grows", () => {
    const curve = importCurve(consumption, gen, "self", 0);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeLessThanOrEqual(curve[i - 1] + 1e-9);
    }
  });

  it("earns peak income only when export-optimised", () => {
    const self = simulate({ battery: 20, consumption, generation: gen, mode: "self", age: 0 });
    const exp = simulate({ battery: 20, consumption, generation: gen, mode: "export", age: 0 });
    expect(self.peakIncome).toBe(0);
    expect(exp.peakIncome).toBeGreaterThan(0);
    // Holding charge back for the peak leaves less for the house, so the
    // home draws more from the grid.
    expect(exp.imported).toBeGreaterThan(self.imported);
  });

  it("loses usable capacity as the system ages", () => {
    const young = simulate({ battery: 20, consumption, generation: gen, mode: "self", age: 0 });
    const old = simulate({ battery: 20, consumption, generation: gen, mode: "self", age: 15 });
    expect(old.imported).toBeGreaterThan(young.imported);
  });

  it("walks the published size ladder", () => {
    expect(BATTERY_SIZES[0]).toBe(0);
    expect(BATTERY_SIZES[BATTERY_SIZES.length - 1]).toBe(100);
  });
});

describe("certificates", () => {
  it("earns solar STCs for a compliant array", () => {
    expect(solarStcs(6.6, 132)).toBe(45);
  });

  it("earns nothing once the array passes 133% of the inverter", () => {
    // The oversize rule is all-or-nothing: one point over and the whole
    // array stops earning, which is why the design check blocks it.
    expect(solarStcs(6.6, 134)).toBe(0);
    expect(solarStcs(6.6, 133)).toBe(45);
  });

  it("lets a system with a battery reach 200%", () => {
    expect(solarStcs(13.2, 200, 200)).toBe(91);
    expect(solarStcs(13.2, 201, 200)).toBe(0);
  });

  it("caps battery certificates at the first 50 kWh", () => {
    expect(batteryStcs(10)).toBe(68);
    expect(batteryStcs(50)).toBe(340);
    // A 100 kWh battery is allowed on a home, but only half of it rebates.
    expect(batteryStcs(100)).toBe(340);
  });
});

describe("pricing", () => {
  it("prices Raj's system off the shared list", () => {
    const p = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "prem", ratioPercent: 132 });
    expect(p.solarGross).toBe(7260);
    expect(p.batteryGross).toBe(0);
    expect(p.solarStcs).toBe(45);
    expect(p.batteryStcs).toBe(0);
    expect(p.total).toBe(7260 - 45 * 38);
  });

  it("charges more for the all-black tier and less for standard", () => {
    const base = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "prem", ratioPercent: 132 });
    const black = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "black", ratioPercent: 132 });
    const std = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "std", ratioPercent: 132 });
    expect(black.total - base.total).toBe(25 * 15);
    expect(std.total - base.total).toBe(-15 * 15);
  });

  it("drops the whole solar rebate when the array is oversized", () => {
    const ok = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "prem", ratioPercent: 132 });
    const over = priceSystem({ arrayKw: 6.6, panels: 15, battery: 0, tier: "prem", ratioPercent: 140 });
    expect(over.total - ok.total).toBe(45 * 38);
  });

  it("discounts a battery by its capped certificates", () => {
    const p = priceSystem({ arrayKw: 6.6, panels: 15, battery: 100, tier: "prem", ratioPercent: 132 });
    expect(p.batteryGross).toBe(90000);
    expect(p.batteryStcs).toBe(340);
  });
});

describe("lifetime savings", () => {
  it("fades the yearly saving over 25 years", () => {
    const flat = 1000 * 25;
    expect(lifetimeSavings(1000)).toBeLessThan(flat);
    expect(lifetimeSavings(1000)).toBeGreaterThan(flat * 0.88);
  });

  it("is zero when nothing is saved", () => {
    expect(lifetimeSavings(0)).toBe(0);
  });
});

describe("money formatting", () => {
  it("groups thousands and rounds to whole dollars", () => {
    expect(money(1374.4)).toBe("$1,374");
    expect(money(0)).toBe("$0");
  });

  it("uses a true minus sign so figures align in a column", () => {
    expect(money(-383)).toBe("−$383");
    expect(money(-383).startsWith("-")).toBe(false);
  });
});

describe("who the design is for", () => {
  it("gives Operations the lead from Quotes & Leads", () => {
    const p = profileFor("distributor");
    expect(p.title).toBe("Raj Malhotra");
    expect(p.network).toBe("Endeavour Energy");
    expect(p.roofMax).toBe(24);
  });

  it("gives every other role Daniel's house", () => {
    expect(profileFor("installer").title).toBe("Daniel Moretti");
    expect(profileFor("customer").roofMax).toBe(38);
  });

  it("starts the public website with empty contact fields", () => {
    const pub = defaultsFor("public");
    expect(pub.name).toBe("");
    expect(pub.email).toBe("");
    // The sizing defaults still apply — only the identity is blank.
    expect(pub.panels).toBe(29);
  });

  it("seeds Operations with the lead's own numbers", () => {
    const d = defaultsFor("distributor");
    expect(d.bill).toBe(620);
    expect(d.panels).toBe(15);
    expect(d.inverter).toBe("s5");
    expect(d.battery).toBe(0);
  });

  it("names the last step for what that role does with the design", () => {
    expect(finalStepName("distributor")).toBe("Save & send");
    expect(finalStepName("installer")).toBe("Share");
    expect(finalStepName("customer")).toBe("Save");
    expect(finalStepName("public")).toBe("Sign in");
  });
});

describe("roof capacity", () => {
  it("limits panels to what the inverter can use under the 133% rule", () => {
    // 9.9 kW hybrid: 9.9 * 1.33 / 0.44 = 29 panels.
    expect(Math.floor((9.9 * 1.33) / PANEL_KW)).toBe(29);
    // 5 kW string: only 15.
    expect(Math.floor((5 * 1.33) / PANEL_KW)).toBe(15);
  });

  it("doubles the inverter's panel allowance with a battery", () => {
    // 9.9 kW hybrid with a battery: 9.9 * 2.0 / 0.44 = 45 panels.
    expect(Math.floor((9.9 * DCAC_LIMIT_WITH_BATTERY) / PANEL_KW)).toBe(45);
  });

  it("counts the roof faces that hold them", () => {
    const p = profileFor("distributor");
    expect(p.faces.reduce((a, f) => a + f.max, 0)).toBe(p.roofMax);
  });
});
