import { describe, expect, it } from "vitest";
import { analyseRoofSnapshot, snapshotBounds, snapshotMetresPerPixel, type SnapshotGeo } from "./roofSnapshot";
import { regularizeRoofOutlines } from "./roofLines";

const geo: SnapshotGeo = { centerLat: -33.8534, centerLng: 151.0517, zoom: 21, scale: 2, widthPx: 400, heightPx: 400 };

/** Synthetic aerial: grey ground, terracotta roof (sunny + shaded halves), dark gap, a neighbour's roof. */
function scene(): Uint8ClampedArray {
  const { widthPx: W, heightPx: H } = geo;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = [110, 112, 100]; // ground
      if (x >= 80 && x < 320 && y >= 120 && y < 280) c = y < 200 ? [216, 117, 86] : [170, 98, 80]; // roof
      if (x >= 80 && x < 320 && y >= 40 && y < 100) c = [200, 110, 85]; // neighbour
      if (x >= 80 && x < 320 && y >= 100 && y < 120) c = [18, 18, 24]; // driveway gap
      // tile texture
      const n = ((x * 7 + y * 13) % 11) - 5;
      const i = (y * W + x) * 4;
      px[i] = c[0] + n;
      px[i + 1] = c[1] + n;
      px[i + 2] = c[2] + n;
      px[i + 3] = 255;
    }
  }
  return px;
}

describe("roof snapshot", () => {
  it("knows its ground scale (~3 cm at zoom 21 in Sydney)", () => {
    expect(snapshotMetresPerPixel(geo)).toBeCloseTo(0.031, 3);
    const b = snapshotBounds(geo);
    expect(b.north).toBeGreaterThan(geo.centerLat);
    expect(b.east).toBeGreaterThan(geo.centerLng);
  });

  it("finds the whole roof under the pin — sunny and shaded faces, not the neighbour", () => {
    const b = snapshotBounds(geo);
    const pinAt = (x: number, y: number) => ({
      lat: b.north + (y / geo.heightPx) * (b.south - b.north),
      lng: b.west + (x / geo.widthPx) * (b.east - b.west),
    });
    const mpp = snapshotMetresPerPixel(geo);
    for (const pin of [pinAt(200, 150), pinAt(200, 250)]) {
      const a = analyseRoofSnapshot(scene(), geo, { pin });
      expect(a).not.toBeNull();
      const expected = 240 * 160 * mpp * mpp;
      expect(a!.areaM2).toBeGreaterThan(expected * 0.95);
      expect(a!.areaM2).toBeLessThan(expected * 1.05);
      const [ring] = regularizeRoofOutlines([a!.outlines[0].ring]);
      expect(ring.length).toBe(4); // one straight line per wall
    }
  });

  it("returns null when the pin is off any roof colour region worth tracing", () => {
    const b = snapshotBounds(geo);
    const a = analyseRoofSnapshot(scene(), geo, { pin: { lat: b.south + 1e-6, lng: b.west + 1e-6 } });
    expect(a).toBeNull();
  });
});
