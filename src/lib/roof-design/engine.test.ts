import { describe, expect, it } from "vitest";
import { bestAvailableRoofs, designRoof, initialRoofs, lotForDesign, type RoofDesignContext } from "./engine";
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

describe("lotForDesign", () => {
  const seg = (x: number, y: number, areaM2: number) => ({
    pitchDegrees: 20,
    azimuthDegrees: 0,
    areaM2,
    center: ll(x, y),
    boundingBox: { sw: ll(x - 3, y - 3), ne: ll(x + 3, y + 3) },
  });
  const est = (segs: ReturnType<typeof seg>[]) =>
    ({ estimated: false, center: ll(8, 10), roofSegments: segs }) as unknown as Parameters<typeof lotForDesign>[1];

  it("widens a lot that holds only part of the house (264 Wangee Rd, Greenacre)", () => {
    const lot = { ring: rect(0, 0, 9, 30), areaM2: 270 };
    const r = lotForDesign(lot, est([seg(4, 10, 40), seg(12, 10, 40), seg(13, 16, 30)]), ll(8, 10))!;
    expect(r.extended).toBe(true);
    expect(r.areaM2).toBeGreaterThan(270);
  });

  it("keeps a lot that holds most of the house (a terrace)", () => {
    const lot = { ring: rect(0, 0, 9, 30), areaM2: 270 };
    const r = lotForDesign(lot, est([seg(4, 10, 60), seg(4, 16, 30), seg(12, 10, 20)]), ll(8, 10))!;
    expect(r.extended).toBe(false);
    expect(r.ring).toBe(lot.ring);
  });
});

describe("outline steps", () => {
  it("squares a step traced at 45° and keeps it (264 Wangee Rd's north eave)", async () => {
    const { squareWalls, withoutNotches } = await import("./roofLevels");
    // 14 × 14 m with a 0.6 m step in the north eave, the step traced leaning.
    const traced = [ll(0, 14), ll(7, 14), ll(7.25, 13.4), ll(14, 13.4), ll(14, 0), ll(0, 0)];
    const sq = squareWalls(traced)!;
    expect(sq).not.toBeNull();
    expect(sq.length).toBe(6);
    expect(withoutNotches(traced)!.length).toBe(6); // long walls either side: a real step, kept for testing
  });

  it("merges a notch round a box on the roof (134 Old Canterbury Rd)", async () => {
    const { withoutNotches } = await import("./roofLevels");
    const notched = [ll(0, 20), ll(4, 20), ll(4, 20.4), ll(5, 20.4), ll(5, 20), ll(9, 20), ll(9, 0), ll(0, 0)];
    const out = withoutNotches(notched)!;
    // The 1 m × 0.4 m tab is gone: nothing sticks out more than 0.1 m above the eave.
    expect(Math.max(...out.map((p) => (p.lat - lat0) * 111320))).toBeLessThan(20.15);
  });
});

describe("user edits", () => {
  it("keeps the customer's drawn step when they save (Edit)", async () => {
    const { confirmRoofOutlines } = await import("./engine");
    const drawn = [ll(0, 14), ll(7, 14), ll(7, 13.4), ll(14, 13.4), ll(14, 0), ll(0, 0)];
    const out = confirmRoofOutlines([drawn], { pin }, { userEdit: true });
    expect(out).toHaveLength(1);
    expect(out[0].length).toBe(6);
  });

  it("designs the outline a person gives, not another reading", () => {
    const given = [rect(0, 0, 12, 8)];
    const d = designRoof({ pin }, { outline: given })!;
    expect(Math.round(d.roofAreaM2)).toBe(96);
  });
});

describe("Google data age", () => {
  it("treats Google imagery 3+ years old as out of date", async () => {
    const { googleDataStale } = await import("./engine");
    const est = (d: string) => ({ estimated: false, imageryDate: d, roofSegments: [] }) as unknown as RoofDesignContext["estimate"];
    expect(googleDataStale({ pin, estimate: est("2018-12-03") })).toBe(true);
    const recent = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    expect(googleDataStale({ pin, estimate: est(recent) })).toBe(false);
    expect(googleDataStale({ pin })).toBe(false);
  });
});
