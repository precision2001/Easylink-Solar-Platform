import { NextResponse } from "next/server";
import { designRoofAt, defaultDataSource } from "@/lib/roof-design/server";

/**
 * Server-side run of the shared roof-design engine for one pin — the same
 * steps the Designs page runs — for checking results on real Google data.
 * Answers only requests made on the server itself (not through the public
 * proxy). The public version is POST /api/roof-design.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (
    // nginx sends the public Host and X-Real-IP; Next adds its own
    // x-forwarded-for even locally, so that one can't be used.
    !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ||
    request.headers.get("x-real-ip")
  ) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ message: "lat and lng are required." }, { status: 400 });
  }
  try {
    const t0 = Date.now();
    const r = await designRoofAt({ lat, lng }, { source: defaultDataSource() });
    const snap = r.context.snapshot;
    const log = { ms: Date.now() - t0, snapshot: { areaM2: snap?.areaM2 ?? null, mpp: snap?.metresPerPixel ?? null } };
    if (r.status !== "READY") return NextResponse.json({ ...log, message: r.message });
    const d = r.design;
    return NextResponse.json({
      ...log,
      outlineSource: d.outlineSource,
      faceSource: d.faceSet.source,
      faces: d.faceSet.faces.map((f) => ({ az: f.azimuthDeg, pitch: f.pitchDeg, n: f.ring.length })),
      eavesAndLines: d.lines.items.map((c) => [c.status, c.offsetM]),
      moved: d.faceSet.moved,
      panels: { portrait: d.counts.PORTRAIT, landscape: d.counts.LANDSCAPE },
      outline: d.outline,
      faceRings: d.faceSet.faces.map((f) => f.ring),
      lines: d.lines.items.map((c) => ({ a: c.a, b: c.b, s: c.status })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
