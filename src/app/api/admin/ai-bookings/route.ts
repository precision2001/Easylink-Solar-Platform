import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET(req: Request) {
  const q = new URL(req.url).search;
  return forwardBackendJson(await backendAuthedFetch("admin", `/ai-bookings${q}`));
}
