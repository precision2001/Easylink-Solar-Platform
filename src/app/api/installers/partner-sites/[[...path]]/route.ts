import type { NextRequest } from "next/server";
import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * Installer relay to the backend's partner-site routes — the Platform
 * Designer an installer puts on their own website.
 *
 * The browser never holds a backend token: the installer's session is an
 * httpOnly cookie, and `backendAuthedFetch` turns it into a Bearer header
 * server-side. The backend scopes every row to the signed-in installer, so
 * authorisation is not re-implemented here.
 *
 * `[[...path]]` is optional-catch-all so both the collection
 * (/api/installers/partner-sites) and a single site
 * (/api/installers/partner-sites/<id>) reach the same relay.
 */
async function relay(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await ctx.params;

  // One optional id segment and nothing deeper — a longer path is not a
  // route this feature has, so it is not forwarded.
  if (path && path.length > 1) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const suffix = path?.length ? `/${encodeURIComponent(path[0]!)}` : "";

  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "DELETE") {
    init.body = await req.text();
    init.headers = { "Content-Type": "application/json" };
  }

  const res = await backendAuthedFetch(
    "installer",
    `/installer-partner-sites${suffix}${req.nextUrl.search}`,
    init,
  );
  return forwardBackendJson(res);
}

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
export const DELETE = relay;
