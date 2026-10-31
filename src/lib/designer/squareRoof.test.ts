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

  it("draws a gable roof when Google sees only two faces", () => {
    const segs = [seg(0, 30, 5, 5), seg(180, 30, 5, 1)];
    const faces = hipFacesForSquareRoof(rect, segs)!;
    expect(faces).not.toBeNull();
    expect(faces.map((f) => f.azimuthDeg).sort((a, b) => a - b)).toEqual([0, 180]);
  });

  it("finds a gable at one end (11 Melton St S)", () => {
    // 10×6 with the west end a gable: N and S 25.5 m² each, E hip 9 m².
    const segs = [seg(0, 25.5, 5, 5), seg(180, 25.5, 5, 1), seg(90, 9, 9, 3)];
    const faces = hipFacesForSquareRoof(rect, segs)!;
    expect(faces).not.toBeNull();
    expect(faces.map((f) => f.azimuthDeg).sort((a, b) => a - b)).toEqual([0, 90, 180]);
  });

  it("refuses an outline that isn't square-walled", () => {
    const skew = [ll(0, 0), ll(10, 0), ll(12, 6), ll(0, 6)];
    const segs = [seg(0, 21, 5, 5), seg(180, 21, 5, 1), seg(90, 9, 9, 3), seg(270, 9, 1, 3)];
    expect(hipFacesForSquareRoof(skew, segs)).toBeNull();
  });

  it("has a valley at the inside corner of an L", () => {
    const L = [ll(0, 0), ll(6, 0), ll(6, 4), ll(12, 4), ll(12, 10), ll(0, 10)];
    // Google's plan areas for this L hip roof: N 27, S 27 (9 + 18), E 21 (12 + 9), W 21.
    const segs = [seg(0, 27, 6, 9), seg(180, 18, 9, 5), seg(180, 9, 3, 1), seg(90, 21, 11, 7), seg(270, 21, 1, 5)];
    const faces = hipFacesForSquareRoof(L, segs);
    expect(faces).not.toBeNull();
    expect(faces!.length).toBe(6);
  });
});

describe("dropJogs", () => {
  it("drops a short step in a wall (lines merged, length-weighted)", () => {
    const r = [
      { u: 0, v: 0 }, { u: 10, v: 0 }, { u: 10, v: 6 }, { u: 5, v: 6 }, { u: 5, v: 6.4 }, { u: 0, v: 6.4 },
    ];
    const out = dropJogs(r);
    expect(out).toHaveLength(4);
    expect(Math.max(...out.map((p) => p.v))).toBeCloseTo(6.2);
  });

  it("keeps a real wing", () => {
    const r = [{ u: 0, v: 0 }, { u: 6, v: 0 }, { u: 6, v: 4 }, { u: 12, v: 4 }, { u: 12, v: 10 }, { u: 0, v: 10 }];
    expect(dropJogs(r)).toHaveLength(6);
  });
});

describe("dropJogs staircase", () => {
  it("keeps a 2 m wing whose corners are staircases (11 Melton St S)", () => {
    const c = [[-3.93,7.7],[1.32,7.7],[1.32,7.45],[1.82,7.45],[1.82,7.2],[2.07,7.2],[2.07,6.7],[2.32,6.7],[2.32,5.7],[2.57,5.7],[2.57,5.45],[3.57,5.45],[3.57,5.2],[4.07,5.2],[4.07,-4.05],[3.82,-4.05],[3.82,-5.3],[3.57,-5.3],[3.57,-5.55],[2.07,-5.55],[2.07,-6.05],[1.82,-6.05],[1.82,-9.05],[1.57,-9.05],[1.57,-9.3],[-0.68,-9.3],[-0.68,-9.55],[-3.43,-9.55],[-3.43,-5.8],[-3.68,-5.8],[-3.68,-5.55],[-3.93,-5.55],[-3.93,1.95],[-3.68,1.95],[-3.68,4.2],[-3.93,4.2]]
      .map(([u, v]) => ({ u: u + 1e-13 * Math.sin(u * 7), v: v + 1e-13 * Math.cos(v * 3) }));
    // Without the corner-step pass (the page tries both and lets Google's data decide).
    const out = dropJogs(c, 1.0, 0);
    expect(out.length).toBe(8);
    expect(Math.max(...out.map((p) => p.u))).toBeGreaterThan(3.5);
  });
});

describe("wallAxisDeg", () => {
  it("reads the wall direction mod 90°", () => {
    const a = (30 * Math.PI) / 180;
    const ring = [[0, 0], [10, 0], [10, 6], [0, 6]].map(([x, y]) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) }));
    expect(wallAxisDeg(ring)).toBeCloseTo(30, 5);
  });
});
