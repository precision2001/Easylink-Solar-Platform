import { NextResponse } from "next/server";

/**
 * Google Street View photo of the house from the street, aimed at the pin
 * (Street View Static API: with a lat/lng location and no heading, Google
 * points the camera at that location). Shown beside the satellite map on the
 * Designs page so gables, metal bay roofs, verandahs and antennas — hard to
 * read from above — can be checked (8 Temple St, Stanmore). The free
 * metadata call is made first so a location without Street View returns 404
 * instead of a grey "no imagery" picture.
 */
const BASE = "https://maps.googleapis.com/maps/api/streetview";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ message: "Google Maps key is not configured." }, { status: 500 });
  const location = `${lat.toFixed(7)},${lng.toFixed(7)}`;
  const headers = { Referer: "https://www.easylinksolar.com.au/" };
  try {
    const meta = await (
      await fetch(`${BASE}/metadata?location=${location}&source=outdoor&radius=60&key=${key}`, { cache: "no-store", headers })
    ).json();
    if (meta?.status !== "OK") {
      return NextResponse.json({ message: "No Street View here." }, { status: 404 });
    }
    // Turn the camera to face the house: Street View's own default heading
    // follows the road, which on a terrace shows the neighbours' fences
    // instead of this house's (process step 1: read the front fences).
    const params = new URLSearchParams({
      size: "640x400",
      source: "outdoor",
      fov: "75",
      pitch: "12",
      key,
    });
    const cam = meta.location as { lat?: number; lng?: number } | undefined;
    if (meta.pano_id && cam && Number.isFinite(cam.lat) && Number.isFinite(cam.lng)) {
      const dy = (lat - cam.lat!) * 111320;
      const dx = (lng - cam.lng!) * 111320 * Math.cos((cam.lat! * Math.PI) / 180);
      const heading = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
      params.set("pano", String(meta.pano_id));
      params.set("heading", heading.toFixed(1));
    } else {
      params.set("location", location);
      params.set("radius", "60");
    }
    const res = await fetch(`${BASE}?${params.toString()}`, { cache: "no-store", headers });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) {
      return NextResponse.json({ message: `Street View failed: ${res.status}` }, { status: 502 });
    }
    return new NextResponse(await res.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=86400",
        // Shown on the page: when the photo was taken.
        "X-Street-View-Date": String(meta.date ?? ""),
      },
    });
  } catch (error) {
    console.error("street-view fetch error", error);
    return NextResponse.json({ message: "Unable to reach Google Street View." }, { status: 502 });
  }
}
