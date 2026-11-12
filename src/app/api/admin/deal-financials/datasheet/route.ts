import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function PUT(req: Request) {
  return forwardBackendJson(
    await backendAuthedFetch("admin", "/deal-financials/datasheet", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
    }),
  );
}
