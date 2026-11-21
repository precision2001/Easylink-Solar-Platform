import { NextResponse } from "next/server";
import { BOOKING_KINDS, addDays, freeTimes, sydneyDayKey, sydneyTime, type BookingKind } from "@/lib/booking/rules";
import { busyTimes, BookingError } from "@/lib/booking/service";
import { loadBookingSettings } from "@/lib/booking/settings-store";
import { resolveTarget } from "@/lib/booking/target";
import { clientIpFrom, createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const limiter = createRateLimiter({ limit: 90, windowMs: 10 * 60_000 });
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Free times for one kind between two Sydney dates (at most 6 weeks). */
export async function GET(req: Request) {
  if (!limiter.check(clientIpFrom(req.headers)).allowed) {
    return NextResponse.json({ message: "Too many requests. Please wait a minute." }, { status: 429 });
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as BookingKind;
  if (!BOOKING_KINDS.includes(kind)) return NextResponse.json({ message: "Pick what you'd like to book." }, { status: 400 });

  const settings = await loadBookingSettings();
  const today = sydneyDayKey(new Date());
  const lastDay = addDays(today, settings.horizonDays);
  let from = url.searchParams.get("from") ?? today;
  let to = url.searchParams.get("to") ?? addDays(from, 13);
  if (!DAY.test(from) || !DAY.test(to)) return NextResponse.json({ message: "Bad dates." }, { status: 400 });
  if (from < today) from = today;
  if (to > lastDay) to = lastDay;
  if (to > addDays(from, 42)) to = addDays(from, 42);
  if (to < from) return NextResponse.json({ data: { days: [] } });

  try {
    const target = await resolveTarget(url.searchParams.get("t"), url.searchParams.get("i"));
    if ("error" in target) return NextResponse.json({ message: target.error }, { status: target.status });
    const leadId = target.type === "lead" ? target.lead.id : null;
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm, td] = addDays(to, 1).split("-").map(Number);
    const busy = await busyTimes(kind, leadId, sydneyTime(fy, fm, fd, 0).toISOString(), sydneyTime(ty, tm, td, 0).toISOString());
    const days = freeTimes(settings, kind, busy, new Date(), from, to);
    return NextResponse.json({ data: { days, from, to, lastDay } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const status = e instanceof BookingError ? e.status : 502;
    return NextResponse.json({ message: "We couldn't load free times. Please try again or call us." }, { status });
  }
}
