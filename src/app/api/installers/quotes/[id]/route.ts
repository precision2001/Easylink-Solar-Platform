import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardBackendJson(await backendAuthedFetch("installer", `/quotes/${encodeURIComponent(id)}`));
}

/** Deposit, valid until, notes or title (draft or sent quotes only). */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardBackendJson(
    await backendAuthedFetch("installer", `/quotes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    }),
  );
}
