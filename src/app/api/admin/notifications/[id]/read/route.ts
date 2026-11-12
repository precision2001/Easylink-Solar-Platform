/** Master portal (admin session): EasyLink staff notifications. Backend /notifications. */
import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch(
    "admin",
    `/notifications/${id}/read`,
    { method: "PATCH" },
  );
  return forwardBackendJson(res);
}
