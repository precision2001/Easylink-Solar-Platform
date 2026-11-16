import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** What brought leads in over the last 30, 90 or 365 days, ranked by the sales that followed. */
export async function GET(request: Request) {
  const days = new URL(request.url).searchParams.get("days");
  const query = days && /^\d+$/.test(days) ? `?days=${days}` : "";
  return forwardBackendJson(await backendAuthedFetch("admin", `/leads/pipeline/influencers${query}`, { cache: "no-store" }));
}
