import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** Records that this staff member has opened the lead's signals; clears "new" for them only. */
export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardBackendJson(await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/signals/seen`, { method: "POST" }));
}
