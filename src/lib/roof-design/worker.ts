/**
 * The design worker thread. Built on its own by scripts/build-roof-worker.mjs
 * into <distDir>/roof-worker.cjs (next to the web build) and started by
 * src/lib/server/roofDesignPool.ts. One job at a time; the pool queues.
 */
import { parentPort } from "node:worker_threads";
import { runRoofJob, type RoofJob } from "./jobs";

type Msg = { id: number; job: RoofJob };

parentPort?.on("message", async ({ id, job }: Msg) => {
  try {
    const result = await runRoofJob(job);
    parentPort?.postMessage({ id, ok: true, result });
  } catch (e) {
    parentPort?.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
