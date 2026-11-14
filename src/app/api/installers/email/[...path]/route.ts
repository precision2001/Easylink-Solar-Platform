import { proxyEmail } from "@/lib/server/email-proxy";

/** Installer Portal → backend Email (Outlook and Gmail). */
type Ctx = { params: Promise<{ path: string[] }> };

const handle = async (request: Request, ctx: Ctx) => proxyEmail("installer", request, (await ctx.params).path);

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
