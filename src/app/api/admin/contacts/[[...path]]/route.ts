import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";

/**
 * Proxy for the calling database behind the Contact lists page.
 *
 * One catch-all rather than a file per endpoint: the contacts API has a dozen
 * routes that differ only in path, and every one of them needs the same thing —
 * the admin cookie swapped for a bearer token. Authorisation and validation
 * stay on the backend, which is the only place that can enforce them, so this
 * forwards rather than deciding anything.
 */

const BASE = "/contacts";

/** Rebuilds the backend path, keeping the query string and encoding each segment. */
function target(req: Request, path: string[]): string {
  const suffix = path.map(encodeURIComponent).join("/");
  const query = new URL(req.url).search;
  return `${BASE}${suffix ? `/${suffix}` : ""}${query}`;
}

async function proxy(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
  method: "GET" | "POST" | "PATCH" | "DELETE",
) {
  const { path = [] } = await ctx.params;
  const body = method === "GET" || method === "DELETE" ? undefined : await req.text();

  const res = await backendAuthedFetch("admin", target(req, path), {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body }
      : {}),
  });
  return forwardBackendJson(res);
}

export const GET = (req: Request, ctx: { params: Promise<{ path?: string[] }> }) =>
  proxy(req, ctx, "GET");

export const POST = (req: Request, ctx: { params: Promise<{ path?: string[] }> }) =>
  proxy(req, ctx, "POST");

export const PATCH = (req: Request, ctx: { params: Promise<{ path?: string[] }> }) =>
  proxy(req, ctx, "PATCH");

export const DELETE = (req: Request, ctx: { params: Promise<{ path?: string[] }> }) =>
  proxy(req, ctx, "DELETE");
