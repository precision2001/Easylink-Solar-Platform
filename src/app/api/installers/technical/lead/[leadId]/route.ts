import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ leadId: string }> };

/** Technical section of a lead: wiring, device installation, circuit protection, CT routing, app. */
export async function GET(_req: Request, ctx: Ctx) {
  const { leadId } = await ctx.params;
  if (!UUID.test(leadId)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return forwardBackendJson(await backendAuthedFetch("installer", `/technical/lead/${leadId}`));
}

/** Saves ratings, compliance ticks, notes, sign-off and "reviewed". */
export async function PATCH(req: Request, ctx: Ctx) {
  const { leadId } = await ctx.params;
  if (!UUID.test(leadId)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  return forwardBackendJson(
    await backendAuthedFetch("installer", `/technical/lead/${leadId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: await req.text() }),
  );
}
