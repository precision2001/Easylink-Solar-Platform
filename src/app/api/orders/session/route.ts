import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { badPortal, buyerPortalFrom } from "@/lib/server/orders-proxy";

/**
 * Who would place the order: the signed-in user of the given portal, from its
 * session cookie. 401 means "not signed in to that portal" (the client then
 * tries a token refresh, then the other portal).
 */
export async function GET(request: Request) {
  const portal = buyerPortalFrom(request);
  if (!portal) return badPortal();
  return forwardBackendJson(await backendAuthedFetch(portal, "/users/me"));
}
