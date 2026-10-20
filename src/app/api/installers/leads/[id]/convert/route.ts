import { backendAuthedFetch } from "@/lib/server/backend-authed-fetch";
import { forwardBackendJsonWithEvents } from "@/lib/server/ai-platform";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const res = await backendAuthedFetch("installer", `/leads/${id}/convert`, {
    method: "POST",
    body,
  });
  return forwardBackendJsonWithEvents(res, "installer", (d) => [
    {
      type: "lead.converted",
      subject: { type: "lead", id },
      links: d.id || d.customerId ? [{ type: "customer", id: String(d.customerId ?? d.id) }] : [],
      data: {},
    },
  ]);
}
