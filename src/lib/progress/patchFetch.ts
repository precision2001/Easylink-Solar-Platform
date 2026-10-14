"use client";

import { doneProgress, startProgress } from "@/lib/progress/progressBar";

let patched = false;

/**
 * Requests that fire too often / aren't user-initiated navigation to keep
 * the top bar quiet for — e.g. the LiveKit SDK's own background region
 * lookup (`/settings/regions`), which re-runs on every `room.connect()`.
 */
function shouldShowProgress(input: Parameters<typeof fetch>[0]): boolean {
  try {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    return !url.includes("/settings/regions");
  } catch {
    return true;
  }
}

/**
 * Wraps the global `fetch` once so every network call in the app — every
 * lib file's `fetchWithCustomerSession`/`fetchWithInstallerSession`/
 * `backendAuthedFetch`/plain `fetch`, all of them are built on this same
 * primitive — drives the top progress bar automatically. No per-call
 * instrumentation needed anywhere else.
 */
export function patchGlobalFetchForProgress() {
  if (patched || typeof window === "undefined") return;
  patched = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const show = shouldShowProgress(args[0]);
    startProgress(show);
    try {
      return await originalFetch(...args);
    } finally {
      doneProgress(show);
    }
  };
}
