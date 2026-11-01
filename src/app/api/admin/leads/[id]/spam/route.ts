import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** The leads table's Spam / Not spam button (admin only; backend checks the role). */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/spam`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
  return forwardBackendJson(res);
}
