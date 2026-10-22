import { describe, expect, it } from "vitest";

import {
  QUOTE_DEFAULTS,
  SAMPLE_PRICE_BOOK as pb,
  auDate,
  batteryStcs,
  deemingYearsFor,
  panelStcEstimate,
  money,
  priceQuote,
  rate,
  sellIncGst,
  solarStcs,
  tradePrice,
} from "./quote-engine";

/**
 * The figures asserted here are the mock's own published output for its
 * default inputs. They are the contract: if one of these moves, the quote
 * tester no longer agrees with the pricing rules it claims to implement.
 */
describe("the default quote", () => {
  const q = priceQuote(pb, QUOTE_DEFAULTS);

  it("sizes the array from the panel count", () => {
    expect(q.arrayKw).toBe(8.36);
  });

  it("auto-sizes to the smallest hybrid that carries the array", () => {
    expect(q.inverter?.model).toBe("Hybrid inverter 8 kW");
  });

  it("totals supply and install separately", () => {
    expect(q.supplyTotal).toBe(9410);
    expect(q.installTotal).toBe(4065);
    expect(q.cost).toBe(13475);
  });

  it("stacks margin then GST", () => {
    expect(Math.round(q.sellEx)).toBe(15496);
    expect(Math.round(q.priceBeforeStcs)).toBe(17046);
    expect(Math.round(q.marginDollars)).toBe(2021);
  });

  it("claims 57 solar and 91 battery certificates", () => {
    expect(q.stcLines.map((l) => l.count)).toEqual([57, 91]);
    expect(q.stcCount).toBe(148);
    expect(q.stcValue).toBe(5550);
  });

  it("lands on the net price the customer pays", () => {
    expect(Math.round(q.net)).toBe(11496);
  });

  it("quotes cleanly", () => {
    expect(q.blocks).toEqual([]);
  });

  it("shows its working", () => {
    expect(q.stcLines[0].label).toBe(
      "Solar STCs: ⌊8.36 kW × 1.382 × 5 yrs⌋ = 57 × $37.5",
    );
    expect(q.stcLines[1].label).toBe(
      "Battery STCs: ⌊(13.5 kWh @ 100%) × 6.8⌋ = 91 × $37.5",
    );
  });

  it("prices each line with margin and GST", () => {
    expect(q.lines.map((l) => [l.item, Math.round(l.sellEx), Math.round(l.sellInc)])).toEqual([
      ["Trina Vertex 440W (Standard)", 3933, 4326],
      ["Hybrid inverter 8 kW", 2530, 2783],
      ["LFP battery 13.5 kWh", 7941, 8735],
      ["Design, permits, DNSP approval, metering", 1093, 1202],
    ]);
  });
});

/**
 * The "every system type, same inputs" grid: net inc GST under all four
 * installation × STC modes, for each of the six system types. These are the
 * mock's published figures.
 */
describe("every system type on the default inputs", () => {
  const grid = (type: Parameters<typeof priceQuote>[2]) =>
    ([
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ] as const).map(([install, stc]) =>
      Math.round(priceQuote(pb, QUOTE_DEFAULTS, type, install, stc).net),
    );

  it.each([
    ["solar", [5288, 7426, 3928, 3928]],
    ["combo", [11496, 17046, 12093, 12093]],
    ["battery", [8801, 12214, 9304, 9304]],
    ["expansion", [3391, 5528, 2473, 2473]],
    ["inverter", [1898, 1898, 1644, 1644]],
    ["ev", [1898, 1898, 1328, 1328]],
  ] as const)("prices %s", (type, expected) => {
    expect(grid(type)).toEqual([...expected]);
  });

  it("reports the certificate count for the installed, with-STC column", () => {
    const counts = (["solar", "combo", "battery", "expansion", "inverter", "ev"] as const).map(
      (t) => priceQuote(pb, QUOTE_DEFAULTS, t, true, true).stcCount,
    );
    expect(counts).toEqual([57, 148, 91, 57, 0, 0]);
  });

  it("blocks nothing on these inputs", () => {
    const blocked = (["solar", "combo", "battery", "expansion", "inverter", "ev"] as const).filter(
      (t) => priceQuote(pb, QUOTE_DEFAULTS, t, true, true).blocks.length > 0,
    );
    expect(blocked).toEqual([]);
  });
});

