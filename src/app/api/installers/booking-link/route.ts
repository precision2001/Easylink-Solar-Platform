import { NextResponse } from "next/server";
import { bookingLinkFor, bookingLinksConfigured } from "@/lib/booking/link-token";
import { whoAmI } from "@/lib/booking/portal-auth";
import { loadBookingSettings } from "@/lib/booking/settings-store";

export const runtime = "nodejs";

/** Installer Portal > Booking link: the installer's own link. */
export async function GET() {
  const me = await whoAmI("installer");
  if (!me) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  if (!bookingLinksConfigured()) return NextResponse.json({ message: "Booking links aren't set up on the server yet." }, { status: 503 });
  const s = await loadBookingSettings();
  return NextResponse.json({
    data: {
      link: bookingLinkFor({ type: "installer", id: me.id }),
      live: s.live,
      kinds: Object.entries(s.kinds)
        .filter(([, k]) => k.enabled)
        .map(([kind]) => kind),
    },
  });
}
