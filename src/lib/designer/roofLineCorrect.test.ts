import { describe, expect, it } from "vitest";
import { correctInteriorLines, snapFacesToOutline } from "./roofLineCorrect";
import type { GeoTiffRaster } from "@/utils/geotiff";

const M = 111320;
const lat0 = -33.85;
const mLng = M * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / M, lng: 151 + x / mLng });

describe("roof line correction", () => {
  const outline = [ll(0, 0), ll(10, 0), ll(10, 6), ll(0, 6)];

  it("puts face corners that stop short exactly onto the eaves", () => {
    const faces = [{ ring: [ll(0.2, 0.3), ll(9.6, 0.3), ll(9.7, 3), ll(0.4, 3)] }];
    const [f] = snapFacesToOutline(faces, [outline]);
    expect(f.ring[0].lat).toBeCloseTo(outline[0].lat, 9);
    expect(f.ring[0].lng).toBeCloseTo(outline[0].lng, 9);
    expect((f.ring[2].lng - 151) * mLng).toBeCloseTo(10, 6);
  });

  it("moves a ridge onto the edge seen in the image", () => {
    // Image: bright north half (y > 3.4 m), darker south half — the real ridge is at y = 3.4.
    const W = 400;
    const H = 240;
    const data = new Float32Array(W * H);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) data[r * W + c] = 6 - (r / H) * 6 > 3.4 ? 180 : 110;
    const luma: GeoTiffRaster = {
      data,
      width: W,
      height: H,
      bounds: { north: ll(0, 6).lat, south: ll(0, 0).lat, west: ll(0, 0).lng, east: ll(10, 0).lng },
      noDataValue: null,
    };
    // Faces split at y = 3 (0.4 m off).
    const faces = [
      { ring: [ll(0, 0), ll(10, 0), ll(10, 3), ll(0, 3)] },
      { ring: [ll(0, 3), ll(10, 3), ll(10, 6), ll(0, 6)] },
    ];
    const out = correctInteriorLines(faces, [outline], luma);
    expect(out.moved).toBe(1);
    const ridgeY = (out.faces[0].ring[2].lat - lat0) * M;
    expect(ridgeY).toBeGreaterThan(3.3);
    expect(ridgeY).toBeLessThan(3.5);
    expect(out.checks.every((c) => c.status === "confirmed")).toBe(true);
  });
});
