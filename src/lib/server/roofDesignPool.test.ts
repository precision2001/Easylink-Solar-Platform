import { beforeEach, describe, expect, it, vi } from "vitest";

// No built worker in tests: jobs run in-process through runRoofJob.
const runRoofJob = vi.hoisted(() => vi.fn());
vi.mock("@/lib/roof-design/jobs", () => ({ runRoofJob }));

const { roofJob, roofJobStats } = await import("./roofDesignPool");

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

  it("runs one design at a time, in order", async () => {
    const first = deferred();
    runRoofJob.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ status: "NO_ROOF", body: {} });
    const a = roofJob(job(-33.2), { key: "a" });
    const b = roofJob(job(-33.3), { key: "b" });
    await tick();
    expect(runRoofJob).toHaveBeenCalledTimes(1);
    expect(roofJobStats().waiting).toBe(1);
    first.resolve({ status: "READY", body: {} });
    await a;
    await b;
    expect(runRoofJob).toHaveBeenCalledTimes(2);
  });

  it("drops a waiting design once nobody wants it", async () => {
    const first = deferred();
    runRoofJob.mockReturnValueOnce(first.promise);
    const running = roofJob(job(-33.4), { key: "run" });
    const gone = new AbortController();
    const dropped = roofJob(job(-33.5), { key: "drop", signal: gone.signal });
    gone.abort();
    await expect(dropped).rejects.toThrow(/no longer needed/);
    first.resolve({ status: "READY", body: {} });
    await running;
    await tick();
    expect(runRoofJob).toHaveBeenCalledTimes(1);
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
