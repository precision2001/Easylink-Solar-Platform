import { NextResponse } from "next/server";
import { z } from "zod";
import { bookFromLink } from "@/lib/booking/book";
import { BOOKING_KINDS } from "@/lib/booking/rules";
import { BookingError, digits } from "@/lib/booking/service";
import { resolveTarget } from "@/lib/booking/target";
import { clientIpFrom, createRateLimiter, isSameOriginRequest } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const HOUR = 3600_000;
const ipLimiter = createRateLimiter({ limit: 8, windowMs: HOUR });
const phoneLimiter = createRateLimiter({ limit: 4, windowMs: HOUR });

const body = z.object({
  kind: z.enum(BOOKING_KINDS),
  start: z.string().datetime({ offset: true }),
  t: z.string().max(200).optional().nullable(),
  i: z.string().max(200).optional().nullable(),
  name: z.string().trim().min(2).max(120).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((p) => /^0[2-478]\d{8}$/.test(digits(p)), "Enter an Australian phone number, e.g. 0412 345 678.")
    .optional(),
  email: z.string().trim().email("Enter a valid email address.").max(200).optional(),
  address: z.string().trim().min(5).max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  smsOk: z.boolean().optional(),
  /** Honeypot: real people never fill it. */
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req.headers, req.url)) return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  if (!ipLimiter.check(clientIpFrom(req.headers)).allowed) {
    return NextResponse.json({ message: "Too many bookings from here. Please call us." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  }
  const b = parsed.data;
  if (b.phone && !phoneLimiter.check(digits(b.phone)).allowed) {
    return NextResponse.json({ message: "Too many bookings for this number. Please call us." }, { status: 429 });
  }
  try {
    const target = await resolveTarget(b.t ?? null, b.i ?? null);
    if ("error" in target) return NextResponse.json({ message: target.error }, { status: target.status });
    const out = await bookFromLink(target, b.kind, b.start, b);
    return NextResponse.json({ data: out }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      const msg = e.status >= 500 ? "Booking is unavailable right now. Please try again or call us." : e.message;
      return NextResponse.json({ message: msg }, { status: e.status });
    }
    console.error("booking link: book failed", e);
    return NextResponse.json({ message: "Something went wrong. Please try again or call us." }, { status: 500 });
  }
}
