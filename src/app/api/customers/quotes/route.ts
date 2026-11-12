import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** The signed-in customer's quotes (never drafts or internal notes). */
export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("customer", "/quotes/mine"));
}
