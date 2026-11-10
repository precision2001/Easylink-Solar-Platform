import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** The leads table's Delete lead button: removes the lead for good (admin only; the backend checks the role). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
  return forwardBackendJson(res);
}
