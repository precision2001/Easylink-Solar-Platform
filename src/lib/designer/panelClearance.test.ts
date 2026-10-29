import { describe, expect, it } from "vitest";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";
import { keepPanelsClear } from "@/lib/designer/panelClearance";

const lat0 = -33.78, lng0 = 150.78;
const mL = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / 111320, lng: lng0 + x / mL });
const dims = { heightM: 1.762, widthM: 1.134 };

describe("keepPanelsClear", () => {
  const face = [ll(0, 0), ll(12, 0), ll(12, 5), ll(0, 5)];
  for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
    it(`keeps every panel the packer placed (${orientation})`, () => {
      const panels = generatePanelsForFaces([{ ring: face, eaveDeg: 0, pitchDeg: 22 }], dims, { orientation, pitchDeg: 22 }, 0);
      expect(panels.length).toBeGreaterThan(0);
      expect(keepPanelsClear(panels, [face], [face], dims)).toHaveLength(panels.length);
    });
  }
  it("matches the packer on a face turned 30°", () => {
    const a = (30 * Math.PI) / 180;
    const r = (x: number, y: number) => ll(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
    const f = [r(0, 0), r(12, 0), r(12, 5), r(0, 5)];
    for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
      const panels = generatePanelsForFaces([{ ring: f, eaveDeg: 30, pitchDeg: 22 }], dims, { orientation, pitchDeg: 22 }, 30);
      expect(panels.length).toBeGreaterThan(0);
      expect(keepPanelsClear(panels, [f], [f], dims)).toHaveLength(panels.length);
    }
  });
  it("removes panels that reach past the roof outline", () => {
    const panels = generatePanelsForFaces([{ ring: face, eaveDeg: 0, pitchDeg: 22 }], dims, { orientation: "PORTRAIT", pitchDeg: 22 }, 0);
    const smaller = [ll(0, 0), ll(10, 0), ll(10, 5), ll(0, 5)];
    const kept = keepPanelsClear(panels, [face], [smaller], dims);
    expect(kept.length).toBeLessThan(panels.length);
    expect(kept.length).toBeGreaterThan(0);
  });
});
