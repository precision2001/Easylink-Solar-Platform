import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/**
 * Master portal (admin sign-in) → backend pricing engine v2:
 *   GET  /api/admin/pricing/price-book → GET  /pricing/price-book (full book, costs included)
 *   PUT  /api/admin/pricing/price-book → PUT  /pricing/price-book
 *   POST /api/admin/pricing/quote      → POST /pricing/quote (full quote, costs and margin)
 */
const ALLOWED = new Set(["price-book", "quote"]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  if (path.length !== 1 || !ALLOWED.has(path[0])) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const body = request.method === "GET" ? undefined : await request.text();
  const res = await backendAuthedFetch("admin", `/pricing/${path[0]}`, {
    method: request.method,
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}

export const GET = proxy;
export const PUT = proxy;
export const POST = proxy;
