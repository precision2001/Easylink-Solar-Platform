import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

/** A lead's signals in full: what has happened, Intent with its reasons, the next best step. */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardBackendJson(await backendAuthedFetch("admin", `/leads/${encodeURIComponent(id)}/signals`, { cache: "no-store" }));
}
