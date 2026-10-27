import { describe, expect, it } from "vitest";
import {
  generatePanelsForRoofPolygon,
  generatePanelsForRoofs,
} from "@/lib/designer/panelLayout";
import { DESIGN_RULES, inverterSizingFor } from "@/lib/designer/designRules";

const LAT0 = -33.8526;
const LNG0 = 151.0522;
const M_PER_LAT = 111320;
const M_PER_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);

/** Axis-aligned rectangle `w` m east–west by `h` m north–south, offset `dx` m east. */
function rect(w: number, h: number, dx = 0) {
  const pt = (x: number, y: number) => ({
    lat: LAT0 + y / M_PER_LAT,
    lng: LNG0 + (x + dx) / M_PER_LNG,
  });
  return [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)];
}

const PANEL = { heightM: 1.879, widthM: 1.045 };

describe("generatePanelsForRoofPolygon", () => {
  it("packs a 10 x 6 m roof in portrait with the 100 mm setback", () => {
    // 9.8 m usable along the row → 9 panels of 1.045 m (+20 mm gaps);
    // 5.8 m across → 3 rows of 1.879 m.
    const panels = generatePanelsForRoofPolygon(rect(10, 6), PANEL, 0, {
      orientation: "PORTRAIT",
    });
    expect(panels).toHaveLength(27);
    expect(panels.every((p) => p.orientation === "PORTRAIT")).toBe(true);
  });

  it("packs the same roof in landscape", () => {
    // 5 panels of 1.879 m along the row, 5 rows of 1.045 m.
    const panels = generatePanelsForRoofPolygon(rect(10, 6), PANEL, 0, {
      orientation: "LANDSCAPE",
    });
    expect(panels).toHaveLength(25);
    expect(panels.every((p) => p.orientation === "LANDSCAPE")).toBe(true);
  });

  it("keeps every panel at least the setback inside the roof", () => {
    const panels = generatePanelsForRoofPolygon(rect(10, 6), PANEL, 0, {
      orientation: "PORTRAIT",
    });
    for (const p of panels) {
      const x = (p.center.lng - LNG0) * M_PER_LNG;
      const y = (p.center.lat - LAT0) * M_PER_LAT;
      expect(x - PANEL.widthM / 2).toBeGreaterThanOrEqual(DESIGN_RULES.edgeSetbackM - 1e-6);
      expect(10 - (x + PANEL.widthM / 2)).toBeGreaterThanOrEqual(DESIGN_RULES.edgeSetbackM - 1e-6);
      expect(y - PANEL.heightM / 2).toBeGreaterThanOrEqual(DESIGN_RULES.edgeSetbackM - 1e-6);
      expect(6 - (y + PANEL.heightM / 2)).toBeGreaterThanOrEqual(DESIGN_RULES.edgeSetbackM - 1e-6);
    }
  });

  it("fits fewer panels as the setback grows", () => {
    const at = (setbackM: number) =>
      generatePanelsForRoofPolygon(rect(10, 6), PANEL, 0, {
        orientation: "PORTRAIT",
        setbackM,
      }).length;
    expect(at(0.4)).toBeLessThan(at(0.1));
  });
});

describe("generatePanelsForRoofs", () => {
  it("uses one orientation across every roof of the design", () => {
    const panels = generatePanelsForRoofs(
      [rect(10, 6), rect(4, 9, 20)],
      PANEL,
      { orientation: "LANDSCAPE" },
    );
    expect(new Set(panels.map((p) => p.orientation))).toEqual(
      new Set(["LANDSCAPE"]),
    );
    expect(new Set(panels.map((p) => p.segmentIndex))).toEqual(new Set([0, 1]));
  });
});

describe("inverterSizingFor", () => {
  it("sizes 43 x 440 W for 200% with a hybrid inverter and 133% with a standard one", () => {
    const s = inverterSizingFor(43, 440);
    expect(s.arrayKw).toBeCloseTo(18.92, 2);
    expect(s.minHybridInverterKw).toBe(9.5);
    expect(s.phasesHybrid).toBe(1);
    expect(s.minStandardInverterKw).toBe(14.3);
    expect(s.phasesStandard).toBe(3);
  });

  it("keeps a 10 kW inverter on single phase under the 10 kW per phase export limit", () => {
    // 20 kW of panels at 200% → exactly a 10 kW inverter.
    expect(inverterSizingFor(50, 400).phasesHybrid).toBe(1);
  });
});
