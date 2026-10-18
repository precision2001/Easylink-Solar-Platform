import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function GET(request: Request) {
  const qs = new URL(request.url).searchParams.toString();
  const path = `/jobs-schedule/week${qs ? `?${qs}` : ""}`;
  const res = await backendAuthedFetch("admin", path);
  return forwardBackendJson(res);
}
