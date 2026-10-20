import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/** Saves the Agent Dialer wrap-up against one call record. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const body = await req.text();

  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/disposition`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  return forwardBackendJson(res);
}
