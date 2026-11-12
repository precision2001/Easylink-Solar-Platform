/** Master portal (admin session): EasyLink staff notifications. Backend /notifications. */
import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function GET(request: Request) {
  const qs = new URL(request.url).searchParams.toString();
  const path = `/notifications${qs ? `?${qs}` : ""}`;
  const res = await backendAuthedFetch("admin", path);
  return forwardBackendJson(res);
}
