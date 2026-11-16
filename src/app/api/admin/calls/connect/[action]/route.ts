import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/** The Connect softphone's call-history reports: placed, answered, connected, ended. */
const ACTIONS = new Set(["placed", "answered", "connected", "ended"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!ACTIONS.has(action)) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }
  const body = await req.text();
  const res = await backendAuthedFetch("admin", `/calls/connect/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
