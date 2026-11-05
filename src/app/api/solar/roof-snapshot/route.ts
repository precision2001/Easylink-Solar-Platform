import { NextResponse } from "next/server";
import { getSnapshotPng } from "@/lib/server/roofDataCache";

/**
 * Zoomed-in Google satellite image of one roof (Static Maps, zoom 21,
 * double-density, ~3 cm per pixel), served from our own origin so the
 * Designs page can analyse its pixels to find the roof lines.
 */
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
  // Cached by point and zoom (see roofDataCache).
  let png: Buffer | null;
  try {
    png = await getSnapshotPng(lat, lng, zoom);
  } catch (error) {
    console.error("roof-snapshot fetch error", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to reach Google Maps." }, { status: 502 });
  }
  if (!png) return NextResponse.json({ message: "Google Maps snapshot failed." }, { status: 502 });
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
