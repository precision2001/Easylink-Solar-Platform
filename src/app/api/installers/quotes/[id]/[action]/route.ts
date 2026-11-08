import { NextResponse } from "next/server";
import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import { STAFF_QUOTE_ACTIONS, isAllowedQuoteAction } from "@/lib/quotes-actions";

type Ctx = { params: Promise<{ id: string; action: string }> };

/** send | reprice | payment-link | withdraw */
export async function POST(request: Request, ctx: Ctx) {
  const { id, action } = await ctx.params;
  if (!isAllowedQuoteAction(STAFF_QUOTE_ACTIONS, action)) {
    return NextResponse.json({ success: false, message: "Unknown quote action." }, { status: 404 });
  }
  const body = await request.text();
  return forwardBackendJson(
    await backendAuthedFetch("installer", `/quotes/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body || "{}",
    }),
  );
}
