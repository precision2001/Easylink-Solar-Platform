import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { readDesignBodyText } from "@/lib/server/image-compress";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch(
    "customer",
    `/designs/${encodeURIComponent(id)}`,
  );
  return forwardBackendJson(res);
}

/** Builder save — separate from PATCH, which is the narrow details edit. */
export async function PUT(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readDesignBodyText(request);
  const res = await backendAuthedFetch(
    "customer",
    `/designs/${encodeURIComponent(id)}/builder`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  return forwardBackendJson(res);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readDesignBodyText(request);
  const res = await backendAuthedFetch(
    "customer",
    `/designs/${encodeURIComponent(id)}/customer-details`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  return forwardBackendJson(res);
}
