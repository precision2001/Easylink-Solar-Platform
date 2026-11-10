import { describe, expect, it } from "vitest";
import { encodePng } from "../src/roof/overlay.js";
import { placeIntersections } from "../src/roof/intersections.js";
import type { RoofBuilding } from "../src/roof/faces.js";

/**
 * A 200×200 photo: ground 170; a roof of mid-grey tiles (110) from x 50..150,
 * y 50..150, a thin light gutter line (230) 1 px outside the tiles on every
 * side, and a dark shadow (40) 12 px wide beside the east and south eaves.
 */
function photo() {
  const W = 200, H = 200, data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 170;
      if (x >= 151 && x < 163 && y >= 50 && y < 163) v = 40;
      if (y >= 151 && y < 163 && x >= 50 && x < 163) v = 40;
      if ((x === 150 || x === 49) && y >= 49 && y <= 150) v = 230;
      if ((y === 150 || y === 49) && x >= 49 && x <= 150) v = 230;
      if (x >= 50 && x < 150 && y >= 50 && y < 150) v = 110;
      data.set([v, v, v, 255], (y * W + x) * 4);
    }
  return encodePng({ width: W, height: H, data });
}

const box = (d: number): RoofBuilding => ({
  name: "House", main: true, flat: true,
  outline: [[50 - d, 50 + d], [150 + d, 50 - d], [150 + d, 150 + d], [50 - d, 150 - d]],
  points: [{ id: "A", x: 50 - d, y: 50 + d }, { id: "B", x: 150 + d, y: 50 - d }, { id: "C", x: 150 + d, y: 150 + d }, { id: "D", x: 50 - d, y: 150 - d }],
  lines: [
    { from: "A", to: "B", kind: "eave", seen: "clear" },
    { from: "B", to: "C", kind: "eave", seen: "clear" },
    { from: "C", to: "D", kind: "eave", seen: "clear" },
    { from: "D", to: "A", kind: "eave", seen: "clear" },
  ],
  faces: [{ name: "Flat", bearingDeg: null, ring: [[50 - d, 50 + d], [150 + d, 50 - d], [150 + d, 150 + d], [50 - d, 150 - d]] }],
  obstructions: [],
});

describe("the intersection rule", () => {
  it("calculates each corner as the crossing of the measured eaves: on the tiles' corner, not the gutter or the shadow", () => {
    const b = [box(4)]; // traced 4 px off at every corner, skewed
    const r = placeIntersections(photo(), b, 0.03);
    expect(r.placed).toBe(4);
    expect(r.lines.every((l) => l.ok)).toBe(true);
    const at = (id: string) => b[0]!.points.find((p) => p.id === id)!;
    // last tile pixel: 50..149 → corners within a pixel of (50,50), (149,50), (149,149), (50,149)
    expect(Math.abs(at("A").x - 50)).toBeLessThanOrEqual(1.2);
    expect(Math.abs(at("A").y - 50)).toBeLessThanOrEqual(1.2);
    expect(Math.abs(at("C").x - 149)).toBeLessThanOrEqual(1.2);
    expect(Math.abs(at("C").y - 149)).toBeLessThanOrEqual(1.2);
    // the face and border corners follow their points
    expect(b[0]!.faces[0]!.ring[2]).toEqual([at("C").x, at("C").y]);
  });

  it("marks a line it can't measure for a site check, and leaves its points", () => {
    const W = 200, H = 200, data = new Uint8Array(W * H * 4).fill(120); // no edges at all
    const flat = encodePng({ width: W, height: H, data });
    const b = [box(0)];
    const r = placeIntersections(flat, b, 0.03);
    expect(r.placed).toBe(0);
    expect(r.marked).toBe(4);
    expect(b[0]!.lines.every((l) => l.seen === "faint")).toBe(true);
    expect(b[0]!.points[0]).toMatchObject({ x: 50, y: 50 });
  });
});
