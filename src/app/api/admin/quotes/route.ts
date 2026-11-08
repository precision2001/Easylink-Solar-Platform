import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

/** Quote versions for a lead or customer (?leadId= / ?customerId=). */
export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams;
  const sp = new URLSearchParams();
  for (const key of ["leadId", "customerId"]) {
    const value = incoming.get(key);
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return forwardBackendJson(await backendAuthedFetch("admin", `/quotes${qs ? `?${qs}` : ""}`));
}

/** New quote version, copied from the latest design and priced by the backend. */
export async function POST(request: Request) {
  return forwardBackendJson(
    await backendAuthedFetch("admin", "/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    }),
  );
}
