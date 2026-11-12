import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";

export async function POST(req: Request) {
  return forwardBackendJson(
    await backendAuthedFetch("admin", "/easylink-pool/nominate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await req.text(),
    }),
  );
}
