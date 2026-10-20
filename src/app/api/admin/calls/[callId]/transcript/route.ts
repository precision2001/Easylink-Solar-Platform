import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/** Recording state and transcript for one call, for the Agent Dialer panel. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;

  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/transcript`,
  );
  return forwardBackendJson(res);
}
