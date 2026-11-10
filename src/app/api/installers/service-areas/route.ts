import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("installer", "/installer-offers/service-areas"));
}

export async function PUT(req: Request) {
  const res = await backendAuthedFetch("installer", "/installer-offers/service-areas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: await req.text(),
  });
  return forwardBackendJson(res);
}
