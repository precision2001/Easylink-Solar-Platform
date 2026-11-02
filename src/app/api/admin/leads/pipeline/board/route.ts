import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Open leads grouped by stage for the pipeline board. */
export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("admin", "/leads/pipeline/board"));
}
