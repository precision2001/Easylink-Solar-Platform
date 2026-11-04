import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearCustomerAuthCookies,
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_REFRESH_COOKIE,
  setCustomerSessionCookies,
} from "@/lib/auth/customer-cookies";
import { executeTokenRefresh } from "@/lib/auth/execute-token-refresh";
import {
  clearInstallerAuthCookies,
  INSTALLER_ACCESS_COOKIE,
  INSTALLER_REFRESH_COOKIE,
  setInstallerSessionCookies,
} from "@/lib/auth/installer-cookies";
import { isAccessTokenExpired } from "@/lib/auth/middleware-session";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  setAdminSessionCookies,
} from "@/lib/auth/admin-cookies";
import { SSO_ALLOWED_ORIGINS } from "@/lib/auth/portal-paths";
import { safeReturnTarget } from "@/lib/auth/return-path";
import { requestBackendSsoCode } from "@/lib/customers/sso-issue-backend";

const CUSTOMER_DASHBOARD = "/customers/dashboard";
const CUSTOMER_LOGIN = "/customers/auth";
const INSTALLER_DASHBOARD_HOME = "/installers/dashboard/home";
const INSTALLER_LOGIN = "/installers/auth";

function customerLoginRedirect(request: NextRequest, fromPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = CUSTOMER_LOGIN;
  url.searchParams.set("from", fromPath);
  return NextResponse.redirect(url);
}

function installerLoginRedirect(request: NextRequest, fromPath: string) {
  const url = request.nextUrl.clone();
  url.pathname = INSTALLER_LOGIN;
  url.searchParams.set("from", fromPath);
  return NextResponse.redirect(url);
}

/**
 * Where an already-authenticated visitor to /customers/auth should land.
 * Honours `?from=` the same way the sign-in form itself does (same allowlist,
 * same SSO handoff to another Easylink site) — without this, an authenticated
 * visitor never reaches page.tsx at all (this runs at the edge, before it),
 * so `from` would otherwise be silently dropped in favour of the dashboard.
 */
async function resolveCustomerAuthDestination(
  request: NextRequest,
  accessToken: string,
): Promise<URL> {
  const from = request.nextUrl.searchParams.get("from");
  const target = safeReturnTarget(
    from,
    CUSTOMER_LOGIN,
    CUSTOMER_DASHBOARD,
    SSO_ALLOWED_ORIGINS,
  );

  if (target.startsWith("/")) {
    return new URL(target, request.url);
  }

  // External allowlisted target (e.g. easylinkplus.com) — trade the session
  // for a one-time code rather than ever exposing the real tokens in a URL.
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  const code = backendBaseUrl
    ? await requestBackendSsoCode(backendBaseUrl, accessToken)
    : null;

  if (!code) {
    // No code, no safe way to prove identity to the other site — land the
    // customer on the target anyway rather than stranding them here.
    return new URL(target);
  }

  const url = new URL(target);
  url.searchParams.set("code", code);
  return url;
}

async function handleCustomerAuthPage(request: NextRequest): Promise<NextResponse> {
  const access = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;

  if (access && !isAccessTokenExpired(access)) {
    return NextResponse.redirect(
      await resolveCustomerAuthDestination(request, access),
    );
  }

  if (!refresh) {
    return NextResponse.next();
  }

  const outcome = await executeTokenRefresh(refresh);
  if (outcome.ok) {
    const redirect = NextResponse.redirect(
      await resolveCustomerAuthDestination(request, outcome.accessToken),
    );
    setCustomerSessionCookies(redirect, {
      accessToken: outcome.accessToken,
      refreshToken: outcome.refreshToken,
    });
    return redirect;
  }
  if (outcome.clearSession) {
    const next = NextResponse.next();
    clearCustomerAuthCookies(next);
    return next;
  }
  return NextResponse.next();
}

