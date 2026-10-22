import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * The agent's recent calls, for the Agent Dialer's history list.
 *
 * Lets a reloaded page get back to a transcript: the id that used to be the
 * only way in lived in component state, so a refresh lost it even though the
 * transcript was already stored.
 */
export async function GET(req: Request) {
  const limit = new URL(req.url).searchParams.get("limit");

  const res = await backendAuthedFetch(
    "admin",
    `/calls/recent${limit ? `?limit=${encodeURIComponent(limit)}` : ""}`,
  );
  return forwardBackendJson(res);
}
