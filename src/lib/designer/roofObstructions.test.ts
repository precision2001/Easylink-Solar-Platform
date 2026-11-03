import { describe, expect, it } from "vitest";
import { findRoofObstructions } from "./roofObstructions";
import { keepFacesInsideRoofs } from "./roofLineCorrect";
import type { GeoTiffRaster } from "@/utils/geotiff";

// 200 x 200 px image, 0.03 m/px, north-up.
const W = 200;
const H = 200;
const bounds = { north: -33.85, south: -33.85 - (200 * 0.03) / 111320, west: 151.04, east: 151.04 + (200 * 0.03) / (111320 * Math.cos((33.85 * Math.PI) / 180)) };
const ll = (col: number, row: number) => ({
  lat: bounds.north + (row / H) * (bounds.south - bounds.north),
  lng: bounds.west + (col / W) * (bounds.east - bounds.west),
});
function image(base: number, paint: (set: (x: number, y: number, v: number) => void) => void): GeoTiffRaster {
  const data = new Float32Array(W * H).fill(base);
  // light texture
  for (let i = 0; i < W * H; i++) data[i] += ((i * 7919) % 13) - 6;
  paint((x, y, v) => { data[y * W + x] = v; });
  return { data, width: W, height: H, bounds, noDataValue: null } as GeoTiffRaster;
}
const face = [ll(10, 10), ll(190, 10), ll(190, 190), ll(10, 190)];

describe("findRoofObstructions", () => {
  it("finds a vent as a spot and a level difference as a step on a white sheet roof (66 Frances St)", () => {
    const luma = image(210, (set) => {
      for (let y = 60; y < 68; y++) for (let x = 60; x < 68; x++) set(x, y, 120); // vent
      for (let x = 40; x < 160; x++) for (let y = 140; y < 143; y++) set(x, y, 130); // step shadow
    });
    const found = findRoofObstructions(luma, [face]);
    expect(found.filter((o) => o.kind === "spot")).toHaveLength(1);
    expect(found.filter((o) => o.kind === "step")).toHaveLength(1);
  });

  it("ignores plain tile texture and dark lines along face edges (hips, valleys)", () => {
    const luma = image(140, (set) => {
      for (let y = 10; y < 190; y++) for (let x = 10; x < 13; x++) set(x, y, 60); // along the face edge
    });
    expect(findRoofObstructions(luma, [face])).toHaveLength(0);
  });
});

describe("keepFacesInsideRoofs", () => {
  it("pulls a corner that shot outside the roof back onto the outline (1 Frampton St spike)", () => {
    const outline = [ll(10, 10), ll(190, 10), ll(190, 190), ll(10, 190)];
    const faces = [{ ring: [ll(10, 10), ll(260, 10), ll(190, 190)] }]; // 2 m past the east wall
    const [f] = keepFacesInsideRoofs(faces, [outline]);
    const east = Math.max(...f.ring.map((p) => p.lng));
    expect(east).toBeLessThanOrEqual(ll(190.5, 0).lng);
  });
});
