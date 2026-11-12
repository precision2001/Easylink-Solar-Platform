import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/customers/backend";

/**
 * Public proxy — no sign-in. Backend: GET /pricing/equipment-validity.
 *
 * CEC validity of every battery range (valid / expiring / not valid, listing
 * end dates) for the Equipment validity pages. No prices or suppliers.
 */
export async function GET() {
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ message: "Pricing is not configured on this server." }, { status: 500 });
  }
  const path = "/pricing/equipment-validity";
  try {
    const res = await fetch(buildBackendUrl(backendBaseUrl, path), {
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
