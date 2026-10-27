import { describe, expect, it } from "vitest";
import { splitRoofIntoFaces, splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";

const LAT0 = -33.8533;
const LNG0 = 151.0517;
const M_LAT = 111320;
const M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });
const xy = (p: { lat: number; lng: number }) => ({ x: (p.lng - LNG0) * M_LNG, y: (p.lat - LAT0) * M_LAT });
const area = (r: { lat: number; lng: number }[]) => {
  const q = r.map(xy);
  let a = 0;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += q[j].x * q[i].y - q[i].x * q[j].y;
  return Math.abs(a) / 2;
};
const inside = (p: { x: number; y: number }, r: { x: number; y: number }[]) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i].y > p.y !== r[j].y > p.y && p.x < ((r[j].x - r[i].x) * (p.y - r[i].y)) / (r[j].y - r[i].y) + r[i].x) c = !c;
  }
  return c;
};
const PANEL = { heightM: 1.879, widthM: 1.045 };
const house = [ll(0, 0), ll(18, 0), ll(18, 9.5), ll(0, 9.5)];

describe("face rule", () => {
  it("splits a rectangular hip roof into two long faces and two hip ends", () => {
    const faces = splitRoofIntoFaces(house);
    expect(faces).toHaveLength(4);
    expect(faces.reduce((s, f) => s + area(f.ring), 0)).toBeCloseTo(18 * 9.5, 3);
    expect(faces.map((f) => f.ring.length).sort()).toEqual([3, 3, 4, 4]);
  });

  it("splits an L-shaped outline into the hip faces of its rectangles", () => {
    const L = [ll(0, 0), ll(18, 0), ll(18, 6), ll(10, 6), ll(10, 11), ll(0, 11)];
    const faces = splitRoofIntoFaces(L);
    expect(faces).toHaveLength(8);
    expect(faces.reduce((s, f) => s + area(f.ring), 0)).toBeCloseTo(18 * 6 + 10 * 5, 3);
  });

  it("gives every edge of a convex, non-square outline its own face", () => {
    const trapezoid = [ll(0, 0), ll(16, 0), ll(13, 7), ll(3, 7)];
    const faces = splitRoofIntoFaces(trapezoid);
    expect(faces).toHaveLength(4);
    expect(faces.reduce((s, f) => s + area(f.ring), 0)).toBeCloseTo(((16 + 10) / 2) * 7, 2);
  });

  it("keeps every panel inside a single face — none cross a hip or the ridge", () => {
    const faces = splitRoofsIntoFaces([house]);
    const panels = generatePanelsForFaces(faces, PANEL, { orientation: "PORTRAIT", pitchDeg: 24 });
    expect(panels.length).toBeGreaterThan(0);
    for (const p of panels) {
      const face = faces[p.segmentIndex].ring.map(xy);
      expect(inside(xy(p.center), face)).toBe(true);
    }
  });

  it("fits fewer panels than packing the outline as one flat surface", () => {
    const flat = generatePanelsForFaces(
      [{ ring: house, eaveDeg: 0 }],
      PANEL,
      { orientation: "PORTRAIT", pitchDeg: 24 },
    ).length;
    const byFace = generatePanelsForFaces(splitRoofsIntoFaces([house]), PANEL, {
      orientation: "PORTRAIT",
      pitchDeg: 24,
    }).length;
    expect(byFace).toBeLessThan(flat);
  });
});
