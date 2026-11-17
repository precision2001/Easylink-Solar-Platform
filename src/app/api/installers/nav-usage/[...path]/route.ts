import { proxyNavUsage } from "@/lib/server/nav-usage-proxy";

/** Side-menu usage counts and this person's weekly section order. */
type Ctx = { params: Promise<{ path: string[] }> };

const handle = async (request: Request, ctx: Ctx) => proxyNavUsage("installer", request, (await ctx.params).path);

export const GET = handle;
export const POST = handle;
