import { NextResponse } from "next/server";
import { bookingLinksConfigured, makeLinkToken } from "@/lib/booking/link-token";
import { whoAmI } from "@/lib/booking/portal-auth";
import { bookingServiceConfigured, BookingError, findLead, findOrCreateLead } from "@/lib/booking/service";

export const runtime = "nodejs";

/**
 * Customer portal > Book a time: the signed-in customer's own booking token,
 * so bookings attach to their EasyLink record. Creates the record if the
 * customer has an account but no enquiry yet.
 */
export async function GET() {
  const me = await whoAmI("customer");
  if (!me) return NextResponse.json({ message: "Please sign in again." }, { status: 401 });
  if (!bookingServiceConfigured() || !bookingLinksConfigured()) {
    return NextResponse.json({ message: "Online booking isn't available yet. Please call us." }, { status: 503 });
  }
  try {
    let lead = await findLead(me.phone, me.email);
    if (!lead && me.email && me.phone) {
      lead = (
        await findOrCreateLead(
          { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || "Customer", phone: me.phone, email: me.email, address: "", smsOk: false },
          "Customer portal - booking",
        )
      ).lead;
    }
    if (!lead) return NextResponse.json({ data: { token: null } });
    return NextResponse.json({ data: { token: makeLinkToken({ type: "lead", id: lead.id }) } });
  } catch (e) {
    const status = e instanceof BookingError ? e.status : 502;
    return NextResponse.json({ message: "Couldn't open booking. Please try again or call us." }, { status });
  }
}
