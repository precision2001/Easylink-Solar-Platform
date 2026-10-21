import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * Attaches a call to the lead the agent captured from it in the dialler.
 * `Call.leadId` is otherwise only set at dial time by phone match, so a lead
 * created mid-call would never gain the call that produced it.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const body = await req.text();
  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/lead`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  return forwardBackendJson(res);
}
