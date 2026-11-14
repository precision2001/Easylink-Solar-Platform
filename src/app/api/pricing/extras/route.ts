import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/customers/backend";

/**
 * Public proxy — no sign-in. Backend: GET /pricing/extras.
 *
 * The price book's quote extras (backup gateway, racking, tilt frames, tile
 * roof adder ...) with the customer price of one unit inc GST, for the
 * staff and installer quote forms. No trade costs, margins or suppliers.
 */
export async function GET() {
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ message: "Pricing is not configured on this server." }, { status: 500 });
  }
  try {
    const res = await fetch(buildBackendUrl(backendBaseUrl, "/pricing/extras"), {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        ...(res.ok ? { "Cache-Control": "public, max-age=300" } : {}),
      },
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach the pricing service." }, { status: 502 });
  }
}
