import { describe, expect, it } from "vitest";
import { encodePng } from "../src/roof/overlay.js";
import { refineByCloseups, snapToEdges } from "../src/roof/refine.js";
import { jsonIn, type RoofBuilding } from "../src/roof/faces.js";
import { FakeModel } from "../src/ai/model.js";

// Light roof left of x=60, dark right of it; a level edge at y=50 too.
function photo() {
  const W = 120, H = 100;
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = x < 60 ? (y < 50 ? 210 : 170) : 60;
      data.set([v, v, v, 255], (y * W + x) * 4);
    }
  return encodePng({ width: W, height: H, data });
}

const building = (): RoofBuilding => ({
  name: "Main roof",
  main: true,
  flat: false,
  outline: [[10, 10], [56, 10], [56, 90], [10, 90]],
  points: [{ id: "A", x: 56, y: 10 }, { id: "B", x: 56, y: 90 }, { id: "C", x: 10, y: 50 }],
  lines: [{ from: "A", to: "B", kind: "edge", seen: "clear" }],
  faces: [{ name: "f", bearingDeg: null, ring: [[10, 10], [56, 10], [56, 90], [10, 90]] }],
  obstructions: [],
});

describe("edge snap", () => {
  it("moves a line onto the photo's edge within the limit, with its points and the face corners on them", () => {
    const b = [building()];
    expect(snapToEdges(photo(), b, 8)).toBe(2);
    expect(Math.round(b[0]!.points[0]!.x)).toBeGreaterThanOrEqual(58);
    expect(Math.round(b[0]!.points[0]!.x)).toBeLessThanOrEqual(61);
    expect(b[0]!.faces[0]!.ring[1]![0]).toBe(b[0]!.points[0]!.x);
    expect(b[0]!.outline[2]![0]).toBe(b[0]!.points[1]!.x);
  });

  it("never moves further than the limit", () => {
    const b = [building()];
    snapToEdges(photo(), b, 2);
    expect(Math.abs(b[0]!.points[0]!.x - 56)).toBeLessThanOrEqual(3);
  });
});

describe("close-ups", () => {
  it("moves each point by what Opus says in its tile (3x), ignoring 0,0", async () => {
    const b = [building()];
    const model = new FakeModel([{ text: JSON.stringify({ points: [{ tile: 1, dx: 12, dy: 0 }, { tile: 2, dx: 0, dy: 0 }, { tile: 3, dx: -6, dy: 3 }] }) }]);
    const r = await refineByCloseups(model, photo(), b, { jsonIn });
    expect(r.moved).toBe(2);
    expect(b[0]!.points[0]).toMatchObject({ x: 60, y: 10 });
    expect(b[0]!.points[2]).toMatchObject({ x: 8, y: 51 });
    expect(b[0]!.faces[0]!.ring[1]).toEqual([60, 10]);
    const sent = model.calls[0]!.messages[0]!;
    expect(sent.role === "user" && sent.image?.format).toBe("png");
  });
});
