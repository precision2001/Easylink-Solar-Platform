import { proxyNavUsage } from "@/lib/server/nav-usage-proxy";

/** Side-menu usage counts and this customer's weekly section order. */
type Ctx = { params: Promise<{ path: string[] }> };

const handle = async (request: Request, ctx: Ctx) => proxyNavUsage("customer", request, (await ctx.params).path);

export const GET = handle;
export const POST = handle;
