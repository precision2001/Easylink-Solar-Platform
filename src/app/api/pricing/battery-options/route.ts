import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/customers/backend";

/**
 * Public proxy — no sign-in. Backend: GET /pricing/battery-options.
 *
 * Battery sizes by brand, range and phase (from the makers' datasheets), with
 * the inverters each size runs on, for the Design Platform's battery picker.
 * No prices, suppliers or price-book ids come back through here.
 */
export async function GET(request: Request) {
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ message: "Pricing is not configured on this server." }, { status: 500 });
  }
  const phase = new URL(request.url).searchParams.get("phase");
  const path = phase === "1" || phase === "3" ? `/pricing/battery-options?phase=${phase}` : "/pricing/battery-options";
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
