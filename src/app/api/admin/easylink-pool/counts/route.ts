import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("admin", "/easylink-pool/counts"));
}
