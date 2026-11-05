import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

process.env.ROOF_DATA_CACHE_DIR = mkdtempSync(join(tmpdir(), "roofcache-test-"));

describe("roof data cache", () => {
  it("loads a value once and reads it back from disk", async () => {
    const { cachedJson } = await import("./roofDataCache");
    const make = vi.fn(async () => ({ n: 1 }));
    expect(await cachedJson("t|a", make)).toEqual({ n: 1 });
    expect(await cachedJson("t|a", make)).toEqual({ n: 1 });
    expect(make).toHaveBeenCalledTimes(1);
  });

  it("shares one load between callers asking at the same time", async () => {
    const { cachedBytes } = await import("./roofDataCache");
    let calls = 0;
    const make = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 20));
      return Buffer.from("png");
    };
    const [a, b] = await Promise.all([cachedBytes("t|b", make), cachedBytes("t|b", make)]);
    expect(a?.toString()).toBe("png");
    expect(b?.toString()).toBe("png");
    expect(calls).toBe(1);
  });

  it("doesn't keep failures", async () => {
    const { cachedJson } = await import("./roofDataCache");
    expect(await cachedJson("t|c", async () => null)).toBeNull();
    expect(await cachedJson("t|c", async () => ({ ok: 1 }))).toEqual({ ok: 1 });
  });
});
