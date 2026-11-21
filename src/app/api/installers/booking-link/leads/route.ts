import { NextResponse } from "next/server";
import { bookingLinkFor, bookingLinksConfigured } from "@/lib/booking/link-token";
import { canSeeLead, searchPortalLeads, suburbOf } from "@/lib/booking/portal-auth";

export const runtime = "nodejs";

/** The installer's own customers (the backend limits the search to them) and their booking links. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  if (!bookingLinksConfigured()) return NextResponse.json({ message: "Booking links aren't set up on the server yet." }, { status: 503 });
  // ?leadId=… → that customer's link, if the signed-in person can open the lead.
  const leadId = params.get("leadId");
  if (leadId) {
    if (!(await canSeeLead("installer", leadId))) return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    return NextResponse.json({ data: { link: bookingLinkFor({ type: "lead", id: leadId }) } });
  }
  const search = (params.get("search") ?? "").trim();
  if (search.length < 2) return NextResponse.json({ data: [] });
  const leads = await searchPortalLeads("installer", search);
  return NextResponse.json({
    data: leads.map((l) => ({ id: l.id, name: l.customerName ?? "Customer", area: suburbOf(l.address), link: bookingLinkFor({ type: "lead", id: l.id }) })),
  });
}
