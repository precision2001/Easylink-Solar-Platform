/**
 * STC estimates (Clean Energy Regulator rules as of 2026; confirm each claim
 * with the STC agent's calculator).
 *   solar:   floor(kW × zone rating × deeming years); deeming runs to the end of 2030.
 *   battery: usable kWh × factor, full to 14 kWh, 60% to 28 kWh, 15% to 50 kWh; floor.
 * Battery factor by installation date (Cheaper Home Batteries Program).
 */
export function batteryFactor(installDate: string): number {
  const d = installDate.slice(0, 10);
  if (d >= "2027-07-01") return 5.2;
  if (d >= "2027-01-01") return 5.7;
  if (d >= "2026-05-01") return 6.8;
  return 8.4;
}

export function deemingYears(installDate: string): number {
  const y = Number(installDate.slice(0, 4));
  return Math.max(1, 2030 - y + 1);
}

export function solarStcs(kw: number, zoneRating: number, installDate: string): number {
  return Math.floor(kw * zoneRating * deemingYears(installDate));
}

export function batteryStcs(usableKwh: number, installDate: string): number {
  const f = batteryFactor(installDate);
  const a = Math.min(usableKwh, 14);
  const b = Math.max(0, Math.min(usableKwh, 28) - 14);
  const c = Math.max(0, Math.min(usableKwh, 50) - 28);
  return Math.floor(a * f + b * f * 0.6 + c * f * 0.15);
}

/** Postcode → STC zone rating (simplified; the zone is confirmed on the job). */
export function zoneRatingFor(postcode: string): { rating: number; zone: number } {
  const p = Number(postcode);
  // Most metropolitan postcodes in NSW, VIC, SA, ACT and southern WA are zone 3/4; NT/north QLD zone 1–2; Tasmania zone 4.
  if (p >= 7000 && p < 8000) return { rating: 1.185, zone: 4 };
  if ((p >= 3000 && p < 4000) || (p >= 8000 && p < 9000)) return { rating: 1.185, zone: 4 };
  if (p >= 800 && p < 1000) return { rating: 1.622, zone: 1 };
  if (p >= 4700 && p < 4900) return { rating: 1.536, zone: 2 };
  return { rating: 1.382, zone: 3 };
}
