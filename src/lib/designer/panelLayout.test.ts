import { describe, expect, it } from "vitest";
import {
  alignedRowAngles,
  generatePanelsForRoofPolygon,
  generatePanelsForRoofs,
} from "@/lib/designer/panelLayout";
import {
  DESIGN_RULES,
  inverterSizingFor,
  roofPitchDegrees,
} from "@/lib/designer/designRules";

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

describe("roof pitch", () => {
  it("fits more rows on a pitched roof, since panels look shorter from above", () => {
    // 7.0 m usable across the roof: 3 flat rows of 1.879 m, but at 30° each
    // row is 1.879 × cos 30° = 1.63 m seen from above, so 4 rows fit.
    const at = (pitchDeg: number) =>
      generatePanelsForRoofPolygon(rect(10, 7.2), PANEL, 0, {
        orientation: "PORTRAIT",
        pitchDeg,
      });
    expect(at(0)).toHaveLength(27);
    const pitched = at(30);
    expect(pitched).toHaveLength(36);
    expect(pitched.every((p) => p.slopeDegrees === 30)).toBe(true);
  });

  it("weights Google's segment pitches by area", () => {
    expect(
      roofPitchDegrees([
        { pitchDegrees: 20, areaM2: 30 },
        { pitchDegrees: 30, areaM2: 10 },
      ]),
    ).toBeCloseTo(22.5, 6);
  });

  it("falls back to 22.5° with no real data, and caps noisy pitches", () => {
    expect(roofPitchDegrees(undefined)).toBe(22.5);
    expect(roofPitchDegrees([{ pitchDegrees: 30, areaM2: 50 }], true)).toBe(22.5);
    expect(roofPitchDegrees([{ pitchDegrees: 70, areaM2: 50 }])).toBe(45);
  });
});

/** `w` x `h` m rectangle rotated `deg` (counter-clockwise) about its corner, offset `dx` m east. */
function rotatedRect(w: number, h: number, deg: number, dx = 0) {
  const a = (deg * Math.PI) / 180;
  const pt = (x: number, y: number) => {
    const rx = x * Math.cos(a) - y * Math.sin(a) + dx;
    const ry = x * Math.sin(a) + y * Math.cos(a);
    return { lat: LAT0 + ry / M_PER_LAT, lng: LNG0 + rx / M_PER_LNG };
  };
  return [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)];
}

const norm = (deg: number) => ((Math.round(deg) % 180) + 180) % 180;

describe("alignment rule", () => {
  it("snaps a slightly skewed wing onto the house's main axis", () => {
    // Main roof runs east–west; a wing traced 20° off it lines up with it.
    const [main, wing] = alignedRowAngles([rect(14, 8), rotatedRect(5, 3, 20, 20)]);
    expect(norm(main)).toBe(0);
    expect(norm(wing)).toBe(0);
  });

  it("keeps a wing at 90° on the perpendicular axis", () => {
    const [, wing] = alignedRowAngles([rect(14, 8), rotatedRect(5, 3, 88, 20)]);
    expect(norm(wing)).toBe(90);
  });

  it("leaves a genuinely angled wing (over 30°) on its own edge", () => {
    const [, wing] = alignedRowAngles([rect(14, 8), rotatedRect(5, 3, 40, 20)]);
    expect(norm(wing)).toBe(40);
  });

  it("draws every panel of an aligned design at the same angle", () => {
    const panels = generatePanelsForRoofs(
      [rect(14, 8), rotatedRect(6, 4, 15, 20)],
      PANEL,
      { orientation: "PORTRAIT" },
    );
    expect(new Set(panels.map((p) => norm(p.rotationDegrees ?? 0)))).toEqual(
      new Set([0]),
    );
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
  it("sizes 43 x 440 W for 200% (hybrid or battery) and 133% (standard, no battery)", () => {
    const s = inverterSizingFor(43, 440);
    expect(s.arrayKw).toBeCloseTo(18.92, 2);
    expect(s.minInverterKwHybridOrBattery).toBe(9.5);
    expect(s.phasesHybridOrBattery).toBe(1);
    expect(s.minInverterKwStandard).toBe(14.3);
    expect(s.phasesStandard).toBe(3);
  });

  it("keeps a 10 kW inverter on single phase under the 10 kW per phase export limit", () => {
    // 20 kW of panels at 200% → exactly a 10 kW inverter.
    expect(inverterSizingFor(50, 400).phasesHybridOrBattery).toBe(1);
  });
});

describe("obstructions are packed around, not deleted afterwards (85 Bombay St lesson)", () => {
  const M = 111320;
  const lat0 = -33.8539;
  const mLng = M * Math.cos((lat0 * Math.PI) / 180);
  const ll = (x: number, y: number) => ({ lat: lat0 + y / M, lng: 151.0514 + x / mLng });
  // A 10 x 4.5 m face with a 2.4 x 1.2 m obstruction in the middle of the lower rows.
  const face = [ll(0, 0), ll(10, 0), ll(10, 4.5), ll(0, 4.5)];
  const obstruction = [ll(3.8, 0.4), ll(6.2, 0.4), ll(6.2, 1.6), ll(3.8, 1.6)];
  const dims = { heightM: 1.762, widthM: 1.134 };

  const corners = (p: { center: { lat: number; lng: number } }, orientation: "PORTRAIT" | "LANDSCAPE") => {
    const x = (p.center.lng - 151.0514) * mLng;
    const y = (p.center.lat - lat0) * M;
    const w = orientation === "PORTRAIT" ? 1.134 : 1.762;
    const h = orientation === "PORTRAIT" ? 1.762 : 1.134;
    return { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
  };

  for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
    it(`${orientation.toLowerCase()}: keeps 100 mm clear and beats packing-then-deleting`, () => {
      const around = generatePanelsForRoofPolygon(face, dims, 0, { orientation, rowAngleDeg: 0, obstructions: [obstruction] });
      const clear = generatePanelsForRoofPolygon(face, dims, 0, { orientation, rowAngleDeg: 0 });
      const deletedAfter = clear.filter((p) => {
        const c = corners(p, orientation);
        return c.x1 <= 3.8 - 0.1 + 1e-6 || c.x0 >= 6.2 + 0.1 - 1e-6 || c.y1 <= 0.4 - 0.1 + 1e-6 || c.y0 >= 1.6 + 0.1 - 1e-6;
      });
      for (const p of around) {
        const c = corners(p, orientation);
        const clearOf = c.x1 <= 3.7 + 1e-6 || c.x0 >= 6.3 - 1e-6 || c.y1 <= 0.3 + 1e-6 || c.y0 >= 1.7 - 1e-6;
        expect(clearOf).toBe(true);
      }
      expect(around.length).toBeGreaterThanOrEqual(deletedAfter.length);
      expect(around.length).toBeGreaterThan(0);
    });
  }
});
