import { requestBackendRefreshTokens } from "@/lib/customers/refresh-backend";

/**
 * Shared backend refresh for customer + installer (same BFF → `POST /auth/refresh-token`).
 * Use this from Route Handlers and from middleware — do not `fetch` the Next API from middleware
 * (loopback to ::1 / port can fail on Windows and is unnecessary).
 */
export type TokenRefreshResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; clearSession: boolean; status: number };

const refreshInFlight = new Map<string, Promise<TokenRefreshResult>>();

async function refreshOnce(refreshToken: string): Promise<TokenRefreshResult> {
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return { ok: false, clearSession: false, status: 500 };
  }

  const outcome = await requestBackendRefreshTokens(
    backendBaseUrl,
    refreshToken,
  );

  if (!outcome.ok) {
    return {
      ok: false,
      clearSession: outcome.clearSession,
      status: outcome.status,
    };
  }

  return {
    ok: true,
    accessToken: outcome.data.accessToken,
    refreshToken: outcome.data.refreshToken,
  };
}

/**
 * Deduplicates concurrent refresh calls that share the same refresh token
 * (e.g. middleware and BFF refresh routes racing after token rotation).
 */
/**
 * The backend rotates the refresh token on every use, so a request that
 * arrives with the old cookie just after another one renewed it would be
 * refused. Keep a successful result for a short while and hand it to those.
 */
const RECENT_MS = 30_000;
const recent = new Map<string, { at: number; result: TokenRefreshResult }>();

export async function executeTokenRefresh(
  refreshToken: string,
): Promise<TokenRefreshResult> {
  const now = Date.now();
  for (const [key, entry] of recent) if (now - entry.at > RECENT_MS) recent.delete(key);
  const cached = recent.get(refreshToken);
  if (cached) return cached.result;

  const existing = refreshInFlight.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = refreshOnce(refreshToken)
    .then((result) => {
      if (result.ok) recent.set(refreshToken, { at: Date.now(), result });
      return result;
    })
    .finally(() => {
      refreshInFlight.delete(refreshToken);
    });

  refreshInFlight.set(refreshToken, promise);
  return promise;
}
