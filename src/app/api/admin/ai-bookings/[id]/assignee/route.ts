import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return forwardBackendJson(
    await backendAuthedFetch("admin", `/ai-bookings/${id}/assignee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
    }),
  );
}
