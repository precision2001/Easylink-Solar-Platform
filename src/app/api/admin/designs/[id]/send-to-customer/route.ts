import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** Sends the design to the customer's portal with a sign-in link: { channel: "email" | "sms" | "both" }. */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  return forwardBackendJson(
    await backendAuthedFetch("admin", `/designs/${encodeURIComponent(id)}/send-to-customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body || "{}",
    }),
  );
}
