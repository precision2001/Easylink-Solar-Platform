import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { badPortal, buyerPortalFrom } from "@/lib/server/orders-proxy";

export async function POST(request: Request) {
  const portal = buyerPortalFrom(request);
  if (!portal) return badPortal();
  const body = await request.text();
  return forwardBackendJson(await backendAuthedFetch(portal, "/orders/checkout", { method: "POST", body }));
}
