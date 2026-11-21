import { NextResponse } from "next/server";
import { bookingLinksConfigured } from "@/lib/booking/link-token";
import { BOOKING_PHONE } from "@/lib/booking/notify";
import { BOOKING_KINDS, KIND_TEXT } from "@/lib/booking/rules";
import { bookingServiceConfigured, BookingError } from "@/lib/booking/service";
import { loadBookingSettings } from "@/lib/booking/settings-store";
import { firstName, maskEmail, phoneEnding, resolveTarget } from "@/lib/booking/target";

export const runtime = "nodejs";

/**
 * What the booking page needs before showing times: which kinds are open
 * and, for a personal link, just enough to greet the customer. Never returns
 * the customer's full contact details: a link can be forwarded.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const settings = await loadBookingSettings();
  const ready = bookingServiceConfigured() && bookingLinksConfigured();
  const kinds = BOOKING_KINDS.filter((k) => settings.kinds[k].enabled).map((k) => ({
    kind: k,
    label: KIND_TEXT[k].label,
    sub: KIND_TEXT[k].sub,
    minutes: settings.kinds[k].minutes,
  }));
  const base = { live: settings.live && ready && kinds.length > 0, kinds, horizonDays: settings.horizonDays, phone: BOOKING_PHONE };
  if (!base.live) return NextResponse.json({ data: { ...base, personal: null, installer: null } });

  try {
    const target = await resolveTarget(url.searchParams.get("t"), url.searchParams.get("i"));
    if ("error" in target) return NextResponse.json({ message: target.error }, { status: target.status });
    if (target.type === "lead") {
      const l = target.lead;
      return NextResponse.json({
        data: {
          ...base,
          personal: {
            firstName: firstName(l.customerName),
            emailHint: maskEmail(l.customerEmail),
            phoneEnding: phoneEnding(l.customerPhone),
            needs: { email: !l.customerEmail, phone: !l.customerPhone, address: !l.address },
          },
          installer: null,
        },
      });
    }
    if (target.type === "installer") {
      return NextResponse.json({ data: { ...base, personal: null, installer: { name: target.installerName } } });
    }
    return NextResponse.json({ data: { ...base, personal: null, installer: null } });
  } catch (e) {
    const status = e instanceof BookingError ? e.status : 502;
    return NextResponse.json({ message: "Booking is unavailable right now. Please call us." }, { status });
  }
}
