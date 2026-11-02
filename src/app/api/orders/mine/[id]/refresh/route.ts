import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { badPortal, buyerPortalFrom } from "@/lib/server/orders-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const portal = buyerPortalFrom(request);
  if (!portal) return badPortal();
  const { id } = await ctx.params;
  return forwardBackendJson(
    await backendAuthedFetch(portal, `/orders/mine/${encodeURIComponent(id)}/refresh`, { method: "POST" }),
  );
}
