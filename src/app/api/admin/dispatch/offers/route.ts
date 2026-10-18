import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

export async function GET() {
  const res = await backendAuthedFetch("admin", "/dispatch/offers");
  return forwardBackendJson(res);
}

export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/dispatch/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
