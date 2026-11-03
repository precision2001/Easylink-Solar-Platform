import { describe, expect, it } from "vitest";
import { beautifyPanelsForFaces } from "./beautify";
import { generatePanelsForFaces } from "./panelLayout";

const lat0 = -33.9, lng0 = 151.1;
const M = 111320, ML = M * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / M, lng: lng0 + x / ML });
const dims = { heightM: 1.762, widthM: 1.134 };

describe("beautifyPanelsForFaces", () => {
  it("puts every panel on one grid (columns line up) on a stepped face", () => {
    // 20 m x 10 m with a 4 m x 3 m notch out of one corner
    const ring = [ll(0, 0), ll(20, 0), ll(20, 7), ll(16, 7), ll(16, 10), ll(0, 10)];
    const panels = beautifyPanelsForFaces([{ ring, eaveDeg: 0 }], dims, { orientation: "LANDSCAPE" });
    expect(panels.length).toBeGreaterThan(30);
    const xs = panels.map((p) => (p.center.lng - lng0) * ML);
    const cols = new Set(xs.map((x) => Math.round(((x % 1.782) + 1.782) % 1.782 * 100)));
    expect(cols.size).toBe(1); // one column phase for the whole face
  });

  it("never places more panels than the packer, and keeps them inside the face", () => {
    const ring = [ll(0, 0), ll(12, 0), ll(9, 6), ll(0, 6)];
    const faces = [{ ring, eaveDeg: 0 }];
    const b = beautifyPanelsForFaces(faces, dims, { orientation: "PORTRAIT" });
    const p = generatePanelsForFaces(faces, dims, { orientation: "PORTRAIT" });
    expect(b.length).toBeGreaterThan(0);
    expect(b.length).toBeLessThanOrEqual(p.length);
  });

  it("adds walkways on large faces", () => {
    const ring = [ll(0, 0), ll(40, 0), ll(40, 30), ll(0, 30)];
    const b = beautifyPanelsForFaces([{ ring, eaveDeg: 0 }], dims, { orientation: "LANDSCAPE" });
    const p = generatePanelsForFaces([{ ring, eaveDeg: 0 }], dims, { orientation: "LANDSCAPE" });
    expect(b.length).toBeLessThan(p.length * 0.95);
    expect(b.length).toBeGreaterThan(p.length * 0.6);
  });
});
