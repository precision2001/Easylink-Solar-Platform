import { NextResponse } from "next/server";
import { getFootprint } from "@/lib/server/roofDataCache";

export interface BuildingFootprintResult {
  ring: { lat: number; lng: number }[];
  distanceM: number;
  areaM2: number;
}


/**
 * Proxies the free Microsoft building-footprint lookup (see
 * building-footprint.service.ts on the backend). `data: null` is a normal,
 * successful response — it just means no footprint was found near this
 * point — not an error, so it's returned as 200 with `data: null` rather
 * than unwrapped/rejected like the Solar API proxies do.
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

  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  // Cached by address (see roofDataCache).
  const r = await getFootprint<BuildingFootprintResult>(la, ln);
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: r.status });
  return NextResponse.json({ success: true, data: r.data ?? null });
}
