import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelFromLink, loadManaged, rescheduleFromLink } from "@/lib/booking/book";
import { readLinkToken } from "@/lib/booking/link-token";
import { BookingError } from "@/lib/booking/service";
import { clientIpFrom, createRateLimiter, isSameOriginRequest } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const limiter = createRateLimiter({ limit: 20, windowMs: 3600_000 });

function bookingId(token: string | null | undefined): string | null {
  const t = readLinkToken(token);
  return t?.type === "booking" ? t.id : null;
}

function fail(e: unknown) {
  if (e instanceof BookingError) {
    return NextResponse.json({ message: e.status >= 500 ? "Please try again or call us." : e.message }, { status: e.status });
  }
  console.error("booking link: manage failed", e);
  return NextResponse.json({ message: "Something went wrong. Please call us." }, { status: 500 });
}

/** The booking behind a change-or-cancel link. */
export async function GET(req: Request) {
  const id = bookingId(new URL(req.url).searchParams.get("m"));
  if (!id) return NextResponse.json({ message: "This link isn't valid." }, { status: 404 });
  try {
    const m = await loadManaged(id);
    if (!m) return NextResponse.json({ message: "We couldn't find that booking." }, { status: 404 });
    return NextResponse.json({ data: m.booking });
  } catch (e) {
    return fail(e);
  }
}

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), m: z.string().max(200) }),
  z.object({ action: z.literal("move"), m: z.string().max(200), start: z.string().datetime({ offset: true }) }),
]);

export async function POST(req: Request) {
  if (!isSameOriginRequest(req.headers, req.url)) return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  if (!limiter.check(clientIpFrom(req.headers)).allowed) return NextResponse.json({ message: "Too many changes. Please call us." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Bad request." }, { status: 400 });
  const id = bookingId(parsed.data.m);
  if (!id) return NextResponse.json({ message: "This link isn't valid." }, { status: 404 });
  try {
    if (parsed.data.action === "cancel") return NextResponse.json({ data: await cancelFromLink(id) });
    return NextResponse.json({ data: await rescheduleFromLink(id, parsed.data.start) });
  } catch (e) {
    return fail(e);
  }
}
