import { NextResponse } from "next/server";

/**
 * Where the street is, for a house: the position of the nearest Google
 * Street View camera, which is always on a road. Proposals use it to find
 * the street side of the house (driveway, car, battery). Uses only Street
 * View's free metadata call — no photo is fetched.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ message: "Google Maps key is not configured." }, { status: 500 });
  try {
    const meta = await (
      await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat.toFixed(7)},${lng.toFixed(7)}&source=outdoor&radius=60&key=${key}`,
        { cache: "no-store", headers: { Referer: "https://www.easylinksolar.com.au/" } },
      )
    ).json();
    const loc = meta?.location as { lat?: number; lng?: number } | undefined;
    if (meta?.status !== "OK" || !loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
      return NextResponse.json({ message: "No street found here." }, { status: 404 });
    }
    return NextResponse.json(
      { data: { lat: loc.lat, lng: loc.lng } },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ message: "Unable to reach Google Street View." }, { status: 502 });
  }
}
