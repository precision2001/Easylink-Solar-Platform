import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/** Stamps `connectedAt` on the call row once the far end answers. */
export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/calls/dial/connected", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
