import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ leadId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { leadId } = await ctx.params;
  const body = await request.text();
  const res = await backendAuthedFetch("admin", `/dispatch/leads/${leadId}/assign-crew`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
