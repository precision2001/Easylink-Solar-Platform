import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * Reports that the recording announcement finished playing to the callee.
 * This is what starts the recording server-side — see call-recording.service.ts.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/calls/dial/consent-announced", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
