import { describe, expect, it } from "vitest";
import { designRoof, type AiRoofTrace, type RoofDesignContext } from "./engine";

const LAT0 = -33.75;
const LNG0 = 150.9;
const M_LAT = 111320;
const M_LNG = M_LAT * Math.cos((LAT0 * Math.PI) / 180);
const ll = (x: number, y: number) => ({ lat: LAT0 + y / M_LAT, lng: LNG0 + x / M_LNG });

// A 12 x 8 m hip roof traced by Opus: four faces from shared points.
const A = ll(-6, 4), B = ll(6, 4), C = ll(6, -4), D = ll(-6, -4), R1 = ll(-2, 0), R2 = ll(2, 0);
const trace: AiRoofTrace = {
  noRoof: false,
  flat: false,
  outline: [A, B, C, D],
  faces: [
    { name: "North", azimuthDeg: 0, ring: [A, B, R2, R1] },
    { name: "East", azimuthDeg: 90, ring: [B, C, R2] },
    { name: "South", azimuthDeg: 180, ring: [C, D, R1, R2] },
    { name: "West", azimuthDeg: 270, ring: [D, A, R1] },
  ],
  lines: [
    { a: A, b: R1, kind: "hip", seen: "clear" },
    { a: R1, b: R2, kind: "ridge", seen: "clear" },
    { a: C, b: R2, kind: "hip", seen: "faint" },
  ],
  obstructions: [],
};

describe("Opus traces every roof first", () => {
  it("uses Opus's border and faces as the design, and flags faint lines for a site check", () => {
    const d = designRoof({ pin: ll(0, 0), aiTrace: trace } as RoofDesignContext)!;
    expect(d.outlineSource).toBe("ai-trace");
    expect(d.faceSet.source).toBe("ai-trace");
    expect(d.faceSet.faces).toHaveLength(4);
    expect(d.faceSet.trace?.faint).toBe(1);
    expect(d.notes.some((n) => n.includes("seen only faintly"))).toBe(true);
    expect(d.panels.length).toBeGreaterThan(0);
  });

  it("says a roof needs a hand trace when Opus was asked but didn't answer", () => {
    const d = designRoof({ pin: ll(0, 0), aiTrace: null, footprint: [A, B, C, D] } as RoofDesignContext);
    expect(d?.notes.some((n) => n.includes("needs a hand trace"))).toBe(true);
  });

  it("a person's outline still wins over the trace", () => {
    const mine = [ll(-5, 3), ll(5, 3), ll(5, -3), ll(-5, -3)];
    const d = designRoof({ pin: ll(0, 0), aiTrace: trace } as RoofDesignContext, { outline: [mine] })!;
    expect(d.outlineSource).toBe("snapshot");
  });
});

describe("Opus still tracing", () => {
  it("is read from the design's notes", async () => {
    const { stillTracing } = await import("./client");
    expect(stillTracing({ notes: ["Opus is still tracing and checking this roof against the photo: …"] } as never)).toBe(true);
    expect(stillTracing({ notes: ["Traced by Opus: 12 roof lines"] } as never)).toBe(false);
    expect(stillTracing(null)).toBe(false);
  });
});
