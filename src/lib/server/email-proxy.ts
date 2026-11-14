import { backendAuthedFetch, forwardBackendJson, type BackendPortal } from "@/lib/server/backend-authed-fetch";

/** Only the email API's own paths are forwarded to the backend. */
const ALLOWED = new Set(["status", "oauth", "accounts", "messages", "send"]);

export async function proxyEmail(portal: BackendPortal, request: Request, path: string[]) {
  if (!path[0] || !ALLOWED.has(path[0]) || path.some((p) => !p || p === "." || p === "..")) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const search = new URL(request.url).search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const res = await backendAuthedFetch(portal, `/email/${path.map(encodeURIComponent).join("/")}${search}`, {
    method: request.method,
    body: body || undefined,
  });
  return forwardBackendJson(res);
}
