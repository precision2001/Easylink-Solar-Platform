/**
 * Federal solar and battery discount schedule (Small-scale Technology Certificates).
 *
 * Battery (Cheaper Home Batteries Program, from 1 May 2026): STCs per usable kWh step down
 * every 1 January and 1 July to 2030, with size tiers (first 14 kWh 100%, 14–28 kWh 60%,
 * 28–50 kWh 15%, nothing above 50 kWh).
 * Solar: STCs = kW × zone rating × deeming years; the deeming period drops by one each 1 January.
 *
 * Dates are Sydney midnight. Figures are estimates for the blog's rebate check, not quotes.
 */

export const STC_PRICE_ESTIMATE = 38;
/** STC zone 3 (Sydney, Melbourne) rating, MWh per kW. */
export const ZONE_3_RATING = 1.382;

type Step = { from: Date; batteryFactor: number; solarYears: number };

/** Midnight in Sydney: AEDT (UTC+11) on 1 January, AEST (UTC+10) on 1 July. */
function sydneyMidnight(year: number, month: 1 | 5 | 7): Date {
  const offsetHours = month === 7 ? 10 : 11;
  return new Date(Date.UTC(year, month - 1, 1, -offsetHours, 0, 0));
}

const BATTERY_FACTORS: Array<[number, 1 | 5 | 7, number]> = [
  [2026, 5, 6.8],
  [2027, 1, 5.7],
  [2027, 7, 5.2],
  [2028, 1, 4.6],
  [2028, 7, 4.1],
  [2029, 1, 3.6],
  [2029, 7, 3.1],
  [2030, 1, 2.6],
  [2030, 7, 2.1],
  [2031, 1, 0],
];

function solarYearsFor(date: Date): number {
  // Calendar year in Sydney decides the deeming period: 2026 → 5 … 2030 → 1, 2031 → 0.
  const sydneyYear = new Date(date.getTime() + 11 * 3600_000).getUTCFullYear();
  return Math.max(0, Math.min(5, 2031 - sydneyYear));
}

export const REBATE_STEPS: Step[] = BATTERY_FACTORS.map(([y, m, f]) => {
  const from = sydneyMidnight(y, m);
  return { from, batteryFactor: f, solarYears: solarYearsFor(from) };
});

export function stepAt(date: Date): Step {
  let current = REBATE_STEPS[0];
  for (const step of REBATE_STEPS) {
    if (step.from.getTime() <= date.getTime()) current = step;
  }
  return current;
}

/** The next date the discount changes, or null once the scheme has ended. */
export function nextStep(date: Date): Step | null {
  return REBATE_STEPS.find((s) => s.from.getTime() > date.getTime()) ?? null;
}

export function batteryStcs(usableKwh: number, factor: number): number {
  const u = Math.max(0, usableKwh);
  const full = Math.min(u, 14) * factor;
  const sixty = Math.max(0, Math.min(u, 28) - 14) * factor * 0.6;
  const fifteen = Math.max(0, Math.min(u, 50) - 28) * factor * 0.15;
  return Math.floor(full + sixty + fifteen);
}

export function solarStcs(kw: number, years: number, zoneRating = ZONE_3_RATING): number {
  return Math.floor(Math.max(0, kw) * zoneRating * years);
}

export function discountFor(step: Step, kw: number, kwh: number, price = STC_PRICE_ESTIMATE): number {
  return (solarStcs(kw, step.solarYears) + batteryStcs(kwh, step.batteryFactor)) * price;
}

export function formatAud(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

export function formatChangeDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  }).format(date);
}
