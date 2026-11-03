import { NextResponse } from "next/server";
import { aiPlatformConfigured } from "@/lib/server/ai-platform";

/**
 * Website → EasyLink Marketplace (no sign-in). Reads are open; buying and paying
 * go through here only, where the server adds the ingest key the AI platform
 * requires, so nobody can call those directly.
 *   GET  /api/public/market/deals?postcode&type&building&maxPrice&minKw
 *   GET  /api/public/market/deals/:id
 *   GET  /api/public/market/sites
 *   POST /api/public/market/deals/:id/buy
 *   POST /api/public/market/orders/:id/pay
 */
type Ctx = { params: Promise<{ path: string[] }> };

const READS = [/^deals$/, /^deals\/[\w-]+$/, /^sites$/];
const WRITES = [/^deals\/[\w-]+\/buy$/, /^orders\/[\w-]+\/pay$/];

async function forward(request: Request, ctx: Ctx, allowed: RegExp[]) {
  const { path } = await ctx.params;
  const rel = path.map(encodeURIComponent).join("/");
  if (!allowed.some((r) => r.test(rel))) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  if (!aiPlatformConfigured()) return NextResponse.json({ success: false, message: "Deals are unavailable right now.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (request.method === "POST") {
    headers["Content-Type"] = "application/json";
    if (process.env.AI_EVENT_INGEST_KEY) headers["x-ingest-key"] = process.env.AI_EVENT_INGEST_KEY;
    body = await request.text();
    if (body.length > 20_000) return NextResponse.json({ success: false, message: "Too much data" }, { status: 413 });
  }
  const url = `${process.env.AI_PLATFORM_URL!.replace(/\/+$/, "")}/public/market/${rel}${new URL(request.url).search}`;
  try {
    const res = await fetch(url, { method: request.method, headers, body, cache: "no-store" });
    return new NextResponse(await res.text(), { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return NextResponse.json({ success: false, message: "Deals are unavailable right now." }, { status: 502 });
  }
}

export const GET = (request: Request, ctx: Ctx) => forward(request, ctx, READS);
export const POST = (request: Request, ctx: Ctx) => forward(request, ctx, WRITES);
