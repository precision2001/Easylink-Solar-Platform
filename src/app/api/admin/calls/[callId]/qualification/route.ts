import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/** The saved battery-qualification answers for a call. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;

  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/qualification`,
  );
  return forwardBackendJson(res);
}

/**
 * Saves the script answers on their own, so the agent can keep them mid-call
 * rather than only when the wrap-up is submitted.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;
  const body = await req.text();

  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/qualification`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  return forwardBackendJson(res);
}
