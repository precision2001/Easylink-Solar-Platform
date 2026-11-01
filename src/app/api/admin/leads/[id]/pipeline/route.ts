import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** Stage, owner, lost (with reason) or reopen, from Quotes & Leads. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardBackendJson(
    await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    }),
  );
}
