import { aiFetch, forwardAiJson } from "@/lib/server/ai-platform";

/**
 * Customer portal → AI platform. Customers see their own project: its files,
 * history and the messages sent to or about it, and can ask for a different
 * installer. They cannot run actions directly.
 */
const ALLOWED = new Set(["projects", "messages", "files", "people"]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [head] = path;
  if (!head || !ALLOWED.has(head)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  // The only write a customer makes here is asking for a different installer.
  if (request.method !== "GET" && !(path.length === 4 && path[0] === "projects" && path[3] === "installer-change")) {
    return Response.json({ success: false, message: "Not allowed" }, { status: 405 });
  }
  const body = request.method === "GET" ? undefined : await request.text();
  return forwardAiJson(
    await aiFetch("customer", `/v1/ai/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`, { method: request.method, body: body || undefined }),
  );
}

export const GET = proxy;
export const POST = proxy;
