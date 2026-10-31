/**
 * Hour-by-hour solar/battery/grid simulation backing the Energy step's
 * system-performance stats, the grid-import-vs-battery-size chart, and the
 * consumption & solar value breakdown.
 *
 * Runs a full synthetic year (365 days x 24 hours) against a seasonal solar
 * generation curve and a seasonal household load curve, tracking battery
 * state of charge hour by hour. A one-year "warmup" pass seeds the battery's
 * starting charge so the reported year doesn't start artificially empty.
 */

/** Retail rate the bill is converted to kWh with. */
export const GRID_RATE_PER_KWH = 0.36975;

/** Flat feed-in tariff for uncaptured solar exports (self-consumption mode). */
export const FIT_RATE_PER_KWH = 0.05;

/** Fixed daily connection fee, independent of usage. */
export const DAILY_SUPPLY_CHARGE = 1.1;

/** Sydney AC yield per kW installed, year 1. */
export const SOLAR_YIELD_KWH_PER_KW_YEAR = 1400;

/** Fallback panel wattage when the system size can't be read (Standard tier). */
export const DEFAULT_PANEL_WATTS = 440;

export const MONTH_LABELS = [
  "J",
  "F",
  "M",
  "A",
  "M",
  "J",
  "J",
  "A",
  "S",
  "O",
  "N",
  "D",
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Relative monthly weights, normalized at use. Consumption peaks in the
 * Sydney winter (heating) and again in high summer (cooling); generation is
 * the opposite, peaking Dec-Jan and bottoming out in June.
 */
export const CONSUMPTION_SEASONALITY = [
  58, 53, 47, 52, 52, 59, 61, 60, 47, 47, 47, 48,
];
export const GENERATION_SEASONALITY = [
  128, 115, 105, 90, 74, 66, 71, 83, 97, 112, 122, 130,
];

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

const BATTERY_ROUND_TRIP_EFFICIENCY = 0.9;
const BATTERY_SINGLE_TRIP_EFFICIENCY = Math.sqrt(BATTERY_ROUND_TRIP_EFFICIENCY);
/** Batteries are commonly warrantied to ~70% capacity retention at year 10. */
const BATTERY_RETENTION_PER_YEAR = Math.pow(0.7, 1 / 10);
const PANEL_DEGRADATION_PER_YEAR = 0.005;

/** Normalized within-day shape of solar output — bell curve centered on midday. */
const SOLAR_HOURLY = normalize([
  0, 0, 0, 0, 0, 0, 0.01, 0.03, 0.06, 0.09, 0.11, 0.13, 0.14, 0.13, 0.11, 0.09,
  0.06, 0.03, 0.01, 0, 0, 0, 0, 0,
]);

/** Normalized within-day shape of household load — morning + evening peaks. */
const LOAD_HOURLY = normalize([
  0.02, 0.015, 0.015, 0.015, 0.015, 0.02, 0.035, 0.05, 0.055, 0.04, 0.03,
  0.03, 0.035, 0.03, 0.03, 0.035, 0.045, 0.06, 0.075, 0.08, 0.075, 0.06,
  0.045, 0.03,
]);

/** Export-optimized mode's hourly sell price — near-zero midday, peaking 4-7pm. */
const EXPORT_PRICE_HOURLY = [
  0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.03, 0.02, 0.01, 0, 0, 0, 0, 0, 0,
  0.05, 0.25, 0.25, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05,
];
const ARBITRAGE_RESERVE_FRACTION = 0.15;

/** Day-to-day weather noise, mean-normalized within each month so monthly totals still match the seasonal split. */
function buildDailyWeatherMultipliers(): number[] {
  const raw: number[] = [];
  for (let d = 0; d < 365; d++) {
    raw.push(
      1 +
        0.4 * Math.sin((2 * Math.PI * d) / 17 + 0.3) +
        0.3 * Math.sin((2 * Math.PI * d) / 7 + 1.1) +
        0.2 * Math.sin((2 * Math.PI * d) / 31 + 2.0),
    );
  }
  const clamped = raw.map((v) => Math.max(0.05, v));
  const out = new Array<number>(365);
  let dayIdx = 0;
  for (let m = 0; m < 12; m++) {
    const slice = clamped.slice(dayIdx, dayIdx + DAYS_IN_MONTH[m]);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    for (let i = 0; i < slice.length; i++) out[dayIdx + i] = slice[i] / mean;
    dayIdx += DAYS_IN_MONTH[m];
  }
  return out;
}
const DAILY_WEATHER_MULT = buildDailyWeatherMultipliers();
const MONTH_START_DAY = (() => {
  const s = [0];
  for (let m = 0; m < 11; m++) s.push(s[m] + DAYS_IN_MONTH[m]);
  return s;
})();

export type BatteryMode = "self-consumption" | "export";

export type MonthSimResult = {
  /** Share of that month's consumption covered by solar (direct + battery), 0-100. */
  solarPct: number;
};

export type YearSimResult = {
  monthly: MonthSimResult[];
  annualGridImportKwh: number;
  annualConsumptionKwh: number;
  annualExportKwh: number;
  annualBatteryExportKwh: number;
  annualStoredKwh: number;
  annualGeneratedKwh: number;
  exportIncomeAud: number;
  avoidedCostAud: number;
};

type DayResult = {
  fromSolarDay: number;
  fromGridDay: number;
  exportDay: number;
  exportIncomeDay: number;
  batteryExportDay: number;
  chargeDay: number;
  generatedDay: number;
  endSoc: number;
};

/**
 * Simulates one synthetic year of hourly solar/load/battery dispatch.
 *
 * @param annualConsumptionKwh household load for the year, before solar
 * @param annualGenerationKwh array/system generation for the year, before degradation
 * @param batteryKwh nameplate battery capacity (0 = no battery)
 * @param mode self-consumption caps discharge at household load; export also
 *   arbitrages held charge into the evening peak-price window
 * @param systemAgeYears years since install — degrades panel output and battery capacity
 */
export function simulateYear(
  annualConsumptionKwh: number,
  annualGenerationKwh: number,
  batteryKwh: number,
  mode: BatteryMode,
  systemAgeYears: number,
  gridRatePerKwh: number = GRID_RATE_PER_KWH,
): YearSimResult {
  const consumptionWeights = normalize(CONSUMPTION_SEASONALITY);
  const generationWeights = normalize(GENERATION_SEASONALITY);
  const monthlyConsumption = consumptionWeights.map(
    (w) => annualConsumptionKwh * w,
  );
  const monthlyGeneration = generationWeights.map(
    (w) => annualGenerationKwh * w,
  );

  const panelDegradation = Math.pow(1 - PANEL_DEGRADATION_PER_YEAR, systemAgeYears);
  const effectiveBatteryKwh =
    batteryKwh * Math.pow(BATTERY_RETENTION_PER_YEAR, systemAgeYears);
  const chargeRateLimit = batteryKwh > 0 ? Math.ceil(batteryKwh / 13.5) * 5 : 0;
  const priceArray = mode === "export" ? EXPORT_PRICE_HOURLY : new Array(24).fill(FIT_RATE_PER_KWH);
  const eff = BATTERY_SINGLE_TRIP_EFFICIENCY;

  function runDay(dailySolar: number, dailyLoad: number, startSoc: number): DayResult {
    let soc = startSoc;
    let fromSolarDay = 0;
    let fromGridDay = 0;
    let exportDay = 0;
    let exportIncomeDay = 0;
    let batteryExportDay = 0;
    let chargeDay = 0;
    let generatedDay = 0;

    for (let h = 0; h < 24; h++) {
      const solar_h = dailySolar * SOLAR_HOURLY[h];
      const load_h = dailyLoad * LOAD_HOURLY[h];
      const directUse = Math.min(solar_h, load_h);
      const excess = Math.max(0, solar_h - load_h);
      const deficit = Math.max(0, load_h - solar_h);

      const chargeIn = Math.min(
        excess,
        chargeRateLimit,
        (effectiveBatteryKwh - soc) / eff,
      );
      soc += chargeIn * eff;
      const uncapturedExcess = excess - chargeIn;

      const maxDeliverable = Math.min(soc * eff, chargeRateLimit * eff);
      const fromBattery = Math.min(deficit, maxDeliverable);
      soc -= fromBattery / eff;

      let arbitrageExport = 0;
      if (mode === "export" && priceArray[h] >= 0.15) {
        const reserve = effectiveBatteryKwh * ARBITRAGE_RESERVE_FRACTION;
        const availableToDraw = Math.max(0, soc - reserve);
        const rateHeadroom = Math.max(0, chargeRateLimit - fromBattery / eff);
        const draw = Math.min(availableToDraw, rateHeadroom);
        arbitrageExport = draw * eff;
        soc -= draw;
      }

      const totalExportThisHour = uncapturedExcess + arbitrageExport;
      exportDay += totalExportThisHour;
      exportIncomeDay += totalExportThisHour * priceArray[h];
      batteryExportDay += arbitrageExport;
      fromSolarDay += directUse + fromBattery;
      fromGridDay += deficit - fromBattery;
      chargeDay += chargeIn * eff;
      generatedDay += solar_h;
    }

    return {
      fromSolarDay,
      fromGridDay,
      exportDay,
      exportIncomeDay,
      batteryExportDay,
      chargeDay,
      generatedDay,
      endSoc: soc,
    };
  }

  function runFullYear(startSoc: number) {
    let soc = startSoc;
    const monthly: MonthSimResult[] = [];
    let annualGridImport = 0;
    let annualExportKwh = 0;
    let annualExportIncomeAud = 0;
    let annualBatteryExportKwh = 0;
    let annualSelfConsumedKwh = 0;
    let annualStoredKwh = 0;
    let annualGeneratedKwh = 0;

    for (let m = 0; m < 12; m++) {
      const dailySolarAvg = (monthlyGeneration[m] * panelDegradation) / DAYS_IN_MONTH[m];
      const dailyLoad = monthlyConsumption[m] / DAYS_IN_MONTH[m];
      let mFromSolar = 0;
      let mFromGrid = 0;

      for (let i = 0; i < DAYS_IN_MONTH[m]; i++) {
        const mult = DAILY_WEATHER_MULT[MONTH_START_DAY[m] + i];
        const r = runDay(dailySolarAvg * mult, dailyLoad, soc);
        soc = r.endSoc;
        annualGridImport += r.fromGridDay;
        annualExportKwh += r.exportDay;
        annualExportIncomeAud += r.exportIncomeDay;
        annualBatteryExportKwh += r.batteryExportDay;
        annualSelfConsumedKwh += r.fromSolarDay;
        annualStoredKwh += r.chargeDay;
        annualGeneratedKwh += r.generatedDay;
        mFromSolar += r.fromSolarDay;
        mFromGrid += r.fromGridDay;
      }
      monthly.push({
        solarPct: mFromSolar + mFromGrid > 0 ? (mFromSolar / (mFromSolar + mFromGrid)) * 100 : 0,
      });
    }

    return {
      monthly,
      annualGridImport,
      annualExportKwh,
      annualExportIncomeAud,
      annualBatteryExportKwh,
      annualSelfConsumedKwh,
      annualStoredKwh,
      annualGeneratedKwh,
      endSoc: soc,
    };
  }

  const warmup = runFullYear(0);
  const year = runFullYear(warmup.endSoc);

  return {
    monthly: year.monthly,
    annualGridImportKwh: year.annualGridImport,
    annualConsumptionKwh,
    annualExportKwh: year.annualExportKwh,
    annualBatteryExportKwh: year.annualBatteryExportKwh,
    annualStoredKwh: year.annualStoredKwh,
    annualGeneratedKwh: year.annualGeneratedKwh,
    exportIncomeAud: year.annualExportIncomeAud,
    avoidedCostAud: year.annualSelfConsumedKwh * gridRatePerKwh,
  };
}

/** Battery sizes (kWh) swept to build the grid-import-vs-battery-size curve. */
export const BATTERY_CURVE_SIZES_KWH = [
  0, 2, 4, 6, 8, 10, 13, 16, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150,
];

export type BatteryKnee = {
  /** Largest size before each extra kWh stops meaningfully reducing grid import. */
  recommendedKwh: number;
  /** Annual grid import (kWh) at each size in BATTERY_CURVE_SIZES_KWH. */
  importsBySize: number[];
};

/**
 * Finds where extra battery storage stops being worth adding: the last size
 * whose marginal import reduction, per added kWh, is still at least 1.5% of
 * annual consumption.
 */
export function findBatteryKnee(
  annualConsumptionKwh: number,
  annualGenerationKwh: number,
): BatteryKnee {
  const importsBySize = BATTERY_CURVE_SIZES_KWH.map(
    (kwh) =>
      simulateYear(annualConsumptionKwh, annualGenerationKwh, kwh, "self-consumption", 0)
        .annualGridImportKwh,
  );
  for (let i = 1; i < BATTERY_CURVE_SIZES_KWH.length; i++) {
    const improvement = importsBySize[i - 1] - importsBySize[i];
    const marginalPerKwh =
      improvement / (BATTERY_CURVE_SIZES_KWH[i] - BATTERY_CURVE_SIZES_KWH[i - 1]);
    if (marginalPerKwh < annualConsumptionKwh * 0.015) {
      return { recommendedKwh: BATTERY_CURVE_SIZES_KWH[i - 1], importsBySize };
    }
  }
  return {
    recommendedKwh: BATTERY_CURVE_SIZES_KWH[BATTERY_CURVE_SIZES_KWH.length - 1],
    importsBySize,
  };
}

/**
 * Car battery assumed when the quote doesn't name one: Tesla Model Y RWD,
 * Australia's best-selling EV (60 kWh usable).
 */
export const DEFAULT_EV_BATTERY_KWH = 60;
/** Share of the energy leaving the home battery that ends up in the car (EasyLink allows a 1% loss). */
export const EV_CHARGE_EFFICIENCY = 0.99;

/**
 * Battery size that covers the house *and* fills the car's whole battery
 * from the home battery: the home-only size plus a full car charge (with
 * charging losses), rounded up to a size on the curve.
 */
export function evReadyBatteryKwh(homeOnlyKwh: number, evBatteryKwh = DEFAULT_EV_BATTERY_KWH): number {
  const want = homeOnlyKwh + Math.max(0, evBatteryKwh) / EV_CHARGE_EFFICIENCY;
  return BATTERY_CURVE_SIZES_KWH.find((k) => k >= want) ?? BATTERY_CURVE_SIZES_KWH[BATTERY_CURVE_SIZES_KWH.length - 1];
}

/**
 * "Future Ready" size: halfway between the home-only and the full-EV-charge
 * sizes, on the nearest size of the curve (rounding up on a tie).
 */
export function futureReadyBatteryKwh(homeOnlyKwh: number, evReadyKwh: number): number {
  const mid = (homeOnlyKwh + evReadyKwh) / 2;
  let best = BATTERY_CURVE_SIZES_KWH[0];
  for (const k of BATTERY_CURVE_SIZES_KWH) {
    if (Math.abs(k - mid) <= Math.abs(best - mid)) best = k;
  }
  return best;
}

/** "7.2 kW" -> 7.2, else panel count x default wattage, else 0. */
export function resolveSystemKw(systemSize: string, totalPanels: string): number {
  const sized = systemSize.match(/([\d.]+)\s*kW/i);
  if (sized) {
    const kw = Number.parseFloat(sized[1]);
    if (Number.isFinite(kw) && kw > 0) return kw;
  }

  const panels = Number.parseInt(totalPanels.replace(/\D/g, ""), 10);
  if (Number.isFinite(panels) && panels > 0) {
    return (panels * DEFAULT_PANEL_WATTS) / 1000;
  }
  return 0;
}
