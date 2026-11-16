import { cookies } from "next/headers";
import { INSTALLER_ACCESS_COOKIE } from "@/lib/auth/installer-cookies";
import { backendAuthedFetch, forwardBackendJson, type BackendPortal } from "@/lib/server/backend-authed-fetch";

/** Only the email API's own paths are forwarded to the backend. */
const ALLOWED = new Set(["status", "oauth", "imap", "accounts", "messages", "send"]);

/**
 * The Operations Portal's pages are gated by the portal sign-in, but its data
 * calls use the separate admin session. When that admin session has lapsed
 * (it can't renew once the same person signs in elsewhere), Email retries
 * with the portal sign-in, but only when that sign-in is itself an Admin.
 * An installer's sign-in is never used here: a mailbox connected through it
 * would belong to the installer and be hidden from EasyLink staff.
 */

/** Role named in a JWT's payload. Only used to decide whether to retry; the backend verifies the token. */
function roleOf(token: string | undefined): string | null {
  try {
    const part = token?.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { role?: unknown };
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}
export async function proxyEmail(portal: BackendPortal, request: Request, path: string[]) {
  if (!path[0] || !ALLOWED.has(path[0]) || path.some((p) => !p || p === "." || p === "..")) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const search = new URL(request.url).search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const target = `/email/${path.map(encodeURIComponent).join("/")}${search}`;
  const init = { method: request.method, body: body || undefined };
  let res = await backendAuthedFetch(portal, target, init);
  if (res.status === 401 && portal === "admin" && roleOf((await cookies()).get(INSTALLER_ACCESS_COOKIE)?.value) === "ADMIN") {
    const retry = await backendAuthedFetch("installer", target, init);
    if (retry.status !== 401) res = retry;
  }
  return forwardBackendJson(res);
}
