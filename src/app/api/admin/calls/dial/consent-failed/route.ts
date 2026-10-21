import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * The recording announcement did not play, so this call is not recorded.
 * Reported rather than swallowed: recording is gated on the announcement,
 * and a gate that fails silently is indistinguishable from one nobody opened.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/calls/dial/consent-failed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
