"use client";

import { useSyncExternalStore } from "react";

/**
 * Current time, ticking every `intervalMs` (0 = read once). Null during server render and
 * hydration, so server and browser markup match.
 */
export function useNow(intervalMs = 1000): Date | null {
  const ms = useSyncExternalStore(
    (notify) => {
      if (!intervalMs) return () => {};
      const id = window.setInterval(notify, intervalMs);
      return () => window.clearInterval(id);
    },
    () => (intervalMs ? Math.floor(Date.now() / intervalMs) * intervalMs : Math.floor(Date.now() / 60_000) * 60_000),
    () => null,
  );
  return ms === null ? null : new Date(ms);
}
