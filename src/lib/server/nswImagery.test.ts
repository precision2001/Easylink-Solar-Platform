import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./roofDataCache", () => ({
  cachedBytes: (_k: string, make: () => Promise<Buffer | null>) => make(),
  cachedJson: (_k: string, make: () => Promise<unknown>) => make(),
}));

import { getNswSnapshotPng, inNsw, nswImageryDate, nswOffsetPx } from "./nswImagery";

const solid = (r: number) => sharp({ create: { width: 256, height: 256, channels: 3, background: { r, g: r, b: r } } }).jpeg().toBuffer();

afterEach(() => vi.unstubAllGlobals());

describe("NSW imagery", () => {
  it("covers NSW only", () => {
    expect(inNsw(-33.73, 150.95)).toBe(true); // Bella Vista
    expect(inNsw(-37.81, 144.96)).toBe(false); // Melbourne
    expect(inNsw(-27.47, 153.03)).toBe(false); // Brisbane
  });

  it("builds Google's roof frame from level-21 tiles: 1280 px, the tiles around the point", async () => {
    const urls: string[] = [];
    const tile = await solid(120);
    vi.stubGlobal("fetch", vi.fn(async (u: string) => {
      urls.push(u);
      return new Response(new Uint8Array(tile), { status: 200 });
    }));
    const png = await getNswSnapshotPng(-33.7307334, 150.9476083, 21);
    const meta = await sharp(png!).metadata();
    expect([meta.width, meta.height]).toEqual([1280, 1280]);
    // Zoom 21 at scale 2 is level 22: 640 level-21 pixels across, 3-4 tiles a side.
    expect(urls.every((u) => /\/tile\/21\/\d+\/\d+$/.test(u))).toBe(true);
    expect(urls.length).toBeGreaterThanOrEqual(9);
    expect(urls.length).toBeLessThanOrEqual(16);
    const col = Math.floor(((150.9476083 + 180) / 360) * 2 ** 21);
    expect(urls.some((u) => u.endsWith(`/${col}`))).toBe(true);
  });

  it("gives nothing when most tiles are missing, and nothing outside NSW", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    expect(await getNswSnapshotPng(-33.73, 150.95, 21)).toBeNull();
    expect(await getNswSnapshotPng(-37.81, 144.96, 21)).toBeNull();
  });

  it("reads the flown date and pixel size, newest block first", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({
        features: [
          { attributes: { BlockName: "OLD", BlockStartDate: Date.UTC(2019, 0, 1), Resolution_cm: 10 } },
          { attributes: { BlockName: "WESTERN_SYDNEY", BlockStartDate: Date.UTC(2022, 4, 1), Resolution_cm: 7 } },
        ],
      }),
    ));
    expect(await nswImageryDate(-33.73, 150.95)).toEqual({ capturedOn: "2022-05-01", resolutionCm: 7, block: "WESTERN_SYDNEY" });
  });

  it("finds how far the NSW photo sits from Google's", async () => {
    // A bright square, 40 px further right and 20 px lower in the "NSW" photo.
    const pic = (dx: number, dy: number) =>
      sharp({ create: { width: 1280, height: 1280, channels: 3, background: { r: 30, g: 30, b: 30 } } })
        .composite([
          { input: { create: { width: 300, height: 200, channels: 3, background: { r: 230, g: 230, b: 230 } } }, left: 400 + dx, top: 500 + dy },
          { input: { create: { width: 120, height: 260, channels: 3, background: { r: 140, g: 140, b: 140 } } }, left: 800 + dx, top: 300 + dy },
        ])
        .png()
        .toBuffer();
    const off = await nswOffsetPx(await pic(0, 0), await pic(40, 20));
    expect(off).not.toBeNull();
    expect(Math.abs(off!.dx - 40)).toBeLessThanOrEqual(10);
    expect(Math.abs(off!.dy - 20)).toBeLessThanOrEqual(10);
  });
});
