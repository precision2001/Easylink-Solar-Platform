/**
 * The illustration on the public /customers page. Deliberately simple and
 * fully stated on the page ("The honest bit"): it is not a quote, and real
 * prices always come from the Design Platform and the pricing engine.
 */

export const LANDING_CITIES = [
  { name: "Sydney", yieldKwhPerKw: 1450 },
  { name: "Brisbane", yieldKwhPerKw: 1500 },
  { name: "Melbourne", yieldKwhPerKw: 1250 },
  { name: "Adelaide", yieldKwhPerKw: 1500 },
  { name: "Perth", yieldKwhPerKw: 1550 },
] as const;

export const LANDING_OPTIONS = [
  { name: "Essential", spec: "6.6 kW solar", kw: 6.6, kwh: 0, price: 6500, badge: "Starter", needsThreePhase: false },
  { name: "Bill-Buster", spec: "12.76 kW solar + 15 kWh battery", kw: 12.76, kwh: 15, price: 19340, badge: "Most popular", needsThreePhase: false },
  { name: "Electrify-Ready", spec: "13.2 kW solar + 27 kWh battery, EV ready", kw: 13.2, kwh: 27, price: 27500, badge: "Future-proof", needsThreePhase: false },
  { name: "Maximum", spec: "14.52 kW solar + 30 kWh battery, three-phase", kw: 14.52, kwh: 30, price: 33500, badge: "Unlock", needsThreePhase: true },
] as const;

export const ASSUMPTIONS = { supplyPerYear: 475, gridPerKwh: 0.35, feedInPerKwh: 0.05, vppPerYear: 300 } as const;

export function estimateYear({ quarterlyBill, cityIndex, optionIndex, vpp }: { quarterlyBill: number; cityIndex: number; optionIndex: number; vpp: boolean }) {
  const A = ASSUMPTIONS;
  const o = LANDING_OPTIONS[optionIndex];
  const today = quarterlyBill * 4;
  const use = Math.max(0, (today - A.supplyPerYear) / A.gridPerKwh);
  const gen = o.kw * LANDING_CITIES[cityIndex].yieldKwhPerKw;
  const share = o.kwh ? Math.min(0.92, 0.4 + (o.kwh / Math.max(1, use / 365)) * 0.5) : 0.4;
  const self = Math.min(use * share, gen * 0.8);
  const imports = (use - self) * A.gridPerKwh;
  const exports = Math.max(0, gen - self) * 0.85 * A.feedInPerKwh;
  const vppCredit = vpp && o.kwh ? A.vppPerYear : 0;
  const net = A.supplyPerYear + imports - exports - vppCredit;
  return { today, net, save: today - net, supply: A.supplyPerYear, imports, exports, vpp: vppCredit };
}
