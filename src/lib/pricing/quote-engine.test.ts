import { describe, expect, it } from "vitest";

import {
  QUOTE_DEFAULTS,
  SAMPLE_PRICE_BOOK as pb,
  type PriceBook,
  auDate,
  batteryInstall,
  batteryStcs,
  deemingYearsFor,
  money,
  panelStcEstimate,
  priceQuote,
  rate,
  solarStcs,
  tradePrice,
} from "./quote-engine";

/**
 * Pricing engine v2 on the placeholder sample book (the real book lives in
 * the backend). Hand-worked figures for the default quote — 19 × 440 W ($90),
 * 14 kWh battery ($4,200), Zone 3, installed 15 Nov 2026:
 *   panels   1,710 cost → 2,163.15 item (×1.15 ×1.1) + 2,508 install (8,360 W × $0.30)
 *   inverter 1,500 cost → 1,897.50 item, installed free with panels (5 kW hybrid: 200% → 10 kW ≥ 8.36)
 *   battery  4,200 cost → 5,313.00 item + 2,000 install (up to 20 kWh)
 *   before STCs 13,881.65; STCs ⌊8.36 × 1.382 × 5⌋ = 57 + ⌊14 × 6.8⌋ = 95 → 152 × $37.50 = 5,700
 *   net 8,181.65
 */
describe("the default quote", () => {
  const q = priceQuote(pb, QUOTE_DEFAULTS);

  it("sizes the array from the panel count", () => {
    expect(q.arrayKw).toBeCloseTo(8.36, 6);
  });

  it("auto-sizes the cheapest hybrid that carries the array at 200%", () => {
    expect(q.inverter?.model).toBe("Sample hybrid inverter 5 kW");
  });

  it("prices items with margin then GST", () => {
    expect(q.itemTotal).toBeCloseTo(9373.65, 2);
    expect(q.cost).toBe(7410);
    expect(q.marginDollars).toBeCloseTo(1111.5, 2);
  });

  it("charges EasyLink's installation rates", () => {
    const by = Object.fromEntries(q.lines.map((l) => [l.kind, l.install]));
    expect(by.panel).toBeCloseTo(2508, 6);
    expect(by.inverter).toBe(0);
    expect(by.battery).toBe(2000);
    expect(q.installTotal).toBeCloseTo(4508, 6);
  });

  it("claims 57 solar and 95 battery certificates", () => {
    expect(q.stcLines.map((l) => l.count)).toEqual([57, 95]);
    expect(q.stcValue).toBe(5700);
  });

  it("lands on the net price the customer pays", () => {
    expect(q.priceBeforeStcs).toBeCloseTo(13881.65, 2);
    expect(q.net).toBeCloseTo(8181.65, 2);
    expect(q.blocks).toEqual([]);
  });
});

describe("installation rates", () => {
  const s = pb.settings;
  it("battery: $2,000 to 20 kWh, then $500 per 10 kWh or part", () => {
    expect(batteryInstall(13.5, s)).toBe(2000);
    expect(batteryInstall(20, s)).toBe(2000);
    expect(batteryInstall(20.5, s)).toBe(2500);
    expect(batteryInstall(30, s)).toBe(2500);
    expect(batteryInstall(40, s)).toBe(3000);
    expect(batteryInstall(100, s)).toBe(6000);
  });

  it("inverter swap and EV charger use their flat rates", () => {
    const swap = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "inverter" });
    expect(swap.lines.find((l) => l.kind === "inverter")?.install).toBe(750);
    const ev = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "ev" });
    expect(ev.installTotal).toBe(1000);
    expect(ev.stcCount).toBe(0);
  });
});

describe("inverter sizing", () => {
  it("allows only 133% on a string inverter with no battery", () => {
    // 19 × 440 W = 8.36 kW > 5 kW × 1.33, so the 10 kW string inverter is picked.
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "solar" });
    expect(q.inverter?.model).toBe("Sample string inverter 10 kW");
  });

  it("blocks an inverter over the single-phase limit", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "solar", inverterId: "i3" });
    expect(q.blocks.some((b) => /three-phase/.test(b))).toBe(true);
  });

  it("blocks an array over the DC:AC ratio", () => {
    const q = priceQuote(pb, { ...QUOTE_DEFAULTS, type: "solar", inverterId: "i1" });
    expect(q.blocks.some((b) => /133%/.test(b))).toBe(true);
  });
});

describe("built-in inverters and brand-locked batteries", () => {
  const book: PriceBook = {
    ...pb,
    inverters: [
      ...pb.inverters,
      { id: "sg5", kind: "Hybrid", model: "Sungrow SH5.0RS 5kW", kw: 5, phase: 1, supply: 1900 },
    ],
    batteries: [
      ...pb.batteries,
      { id: "pkg", model: "Package 13.4kWh (inverter built in)", kwh: 13.39, supply: 5090, inv: true, invKw: 5, pvKw: 7.6, phase: 1 },
      { id: "sbr", model: "Sungrow SBR 9.6kWh", kwh: 9.6, supply: 3546 },
    ],
  };

  it("adds no separate inverter for a package with one built in", () => {
    const q = priceQuote(book, { ...QUOTE_DEFAULTS, count: 17, batteryId: "pkg" });
    expect(q.lines.some((l) => l.kind === "inverter")).toBe(false);
    expect(q.blocks).toEqual([]);
  });

  it("blocks more PV than a built-in inverter accepts", () => {
    const q = priceQuote(book, { ...QUOTE_DEFAULTS, count: 19, batteryId: "pkg" });
    expect(q.blocks.some((b) => /7.6 kW of PV/.test(b))).toBe(true);
  });

  it("pairs a brand-locked battery with its own brand's inverter", () => {
    const q = priceQuote(book, { ...QUOTE_DEFAULTS, count: 10, batteryId: "sbr" });
    expect(q.inverter?.model).toBe("Sungrow SH5.0RS 5kW");
    expect(q.warns).toEqual([]);
  });
});

describe("STC rules", () => {
  it("tiers battery capacity 100 / 60 / 15% and floors once", () => {
    // 40 kWh: 14 + 14 × 0.6 + 12 × 0.15 = 24.2 weighted × 6.8 = 164.56 → 164
    expect(batteryStcs(40, "2026-11-15").count).toBe(164);
    expect(batteryStcs(4, "2026-11-15").count).toBe(0);
    expect(batteryStcs(14, "2027-01-15").count).toBe(79);
  });

  it("uses deeming years for the install year", () => {
    expect(deemingYearsFor("2026-11-15")).toBe(5);
    expect(deemingYearsFor("2027-03-01")).toBe(4);
    expect(solarStcs(24.2, 3, "2026-11-15")).toBe(167);
    expect(panelStcEstimate(440, 3, "2026-11-15")).toBeCloseTo(3.0404, 4);
  });

  it("gives no STCs on supply-only jobs", () => {
    const q = priceQuote(pb, QUOTE_DEFAULTS, "combo", false, true);
    expect(q.stcCount).toBe(0);
    expect(q.installTotal).toBe(0);
  });
});

describe("formatting helpers", () => {
  it("formats money, rates and dates", () => {
    expect(money(1234.4)).toBe("$1,234");
    expect(money(-50)).toBe("−$50");
    expect(rate(37.5)).toBe("$37.5");
    expect(auDate("2026-11-15")).toBe("15/11/2026");
    expect(tradePrice(100, pb.settings)).toBe(108);
  });
});
