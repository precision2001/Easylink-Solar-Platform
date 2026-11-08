import { describe, expect, it } from "vitest";
import { mergeAcrossUnseenLines } from "./visibleLines";
import type { GeoTiffRaster } from "@/utils/geotiff";

const LAT0 = -33.85;
const LNG0 = 151.05;
const M_LAT = 111320;
const M_LNG = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });

/** A 12 m x 8 m roof; `step` paints a dark line across it at x = 0 (a visible roof line). */
function image(step: boolean): GeoTiffRaster {
  const px = 0.03;
  const size = 16;
  const n = Math.round(size / px);
  const data = new Float32Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = -size / 2 + (c + 0.5) * px;
      const y = size / 2 - (r + 0.5) * px;
      const onRoof = Math.abs(x) <= 6 && Math.abs(y) <= 4;
      data[r * n + c] = !onRoof ? 40 : step && Math.abs(x) < 0.08 ? 90 : 200;
    }
  }
  const h = size / 2;
  return { data, width: n, height: n, bounds: { north: LAT0 + h / M_LAT, south: LAT0 - h / M_LAT, east: LNG0 + h / M_LNG, west: LNG0 - h / M_LNG }, noDataValue: null };
}

const outline = [ll(-6, 4), ll(6, 4), ll(6, -4), ll(-6, -4)];
// Two faces either side of x = 0.
const faces = [
  { ring: [ll(-6, 4), ll(0, 4), ll(0, -4), ll(-6, -4)], id: "w" },
  { ring: [ll(0, 4), ll(6, 4), ll(6, -4), ll(0, -4)], id: "e" },
];

describe("mergeAcrossUnseenLines (flat roofs)", () => {
  it("makes one flat face when the line between the faces isn't visible", () => {
    const r = mergeAcrossUnseenLines(faces, outline, image(false));
    expect(r.merged).toBe(1);
    expect(r.faces).toHaveLength(1);
    expect(r.faces[0].ring).toEqual(outline);
  });

  it("keeps the split where the image shows the line", () => {
    const r = mergeAcrossUnseenLines(faces, outline, image(true));
    expect(r.merged).toBe(0);
    expect(r.faces).toHaveLength(2);
  });
});
