import { describe, expect, it } from "vitest";
import { encodePng } from "../src/roof/overlay.js";
import { refineByCloseups, snapToEdges } from "../src/roof/refine.js";
import { jsonIn, readRoofFaces, type RoofBuilding } from "../src/roof/faces.js";
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


describe("missing sections", () => {
  const plain = () => {
    const w = 200, h = 200, data = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) data.set([200, 200, 200, 255], i * 4);
    return encodePng({ width: w, height: h, data });
  };
  const one = JSON.stringify({ buildings: [{ name: "House", main: true, outline: [[40, 40], [160, 40], [160, 160], [40, 160]], points: [{ id: "A", x: 40, y: 40 }, { id: "B", x: 160, y: 40 }, { id: "C", x: 160, y: 160 }, { id: "D", x: 40, y: 160 }], lines: [], faces: [{ name: "All", facing: "N", points: ["A", "B", "C", "D"] }] }] });

  it("adds a section Opus finds on the enlarged view, in the photo's pixels", async () => {
    // The enlarged view: the house's extent ×1.35 + 40 px → 202 → whole 200 px photo, enlarged to 500 (k = 0.4).
    const two = JSON.stringify({
      missing: true,
      notes: "front wing",
      buildings: [{ name: "House", main: true, outline: [[0, 0], [500, 0], [500, 500], [0, 500]],
        points: [{ id: "A", x: 0, y: 0 }, { id: "B", x: 500, y: 0 }, { id: "C", x: 500, y: 500 }, { id: "D", x: 0, y: 500 }, { id: "M", x: 250, y: 0 }, { id: "N", x: 250, y: 500 }],
        lines: [{ from: "M", to: "N", kind: "ridge", seen: "clear" }],
        faces: [{ name: "W", facing: "W", points: ["A", "M", "N", "D"] }, { name: "E", facing: "E", points: ["M", "B", "C", "N"] }] }],
    });
    const model = new FakeModel([{ text: one }, { text: two }, { text: JSON.stringify({ points: [] }) }]);
    const r = await readRoofFaces(model, { imageBase64: plain().toString("base64"), format: "png", widthPx: 200, heightPx: 200, scope: "house", review: 0, refine: true });
    expect(r.refined?.sections).toBe(1);
    expect(r.buildings[0]!.faces).toHaveLength(2);
    const m = r.buildings[0]!.points.find((p) => p.id === "M")!;
    expect(m.x).toBeCloseTo(100, 0);
  });

  it("keeps the trace when nothing is missing", async () => {
    const model = new FakeModel([{ text: one }, { text: JSON.stringify({ missing: false }) }, { text: JSON.stringify({ points: [] }) }]);
    const r = await readRoofFaces(model, { imageBase64: plain().toString("base64"), format: "png", widthPx: 200, heightPx: 200, scope: "house", review: 0, refine: true });
    expect(r.refined?.sections).toBe(0);
    expect(r.buildings[0]!.faces).toHaveLength(1);
  });
});
