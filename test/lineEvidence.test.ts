import { describe, expect, it } from "vitest";
import { encodePng } from "../src/roof/overlay.js";
import { lineEvidence } from "../src/roof/lineEvidence.js";

describe("lineEvidence", () => {
  it("sees a line on the photo's edge and not one drawn across plain roof", () => {
    const W = 120, H = 120;
    const data = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const v = x < 60 ? 210 : 60; // light roof | dark courtyard
        data.set([v, v, v, 255], (y * W + x) * 4);
      }
    const png = encodePng({ width: W, height: H, data });
    const b = {
      outline: [] as [number, number][],
      points: [
        { id: "A", x: 60, y: 10 }, { id: "B", x: 60, y: 110 }, // on the edge
        { id: "C", x: 20, y: 10 }, { id: "D", x: 30, y: 110 }, // across plain roof
      ],
      lines: [
        { from: "A", to: "B", seen: "clear" as const },
        { from: "C", to: "D", seen: "clear" as const },
      ],
    };
    const r = lineEvidence(png, [b])!;
    expect(r.find((l) => l.from === "A")!.seen).toBe(true);
    expect(r.find((l) => l.from === "C")!.seen).toBe(false);
  });
});
