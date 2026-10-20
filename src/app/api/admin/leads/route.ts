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
export async function POST(req: Request) {
  const body = await req.text();
  const res = await backendAuthedFetch("admin", "/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return forwardBackendJson(res);
}
