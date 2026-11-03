import { describe, expect, it } from "vitest";
import { checkInteriorLine, fitEavesToMask, interiorEdges } from "@/lib/designer/roofLineCheck";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import type { GeoTiffRaster } from "@/utils/geotiff";

const LAT0 = -33.8533;
const LNG0 = 151.0517;
const M_LAT = 111320;
const M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });
const xy = (p: { lat: number; lng: number }) => ({ x: (p.lng - LNG0) * M_LNG, y: (p.lat - LAT0) * M_LAT });

/** 0.1 m/px raster covering x -5..25 m, y -5..15 m, filled by `f(x, y)`. */
function raster(f: (x: number, y: number) => number): GeoTiffRaster {
  const px = 0.1;
  const width = 300;
  const height = 200;
  const data = new Float32Array(width * height);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      data[r * width + c] = f(-5 + (c + 0.5) * px, 15 - (r + 0.5) * px);
    }
  }
  const nw = ll(-5, 15);
  const se = ll(25, -5);
  return { data, width, height, bounds: { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng }, noDataValue: null };
}

// The real roof is 0..18 m x 0..9.5 m.
const roofMask = raster((x, y) => (x >= 0 && x <= 18 && y >= 0 && y <= 9.5 ? 1 : 0));

describe("roof-line check: eaves", () => {
  it("confirms eaves drawn on the roof edge", () => {
    const { checks } = fitEavesToMask([ll(0, 0), ll(18, 0), ll(18, 9.5), ll(0, 9.5)], roofMask);
    expect(checks.every((c) => c.status === "confirmed")).toBe(true);
  });

  it("moves an eave drawn 0.6 m inside the roof onto the real edge", () => {
    // South eave drawn at y = 0.6 instead of 0 — the S1 problem on 95 Bombay St.
    const { ring, checks } = fitEavesToMask([ll(0, 0.6), ll(18, 0.6), ll(18, 9.5), ll(0, 9.5)], roofMask);
    expect(checks[0].status).toBe("adjusted");
    const minY = Math.min(...ring.map((p) => xy(p).y));
    expect(Math.abs(minY)).toBeLessThan(0.1);
  });

  it("flags eaves when there is no imagery", () => {
    const { checks } = fitEavesToMask([ll(0, 0), ll(18, 0), ll(18, 9.5), ll(0, 9.5)], null);
    expect(checks.every((c) => c.status === "no-data")).toBe(true);
  });
});

describe("roof-line check: hips and ridges", () => {
  // Sunlit north face (y > 4.75) brighter than the south face.
  const twoTone = raster((x, y) => (y > 4.75 ? 180 : 110));

  it("confirms a ridge drawn on the brightness change", () => {
    expect(checkInteriorLine(ll(5, 4.75), ll(13, 4.75), twoTone).status).toBe("confirmed");
  });

  it("flags a ridge drawn 0.5 m off the brightness change", () => {
    const c = checkInteriorLine(ll(5, 5.25), ll(13, 5.25), twoTone);
    expect(c.status).toBe("unconfirmed");
    expect(c.offsetM).not.toBeNull();
    expect(Math.abs(Math.abs(c.offsetM!) - 0.5)).toBeLessThan(0.1);
  });

  it("flags a line with no visible edge (both faces in shade)", () => {
    const flat = raster(() => 120);
    expect(checkInteriorLine(ll(5, 4.75), ll(13, 4.75), flat).status).toBe("unconfirmed");
  });

  it("finds the hips and ridge of a hip roof as interior lines", () => {
    const house = [ll(0, 0), ll(18, 0), ll(18, 9.5), ll(0, 9.5)];
    const edges = interiorEdges(splitRoofsIntoFaces([house]), [house]);
    // 4 hips + 1 ridge.
    expect(edges).toHaveLength(5);
  });
});
