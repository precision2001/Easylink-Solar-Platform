import { describe, expect, it } from "vitest";
import { findExistingArrays, findRoofObstructions } from "./roofObstructions";
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

describe("findExistingArrays", () => {
  // A 2 x 3 block of panels (1.0 x 1.35 m, light frame lines between them) on a white sheet roof.
  const withArray = (base: number, panel: number) =>
    image(base, (set) => {
      for (let y = 40; y < 40 + 2 * 34; y++) for (let x = 40; x < 40 + 3 * 45; x++) {
        if (x >= 190 || y >= 190) continue;
        set(x, y, (x - 40) % 45 < 2 || (y - 40) % 34 < 2 ? base - 40 : panel);
      }
    });

  it("finds an existing array on a light roof and outlines all of it (26 Bridgeview Cct)", () => {
    const luma = withArray(210, 70);
    const found = findExistingArrays(luma, [face]);
    expect(found).toHaveLength(1);
    const cols = found[0].ring.map((p) => ((p.lng - bounds.west) / (bounds.east - bounds.west)) * W);
    const rows = found[0].ring.map((p) => ((bounds.north - p.lat) / (bounds.north - bounds.south)) * H);
    expect(Math.min(...cols)).toBeLessThanOrEqual(43);
    expect(Math.max(...cols)).toBeGreaterThanOrEqual(172);
    expect(Math.min(...rows)).toBeLessThanOrEqual(43);
    expect(Math.max(...rows)).toBeGreaterThanOrEqual(105);
  });

  it("takes no shadow line, vent or plain roof for panels", () => {
    const luma = image(210, (set) => {
      for (let x = 20; x < 180; x++) for (let y = 150; y < 156; y++) set(x, y, 90); // parapet shadow
      for (let y = 60; y < 70; y++) for (let x = 60; x < 70; x++) set(x, y, 60); // vent
      for (let y = 10; y < 80; y++) for (let x = 110; x < 190; x++) set(x, y, 70); // upper storey's shadow, against the face edge
    });
    expect(findExistingArrays(luma, [face])).toHaveLength(0);
  });

  it("leaves dark roofs to Opus's outlines", () => {
    expect(findExistingArrays(withArray(110, 40), [face])).toHaveLength(0);
  });
});


describe("panelsOffRoof", () => {
  it("takes out a panel over a dark courtyard beside a light roof, keeps the ones on the roof", () => {
    const W = 200, H = 200;
    const data = new Float32Array(W * H).fill(215);
    for (let y = 0; y < H; y++) for (let x = 120; x < W; x++) data[y * W + x] = 40; // courtyard on the right
    const luma = { width: W, height: H, data, bounds: { north: 0.002, south: 0, west: 0, east: 0.002 } } as never;
    const ll = (x: number, y: number) => ({ lat: 0.002 - (y / H) * 0.002, lng: (x / W) * 0.002 });
    const face = [ll(0, 0), ll(200, 0), ll(200, 200), ll(0, 200)];
    const panel = (x: number) => [ll(x, 50), ll(x + 30, 50), ll(x + 30, 100), ll(x, 100)];
    expect(panelsOffRoof(luma, [face], [panel(20), panel(70), panel(100), panel(140)])).toEqual([2, 3]);
  });
});
