import { describe, expect, it } from "vitest";
import { findRoofFaces, type RoofDesignContext } from "./engine";
import { fromPx } from "./aiFaces";
import type { GeoTiffRaster } from "@/utils/geotiff";
import type { RoofSnapshotAnalysis } from "@/lib/designer/roofSnapshot";

const lat0 = -33.78;
const lng0 = 150.78;
const mL = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / 111320, lng: lng0 + x / mL });
const rect = (x0: number, y0: number, w: number, h: number) => [ll(x0, y0), ll(x0 + w, y0), ll(x0 + w, y0 + h), ll(x0, y0 + h)];

/**
 * A 14 × 9 m gable roof seen at 5 cm a pixel: roof everywhere inside the
 * outline, a bright ridge capping along y = 4.5 m. Its true faces are two
 * (north and south of the ridge); the plain hip split would draw four.
 */
function gableSnapshot(): RoofSnapshotAnalysis {
  const res = 0.05;
  const pad = 2;
  const W = Math.round((14 + 2 * pad) / res);
  const H = Math.round((9 + 2 * pad) / res);
  const mask = new Uint8Array(W * H);
  const luma = new Float32Array(W * H).fill(90);
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const x = c * res - pad;
      const y = 9 + pad - r * res; // row 0 is the north edge
      const inside = x >= 0 && x <= 14 && y >= 0 && y <= 9;
      mask[r * W + c] = inside ? 1 : 0;
      if (inside) luma[r * W + c] = Math.abs(y - 4.5) < 0.1 ? 220 : y > 4.5 ? 150 : 110;
    }
  }
  const nw = ll(-pad, 9 + pad);
  const se = ll(14 + pad, -pad);
  const bounds = { north: nw.lat, south: se.lat, west: nw.lng, east: se.lng };
  const raster = (data: Uint8Array | Float32Array): GeoTiffRaster => ({ data, width: W, height: H, bounds, noDataValue: null });
  return { mask: raster(mask), luma: raster(luma), outlines: [], metresPerPixel: res, areaM2: 126 } as RoofSnapshotAnalysis;
}

describe("AI reading of the roof", () => {
  const outline = rect(0, 0, 14, 9);
  // The AI's ridge is 0.3 m south of the real one — typical of its errors.
  const aiFaces = [
    { ring: [ll(0, 4.2), ll(14, 4.2), ll(14, 9), ll(0, 9)], azimuthDeg: 0 },
    { ring: [ll(0, 0), ll(14, 0), ll(14, 4.2), ll(0, 4.2)], azimuthDeg: 180 },
  ];

  it("is used when the image backs it over the plain hip split", () => {
    const ctx: RoofDesignContext = { pin: ll(7, 4), snapshot: gableSnapshot(), aiFaces };
    const set = findRoofFaces([outline], ctx);
    expect(set.source).toBe("ai-image");
    expect(set.faces).toHaveLength(2);
  });

  it("is not used without the image, or when it covers too little of the roof", () => {
    expect(findRoofFaces([outline], { pin: ll(7, 4), aiFaces }).source).not.toBe("ai-image");
    const small = [{ ring: rect(0, 0, 3, 3), azimuthDeg: 180 }];
    expect(findRoofFaces([outline], { pin: ll(7, 4), snapshot: gableSnapshot(), aiFaces: small }).source).not.toBe("ai-image");
  });

  it("is ignored when there isn't one", () => {
    expect(findRoofFaces([outline], { pin: ll(7, 4), snapshot: gableSnapshot() }).source).not.toBe("ai-image");
  });
});

describe("fromPx", () => {
  it("puts the image centre on the pin and is about 3 cm a pixel at zoom 21", () => {
    const geo = { centerLat: -33.86, centerLng: 151.2, zoom: 21, scale: 2, widthPx: 1280, heightPx: 1280 };
    const c = fromPx(geo, 640, 640);
    expect(c.lat).toBeCloseTo(-33.86, 7);
    expect(c.lng).toBeCloseTo(151.2, 7);
    const east = fromPx(geo, 740, 640);
    const metres = (east.lng - 151.2) * 111320 * Math.cos((-33.86 * Math.PI) / 180);
    expect(metres).toBeGreaterThan(2.9);
    expect(metres).toBeLessThan(3.4);
    const south = fromPx(geo, 640, 740);
    expect(south.lat).toBeLessThan(c.lat);
  });
});
