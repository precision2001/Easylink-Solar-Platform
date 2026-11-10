import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET() {
  return forwardBackendJson(await backendAuthedFetch("admin", "/ai-bookings/settings"));
}

export async function PUT(req: Request) {
  return forwardBackendJson(
    await backendAuthedFetch("admin", "/ai-bookings/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
    }),
  );
}