describe("system types that reuse existing equipment", () => {
  it("prices a panel add-on with no inverter at all", () => {
    const q = priceQuote(pb, QUOTE_DEFAULTS, "expansion");
    expect(q.inverter).toBeNull();
    expect(q.lines.map((l) => l.item)).toEqual([
      "Trina Vertex 440W (Standard)",
      "Design, permits, DNSP approval, metering",
    ]);
    expect(q.warns.join(" ")).toContain("existing inverter can take the extra panels");
  });

  it("sizes an inverter swap against the array already on the roof", () => {
    const q = priceQuote(pb, QUOTE_DEFAULTS, "inverter");
    expect(q.arrayKw).toBe(8.36);
    expect(q.inverter?.model).toBe("String inverter 8 kW");
    // No panels in the price, and no design fee on an inverter-only job.
    expect(q.lines.map((l) => l.item)).toEqual(["String inverter 8 kW"]);
  });

  it("sizes a battery retrofit for the battery, not the array", () => {
    const q = priceQuote(pb, QUOTE_DEFAULTS, "battery");
    expect(q.inverter?.model).toBe("AC-coupled battery inverter 5 kW");
    expect(q.blocks).toEqual([]);
  });
});

describe("supply only", () => {
  const q = priceQuote(pb, QUOTE_DEFAULTS, "combo", false, true);

  it("drops install labour and adds delivery", () => {
    expect(q.installTotal).toBe(0);
    expect(q.lines.at(-1)?.item).toBe("Delivery (supply only)");
  });

  it("claims no certificates and says why", () => {
    expect(q.stcValue).toBe(0);
    expect(q.notes.join(" ")).toContain("accredited installer installs the system");
  });
});

describe("battery certificates", () => {
  it("earns nothing under 5 kWh", () => {
    expect(batteryStcs(4.9, "2026-11-15").count).toBe(0);
  });

  it("counts every kWh in full before the tiers came in", () => {
    const r = batteryStcs(20, "2026-04-30");
    expect(r.factor).toBe(8.4);
    expect(r.count).toBe(Math.floor(20 * 8.4));
    expect(r.bands).toEqual([]);
  });

  it("caps the pre-tier rate at 50 kWh", () => {
    expect(batteryStcs(100, "2026-04-30").count).toBe(Math.floor(50 * 8.4));
  });

  it("tiers capacity above 14 kWh", () => {
    const r = batteryStcs(28, "2026-11-15");
    // 14 kWh at 100% plus 14 kWh at 60%.
    expect(r.weightedKwh).toBeCloseTo(22.4);
    expect(r.count).toBe(Math.floor(22.4 * 6.8));
  });

  it("earns nothing on capacity above 50 kWh", () => {
    expect(batteryStcs(60, "2026-11-15").count).toBe(batteryStcs(50, "2026-11-15").count);
  });

  it("earns nothing once the scheme has run out", () => {
    expect(batteryStcs(13.5, "2031-01-01").count).toBe(0);
  });

  it("does not claim for a battery on a site with no panels", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "battery", existing: false }, "battery");
    expect(q.stcValue).toBe(0);
    expect(q.notes.join(" ")).toContain("must connect to solar panels");
  });

  it("warns about capacity that only partly counts", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, batteryId: "b7" });
    expect(q.warns.join(" ")).toContain("only 15% of the STC factor");
  });
});

describe("solar certificates", () => {
  it("floors array kW by zone rating by deeming years", () => {
    expect(solarStcs(8.36, 3, "2026-11-15")).toBe(57);
    expect(solarStcs(8.36, 1, "2026-11-15")).toBe(67);
  });

  it("runs out after 2030", () => {
    expect(deemingYearsFor("2031-06-01")).toBe(0);
    expect(solarStcs(8.36, 3, "2031-06-01")).toBe(0);
  });
});

