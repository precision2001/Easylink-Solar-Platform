import { NextResponse } from "next/server";
import { inNsw, NSW_IMAGERY_ATTRIBUTION, nswImageryDate } from "@/lib/server/nswImagery";

export const runtime = "nodejs";

/** Whether NSW aerial imagery covers a point, when it was flown and its pixel size. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ message: "lat and lng are needed." }, { status: 400 });
  if (!inNsw(lat, lng)) return NextResponse.json({ data: { available: false } });
  const date = await nswImageryDate(lat, lng).catch(() => null);
  return NextResponse.json(
    { data: { available: true, ...(date ?? { capturedOn: null, resolutionCm: null, block: null }), attribution: NSW_IMAGERY_ATTRIBUTION } },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
