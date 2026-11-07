import { existsSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type { RoofJob, RoofJobResult } from "@/lib/roof-design/jobs";

/**
 * Runs Roof Designer jobs off the web server's thread (7 Nov 2026: one design
 * kept Node busy for up to 5 s at a time, so every page and API stalled while
 * designs ran, and preloads for each pin nudge piled up into 504s).
 *
 * - One worker thread, one job at a time; the rest wait in order.
 * - The same job asked for again while it's waiting or running is shared.
 * - A waiting job whose every asker has gone (the browser moved the pin or
 *   left) is dropped before it starts.
 * - A job that runs past JOB_TIMEOUT_MS is failed and the worker replaced.
 * - Without the built worker (local dev, tests) jobs run in-process.
 */

export const JOB_TIMEOUT_MS = 120_000;

type Entry = {
  key: string;
  job: RoofJob;
  promise: Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  askers: number;
  started: boolean;
};

const byKey = new Map<string, Entry>();
const queue: Entry[] = [];
let worker: Worker | null = null;
/** The worker failed to start or crashed twice: run jobs in-process from now on. */
let workerFailures = 0;
let busy = false;
let nextId = 1;

function workerPath(): string {
  return join(process.cwd(), process.env.NEXT_DIST_DIR || ".next", "roof-worker.cjs");
}

let inProcess: ((job: RoofJob) => Promise<unknown>) | null = null;
async function runHere(job: RoofJob): Promise<unknown> {
  if (!inProcess) inProcess = (await import("@/lib/roof-design/jobs")).runRoofJob;
  return inProcess(job);
}

function getWorker(): Worker | null {
  if (worker) return worker;
  if (workerFailures >= 2) return null;
  const path = workerPath();
  if (!existsSync(path)) return null;
  worker = new Worker(path);
  worker.unref();
  worker.on("error", (e) => {
    console.error("roof design worker error", e);
    workerFailures++;
    worker = null;
  });
  worker.on("exit", () => {
    worker = null;
  });
  return worker;
}

function runOnWorker(w: Worker, job: RoofJob): Promise<unknown> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("The roof design took too long."));
      // A stuck job holds the thread: replace the worker.
      w.terminate().catch(() => {});
      if (worker === w) worker = null;
    }, JOB_TIMEOUT_MS);
    const onMessage = (m: { id: number; ok: boolean; result?: unknown; error?: string }) => {
      if (m.id !== id) return;
      cleanup();
      if (m.ok) resolve(m.result);
      else reject(new Error(m.error || "The roof design failed."));
    };
    const onExit = () => {
      cleanup();
      reject(new Error("The roof design worker stopped."));
    };
    const cleanup = () => {
      clearTimeout(timer);
      w.off("message", onMessage);
      w.off("exit", onExit);
    };
    w.on("message", onMessage);
    w.on("exit", onExit);
    w.postMessage({ id, job });
  });
}

async function pump(): Promise<void> {
  if (busy) return;
  const entry = queue.shift();
  if (!entry) return;
  busy = true;
  entry.started = true;
  try {
    const w = getWorker();
    let result: unknown;
    try {
      result = w ? await runOnWorker(w, entry.job) : await runHere(entry.job);
    } catch (e) {
      // The worker itself died (not the design failing): do this one here.
      if (!(w && e instanceof Error && /worker stopped/.test(e.message))) throw e;
      result = await runHere(entry.job);
    }
    entry.resolve(result);
  } catch (e) {
    entry.reject(e instanceof Error ? e : new Error(String(e)));
  } finally {
    byKey.delete(entry.key);
    busy = false;
    void pump();
  }
}

/**
 * Queues a job. `key` identifies identical jobs (shared while one is waiting
 * or running). `signal`: the asker's request; when every asker of a job that
 * hasn't started has gone, it's dropped.
 */
export function roofJob<J extends RoofJob>(job: J, opts: { key: string; signal?: AbortSignal }): Promise<RoofJobResult<J>> {
  let entry = byKey.get(opts.key);
  if (!entry) {
    let resolve!: (v: unknown) => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    promise.catch(() => {});
    entry = { key: opts.key, job, promise, resolve, reject, askers: 0, started: false };
    byKey.set(opts.key, entry);
    queue.push(entry);
  }
  const e = entry;
  e.askers++;
  const signal = opts.signal;
  if (signal) {
    const onAbort = () => {
      e.askers--;
      if (e.askers <= 0 && !e.started) {
        const i = queue.indexOf(e);
        if (i >= 0) queue.splice(i, 1);
        byKey.delete(e.key);
        e.reject(new Error("The design was no longer needed."));
      }
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
    e.promise.finally(() => signal.removeEventListener("abort", onAbort)).catch(() => {});
  }
  void pump();
  return e.promise as Promise<RoofJobResult<J>>;
}

/** For the tests and the status line: how many jobs are waiting / running. */
export function roofJobStats(): { waiting: number; running: boolean; worker: boolean } {
  return { waiting: queue.length, running: busy, worker: Boolean(worker) };
}
