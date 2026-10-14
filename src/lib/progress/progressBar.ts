"use client";

/**
 * Shared state for the top progress bar — a plain module-level store (not
 * Redux) since this needs to be readable from a one-off fetch patch that
 * runs outside any component tree, not just from React.
 */

type ProgressState = { percent: number; visible: boolean };
type Listener = () => void;

const SERVER_SNAPSHOT: ProgressState = { percent: 0, visible: false };

let state: ProgressState = SERVER_SNAPSHOT;
let activeCount = 0;
let visibleActiveCount = 0;
let tickIntervalId: ReturnType<typeof setInterval> | null = null;
let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function setState(next: Partial<ProgressState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Eases toward 90% while a request is pending — never claims to finish until it actually does. */
function tick() {
  const remaining = 90 - state.percent;
  const step = Math.max(remaining * 0.08, 0.3);
  setState({ percent: Math.min(90, state.percent + step) });
}

/**
 * Call when an async operation (typically a fetch) starts. Safe to call concurrently.
 * Pass `show: false` for requests that shouldn't surface the bar at all (e.g. the
 * LiveKit SDK's own background `/settings/regions` lookup) — always pair the same
 * `show` value with the matching `doneProgress` call.
 */
export function startProgress(show: boolean = true) {
  activeCount += 1;
  if (!show) return;

  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
  visibleActiveCount += 1;
  if (visibleActiveCount === 1) {
    setState({ visible: true, percent: Math.max(state.percent, 8) });
    if (!tickIntervalId) {
      tickIntervalId = setInterval(tick, 200);
    }
  }
}

/** Call when that operation finishes (success or failure — always pair with startProgress). */
export function doneProgress(show: boolean = true) {
  activeCount = Math.max(0, activeCount - 1);
  if (!show) return;

  visibleActiveCount = Math.max(0, visibleActiveCount - 1);
  if (visibleActiveCount > 0) return;

  if (tickIntervalId) {
    clearInterval(tickIntervalId);
    tickIntervalId = null;
  }
  setState({ percent: 100 });
  hideTimeoutId = setTimeout(() => {
    setState({ visible: false, percent: 0 });
    hideTimeoutId = null;
  }, 250);
}

export function subscribeProgress(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProgressSnapshot(): ProgressState {
  return state;
}

export function getProgressServerSnapshot(): ProgressState {
  return SERVER_SNAPSHOT;
}
