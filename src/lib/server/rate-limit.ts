/**
 * Small in-memory sliding-window rate limiter.
 *
 * Per server process only — limits reset on restart and aren't shared between
 * instances. Good enough to stop casual abuse of a single endpoint; not a
 * substitute for limits at the proxy or provider.
 */
export type RateLimitResult = {
  allowed: boolean;
  /** Milliseconds until the next request would be allowed (0 when allowed). */
  retryAfterMs: number;
};

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
  reset: () => void;
};

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /** Oldest keys are dropped past this, so the map can't grow without bound. */
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()) {
      const cutoff = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: Math.max(0, recent[0] + windowMs - now) };
      }

      recent.push(now);
      // Re-insert so Map order tracks most-recent use.
      hits.delete(key);
      hits.set(key, recent);
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest === undefined) break;
        hits.delete(oldest);
      }
      return { allowed: true, retryAfterMs: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

/**
 * True when the request's Origin (or, failing that, Referer) is on the same
 * host the request was sent to. Requests with neither header are rejected —
 * browsers always send Origin on a cross-site or same-site POST from fetch.
 */
export function isSameOriginRequest(headers: Headers, requestUrl: string): boolean {
  const host = (headers.get("host") ?? safeHost(requestUrl) ?? "").toLowerCase();
  if (!host) return false;

  const source = headers.get("origin") ?? headers.get("referer");
  if (!source || source === "null") return false;
  const sourceHost = safeHost(source);
  return sourceHost != null && sourceHost.toLowerCase() === host;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * The visitor's IP. nginx sets X-Real-IP; Next adds its own x-forwarded-for
 * even locally, so that one isn't trusted (same rule as api/solar/roof-lines-check).
 */
export function clientIpFrom(headers: Headers): string {
  return headers.get("x-real-ip")?.trim() || "unknown";
}
