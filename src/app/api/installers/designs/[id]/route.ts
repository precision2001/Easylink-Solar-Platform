import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { readDesignBodyText } from "@/lib/server/image-compress";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch("installer", `/designs/${id}`);
  return forwardBackendJson(res);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await readDesignBodyText(request);
  const res = await backendAuthedFetch("installer", `/designs/${id}`, {
    method: "PATCH",
    body,
  });
  return forwardBackendJson(res);
}
