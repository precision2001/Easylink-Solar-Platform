import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * Admin-authenticated lead creation. The backend has allowed ADMIN on
 * `POST /leads` all along; what was missing was an admin-token proxy for it,
 * so the admin portal had no way to create a lead (only the installer-scoped
 * route and the public contact form existed). Used by the Agent Dialer to
 * capture an unknown caller without leaving the call.
 */
/**
 * Admin lead listing. The backend has allowed ADMIN on `GET /leads` all
 * along, but no admin proxy existed — so a lead created from the dialler was
 * write-only: there was nowhere in the admin portal to see it again. That is
 * what this route (and the leads table on /master/quotes-leads) fixes.
 *
 * Query params are passed through verbatim (`page`, `limit`, `status`,
 * `assignedToId`, `search`) — the backend validates them.
 */
export async function GET(req: Request) {
  const { search } = new URL(req.url);
  const res = await backendAuthedFetch("admin", `/leads${search}`);
  return forwardBackendJson(res);
}

export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
