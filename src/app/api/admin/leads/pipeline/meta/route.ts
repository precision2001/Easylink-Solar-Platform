import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Stages, lost reasons and staff who can own a lead (Quotes & Leads menus). */
export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("admin", "/leads/pipeline/meta"));
}
