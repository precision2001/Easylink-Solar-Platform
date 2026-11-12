/** Master portal (admin session): EasyLink staff notifications. Backend /notifications. */
import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function PATCH() {
  const res = await backendAuthedFetch("admin", "/notifications/read-all", {
    method: "PATCH",
  });
  return forwardBackendJson(res);
}
