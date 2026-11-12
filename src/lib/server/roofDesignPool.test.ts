import { beforeEach, describe, expect, it, vi } from "vitest";

// No built worker in tests: jobs run in-process through runRoofJob.
const runRoofJob = vi.hoisted(() => vi.fn());
vi.mock("@/lib/roof-design/jobs", () => ({ runRoofJob }));
// Never pick up a built .next/roof-worker.cjs (present after `npm run build`):
// it would run real roof jobs instead of the mock.
vi.stubEnv("NEXT_DIST_DIR", ".test-no-roof-worker");

const { roofJob, roofJobStats, MAX_RUNNING } = await import("./roofDesignPool");

const job = (lat: number) => ({ kind: "api" as const, pin: { lat, lng: 151 }, formattedAddress: null });
const deferred = () => {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => runRoofJob.mockReset());

describe("roof design pool", () => {
  it("shares one run between askers of the same design", async () => {
    const d = deferred();
    runRoofJob.mockReturnValueOnce(d.promise);
    const a = roofJob(job(-33.1), { key: "same" });
    const b = roofJob(job(-33.1), { key: "same" });
    await tick();
    d.resolve({ status: "READY", body: { n: 1 } });
    expect(await a).toEqual({ status: "READY", body: { n: 1 } });
    expect(await b).toEqual({ status: "READY", body: { n: 1 } });
    expect(runRoofJob).toHaveBeenCalledTimes(1);
  });

  it("runs several designs at once (their Opus waits overlap), the rest wait in order", async () => {
    const held = Array.from({ length: MAX_RUNNING }, () => deferred());
    for (const d of held) runRoofJob.mockReturnValueOnce(d.promise);
    runRoofJob.mockResolvedValueOnce({ status: "NO_ROOF", body: {} });
    const running = held.map((_, i) => roofJob(job(-33.2 - i / 100), { key: `a${i}` }));
    const last = roofJob(job(-33.3), { key: "last" });
    await tick();
    expect(runRoofJob).toHaveBeenCalledTimes(MAX_RUNNING);
    expect(roofJobStats().waiting).toBe(1);
    held[0].resolve({ status: "READY", body: {} });
    await running[0];
    expect(await last).toEqual({ status: "NO_ROOF", body: {} });
    expect(runRoofJob).toHaveBeenCalledTimes(MAX_RUNNING + 1);
    for (const d of held.slice(1)) d.resolve({ status: "READY", body: {} });
    await Promise.all(running);
  });

  it("drops a waiting design once nobody wants it", async () => {
    const held = Array.from({ length: MAX_RUNNING }, () => deferred());
    for (const d of held) runRoofJob.mockReturnValueOnce(d.promise);
    const running = held.map((_, i) => roofJob(job(-33.4 - i / 100), { key: `run${i}` }));
    const gone = new AbortController();
    const dropped = roofJob(job(-33.5), { key: "drop", signal: gone.signal });
    gone.abort();
    await expect(dropped).rejects.toThrow(/no longer needed/);
    for (const d of held) d.resolve({ status: "READY", body: {} });
    await Promise.all(running);
    await tick();
    expect(runRoofJob).toHaveBeenCalledTimes(MAX_RUNNING);
  });

  it("keeps a waiting design while someone still wants it", async () => {
    const first = deferred();
    runRoofJob.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ status: "READY", body: { kept: true } });
    const running = roofJob(job(-33.6), { key: "r2" });
    const leaver = new AbortController();
    const left = roofJob(job(-33.7), { key: "k", signal: leaver.signal });
    const stayer = roofJob(job(-33.7), { key: "k" });
    leaver.abort();
    first.resolve({ status: "READY", body: {} });
    await running;
    expect(await stayer).toEqual({ status: "READY", body: { kept: true } });
    expect(await left).toEqual({ status: "READY", body: { kept: true } });
  });
});