describe("blocking rules", () => {
  it("blocks an array over the DC:AC ratio", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, inverterId: "i6" });
    expect(q.blocks.join(" ")).toContain("more than 133% of the 5 kW inverter");
  });

  it("blocks a three-phase inverter on a single-phase supply", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, inverterId: "i9", count: 30 });
    expect(q.blocks.join(" ")).toContain("needs a three-phase supply");
  });

  it("blocks an inverter over the connection limit", () => {
    // Nothing in the sample book exceeds 30 kW, so the rule needs a row that
    // does. It guards against a future price book that adds one.
    const oversize = {
      ...pb,
      inverters: [
        ...pb.inverters,
        {
          id: "big",
          kind: "Hybrid" as const,
          model: "Hybrid inverter 40 kW 3-phase",
          kw: 40,
          phase: 3 as const,
          supply: 6000,
          install: 700,
        },
      ],
    };
    const q = priceQuote(oversize, { ...QUOTE_DEFAULTS, inverterId: "big", phase: 3, count: 90 });
    expect(q.blocks.join(" ")).toContain("over the 30 kW inverter limit");
  });

  it("allows the largest inverter in the book on a three-phase supply", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, inverterId: "i10", phase: 3, count: 60 });
    expect(q.inverter?.kw).toBe(20);
    expect(q.blocks).toEqual([]);
  });

  it("asks for a panel count", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, count: 0 });
    expect(q.blocks).toContain("Enter a panel count.");
  });

  it("ignores an inverter of the wrong kind and auto-sizes instead", () => {
    // i2 is a string inverter; a solar + battery job takes a hybrid.
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, inverterId: "i2" });
    expect(q.inverter?.model).toBe("Hybrid inverter 8 kW");
  });
});

describe("three-phase supply", () => {
  it("adds three-phase works to an installed job", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, phase: 3 });
    expect(q.lines.map((l) => l.item)).toContain("Three-phase works");
  });

  it("does not add them to an EV charger", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, phase: 3 }, "ev");
    expect(q.lines.map((l) => l.item)).not.toContain("Three-phase works");
  });
});

/** The columns the price book screen derives for each row. */
describe("the price book's derived columns", () => {
  const s = pb.settings;

  it("marks trade price up from supply cost alone, not supply plus install", () => {
    // Installers pay their own labour, so the trade price never includes ours.
    expect(tradePrice(95, s)).toBe(103);
    expect(tradePrice(5805, s)).toBe(6269);
  });

  it("prices a panel installed", () => {
    expect(Math.round(sellIncGst(95 + 85, s))).toBe(228);
  });

  it("prices a battery installed and nets off its certificates", () => {
    const inc = sellIncGst(5805 + 1100, s);
    const net = inc - batteryStcs(13.5, "2026-11-15").count * s.stcPrice;
    expect(Math.round(inc)).toBe(8735);
    expect(Math.round(net)).toBe(5322);
  });

  it("estimates per-panel certificates without flooring", () => {
    expect(panelStcEstimate(440, 3, "2026-11-15").toFixed(2)).toBe("3.04");
    // 19 of them would sum past the 57 the system actually earns, because the
    // real calculation floors once rather than per panel.
    expect(panelStcEstimate(440, 3, "2026-11-15") * 19).toBeGreaterThan(57);
  });

  it("writes dates the Australian way round", () => {
    expect(auDate("2026-11-15")).toBe("15/11/2026");
  });
});

describe("formatting", () => {
  it("rounds and groups", () => {
    expect(money(11495.875)).toBe("$11,496");
  });

  it("uses a real minus sign", () => {
    expect(money(-5550)).toBe("−$5,550");
  });

  it("rounds a negative half away from zero, not toward it", () => {
    // Rounding the signed value would give −$2,137 and understate the discount.
    expect(money(-2137.5)).toBe("−$2,138");
    expect(money(-3412.5)).toBe("−$3,413");
  });

  it("keeps cents on a rate", () => {
    expect(rate(37.5)).toBe("$37.5");
    expect(rate(40)).toBe("$40");
  });
});
