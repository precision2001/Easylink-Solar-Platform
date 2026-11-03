import { describe, expect, it } from "vitest";

import { compressToLimit, EMAIL_COMPRESSION_LADDER, formatMb, type CompressionStep } from "./pdfCompression";

/** A fake build: size shrinks with quality × resolution², like a JPEG would. */
function fakeBuild(fullBytes: number, calls: CompressionStep[]) {
  return async (step: CompressionStep) => {
    calls.push(step);
    const size = Math.round(fullBytes * step.quality * step.resolution ** 2);
    return new Blob([new Uint8Array(size)]);
  };
}

describe("compressToLimit", () => {
  it("stops at the first step that fits", async () => {
    const calls: CompressionStep[] = [];
    const r = await compressToLimit(fakeBuild(2_000_000, calls), 1_300_000);
    expect(r.fits).toBe(true);
    expect(r.blob.size).toBeLessThanOrEqual(1_300_000);
    expect(calls).toEqual(EMAIL_COMPRESSION_LADDER.slice(0, calls.length));
    expect(calls.length).toBeLessThan(EMAIL_COMPRESSION_LADDER.length);
  });

  it("keeps the first step when it already fits", async () => {
    const calls: CompressionStep[] = [];
    const r = await compressToLimit(fakeBuild(500_000, calls), 1_000_000);
    expect(calls).toHaveLength(1);
    expect(r.step).toEqual(EMAIL_COMPRESSION_LADDER[0]);
  });

  it("returns the smallest try, flagged, when nothing fits", async () => {
    const calls: CompressionStep[] = [];
    const r = await compressToLimit(fakeBuild(50_000_000, calls), 1_000);
    expect(r.fits).toBe(false);
    expect(calls).toHaveLength(EMAIL_COMPRESSION_LADDER.length);
    expect(r.step).toEqual(EMAIL_COMPRESSION_LADDER.at(-1));
  });
});

describe("formatMb", () => {
  it("shows one decimal", () => {
    expect(formatMb(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
