import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams;
  const sp = new URLSearchParams();
  for (const k of ["status", "warehouseId", "limit"]) {
    const v = incoming.get(k);
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return forwardBackendJson(await backendAuthedFetch("admin", `/orders${qs ? `?${qs}` : ""}`));
}
