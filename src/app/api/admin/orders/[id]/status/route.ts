import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  return forwardBackendJson(
    await backendAuthedFetch("admin", `/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body }),
  );
}
