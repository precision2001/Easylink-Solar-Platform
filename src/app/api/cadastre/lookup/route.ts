import { NextResponse } from "next/server";
import { buildBackendUrl, extractMessage } from "@/lib/customers/backend";

export interface CadastralParcelResult {
  ring: { lat: number; lng: number }[];
  areaM2: number;
  lotNumber: string | null;
  planLabel: string | null;
  state: "NSW" | "VIC" | "QLD" | "WA" | "TAS";
}

const LOOKUP_PATH = "/cadastre/lookup";

/**
 * Proxies the free NSW cadastre lookup (see cadastre.service.ts on the
 * backend). `data: null` is a normal, successful response — no parcel found
 * (outside NSW, or no match) — not an error, so it's returned as 200 with
 * `data: null` rather than unwrapped/rejected.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { message: "lat and lng are required." },
      { status: 400 },
    );
  }

  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;

  if (!backendBaseUrl) {
    return NextResponse.json(
      { message: "Server configuration is missing BACKEND_API_BASE_URL." },
      { status: 500 },
    );
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(
      buildBackendUrl(
        backendBaseUrl,
        `${LOOKUP_PATH}?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      ),
      { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" },
    );
  } catch (error) {
    console.error("cadastre lookup fetch error", error);
    return NextResponse.json(
      { message: "Unable to reach the cadastre service." },
      { status: 502 },
    );
  }

  const responseText = await backendResponse.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        message: extractMessage(
          payload,
          "Cadastre lookup failed. Please try again.",
        ),
      },
      { status: backendResponse.status },
    );
  }

  const record = (payload ?? {}) as { data?: CadastralParcelResult | null };
  return NextResponse.json({ success: true, data: record.data ?? null });
}
