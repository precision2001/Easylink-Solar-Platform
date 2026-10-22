import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * A short-lived signed URL for one call's audio.
 *
 * Minted per request rather than stored with the row: the recording bucket is
 * private, so the object is never linked directly from a page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params;

  const res = await backendAuthedFetch(
    "admin",
    `/calls/${encodeURIComponent(callId)}/recording`,
  );
  return forwardBackendJson(res);
}
