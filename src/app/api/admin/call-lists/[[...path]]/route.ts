import type { NextRequest } from "next/server";
import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Staff relay to the backend's /call-lists routes (state lists, uploaded lists, next contact). */
async function relay(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const safe = path.map((p) => encodeURIComponent(p)).join("/");
  const search = req.nextUrl.search;
  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "DELETE") {
    init.body = await req.text();
    init.headers = { "Content-Type": "application/json" };
  }
  const res = await backendAuthedFetch("admin", `/call-lists${safe ? `/${safe}` : ""}${search}`, init);
  return forwardBackendJson(res);
}

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
export const DELETE = relay;
