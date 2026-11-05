import { NextResponse } from "next/server";
import { getCombinedSolar } from "@/lib/server/roofDataCache";
import type { SolarEstimateResult } from "@/types/solar";

interface DataLayersResult {
  rgbUrl: string;
  maskUrl: string;
  annualFluxUrl: string;
  dsmUrl: string;
  imageryQuality: string;
}

export interface CombinedSolarResult {
  estimate: SolarEstimateResult;
  dataLayers: DataLayersResult;
}

/**
 * Combined estimate + data-layers-metadata in one call, so the client only
 * hits the backend's shared solarLimiter once instead of twice per page load.
 * See useSolarEstimate/useSolarLayers, which both read off this one fetch.
 */

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("latitude" in body) ||
    !("longitude" in body)
  ) {
    return NextResponse.json(
      { message: "latitude and longitude are required." },
      { status: 400 },
    );
  }

  const lat = Number((body as { latitude: unknown }).latitude);
  const lng = Number((body as { longitude: unknown }).longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ message: "latitude and longitude are required." }, { status: 400 });
  }
  // Cached by address with its layer files (see roofDataCache): the page and
  // the Roof Designer load an address from Google once.
  const r = await getCombinedSolar(lat, lng);
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: r.status });
  return NextResponse.json({ success: true, data: r.data as unknown as CombinedSolarResult }, { status: 200 });
}
