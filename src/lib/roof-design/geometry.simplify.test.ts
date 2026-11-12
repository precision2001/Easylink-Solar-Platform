import { describe, expect, it } from "vitest";
import { fromLocalXY, minAreaRectangle, ringAreaM2, simplifyRing } from "./geometry";

const o = { lat: -33.85, lng: 151.05 };
const ring = (pts: [number, number][]) => pts.map(([x, y]) => fromLocalXY({ x, y }, o));

describe("straight-border helpers", () => {
  it("simplifies a ragged rectangle back to its corners", () => {
    const pts: [number, number][] = [];
    for (let x = 0; x <= 20; x += 0.5) pts.push([x, (Math.round(x * 2) % 2) * 0.1]);
    for (let y = 0.5; y <= 10; y += 0.5) pts.push([20 + (Math.round(y * 2) % 2) * 0.1, y]);
    for (let x = 19.5; x >= 0; x -= 0.5) pts.push([x, 10 - (Math.round(x * 2) % 2) * 0.1]);
    for (let y = 9.5; y > 0; y -= 0.5) pts.push([(Math.round(y * 2) % 2) * 0.1, y]);
    const s = simplifyRing(ring(pts), 0.3);
    expect(s.length).toBeLessThanOrEqual(6);
    expect(ringAreaM2(s)).toBeGreaterThan(190);
    expect(ringAreaM2(s)).toBeLessThan(210);
  });

  it("finds the smallest rectangle round a turned shape", () => {
    const a = (30 * Math.PI) / 180;
    const rot = ([x, y]: [number, number]): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const r = minAreaRectangle(ring(([[0, 0], [12, 0], [12, 4], [6, 6], [0, 4]] as [number, number][]).map(rot)))!;
    expect(r).toHaveLength(4);
    expect(ringAreaM2(r)).toBeGreaterThan(71);
    expect(ringAreaM2(r)).toBeLessThan(73);
  });
});
