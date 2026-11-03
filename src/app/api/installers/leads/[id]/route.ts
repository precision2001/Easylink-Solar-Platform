import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { forwardBackendJsonWithEvents } from "@/lib/server/ai-platform";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const qs = new URL(request.url).searchParams.toString();
  const path = `/leads/${id}${qs ? `?${qs}` : ""}`;
  const res = await backendAuthedFetch("installer", path);
  return forwardBackendJson(res);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  const res = await backendAuthedFetch("installer", `/leads/${id}`, {
    method: "PATCH",
    body,
  });
  return forwardBackendJsonWithEvents(res, "installer", () => {
    let fields: string[] = [];
    let status: unknown;
    try {
      const b = JSON.parse(body) as Record<string, unknown>;
      fields = Object.keys(b);
      status = b.status;
    } catch {}
    const subject = { type: "lead", id };
    const out = [{ type: "lead.updated", subject, data: { fields } }];
    if (status === "QUALIFIED") out.push({ type: "lead.qualified", subject, data: { fields } });
    if (status === "LOST") out.push({ type: "lead.lost", subject, data: { fields } });
    return out;
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch("installer", `/leads/${id}`, {
    method: "DELETE",
  });
  return forwardBackendJson(res);
}
