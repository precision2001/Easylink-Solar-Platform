/**
 * Short card titles for the website's products: Brand + product name + total
 * size, e.g. "BLUETTI EP2000 + B700" / "14.75 kWh" with "10.5 kW 3-phase
 * inverter built in" beneath. The full catalogue name stays available as the
 * subtitle, so nothing is lost.
 *
 * Sizes come from the catalogue: the total quoted in a kit's name when it has
 * one (that is the size the package is sold as), otherwise the spec fields.
 */

export type DisplayCategory =
  | "batteries"
  | "solar-panels"
  | "inverters"
  | "ev-chargers"
  | "heat-pumps"
  | "portable-power";

export type ProductDisplayTitle = {
  /** "BLUETTI EP2000 + B700" */
  name: string;
  /** "14.75 kWh", "10 kW", "475 W"; empty when the catalogue has no size. */
  size: string;
  /** Secondary size line, e.g. "10.5 kW 3-phase · inverter built in". */
  detail: string;
};

type Row = {
  name: string;
  brand?: string | null;
  wattage?: number | null;
  specs?: Record<string, unknown> | null;
};

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const KWH_RE = new RegExp(`${NUM}\\s*kWh\\b`, "i");
const KW_RE = new RegExp(`${NUM}\\s*kW(?!h)\\b`, "i");
const PHASE_RE = /\b([13])[\s-]*phase\b/i;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/** 9.999 → "10", 14.75 → "14.75", 5.0 → "5". */
export function formatSize(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  // Ratings like 9.999 kW are a 10 kW inverter registered just under the limit.
  const near = Math.round(rounded);
  const v = Math.abs(rounded - near) <= 0.011 ? near : rounded;
  return String(v);
}

/** Strip sizes, phase, multipliers, bracketed notes and packaging words. */
export function shortProductName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, " ")
    .replace(new RegExp(`${NUM}\\s*(kWh|kW|W)\\b`, "gi"), " ")
    .replace(PHASE_RE, " ")
    .replace(/\b\d+\s*[×x]\s*/g, "")
    .replace(/\b(package|kit|module|cabinet|with)\b/gi, " ")
    .replace(/\s+\+\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[+\-–,·\s]+|[\-–,·\s]+$/g, "")
    .trim();
}

function withBrand(brand: string, name: string): string {
  if (!name) return brand;
  if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) return name;
  return `${brand} ${name}`;
}

function phaseLabel(row: Row): string {
  const p = num(row.specs?.phase);
  if (p === 1 || p === 3) return `${p}-phase`;
  const m = row.name.match(PHASE_RE);
  return m ? `${m[1]}-phase` : "";
}

export function productDisplayTitle(
  category: DisplayCategory,
  row: Row,
): ProductDisplayTitle {
  const brand = row.brand?.trim() || "";
  const specs = row.specs ?? {};
  const series =
    typeof specs.series === "string" && specs.series !== "NA"
      ? shortProductName(specs.series)
      : "";
  const fromName = shortProductName(row.name);
  const phase = phaseLabel(row);

  switch (category) {
    case "batteries": {
      // Researched modules carry a part number as their name; their series
      // ("Powerwall 3", "Lynx Home F G2") is what customers recognise.
      const name = series || fromName;
      const kwhInName = row.name.match(KWH_RE);
      const kwh = kwhInName
        ? Number(kwhInName[1])
        : num(specs.usableCapacityKwh) ?? num(specs.nominalCapacityKwh);
      const kwInName = row.name.match(KW_RE);
      const builtIn = /inverter built in/i.test(row.name);
      const detail = [
        kwInName ? `${formatSize(Number(kwInName[1]))} kW` : "",
        phase,
        builtIn ? "inverter built in" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/ inverter built in$/, " · inverter built in")
        .replace(/^· /, "");
      return {
        name: withBrand(brand, name),
        size: kwh ? `${formatSize(kwh)} kWh` : "",
        detail,
      };
    }
    case "inverters": {
      // Inverter model codes (SH10RT, Primo GEN24 5.0 Plus) are the names.
      const kw = num(specs.ratedKw) ?? (num(row.wattage) ? row.wattage! / 1000 : null);
      return {
        name: withBrand(brand, fromName || series),
        size: kw ? `${formatSize(kw)} kW` : "",
        detail: phase,
      };
    }
    case "solar-panels": {
      const w = num(row.wattage);
      return {
        name: withBrand(brand, series || fromName),
        size: w ? `${formatSize(w)} W` : "",
        detail: "",
      };
    }
    case "ev-chargers": {
      const kw = num(specs.ratedKw);
      return {
        name: withBrand(brand, series || fromName),
        size: kw ? `${formatSize(kw)} kW` : "",
        detail: phase,
      };
    }
    case "portable-power": {
      const kwh = num(specs.capacityKwh);
      return {
        name: withBrand(brand, fromName || series),
        size: kwh ? `${formatSize(kwh)} kWh` : "",
        detail: "",
      };
    }
    case "heat-pumps": {
      const litres = num(specs.capacityL);
      const kw = num(specs.heatingKw);
      return {
        name: withBrand(brand, fromName || series),
        size: litres ? `${formatSize(litres)} L` : kw ? `${formatSize(kw)} kW` : "",
        detail: litres && kw ? `${formatSize(kw)} kW heating` : "",
      };
    }
  }
}
