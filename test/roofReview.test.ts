import { describe, expect, it } from "vitest";
import { FakeModel } from "../src/ai/model.js";
import { readRoofFaces } from "../src/roof/faces.js";
import { decodePng, encodePng, traceOverlay } from "../src/roof/overlay.js";

function photo(w = 120, h = 100): Buffer {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([200, 200, 200, 255], i * 4);
  return encodePng({ width: w, height: h, data });
}

const trace = (dx: number) =>
  JSON.stringify({
    buildings: [
      {
        name: "House",
        main: true,
        outline: [[10, 10], [110, 10], [110, 90], [10, 90]],
        points: [
          { id: "A", x: 10, y: 10 },
          { id: "B", x: 110, y: 10 },
          { id: "C", x: 110, y: 90 },
          { id: "D", x: 10, y: 90 },
          { id: "R1", x: 40 + dx, y: 50 },
          { id: "R2", x: 80 + dx, y: 50 },
        ],
        lines: [
          { from: "A", to: "R1", kind: "hip", seen: "clear" },
          { from: "R1", to: "R2", kind: "ridge", seen: "faint" },
        ],
        faces: [{ name: "N", facing: "N", points: ["A", "B", "R2", "R1"] }],
      },
    ],
  });

describe("trace overlay", () => {
  it("decodes, draws and re-encodes a PNG", () => {
    const img = decodePng(photo())!;
    expect(img.width).toBe(120);
    expect(Array.from(img.data.slice(0, 4))).toEqual([200, 200, 200, 255]);
    const out = traceOverlay(photo(), [
      { outline: [[10, 10], [110, 10], [110, 90], [10, 90]], points: [{ id: "A", x: 60, y: 50 }], lines: [] },
    ])!;
    const back = decodePng(out.png)!;
    const at = (x: number, y: number) => Array.from(back.data.slice((y * 120 + x) * 4, (y * 120 + x) * 4 + 3));
    expect(at(60, 10)).toEqual([255, 0, 255]); // border
    expect(at(60, 50)).toEqual([0, 230, 255]); // the point
    expect(out.numbers[0]!.get("A")).toBe(1);
  });

  it("returns null for anything but 8-bit RGB/RGBA PNG", () => {
    expect(decodePng(Buffer.from("not a png"))).toBeNull();
  });
});

describe("roof trace self-check", () => {
  it("sends the trace drawn on the photo back once and keeps the corrected one", async () => {
    const model = new FakeModel([{ text: trace(12) }, { text: trace(0) }, { text: trace(0) }]);
    const r = await readRoofFaces(model, {
      imageBase64: photo().toString("base64"),
      format: "png",
      widthPx: 120,
      heightPx: 100,
      scope: "house",
      review: 2,
    });
    expect(model.calls.length).toBe(2);
    const second = model.calls[1]!.messages;
    expect(second.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    const last = second[2]!;
    expect(last.role === "user" && last.image?.format).toBe("png");
    expect(last.role === "user" && last.text).toContain("5=R1 (52,50)");
    expect(r.reviews).toBe(1);
    expect(r.buildings[0]!.points.find((p) => p.id === "R1")!.x).toBe(40);
  });

  it("stops once the points stop moving", async () => {
    const model = new FakeModel([{ text: trace(0) }, { text: trace(0) }, { text: trace(0) }]);
    const r = await readRoofFaces(model, { imageBase64: photo().toString("base64"), format: "png", widthPx: 120, heightPx: 100, scope: "house", review: 3 });
    expect(r.reviews).toBe(1);
    expect(model.calls.length).toBe(2);
  });

  it("names the lines the photo doesn't show, in one self-check round only", async () => {
    const model = new FakeModel([{ text: trace(0) }, { text: trace(-25) }, { text: trace(0) }, { text: trace(-25) }, { text: trace(0) }]);
    const r = await readRoofFaces(model, { imageBase64: photo().toString("base64"), format: "png", widthPx: 120, heightPx: 100, scope: "house", review: 2 });
    const first = model.calls[1]!.messages.at(-1)!;
    expect(first.role === "user" && first.text).toContain("NOT on any edge the photo shows");
    expect(r.reviews).toBe(1);
    expect(model.calls.length).toBe(2);
  });

  it("keeps the last good trace when a check reply is unreadable", async () => {
    const model = new FakeModel([{ text: trace(5) }, { text: "sorry" }]);
    const r = await readRoofFaces(model, { imageBase64: photo().toString("base64"), format: "png", widthPx: 120, heightPx: 100, scope: "house", review: 2 });
    expect(r.buildings[0]!.points.find((p) => p.id === "R1")!.x).toBe(45);
  });
});
