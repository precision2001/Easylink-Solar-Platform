import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { badPortal, buyerPortalFrom } from "@/lib/server/orders-proxy";

export async function GET(request: Request) {
  const portal = buyerPortalFrom(request);
  if (!portal) return badPortal();
  const limit = new URL(request.url).searchParams.get("limit");
  return forwardBackendJson(
    await backendAuthedFetch(portal, `/orders/mine${limit ? `?limit=${encodeURIComponent(limit)}` : ""}`),
  );
}
