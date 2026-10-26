import type { NextRequest } from "next/server";
import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Staff relay to the backend's contact-centre routes: calls, customer records, follow-ups. */
const ALLOWED = new Set(["call-records", "customer-records", "follow-ups", "calls", "live-calls"]);

async function relay(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path?.length || !ALLOWED.has(path[0]!)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  const init: RequestInit = { method: req.method };
  if (req.method !== "GET" && req.method !== "DELETE") {
    init.body = await req.text();
    init.headers = { "Content-Type": "application/json" };
  }
  const res = await backendAuthedFetch("admin", `/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`, init);
  return forwardBackendJson(res);
}

export const GET = relay;
export const POST = relay;
export const PATCH = relay;
export const PUT = relay;
export const DELETE = relay;
