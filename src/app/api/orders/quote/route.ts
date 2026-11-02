import { forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { backendPublicFetch } from "@/lib/server/orders-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return forwardBackendJson(await backendPublicFetch("/orders/quote", { method: "POST", body }));
}
