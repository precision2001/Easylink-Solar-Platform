import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Staff only: the deal's buy and sell prices and profit (Customer record → Deal financials). */
export async function GET(_req: Request, ctx: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await ctx.params;
  if (!UUID.test(leadId)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return forwardBackendJson(await backendAuthedFetch("admin", `/deal-financials/lead/${leadId}`));
}
