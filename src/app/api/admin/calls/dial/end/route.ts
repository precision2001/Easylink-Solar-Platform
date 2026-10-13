import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/calls/dial/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
