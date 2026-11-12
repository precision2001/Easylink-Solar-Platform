import { NextResponse } from "next/server";
import { getCadastre } from "@/lib/server/roofDataCache";

export interface CadastralParcelResult {
  ring: { lat: number; lng: number }[];
  areaM2: number;
  lotNumber: string | null;
  planLabel: string | null;
  state: "NSW" | "VIC" | "QLD" | "WA" | "TAS";
}


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

  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  // Cached by address (see roofDataCache).
  const r = await getCadastre<CadastralParcelResult>(la, ln);
  if (!r.ok) return NextResponse.json({ message: r.message }, { status: r.status });
  return NextResponse.json({ success: true, data: r.data ?? null });
}