async function handleCustomerProtected(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value;

  if (access && !isAccessTokenExpired(access)) {
    return NextResponse.next();
  }

  if (refresh) {
    const outcome = await executeTokenRefresh(refresh);
    if (outcome.ok) {
      const next = NextResponse.next();
      setCustomerSessionCookies(next, {
        accessToken: outcome.accessToken,
        refreshToken: outcome.refreshToken,
      });
      return next;
    }
    if (outcome.clearSession) {
      const redirect = customerLoginRedirect(request, pathname);
      clearCustomerAuthCookies(redirect);
      return redirect;
    }
    return NextResponse.next();
  }

  return customerLoginRedirect(request, pathname);
}

async function handleInstallerAuthPage(request: NextRequest): Promise<NextResponse> {
  const access = request.cookies.get(INSTALLER_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(INSTALLER_REFRESH_COOKIE)?.value;

  if (access && !isAccessTokenExpired(access)) {
    return NextResponse.redirect(new URL(INSTALLER_DASHBOARD_HOME, request.url));
  }

  if (!refresh) {
    return NextResponse.next();
  }

  const outcome = await executeTokenRefresh(refresh);
  if (outcome.ok) {
    const redirect = NextResponse.redirect(
      new URL(INSTALLER_DASHBOARD_HOME, request.url),
    );
    setInstallerSessionCookies(redirect, {
      accessToken: outcome.accessToken,
      refreshToken: outcome.refreshToken,
    });
    return redirect;
  }
  if (outcome.clearSession) {
    const next = NextResponse.next();
    clearInstallerAuthCookies(next);
    return next;
  }
  return NextResponse.next();
}

async function handleInstallerProtected(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(INSTALLER_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(INSTALLER_REFRESH_COOKIE)?.value;

  if (access && !isAccessTokenExpired(access)) {
    return NextResponse.next();
  }

  if (refresh) {
    const outcome = await executeTokenRefresh(refresh);
    if (outcome.ok) {
      const next = NextResponse.next();
      setInstallerSessionCookies(next, {
        accessToken: outcome.accessToken,
        refreshToken: outcome.refreshToken,
      });
      return next;
    }
    if (outcome.clearSession) {
      const redirect = installerLoginRedirect(request, pathname);
      clearInstallerAuthCookies(redirect);
      return redirect;
    }
    return NextResponse.next();
  }

  return installerLoginRedirect(request, pathname);
}

/**
 * The operations portal's data calls use the admin session. Keep it renewed
 * on navigation like the other portals; the page gate itself is unchanged.
 */
async function handleMasterProtected(request: NextRequest): Promise<NextResponse> {
  const access = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;
  const gate = await handleInstallerProtected(request);
  if (!refresh || (access && !isAccessTokenExpired(access))) return gate;
  if (gate.headers.get("location")) return gate;
  const outcome = await executeTokenRefresh(refresh);
  if (outcome.ok) {
    setAdminSessionCookies(gate, { accessToken: outcome.accessToken, refreshToken: outcome.refreshToken });
  }
  return gate;
}

/** Exactly "/customers" or "/customers/" — not anything beneath it. */
export function isPublicCustomersLanding(pathname: string): boolean {
  return pathname === "/customers" || pathname === "/customers/";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/customers/auth")) {
    return handleCustomerAuthPage(request);
  }

  // The bare /customers page is the public customer marketing page; only the
  // portal routes beneath it need a session.
  if (isPublicCustomersLanding(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/customers")) {
    return handleCustomerProtected(request);
  }

  if (pathname.startsWith("/installers/auth")) {
    return handleInstallerAuthPage(request);
  }

  if (pathname.startsWith("/installers/dashboard")) {
    return handleInstallerProtected(request);
  }

  if (pathname.startsWith("/master")) {
    return handleMasterProtected(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customers/:path*",
    "/installers/auth",
    "/installers/dashboard/:path*",
    "/master/:path*",
  ],
};
