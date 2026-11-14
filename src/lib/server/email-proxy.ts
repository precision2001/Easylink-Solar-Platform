import { backendAuthedFetch, forwardBackendJson, type BackendPortal } from "@/lib/server/backend-authed-fetch";

/** Only the email API's own paths are forwarded to the backend. */
const ALLOWED = new Set(["status", "oauth", "accounts", "messages", "send"]);

/**
 * The Operations Portal's pages are gated by the portal sign-in, but its data
 * calls use the separate admin session. When that admin session has lapsed
 * (it can't renew once the same person signs in elsewhere), Email retries
 * with the portal sign-in. The backend still checks the role and scopes
 * every mailbox and email to the person, so nothing widens.
 */
export async function proxyEmail(portal: BackendPortal, request: Request, path: string[]) {
  if (!path[0] || !ALLOWED.has(path[0]) || path.some((p) => !p || p === "." || p === "..")) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const search = new URL(request.url).search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const target = `/email/${path.map(encodeURIComponent).join("/")}${search}`;
  const init = { method: request.method, body: body || undefined };
  let res = await backendAuthedFetch(portal, target, init);
  if (res.status === 401 && portal === "admin") {
    const retry = await backendAuthedFetch("installer", target, init);
    if (retry.status !== 401) res = retry;
  }
  return forwardBackendJson(res);
}
