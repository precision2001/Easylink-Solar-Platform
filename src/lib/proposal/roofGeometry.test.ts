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

  it("splits the outline into faces for older designs without saved faces", () => {
    const d = buildRoofDrawing(design())!;
    expect(d.faces.length).toBeGreaterThan(1);
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

describe("placeDriveway", () => {
  it("parks the car off the street-facing wall, nose to the house, battery beside it", async () => {
    const { placeDriveway, rectCorners, EV_SIZE } = await import("./roofGeometry");
    const d = buildRoofDrawing(design({ generatedPanels: [] }))!;
    // Street to the south of a 10 m × 8 m house.
    const p = placeDriveway(d, { x: 0, y: -25 });
    expect(p.ev).toBeDefined();
    expect(p.battery).toBeDefined();
    // Car is south of the house, pointing away from it (towards the street).
    expect(p.ev!.y).toBeLessThan(-4);
    expect(Math.round(p.ev!.angleDeg)).toBe(-90);
    // None of the car is on the roof.
    for (const q of rectCorners(p.ev!, EV_SIZE.length, EV_SIZE.width)) expect(q.y).toBeLessThan(-4);
    // Battery sits against that same wall, near the car's nose.
    expect(p.battery!.y).toBeGreaterThan(-4.6);
    expect(p.battery!.y).toBeLessThan(-4);
    expect(Math.abs(p.battery!.x - p.ev!.x)).toBeLessThan(3);
  });

  it("prefers the paved spot", async () => {
    const { placeDriveway } = await import("./roofGeometry");
    const d = buildRoofDrawing(design({ generatedPanels: [] }))!;
    const p = placeDriveway(d, { x: 0, y: -25 }, (c) => (c.every((q) => q.x > 1) ? 1 : 0));
    expect(p.ev!.x).toBeGreaterThan(1);
  });

  it("leaves the drawing alone when no wall faces the street", async () => {
    const { placeDriveway } = await import("./roofGeometry");
    const d = { ...buildRoofDrawing(design({ generatedPanels: [] }))!, outlines: [] };
    expect(placeDriveway(d, { x: 0, y: -25 }).ev).toBeUndefined();
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
