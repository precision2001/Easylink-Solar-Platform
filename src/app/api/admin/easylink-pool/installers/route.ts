import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET(req: Request) {
  return forwardBackendJson(await backendAuthedFetch("admin", `/easylink-pool/installers${new URL(req.url).search}`));
}
