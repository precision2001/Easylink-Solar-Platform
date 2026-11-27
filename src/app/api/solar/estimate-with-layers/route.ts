import { NextResponse } from "next/server";
import { getCombinedSolar } from "@/lib/server/roofDataCache";
import { DEFAULT_PANEL } from "@/lib/roof-design/engine";
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
  // Google's Solar API doesn't cover this place (many regional towns): carry on
  // with assumed values so the roof can still be drawn, designed and saved.
  if (!r.ok && r.status === 404) {
    return NextResponse.json({ success: true, data: noCoverageEstimate(lat, lng) }, { status: 200 });
  }
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: r.status });
  return NextResponse.json({ success: true, data: r.data as unknown as CombinedSolarResult }, { status: 200 });
}

/**
 * Stand-in when Google has no solar data for a location. `estimated: true`
 * makes the page say the values are assumed; the roof outline, faces and
 * panels then come from the roof the user draws (or the AI trace), with the
 * EasyLink default panel size. No Google roof segments, panels or layers.
 */
function noCoverageEstimate(lat: number, lng: number): CombinedSolarResult {
  const d = 0.0002; // about 20 m around the pin
  // Yearly sun on a well-placed Australian roof: about 2,100 h in the tropics
  // down to about 1,650 h in Tasmania.
  const sunHours = Math.round(Math.min(2150, Math.max(1600, 2300 - 15 * Math.abs(lat))));
  const estimate: SolarEstimateResult = {
    estimated: true,
    center: { lat, lng },
    boundingBox: { sw: { lat: lat - d, lng: lng - d }, ne: { lat: lat + d, lng: lng + d } },
    imageryDate: "",
    maxPanelsCount: 0,
    maxArrayAreaM2: 0,
    maxSunshineHoursPerYear: sunHours,
    panelCapacityWatts: DEFAULT_PANEL.watts,
    panelDimensions: { ...DEFAULT_PANEL.dims },
    yearlyEnergyDcKwh: 0,
    co2SavingsKgPerYear: 0,
    wholeRoofAreaM2: 0,
    buildingAreaM2: 0,
    roofSegments: [],
    solarPanels: [],
  };
  return { estimate, dataLayers: { rgbUrl: "", maskUrl: "", annualFluxUrl: "", dsmUrl: "", imageryQuality: "NONE" } };
}
