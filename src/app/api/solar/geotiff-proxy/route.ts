import { NextResponse } from "next/server";
import { getLayerBytes } from "@/lib/server/roofDataCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tiffUrl = searchParams.get("url");

  if (!tiffUrl) {
    return NextResponse.json(
      { message: "url query parameter is required." },
      { status: 400 },
    );
  }

  // From the address cache when this link was issued for a cached address.
  let bytes: Buffer | null;
  try {
    bytes = await getLayerBytes(tiffUrl);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 502;
    console.error("geotiff-proxy fetch error", error);
    return NextResponse.json({ message: `GeoTIFF proxy failed: ${status}` }, { status });
  }
  if (!bytes) return NextResponse.json({ message: "Unable to reach the GeoTIFF proxy." }, { status: 502 });
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: { "Content-Type": "image/tiff", "Cache-Control": "private, max-age=3600" },
  });
}
