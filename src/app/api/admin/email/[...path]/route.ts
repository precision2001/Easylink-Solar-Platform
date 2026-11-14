import { proxyEmail } from "@/lib/server/email-proxy";

/** Operations Portal → backend Email (Outlook and Gmail). */
type Ctx = { params: Promise<{ path: string[] }> };

const handle = async (request: Request, ctx: Ctx) => proxyEmail("admin", request, (await ctx.params).path);

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
