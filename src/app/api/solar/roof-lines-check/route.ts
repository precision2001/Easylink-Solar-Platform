import { NextResponse } from "next/server";
import { parseGeoTiffDsm, type GeoTiffRaster } from "@/utils/geotiff";
import { analyseRoofSnapshot, ROOF_SNAPSHOT, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines } from "@/lib/designer/roofLineCorrect";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";

/**
 * Server-side run of the Designs page roof-line pipeline for one pin — for
 * checking results on real Google data. Answers only requests made on the
 * server itself (not through the public proxy).
 */
export const runtime = "nodejs";

async function get(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: "no-store", headers: { Referer: "https://www.easylinksolar.com.au/" } });
  if (!res.ok) throw new Error(`${url.split("?")[0]} → ${res.status}`);
  return res.arrayBuffer();
}

export async function GET(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (
    !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ||
    request.headers.get("x-forwarded-for") ||
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
  const solarKey = process.env.GOOGLE_SOLAR_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const log: Record<string, unknown> = {};
  try {
    let mask: GeoTiffRaster | null = null;
    let dsm: GeoTiffRaster | null = null;
    if (solarKey) {
      const dl = await (
        await fetch(
          `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=35&view=FULL_LAYERS&requiredQuality=LOW&pixelSizeMeters=0.5&key=${solarKey}`,
        )
      ).json();
      log.solar = { quality: dl.imageryQuality, date: dl.imageryDate };
      if (dl.maskUrl) mask = await parseGeoTiffDsm(await get(`${dl.maskUrl}&key=${solarKey}`));
      if (dl.dsmUrl) dsm = await parseGeoTiffDsm(await get(`${dl.dsmUrl}&key=${solarKey}`));
      log.utm = dsm?.utm ?? null;
    }
    const sharp = (await import("sharp")).default;
    const png = await get(
      `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${ROOF_SNAPSHOT.zoom}&size=640x640&scale=2&maptype=satellite&format=png&key=${mapsKey}`,
    );
    const { data, info } = await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const geo: SnapshotGeo = {
      centerLat: lat,
      centerLng: lng,
      zoom: ROOF_SNAPSHOT.zoom,
      scale: ROOF_SNAPSHOT.scale,
      widthPx: info.width,
      heightPx: info.height,
    };
    const t0 = Date.now();
    const snap = analyseRoofSnapshot(new Uint8Array(data), geo, { pin: { lat, lng }, hint: mask });
    log.snapshot = { ms: Date.now() - t0, areaM2: snap?.areaM2 ?? null, mpp: snap?.metresPerPixel ?? null };
    if (!snap) return NextResponse.json(log);
    const straight = regularizeRoofOutlines(snap.outlines.map((o) => o.ring));
    const outline = regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring));
    const eaves = outline.flatMap((r) => fitEavesToMask(r, snap.mask).checks);
    const detected = detectRoofFaces(dsm, outline, mask);
    const faces = detected
      ? (() => {
          const rings = regularizeRoofOutlines(detected.map((f) => f.ring));
          return detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg, areaM2: f.areaM2 }));
        })()
      : splitRoofsIntoFaces(outline).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
    const corrected = correctInteriorLines(faces, outline, snap.luma);
    const dims = { heightM: 1.762, widthM: 1.134 };
    const portrait = generatePanelsForFaces(corrected.faces, dims, { orientation: "PORTRAIT", pitchDeg: 22.5 });
    const landscape = generatePanelsForFaces(corrected.faces, dims, { orientation: "LANDSCAPE", pitchDeg: 22.5 });
    return NextResponse.json({
      ...log,
      faceSource: detected ? "height-model" : "assumed-hip",
      eaves: eaves.map((c) => [c.status, c.offsetM]),
      faces: corrected.faces.map((f) => ({
        az: (f as { azimuthDeg?: number }).azimuthDeg,
        pitch: (f as { pitchDeg?: number }).pitchDeg,
        n: f.ring.length,
      })),
      interior: corrected.checks.map((c) => [c.status, c.offsetM]),
      moved: corrected.moved,
      panels: { portrait: portrait.length, landscape: landscape.length },
      outline,
      faceRings: corrected.faces.map((f) => f.ring),
      lines: corrected.checks.map((c) => ({ a: c.a, b: c.b, s: c.status })),
    });
  } catch (e) {
    return NextResponse.json({ ...log, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
