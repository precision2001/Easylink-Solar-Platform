import { describe, expect, it } from "vitest";
import { formatSize, productDisplayTitle, shortProductName } from "./displayTitle";

describe("product display titles", () => {
  it("show brand, product name and total size for battery packages", () => {
    const t = productDisplayTitle("batteries", {
      brand: "BLUETTI",
      name: "EP2000 + 2 × B700 10.5kW 3-phase 14.75kWh (inverter built in)",
      specs: { usableCapacityKwh: 13.28 },
    });
    expect(t).toEqual({
      name: "BLUETTI EP2000 + B700",
      size: "14.75 kWh",
      detail: "10.5 kW 3-phase · inverter built in",
    });
  });

  it("use the series for batteries listed by part number", () => {
    const t = productDisplayTitle("batteries", {
      brand: "Tesla",
      name: "1707000-xx-y (Powerwall 3 with Backup Gateway 2)",
      specs: { usableCapacityKwh: 13.5, series: "Powerwall 3" },
    });
    expect(t.name).toBe("Tesla Powerwall 3");
    expect(t.size).toBe("13.5 kWh");
  });

  it("show inverter model, rated size and phase", () => {
    const t = productDisplayTitle("inverters", {
      brand: "Sungrow",
      name: "SH10RT",
      specs: { ratedKw: 9.999, phase: 3 },
    });
    expect(t).toEqual({ name: "Sungrow SH10RT", size: "10 kW", detail: "3-phase" });
  });

  it("show panel series and wattage", () => {
    const t = productDisplayTitle("solar-panels", {
      brand: "Trina",
      name: "TSM-450NEG9R.28",
      wattage: 450,
      specs: { series: "Vertex S+ (NEG9R.28, black frame)" },
    });
    expect(t.name).toBe("Trina Vertex S+");
    expect(t.size).toBe("450 W");
  });

  it("keep model codes that end in a letter", () => {
    expect(shortProductName("AC200L")).toBe("AC200L");
    expect(shortProductName("SBR 9.6kWh (3 × 3.2 + system parts)")).toBe("SBR");
  });

  it("round ratings registered just under a size", () => {
    expect(formatSize(9.999)).toBe("10");
    expect(formatSize(14.75)).toBe("14.75");
    expect(formatSize(5)).toBe("5");
  });
});
