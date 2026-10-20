import { aiFetch, forwardAiJson, proxyBody } from "@/lib/server/ai-platform";

/**
 * Installer portal → AI platform. Installers get the record panel, generated
 * screens and the Action API, all as themselves (backend RBAC + AI policy).
 */
const ALLOWED = new Set(["records", "screens", "actions", "projects", "messages", "files", "people", "jobs", "documents"]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [head, ...rest] = path;
  if (!head || !ALLOWED.has(head)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  const target = head === "actions" ? `/v1/actions/${rest.map(encodeURIComponent).join("/")}` : `/v1/ai/${path.map(encodeURIComponent).join("/")}`;
  const b = await proxyBody(request);
  if (b instanceof Response) return b;
  return forwardAiJson(await aiFetch("installer", `${target}${new URL(request.url).search}`, { method: request.method, body: b.body, headers: b.headers }));
}

export const GET = proxy;
export const POST = proxy;
