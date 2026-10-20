import { aiFetch, forwardAiJson, proxyBody } from "@/lib/server/ai-platform";

/**
 * Customer portal → AI platform. Customers see their own project: its files,
 * history and the messages sent to or about it, and can ask for a different
 * installer. They cannot run actions directly.
 */
const ALLOWED = new Set(["projects", "messages", "files", "people", "jobs", "documents"]);

/** Writes a customer may make: ask for a different installer, do a step on their own job, upload a photo or bill. */
function customerWrite(path: string[]) {
  if (path.length === 4 && path[0] === "projects" && path[3] === "installer-change") return true;
  if (path.length === 4 && path[0] === "jobs" && path[2] === "steps") return true;
  if (path.length === 3 && path[0] === "jobs" && path[2] === "uploads") return true;
  return false;
}

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const [head] = path;
  if (!head || !ALLOWED.has(head)) return Response.json({ success: false, message: "Not found" }, { status: 404 });
  // Which steps a customer may do on a job is checked again by the AI platform.
  if (request.method !== "GET" && !customerWrite(path)) {
    return Response.json({ success: false, message: "Not allowed" }, { status: 405 });
  }
  const b = await proxyBody(request);
  if (b instanceof Response) return b;
  return forwardAiJson(
    await aiFetch("customer", `/v1/ai/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`, { method: request.method, body: b.body, headers: b.headers }),
  );
}

export const GET = proxy;
export const POST = proxy;
