import { describe, expect, it } from "vitest";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";

const LAT0 = -33.8533;
const LNG0 = 151.0517;
const M_LAT = 111320;
const M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });
const xy = (p: { lat: number; lng: number }) => ({
  x: (p.lng - LNG0) * M_LNG,
  y: (p.lat - LAT0) * M_LAT,
});
const edgeAngles = (ring: { lat: number; lng: number }[]) =>
  ring.map((p, i) => {
    const a = xy(p);
    const b = xy(ring[(i + 1) % ring.length]);
    return ((Math.round((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) % 180) + 180) % 180;
  });

describe("roof-line rule", () => {
  it("straightens a wobbly rectangle onto the main walls", () => {
    // 14 x 8 m roof traced with ~0.2 m wobble and a stray mid-edge point.
    const [out] = regularizeRoofOutlines([
      [ll(0, 0), ll(7, 0.25), ll(14, 0.1), ll(14.2, 8), ll(0.1, 7.8)],
    ]);
    expect(out).toHaveLength(4);
    for (const a of edgeAngles(out)) expect([0, 90]).toContain(a);
  });

  it("snaps a hip traced at 40° onto 45°", () => {
    // Triangle hip end: eave along x, two hips meeting at the apex.
    const [out] = regularizeRoofOutlines([[ll(0, 0), ll(10, 0), ll(5.4, 4.6)]]);
    const angles = edgeAngles(out);
    expect(angles).toContain(0);
    expect(angles).toContain(45);
    expect(angles).toContain(135);
  });

  it("makes neighbouring roofs share the same corners", () => {
    // Two faces meeting along a ridge, traced with corners 0.2 m apart.
    const [a, b] = regularizeRoofOutlines([
      [ll(0, 0), ll(10, 0), ll(10, 4), ll(0, 4)],
      [ll(0.15, 4.2), ll(10.1, 4.15), ll(10, 8), ll(0, 8)],
    ]);
    const key = (p: { lat: number; lng: number }) => {
      const q = xy(p);
      return `${q.x.toFixed(3)},${q.y.toFixed(3)}`;
    };
    const shared = a.map(key).filter((k) => b.map(key).includes(k));
    expect(shared).toHaveLength(2);
  });

  it("leaves a genuinely angled edge alone", () => {
    // A 22° edge is more than 20° from both 0° and 45°, so it stays.
    const ring = [ll(0, 0), ll(10, 0), ll(10, 4.04)];
    const [out] = regularizeRoofOutlines([ring], { mainAxisDeg: 0 });
    expect(edgeAngles(out)).toContain(22);
  });
});
