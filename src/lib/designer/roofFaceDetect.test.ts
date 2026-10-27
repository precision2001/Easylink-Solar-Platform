import { describe, expect, it } from "vitest";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import type { GeoTiffRaster } from "@/utils/geotiff";

const LAT0 = -33.8533;
const LNG0 = 151.0517;
const M_LAT = 111320;
const M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });

/** 0.25 m/px DSM over x -5..25 m, y -5..15 m. */
function dsm(height: (x: number, y: number) => number): GeoTiffRaster {
  const px = 0.25;
  const width = 120;
  const height_ = 80;
  const data = new Float32Array(width * height_);
  for (let r = 0; r < height_; r++) {
    for (let c = 0; c < width; c++) data[r * width + c] = height(-5 + (c + 0.5) * px, 15 - (r + 0.5) * px);
  }
  const nw = ll(-5, 15);
  const se = ll(25, -5);
  return { data, width, height: height_, bounds: { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng }, noDataValue: null };
}

const T24 = Math.tan((24 * Math.PI) / 180);
/** Hip roof on an 18 x 9.5 m house: 3 m walls, every face at 24°. */
const hipRoof = dsm((x, y) =>
  x >= 0 && x <= 18 && y >= 0 && y <= 9.5 ? 3 + T24 * Math.min(x, 18 - x, y, 9.5 - y) : 0,
);
const house = [ll(0, 0), ll(18, 0), ll(18, 9.5), ll(0, 9.5)];

describe("roof-line finder (height model)", () => {
  it("finds the four faces of a hip roof with their directions and pitch", () => {
    const faces = detectRoofFaces(hipRoof, [house])!;
    expect(faces).not.toBeNull();
    expect(faces).toHaveLength(4);
    const dirs = faces.map((f) => Math.round(f.azimuthDeg / 90) % 4).sort();
    expect(dirs).toEqual([0, 1, 2, 3]); // N, E, S, W
    for (const f of faces) expect(Math.abs(f.pitchDeg - 24)).toBeLessThan(2.5);
    // The two long faces (north and south) are the biggest.
    const long = faces.slice(0, 2).map((f) => Math.round(f.azimuthDeg / 90) % 4).sort();
    expect(long).toEqual([0, 2]);
  });

  it("runs rows along each face's contour", () => {
    const faces = detectRoofFaces(hipRoof, [house])!;
    for (const f of faces) {
      const along = ((Math.round(f.eaveDeg) % 180) + 180) % 180;
      const isNS = Math.round(f.azimuthDeg / 90) % 2 === 0;
      expect(along).toBe(isNS ? 0 : 90);
    }
  });

  it("leaves out ground and flat areas inside an outline drawn too big", () => {
    const tooBig = [ll(-2, -2), ll(20, -2), ll(20, 11.5), ll(-2, 11.5)];
    const faces = detectRoofFaces(hipRoof, [tooBig])!;
    expect(faces).toHaveLength(4);
    const total = faces.reduce((s, f) => s + f.areaM2, 0);
    expect(total).toBeLessThan(18 * 9.5 * 1.05);
  });

  it("finds all six faces of an L-shaped hip roof, valley included", () => {
    // L: 18 x 6 m main wing plus a 6 x 5 m wing to the north at the west end.
    const inL = (x: number, y: number) => (x >= 0 && x <= 18 && y >= 0 && y <= 6) || (x >= 0 && x <= 6 && y >= 6 && y <= 11);
    // Distance to the nearest outside point approximates a hip roof's height.
    const edgeDist = (x: number, y: number) => {
      let d = Infinity;
      for (let a = 0; a < 360; a += 6) {
        const t = (a * Math.PI) / 180;
        let r = 0;
        while (r < 6 && inL(x + r * Math.cos(t), y + r * Math.sin(t))) r += 0.05;
        d = Math.min(d, r * Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t))));
      }
      return d;
    };
    const L = dsm((x, y) => (inL(x, y) ? 3 + T24 * edgeDist(x, y) : 0));
    const outline = [ll(0, 0), ll(18, 0), ll(18, 6), ll(6, 6), ll(6, 11), ll(0, 11)];
    const faces = detectRoofFaces(L, [outline])!;
    expect(faces).not.toBeNull();
    expect(faces.length).toBe(6);
  });

  it("returns null without a height model, so the hip split is used instead", () => {
    expect(detectRoofFaces(null, [house])).toBeNull();
    expect(detectRoofFaces(dsm(() => 0), [house])).toBeNull();
  });
});
