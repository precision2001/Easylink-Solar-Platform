import { forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { backendPublicFetch } from "@/lib/server/orders-proxy";

export async function GET() {
  return forwardBackendJson(await backendPublicFetch("/orders/warehouses"));
}
