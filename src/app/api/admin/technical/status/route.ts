import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Staff only: short technical status for many leads (Quotes & Leads chips). */
export async function POST(req: Request) {
  return forwardBackendJson(
    await backendAuthedFetch("admin", "/technical/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: await req.text() }),
  );
}
