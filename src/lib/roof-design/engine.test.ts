import { describe, expect, it } from "vitest";
import { bestAvailableRoofs, designRoof, initialRoofs, type RoofDesignContext } from "./engine";
import { panelCorners, ringAreaM2 } from "./geometry";

const lat0 = -33.78;
const lng0 = 150.78;
const mL = 111320 * Math.cos((lat0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: lat0 + y / 111320, lng: lng0 + x / mL });
const rect = (x0: number, y0: number, w: number, h: number) => [ll(x0, y0), ll(x0 + w, y0), ll(x0 + w, y0 + h), ll(x0, y0 + h)];
const pin = ll(5, 4);

describe("initialRoofs", () => {
  it("uses a placeholder square only when nothing is known", () => {
    expect(initialRoofs({ pin })?.source).toBe("placeholder");
    expect(initialRoofs({ pin }, { placeholder: false })).toBeNull();
    expect(bestAvailableRoofs({ pin })).toBeNull();
  });

  it("prefers the building footprint over Google's box, trimmed to the lot", () => {
    const ctx: RoofDesignContext = {
      pin,
      footprint: rect(-6, 0, 22, 8), // a terrace row
      parcel: { ring: rect(0, -5, 10, 20), areaM2: 200 },
    };
    const r = initialRoofs(ctx)!;
    expect(r.source).toBe("footprint");
    expect(r.traced).toBe(false);
    expect(ringAreaM2(r.rings[0])).toBeCloseTo(80, 0); // 10 × 8 on this lot
  });
});

describe("designRoof", () => {
  it("designs a drawn roof: faces, panels clear of every line, inverter sizing", () => {
    const d = designRoof({ pin }, { outline: [rect(0, 0, 14, 9)], panelWatts: 440 })!;
    expect(d).not.toBeNull();
    expect(d.faceSet.source).toBe("assumed-hip");
    expect(d.faceSet.faces.length).toBe(4);
    expect(d.panels.length).toBeGreaterThan(10);
    expect(d.panels.every((p) => p.orientation === d.orientation)).toBe(true);
    expect(d.systemKw).toBeCloseTo((d.panels.length * 440) / 1000, 2);
    expect(d.inverter).toBeTruthy();
    // 100 mm setback: every corner inside the outline, at least 0.1 m from the walls.
    for (const p of d.panels) {
      for (const c of panelCorners(p, d.dims)) {
        const x = (c.lng - lng0) * mL;
        const y = (c.lat - lat0) * 111320;
        expect(Math.min(x, 14 - x, y, 9 - y)).toBeGreaterThanOrEqual(0.099);
      }
    }
  });

  it("picks the orientation that fits more when asked for the best", () => {
    const d = designRoof({ pin }, { outline: [rect(0, 0, 14, 9)], orientation: "best" })!;
    expect(d.panels.length).toBe(Math.max(d.counts.PORTRAIT, d.counts.LANDSCAPE));
  });
});
