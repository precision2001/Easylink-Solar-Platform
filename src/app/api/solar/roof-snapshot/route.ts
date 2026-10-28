import { NextResponse } from "next/server";

/**
 * Zoomed-in Google satellite image of one roof (Static Maps, zoom 21,
 * double-density, ~3 cm per pixel), served from our own origin so the
 * Designs page can analyse its pixels to find the roof lines.
 */
const STATIC_MAPS = "https://maps.googleapis.com/maps/api/staticmap";
const ALLOWED_ZOOMS = new Set([19, 20, 21]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const zoom = Number(searchParams.get("zoom") ?? 21);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  if (!ALLOWED_ZOOMS.has(zoom)) {
    return NextResponse.json({ message: "zoom must be 19, 20 or 21." }, { status: 400 });
  }
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ message: "Google Maps key is not configured." }, { status: 500 });
  }

  const params = new URLSearchParams({
    center: `${lat.toFixed(7)},${lng.toFixed(7)}`,
    zoom: String(zoom),
    size: "640x640",
    scale: "2",
    maptype: "satellite",
    format: "png",
    key,
  });
  let res: Response;
  try {
    res = await fetch(`${STATIC_MAPS}?${params.toString()}`, {
      cache: "no-store",
      headers: { Referer: "https://www.easylinksolar.com.au/" },
    });
  } catch (error) {
    console.error("roof-snapshot fetch error", error);
    return NextResponse.json({ message: "Unable to reach Google Maps." }, { status: 502 });
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) {
    return NextResponse.json({ message: `Google Maps snapshot failed: ${res.status}` }, { status: 502 });
  }
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
