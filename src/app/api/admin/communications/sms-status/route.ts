import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Whether texts can go out yet (live, sandbox, pending sender ID, or off). */
export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("admin", "/communications/sms-status"));
}
