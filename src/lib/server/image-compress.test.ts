import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  compressDesignBody,
  compressFormDataImages,
  compressImageBuffer,
  compressImageDataUrl,
  compressImageFile,
} from "./image-compress";
import { fitWithin, isCompressibleImage, withExtension } from "@/lib/images/policy";

/** Noisy RGB(A) image: compresses like a real photo, not like a flat colour. */
async function noisyPng(width: number, height: number, channels: 3 | 4 = 3): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * channels);
  let seed = 7;
  for (let i = 0; i < raw.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    raw[i] = channels === 4 && i % 4 === 3 ? (i % 8 === 3 ? 0 : 255) : seed & 0xff;
  }
  return sharp(raw, { raw: { width, height, channels } }).png({ compressionLevel: 0 }).toBuffer();
}

describe("policy helpers", () => {
  it("scales the longest side down and never up", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it("re-encodes photos but leaves GIF and SVG alone", () => {
    expect(isCompressibleImage("image/jpeg")).toBe(true);
    expect(isCompressibleImage("image/png")).toBe(true);
    expect(isCompressibleImage("image/gif")).toBe(false);
    expect(isCompressibleImage("image/svg+xml")).toBe(false);
    expect(isCompressibleImage("application/pdf")).toBe(false);
  });

  it("swaps the extension", () => {
    expect(withExtension("roof photo.PNG", ".jpg")).toBe("roof photo.jpg");
  });
});

describe("compressImageBuffer", () => {
  it("shrinks a large photo to JPEG within the size limit and dimension cap", async () => {
    const input = await noisyPng(3000, 2000);
    const out = await compressImageBuffer(input, "image/png");
    expect(out.changed).toBe(true);
    expect(out.mime).toBe("image/jpeg");
    expect(out.buffer.length).toBeLessThan(input.length / 5);
    const meta = await sharp(out.buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBe(2048);
    expect(meta.exif).toBeUndefined();
  });

  it("keeps transparency by using WebP", async () => {
    const out = await compressImageBuffer(await noisyPng(1200, 900, 4), "image/png");
    expect(out.mime).toBe("image/webp");
    expect((await sharp(out.buffer).metadata()).hasAlpha).toBe(true);
  });

  it("leaves small images and non-images untouched", async () => {
    const small = await sharp({ create: { width: 50, height: 50, channels: 3, background: "#f80" } }).png().toBuffer();
    expect((await compressImageBuffer(small, "image/png")).changed).toBe(false);
    const pdf = Buffer.alloc(500_000, 1);
    expect((await compressImageBuffer(pdf, "application/pdf")).buffer).toBe(pdf);
  });

  it("keeps the original when the file can't be read", async () => {
    const junk = Buffer.alloc(400_000, 7);
    const out = await compressImageBuffer(junk, "image/jpeg");
    expect(out.changed).toBe(false);
    expect(out.buffer).toBe(junk);
  });
});

describe("files, data URLs and design bodies", () => {
  it("renames a compressed upload", async () => {
    const file = new File([new Uint8Array(await noisyPng(2500, 1800))], "bill.png", { type: "image/png" });
    const out = await compressImageFile(file);
    expect(out.name).toBe("bill.jpg");
    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBeLessThan(file.size);
  });

  it("compresses only image parts of a multipart upload", async () => {
    const form = new FormData();
    form.append("purpose", "photo");
    form.append("file", new File([new Uint8Array(await noisyPng(2500, 1800))], "meter.png", { type: "image/png" }));
    form.append("doc", new File([new Uint8Array(300_000)], "quote.pdf", { type: "application/pdf" }));
    const out = await compressFormDataImages(form);
    expect(out.get("purpose")).toBe("photo");
    expect((out.get("file") as File).type).toBe("image/jpeg");
    expect((out.get("doc") as File).size).toBe(300_000);
  });

  it("brings an old PNG map snapshot inside a design save under 250 KB", async () => {
    const png = await noisyPng(1400, 900);
    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
    expect(dataUrl.length).toBeGreaterThan(1_000_000);

    const body = { firstName: "Ada", design: { wizardData: { solarDesign: { mapScreenshotDataUrl: dataUrl, pinLat: -33.8 } } } };
    const out = await compressDesignBody(body);
    const url = out.design.wizardData.solarDesign.mapScreenshotDataUrl;
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(url.length * 0.75).toBeLessThan(250 * 1024);
    expect(out.design.wizardData.solarDesign.pinLat).toBe(-33.8);
  });

  it("leaves a body without a snapshot, or a non-image data URL, as it was", async () => {
    const body = { wizardData: { solarDesign: { mapScreenshotDataUrl: null } } };
    expect(await compressDesignBody(body)).toEqual(body);
    expect(await compressImageDataUrl("data:text/plain;base64,aGk=")).toBe("data:text/plain;base64,aGk=");
  });
});
