import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/customers/backend";

/**
 * Public proxy — no sign-in. Backend: POST /pricing/proposal.
 *
 * Returns customer prices for a design (total, tier and battery option
 * totals). The price book with trade costs stays in the backend; nothing
 * internal comes back through here.
 */
export async function POST(request: Request) {
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ message: "Pricing is not configured on this server." }, { status: 500 });
  }
  const body = await request.text();
  try {
    const res = await fetch(buildBackendUrl(backendBaseUrl, "/pricing/proposal"), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach the pricing service." }, { status: 502 });
  }
}
