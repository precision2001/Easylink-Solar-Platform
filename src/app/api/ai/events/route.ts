import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentPortal, emitAiEvents, VISITOR_COOKIE, type AiEventInput } from "@/lib/server/ai-platform";

/**
 * Browser event capture (spec 3.6) for the website and every portal page.
 * Signed-in people are attributed through their portal session; everyone else
 * gets a first-party pseudonymous visitor id. Only interaction events are
 * accepted here; field values are never sent.
 */
const BROWSER_ENTITIES = new Set(["page", "form", "field", "cta", "price", "help", "ui", "widget", "search", "design", "cart"]);

export async function POST(request: Request) {
  let events: AiEventInput[];
  try {
    const body = (await request.json()) as { events?: AiEventInput[] } | AiEventInput[];
    events = (Array.isArray(body) ? body : body.events ?? []).slice(0, 50);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  events = events.filter((e) => typeof e?.type === "string" && BROWSER_ENTITIES.has(e.type.split(".")[0] ?? ""));

  const jar = await cookies();
  let vid = jar.get(VISITOR_COOKIE)?.value;
  const res = NextResponse.json({ success: true, accepted: events.length }, { status: 202 });
  if (!vid) {
    vid = `v_${randomUUID()}`;
    res.cookies.set(VISITOR_COOKIE, vid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  // Do not hold the page up: send after the response.
  const visitorId = vid;
  after(async () => emitAiEvents(await currentPortal(), events, visitorId));
  return res;
}
