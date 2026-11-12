import { describe, expect, it } from "vitest";
import { fitRoofJunctions } from "./junctions";
import type { GeoTiffRaster } from "@/utils/geotiff";

// A 10 m square pyramid roof seen from above: four faces of different
// brightness meeting at an apex 0.6 m east and 0.4 m north of the centre.
const LAT0 = -33.75;
const LNG0 = 150.9;
const M_LAT = 111320;
const M_LNG = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });

function pyramidImage(apex: { x: number; y: number }): GeoTiffRaster {
  const px = 0.03;
  const size = 14; // metres, centred on the roof
  const n = Math.round(size / px);
  const data = new Float32Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = -size / 2 + (c + 0.5) * px;
      const y = size / 2 - (r + 0.5) * px;
      let v = 40; // ground
      if (Math.abs(x) <= 5 && Math.abs(y) <= 5) {
        // Which face: the triangle (two corners and the apex) the point is in.
        const inTri = (ax: number, ay: number, bx: number, by: number) => {
          const d = (px: number, py: number, qx: number, qy: number) => (qx - px) * (y - py) - (qy - py) * (x - px);
          const s1 = d(ax, ay, bx, by);
          const s2 = d(bx, by, apex.x, apex.y);
          const s3 = d(apex.x, apex.y, ax, ay);
          return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
        };
        const north = inTri(-5, 5, 5, 5);
        const south = inTri(5, -5, -5, -5);
        const east = inTri(5, 5, 5, -5);
        v = north ? 160 : south ? 90 : east ? 130 : 110;
      }
      data[r * n + c] = v;
    }
  }
  const half = size / 2;
  return {
    data,
    width: n,
    height: n,
    bounds: { north: LAT0 + half / M_LAT, south: LAT0 - half / M_LAT, east: LNG0 + half / M_LNG, west: LNG0 - half / M_LNG },
    noDataValue: null,
  };
}

const square = [ll(-5, 5), ll(5, 5), ll(5, -5), ll(-5, -5)];
const facesWithApex = (a: { lat: number; lng: number }) => [
  { ring: [square[0], square[1], a] },
  { ring: [square[1], square[2], a] },
  { ring: [square[2], square[3], a] },
  { ring: [square[3], square[0], a] },
];

describe("fitRoofJunctions", () => {
  it("moves the apex onto the point where the image's hips meet, for all four faces at once", () => {
    const truth = { x: 0.6, y: 0.4 };
    const fit = fitRoofJunctions([square], facesWithApex(ll(0, 0)), pyramidImage(truth), { fixedOutline: true });
    expect(fit.moved).toBe(1);
    const apexes = fit.faces.map((f) => f.ring[2]);
    // Every face got the same (shared) point.
    for (const a of apexes) expect(a).toEqual(apexes[0]);
    const a = apexes[0];
    const x = (a.lng - LNG0) * M_LNG;
    const y = (a.lat - LAT0) * M_LAT;
    expect(Math.hypot(x - truth.x, y - truth.y)).toBeLessThan(0.12);
    // The outline is untouched.
    expect(fit.outline[0]).toEqual(square);
  });

  it("leaves a roof alone when its junctions already sit on the image's lines", () => {
    const fit = fitRoofJunctions([square], facesWithApex(ll(0, 0)), pyramidImage({ x: 0, y: 0 }), { fixedOutline: true });
    expect(fit.moved).toBe(0);
  });

  it("does nothing without an image", () => {
    const faces = facesWithApex(ll(0, 0));
    expect(fitRoofJunctions([square], faces, null).faces).toBe(faces);
  });
});
