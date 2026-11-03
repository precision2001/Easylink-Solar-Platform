import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { INSTALLER_ACCESS_COOKIE, INSTALLER_REFRESH_COOKIE } from "@/lib/auth/installer-cookies";
import {
  ACCESS_COOKIE_MAX_AGE_SEC,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SEC,
  cookieBaseOptions,
} from "@/lib/auth/customer-cookies";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/auth/admin-cookies";
import { executeTokenRefresh } from "@/lib/auth/execute-token-refresh";
import { isAccessTokenExpired } from "@/lib/auth/middleware-session";
import { buildBackendUrl } from "@/lib/customers/backend";

export type BackendPortal = "customer" | "installer" | "admin";

const PORTAL_COOKIE: Record<BackendPortal, string> = {
  customer: CUSTOMER_ACCESS_COOKIE,
  installer: INSTALLER_ACCESS_COOKIE,
  admin: ADMIN_ACCESS_COOKIE,
};

const PORTAL_REFRESH_COOKIE: Record<BackendPortal, string> = {
  customer: CUSTOMER_REFRESH_COOKIE,
  installer: INSTALLER_REFRESH_COOKIE,
  admin: ADMIN_REFRESH_COOKIE,
};

/**
 * Access tokens last 15 minutes. Page navigations are renewed by proxy.ts,
 * but API calls (/api/**) never pass through it, so a tab left open longer
 * than that had every save rejected while the screen still looked signed in.
 * Renews here with the refresh cookie and stores the new pair. Returns null
 * when there is nothing to renew with or the backend refuses.
 */
async function renewSession(portal: BackendPortal): Promise<string | null> {
  const jar = await cookies();
  const refresh = jar.get(PORTAL_REFRESH_COOKIE[portal])?.value;
  if (!refresh) return null;
  const outcome = await executeTokenRefresh(refresh);
  if (!outcome.ok) return null;
  try {
    const base = cookieBaseOptions();
    jar.set(PORTAL_COOKIE[portal], outcome.accessToken, { ...base, maxAge: ACCESS_COOKIE_MAX_AGE_SEC });
    jar.set(PORTAL_REFRESH_COOKIE[portal], outcome.refreshToken, { ...base, maxAge: REFRESH_COOKIE_MAX_AGE_SEC });
  } catch {
    // Server components can't set cookies; the request still goes through
    // with the new token, and the next route handler stores it.
  }
  return outcome.accessToken;
}

export async function backendAuthedFetch(
  portal: BackendPortal,
  path: string,
  init?: RequestInit,
): Promise<Response | NextResponse> {
  const jar = await cookies();
  let token = jar.get(PORTAL_COOKIE[portal])?.value;

  if (!token || isAccessTokenExpired(token)) {
    token = (await renewSession(portal)) ?? token;
  }

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json(
      {
        message:
          "Server configuration is missing BACKEND_API_BASE_URL for messaging.",
      },
      { status: 500 },
    );
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const url = buildBackendUrl(backendBaseUrl, path);
    const res = await fetch(url, { ...init, headers, cache: "no-store" });
    // Expired between our check and the backend's (clock skew, a token
    // revoked by a refresh in another tab): renew once and retry, when the
    // body can be sent again.
    const replayable = init?.body == null || typeof init.body === "string";
    if (res.status === 401 && replayable) {
      const renewed = await renewSession(portal);
      if (renewed) {
        headers.set("Authorization", `Bearer ${renewed}`);
        return await fetch(url, { ...init, headers, cache: "no-store" });
      }
    }
    return res;
  } catch {
    // Most common in local dev when the Express backend is down/restarting (ECONNRESET).
    return NextResponse.json(
      { message: "Unable to reach the backend service." },
      { status: 502 },
    );
  }
}

/** Pass JSON body through from Route Handlers to the Express API. */
export async function forwardBackendJson(
  res: Response | NextResponse,
): Promise<NextResponse> {
  if (res instanceof NextResponse) return res;
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}
