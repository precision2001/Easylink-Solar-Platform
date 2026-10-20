import { aiFetch, forwardAiJson } from "@/lib/server/ai-platform";

/**
 * Master portal → AI platform. Only these prefixes are forwarded:
 *   /api/admin/ai/control/...   → /v1/ai/control/...
 *   /api/admin/ai/inbox/...     → /v1/ai/inbox/...
 *   /api/admin/ai/activity      → /v1/ai/activity
 *   /api/admin/ai/records/...   → /v1/ai/records/...
 *   /api/admin/ai/screens/...   → /v1/ai/screens/...
 *   /api/admin/ai/actions/:name → /v1/actions/:name
 */
const ALLOWED = new Set(["control", "inbox", "activity", "records", "screens", "actions", "partners", "config", "projects", "messages", "files", "people", "installers"]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [head, ...rest] = path;
  if (!head || !ALLOWED.has(head)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  const target = head === "actions" ? `/v1/actions/${rest.map(encodeURIComponent).join("/")}` : `/v1/ai/${path.map(encodeURIComponent).join("/")}`;
  const search = new URL(request.url).search;
  const body = request.method === "GET" ? undefined : await request.text();
  const headers: Record<string, string> = {};
  const idem = request.headers.get("idempotency-key");
  if (idem) headers["Idempotency-Key"] = idem;
  return forwardAiJson(await aiFetch("admin", `${target}${search}`, { method: request.method, body: body || undefined, headers }));
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
