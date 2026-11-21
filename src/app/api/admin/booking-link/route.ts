import { NextResponse } from "next/server";
import { bookingLinksConfigured, siteUrl } from "@/lib/booking/link-token";
import { bookingServiceConfigured } from "@/lib/booking/service";
import { loadBookingSettings, saveBookingSettings } from "@/lib/booking/settings-store";
import { backendAuthedFetch } from "@/lib/server/backend-authed-fetch";

export const runtime = "nodejs";

/** Signed in to the Operations Portal as staff: the backend's own admin-only settings endpoint must accept the session. */
async function admin(): Promise<boolean> {
  const res = await backendAuthedFetch("admin", "/ai-bookings/settings");
  return res.ok;
}

/** Operations Portal > Booking link: the settings and the public link. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  return NextResponse.json({
    data: {
      settings: await loadBookingSettings(),
      publicUrl: `${siteUrl()}/book`,
      ready: { service: bookingServiceConfigured(), links: bookingLinksConfigured(), email: !!process.env.RESEND_API_KEY },
    },
  });
}

export async function PUT(req: Request) {
  if (!(await admin())) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ message: "Bad request." }, { status: 400 });
  try {
    return NextResponse.json({ data: { settings: await saveBookingSettings(body) } });
  } catch (e) {
    console.error("booking link: settings save failed", e);
    return NextResponse.json({ message: "Couldn't save the settings on the server." }, { status: 500 });
  }
}
