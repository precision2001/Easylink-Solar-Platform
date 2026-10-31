import { describe, expect, it } from "vitest";

import { buildRoofDrawing, fitToBox, panelCornersXY } from "./roofGeometry";
import type { DesignProposalSolarDesign } from "@/lib/store/designProposalSlice";

const c = { lat: -33.7829, lng: 150.7855 };
const mLng = 111320 * Math.cos((c.lat * Math.PI) / 180);
const at = (x: number, y: number) => ({ lat: c.lat + y / 111320, lng: c.lng + x / mLng });

function design(over: Partial<DesignProposalSolarDesign> = {}): DesignProposalSolarDesign {
  return {
    pinLat: c.lat,
    pinLng: c.lng,
    savedRoofs: [[at(-5, -4), at(5, -4), at(5, 4), at(-5, 4)]],
    generatedPanels: [
      { center: at(0, 2), orientation: "PORTRAIT", rotationDegrees: 0, slopeDegrees: 0, segmentIndex: 0, yearlyEnergyDcKwh: 0 },
    ],
    polygonTotalAreaM2: 80,
    panelCountInput: "",
    mapScreenshotDataUrl: null,
    ...over,
  };
}

describe("panelCornersXY", () => {
  it("draws a flat portrait panel long side north-south", () => {
    const q = panelCornersXY(design().generatedPanels![0], { heightM: 1.8, widthM: 1 }, c);
    const xs = q.map((p) => p.x), ys = q.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1.8, 2);
  });

  it("shortens the up-slope side by cos(pitch), as seen from above", () => {
    const p = { ...design().generatedPanels![0], slopeDegrees: 60 };
    const ys = panelCornersXY(p, { heightM: 1.8, widthM: 1 }, c).map((q) => q.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0.9, 2);
  });
});

describe("buildRoofDrawing", () => {
  it("returns null without a saved roof", () => {
    expect(buildRoofDrawing(null)).toBeNull();
  });

  it("uses the saved faces and lights north-facing ones most", () => {
    const d = buildRoofDrawing(
      design({
        roofFaces: [
          { ring: [at(-5, 0), at(5, 0), at(5, 4), at(-5, 4)], azimuthDeg: 0 },
          { ring: [at(-5, -4), at(5, -4), at(5, 0), at(-5, 0)], azimuthDeg: 180 },
        ],
      }),
    )!;
    expect(d.faces).toHaveLength(2);
    expect(d.faces[0].light).toBeGreaterThan(d.faces[1].light);
    expect(d.panels).toHaveLength(1);
  });

  it("draws only the outline for older designs without saved faces", () => {
    const d = buildRoofDrawing(design())!;
    expect(d.faces).toHaveLength(1);
    expect(d.faces[0].ring).toHaveLength(4);
  });
});

describe("fitToBox", () => {
  it("keeps the roof inside the box with north up", () => {
    const d = buildRoofDrawing(design())!;
    const { toPx } = fitToBox(d, 600, 400, 20);
    const north = toPx({ x: 0, y: 4 });
    const south = toPx({ x: 0, y: -4 });
    expect(north.y).toBeLessThan(south.y);
    for (const p of d.faces[0].ring.map(toPx)) {
      expect(p.x).toBeGreaterThanOrEqual(19.9);
      expect(p.x).toBeLessThanOrEqual(580.1);
      expect(p.y).toBeGreaterThanOrEqual(19.9);
      expect(p.y).toBeLessThanOrEqual(380.1);
    }
  });
});

describe("orientForBox", () => {
  it("lays a tall roof wide in a wide frame, walls square to it", async () => {
    const { orientForBox } = await import("./roofGeometry");
    // A 6 m × 16 m roof standing north-south, turned 20° off the grid.
    const t = (20 * Math.PI) / 180;
    const pt = (x: number, y: number) => at(x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t));
    const d = buildRoofDrawing(design({ savedRoofs: [[pt(-3, -8), pt(3, -8), pt(3, 8), pt(-3, 8)]], generatedPanels: [] }))!;
    const o = orientForBox(d, 600, 300);
    expect(o.maxX - o.minX).toBeCloseTo(16, 1);
    expect(o.maxY - o.minY).toBeCloseTo(6, 1);
  });
});
