import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { runAutoRoofDesign, toPx, AUTO_PANEL } from "./auto-roof-design";

/** A 1280² "satellite image": terracotta hip roof (about 16 × 11 m) on grey ground. */
async function fakeSnapshot(): Promise<Buffer> {
  const W = 1280;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}">
    <rect width="${W}" height="${W}" fill="#7d8a78"/>
    <rect x="420" y="460" width="440" height="300" fill="#b5532e"/>
    <polygon points="420,460 570,610 710,610 860,460" fill="#c45f37"/>
    <polygon points="420,760 570,610 710,610 860,760" fill="#9e4628"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

afterEach(() => vi.unstubAllGlobals());

describe("runAutoRoofDesign", () => {
  it("says so when the address couldn't be located", async () => {
    expect(await runAutoRoofDesign({ address: "x", located: false })).toMatchObject({ status: "NO_ADDRESS" });
  });

  it("designs a roof from the satellite image and draws it", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test";
    const png = await fakeSnapshot();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(png), { status: 200, headers: { "content-type": "image/png" } })));
    const lat = -33.8688, lng = 151.2093;
    const r = await runAutoRoofDesign({ address: "1 Test St", located: true, pin: { lat, lng } });
    expect(r.status).toBe("READY");
    if (r.status !== "READY") return;
    expect(r.panelCount).toBeGreaterThan(10);
    expect(r.systemKw).toBeCloseTo((r.panelCount * AUTO_PANEL.watts) / 1000, 2);
    expect(r.faceCount).toBeGreaterThanOrEqual(1);
    expect(r.thumb[0]).toBe(0xff); // JPEG
    expect(r.large.length).toBeLessThan(600_000);
    const meta = await sharp(r.large).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(4 / 3, 1);
    await sharp(r.large).toFile(process.env.ROOF_TEST_OUT ?? "/tmp/roof-test-large.jpg").catch(() => undefined);
  }, 30_000);

  it("puts the pin at the image centre", () => {
    const geo = { centerLat: -33.8, centerLng: 151.1, zoom: 21, scale: 2, widthPx: 1280, heightPx: 1280 };
    expect(toPx(geo, { lat: -33.8, lng: 151.1 })).toEqual([640, 640]);
  });
});

import { autoDesignEligible, roofDesignNeeded } from "@/components/master-dashboard/quotes-leads/RoofDesign";
describe("roofDesignNeeded", () => {
  const d = { status: "READY" as const, address: "1 Test St", panelCount: 1, panelWatts: 440, systemKw: 0.44, orientation: null, faceCount: 1, roofAreaM2: 1, message: null, updatedAt: "2026-11-06T00:00:00.000Z" };
  it("designs leads with an address and no design, or a changed address", () => {
    expect(roofDesignNeeded({ address: "1 Test St", roofDesign: null })).toBe(true);
    expect(roofDesignNeeded({ address: "1 Test St", roofDesign: d })).toBe(false);
    expect(roofDesignNeeded({ address: "2 Other Rd", roofDesign: d })).toBe(true);
    expect(roofDesignNeeded({ address: "  ", roofDesign: null })).toBe(false);
    expect(roofDesignNeeded({ address: "1 Test St", roofDesign: { ...d, updatedAt: "2026-11-05T07:00:00.000Z" } })).toBe(true);
  });
});

describe("autoDesignEligible", () => {
  it("designs automatically only for leads created from 5 Nov 2026, Sydney time", () => {
    expect(autoDesignEligible({ createdAt: "2026-11-04T13:00:00.000Z" })).toBe(true); // midnight Sydney
    expect(autoDesignEligible({ createdAt: "2026-11-04T12:59:59.000Z" })).toBe(false);
    expect(autoDesignEligible({ createdAt: "2026-11-02T00:28:00.000Z" })).toBe(false);
  });
});
