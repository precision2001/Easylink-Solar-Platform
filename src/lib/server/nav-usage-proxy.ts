import { cookies } from "next/headers";
import { INSTALLER_ACCESS_COOKIE } from "@/lib/auth/installer-cookies";
import { backendAuthedFetch, forwardBackendJson, type BackendPortal } from "@/lib/server/backend-authed-fetch";

/** Side-menu usage and order (see src/components/navigation/menuPrefs.ts). */
const ALLOWED = new Set(["order", "use"]);

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

export async function proxyNavUsage(portal: BackendPortal, request: Request, path: string[]) {
  if (path.length !== 1 || !ALLOWED.has(path[0])) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  const search = new URL(request.url).search;
  const body = request.method === "GET" ? undefined : await request.text();
  const target = `/nav-usage/${path[0]}${search}`;
  const init = { method: request.method, body: body || undefined };
  let res = await backendAuthedFetch(portal, target, init);
  // Same rule as Email: the Operations Portal may fall back to a portal sign-in only when it is an Admin's.
  if (res.status === 401 && portal === "admin" && roleOf((await cookies()).get(INSTALLER_ACCESS_COOKIE)?.value) === "ADMIN") {
    const retry = await backendAuthedFetch("installer", target, init);
    if (retry.status !== 401) res = retry;
  }
  return forwardBackendJson(res);
}
