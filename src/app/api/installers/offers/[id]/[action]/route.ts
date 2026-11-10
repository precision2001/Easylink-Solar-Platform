import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

const ACTIONS = new Set(["viewed", "accept", "decline"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string; action: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id, action } = await ctx.params;
  if (!UUID.test(id) || !ACTIONS.has(action)) {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const body = (await req.text()) || "{}";
  const res = await backendAuthedFetch("installer", `/installer-offers/${id}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
