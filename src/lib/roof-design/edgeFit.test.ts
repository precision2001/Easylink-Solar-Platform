import { describe, expect, it } from "vitest";
import { fitTraceToEdges } from "./edgeFit";
import type { GeoTiffRaster } from "@/utils/geotiff";

// A 10 m × 8 m hip roof seen from above (true corners at ±5, ±4; ridge from
// (-1, 0) to (1, 0)), traced by "Opus" with every point 0.2-0.5 m off.
const LAT0 = -33.75;
const LNG0 = 150.9;
const M_LAT = 111320;
const M_LNG = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });
const xy = (p: { lat: number; lng: number }) => ({ x: (p.lng - LNG0) * M_LNG, y: (p.lat - LAT0) * M_LAT });

function hipImage(): GeoTiffRaster {
  const px = 0.03;
  const size = 14;
  const n = Math.round(size / px);
  const data = new Float32Array(n * n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const x = -size / 2 + (c + 0.5) * px;
      const y = size / 2 - (r + 0.5) * px;
      let v = 40;
      if (Math.abs(x) <= 5 && Math.abs(y) <= 4) {
        // 45° hips: a point is on the face whose eave is nearest.
        const west = x + 5 < 4 - Math.abs(y);
        const east = 5 - x < 4 - Math.abs(y);
        v = west ? 100 : east ? 120 : y >= 0 ? 160 : 80;
      }
      data[r * n + c] = v;
    }
  const half = size / 2;
  return { data, width: n, height: n, bounds: { north: LAT0 + half / M_LAT, south: LAT0 - half / M_LAT, east: LNG0 + half / M_LNG, west: LNG0 - half / M_LNG }, noDataValue: null };
}

// Opus's points, each off by 0.2-0.5 m.
const P = {
  nw: ll(-5.3, 4.2),
  ne: ll(4.7, 4.3),
  se: ll(5.25, -3.7),
  sw: ll(-4.8, -4.35),
  r1: ll(-1.3, 0.3),
  r2: ll(1.4, -0.25),
};
const trace = {
  outline: [P.nw, P.ne, P.se, P.sw],
  faces: [
    { ring: [P.nw, P.ne, P.r2, P.r1] },
    { ring: [P.ne, P.se, P.r2] },
    { ring: [P.se, P.sw, P.r1, P.r2] },
    { ring: [P.sw, P.nw, P.r1] },
  ],
  lines: [
    { a: P.nw, b: P.ne },
    { a: P.ne, b: P.se },
    { a: P.se, b: P.sw },
    { a: P.sw, b: P.nw },
    { a: P.r1, b: P.r2 },
    { a: P.nw, b: P.r1 },
    { a: P.sw, b: P.r1 },
    { a: P.ne, b: P.r2 },
    { a: P.se, b: P.r2 },
  ],
};

describe("fitTraceToEdges", () => {
  it("puts every traced point on the photo's lines, within 100 mm", () => {
    const r = fitTraceToEdges(trace, hipImage());
    const truth = [
      [-5, 4],
      [5, 4],
      [5, -4],
      [-5, -4],
    ];
    r.trace.outline!.forEach((p, i) => {
      const q = xy(p);
      expect(Math.hypot(q.x - truth[i][0], q.y - truth[i][1])).toBeLessThan(0.1);
    });
    const ridge = r.trace.lines[4];
    const a = xy(ridge.a);
    const b = xy(ridge.b);
    expect(Math.hypot(a.x + 1, a.y)).toBeLessThan(0.1);
    expect(Math.hypot(b.x - 1, b.y)).toBeLessThan(0.1);
    expect(r.onEdge).toBe(9);
    expect(r.notSeen).toBe(0);
  });

  it("keeps lines joined: every face corner is the same shared point as before", () => {
    const r = fitTraceToEdges(trace, hipImage());
    const k = (p: { lat: number; lng: number }) => `${p.lat.toFixed(9)},${p.lng.toFixed(9)}`;
    expect(k(r.trace.faces[0].ring[0])).toBe(k(r.trace.outline![0]));
    expect(k(r.trace.faces[3].ring[2])).toBe(k(r.trace.faces[0].ring[3]));
    expect(k(r.trace.lines[5].b)).toBe(k(r.trace.lines[4].a));
  });

  it("leaves a line the image doesn't show where Opus put it, and says so", () => {
    const flat: GeoTiffRaster = { ...hipImage(), data: new Float32Array(hipImage().data.length).fill(120) };
    const r = fitTraceToEdges(trace, flat);
    expect(r.notSeen).toBe(9);
    expect(r.moved).toBe(0);
    expect(xy(r.trace.outline![0]).x).toBeCloseTo(-5.3, 5);
  });
});
