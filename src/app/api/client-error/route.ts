import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * A page that crashed in the browser reports here, so the error and its stack
 * reach the server log (pm2) instead of only the visitor's console
 * (10 Nov 2026: the Designs page crashed for a lead and nothing was logged).
 * Text only, trimmed; nothing about the visitor is kept.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { message?: unknown; stack?: unknown; digest?: unknown; path?: unknown } | null;
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  console.error("client-error", JSON.stringify({ path: s(body?.path, 200), message: s(body?.message, 500), digest: s(body?.digest, 100), stack: s(body?.stack, 4000) }));
  return new NextResponse(null, { status: 204 });
}
