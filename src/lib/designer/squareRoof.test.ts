import { describe, expect, it } from "vitest";
import { dropJogs, hipFacesForSquareRoof, wallAxisDeg } from "@/lib/designer/squareRoof";

const lat0 = -33.78;
const lng0 = 150.78;
const mL = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / 111320, lng: lng0 + x / mL });

// A 10 m × 6 m hip roof, walls square to north.
const rect = [ll(0, 0), ll(10, 0), ll(10, 6), ll(0, 6)];
const seg = (az: number, plan: number, x: number, y: number) => ({
  azimuthDegrees: az,
  pitchDegrees: 22,
  areaM2: plan / Math.cos((22 * Math.PI) / 180),
  center: ll(x, y),
});

describe("hipFacesForSquareRoof", () => {
  it("draws four hip faces on a rectangle, with Google's pitch", () => {
    // Plan areas of a 10×6 hip roof: long sides 21 m² each, ends 9 m² each.
    const segs = [seg(0, 21, 5, 5), seg(180, 21, 5, 1), seg(90, 9, 9, 3), seg(270, 9, 1, 3)];
    const faces = hipFacesForSquareRoof(rect, segs)!;
    expect(faces).not.toBeNull();
    expect(faces).toHaveLength(4);
    expect(faces.map((f) => f.azimuthDeg).sort((a, b) => a - b)).toEqual([0, 90, 180, 270]);
    expect(faces.every((f) => f.pitchDeg === 22)).toBe(true);
  });

  it("refuses a gable roof (Google sees only two faces)", () => {
    const segs = [seg(0, 30, 5, 5), seg(180, 30, 5, 1)];
    expect(hipFacesForSquareRoof(rect, segs)).toBeNull();
  });

  it("refuses an outline that isn't square-walled", () => {
    const skew = [ll(0, 0), ll(10, 0), ll(12, 6), ll(0, 6)];
    const segs = [seg(0, 21, 5, 5), seg(180, 21, 5, 1), seg(90, 9, 9, 3), seg(270, 9, 1, 3)];
    expect(hipFacesForSquareRoof(skew, segs)).toBeNull();
  });

  it("has a valley at the inside corner of an L", () => {
    const L = [ll(0, 0), ll(6, 0), ll(6, 4), ll(12, 4), ll(12, 10), ll(0, 10)];
    // Rough Google shares for this L; the share test is relaxed here.
    const segs = [seg(0, 30, 6, 9), seg(180, 18, 4, 1), seg(90, 15, 11, 7), seg(270, 21, 1, 5)];
    const faces = hipFacesForSquareRoof(L, segs, { maxShareDiff: 1 });
    expect(faces).not.toBeNull();
    expect(faces!.length).toBe(6);
  });
});

describe("dropJogs", () => {
  it("drops a short step in a wall onto the inner line", () => {
    const r = [
      { u: 0, v: 0 }, { u: 10, v: 0 }, { u: 10, v: 6 }, { u: 5, v: 6 }, { u: 5, v: 6.4 }, { u: 0, v: 6.4 },
    ];
    const out = dropJogs(r);
    expect(out).toHaveLength(4);
    expect(Math.max(...out.map((p) => p.v))).toBeCloseTo(6);
  });

  it("keeps a real wing", () => {
    const r = [{ u: 0, v: 0 }, { u: 6, v: 0 }, { u: 6, v: 4 }, { u: 12, v: 4 }, { u: 12, v: 10 }, { u: 0, v: 10 }];
    expect(dropJogs(r)).toHaveLength(6);
  });
});

describe("wallAxisDeg", () => {
  it("reads the wall direction mod 90°", () => {
    const a = (30 * Math.PI) / 180;
    const ring = [[0, 0], [10, 0], [10, 6], [0, 6]].map(([x, y]) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }));
    expect(wallAxisDeg(ring)).toBeCloseTo(30, 5);
  });
});
