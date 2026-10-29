// Runs the live Designs page roof pipeline for one pin, outside the browser,
// on the same Google data: zoom-21 snapshot -> roof outline -> faces -> lines
// -> panels. Writes the snapshot (snap.png) and the result (pipeline.json) to
// the output folder, for drawing and checking (draw with live-draw.py).
// Usage: GKEY=... npx tsx scripts/roof-design/live-pipeline.ts <lat> <lng> <outDir>
import { writeFileSync, mkdirSync } from "fs";
import sharp from "sharp";
import { parseGeoTiffDsm, type GeoTiffRaster } from "@/utils/geotiff";
import { analyseRoofSnapshot, ROOF_SNAPSHOT, snapshotBounds, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines, fillFacesOnRoofs } from "@/lib/designer/roofLineCorrect";
import { generatePanelsForFaces, longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { findRoofObstructions } from "@/lib/designer/roofObstructions";
import { beautifyPanelsForFaces } from "@/lib/designer/beautify";

const [lat, lng] = [Number(process.argv[2]), Number(process.argv[3])];
const out = process.argv[4]; mkdirSync(out, { recursive: true });
const key = process.env.GKEY!;
async function get(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(url.split("?")[0] + " " + r.status); return r.arrayBuffer(); }
(async () => {
  const dl = await (await fetch(`https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=35&view=FULL_LAYERS&requiredQuality=LOW&pixelSizeMeters=0.5&key=${key}`)).json();
  const mask: GeoTiffRaster | null = dl.maskUrl ? await parseGeoTiffDsm(await get(`${dl.maskUrl}&key=${key}`)) : null;
  const dsm: GeoTiffRaster | null = dl.dsmUrl ? await parseGeoTiffDsm(await get(`${dl.dsmUrl}&key=${key}`)) : null;
  const png = await get(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${ROOF_SNAPSHOT.zoom}&size=640x640&scale=2&maptype=satellite&format=png32&key=${key}`);
  writeFileSync(`${out}/snap.png`, Buffer.from(png));
  const { data, info } = await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const geo: SnapshotGeo = { centerLat: lat, centerLng: lng, zoom: ROOF_SNAPSHOT.zoom, scale: ROOF_SNAPSHOT.scale, widthPx: info.width, heightPx: info.height };
  const rgba = new Uint8Array(data);
  const parcel = process.env.PARCEL ? JSON.parse(process.env.PARCEL) : null;
  const snap = analyseRoofSnapshot(rgba, geo, { pin: { lat, lng }, hint: mask, dsm, parcel });
  if (!snap) { console.log("no snapshot roof"); return; }
  const dims = { heightM: 1.762, widthM: 1.134 };
  void rgba;
  const res = (() => {
        const straight = regularizeRoofOutlines(snap.outlines.map((o) => o.ring));
        const outline = regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring));
        const detected = detectRoofFaces(dsm, outline, mask);
        let faces: any[] = detected
          ? (() => { const rings = regularizeRoofOutlines(detected.map((f) => f.ring)); return detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg })); })()
          : splitRoofsIntoFaces(outline).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
        if (detected) faces = fillFacesOnRoofs(faces, outline, snap.mask, snap.metresPerPixel);
        const corrected = correctInteriorLines(faces, outline, snap.luma);
        const axis = longestEdgeAngleDegrees(outline[0]);
        const obs = process.env.NO_OBS ? [] : findRoofObstructions(snap.luma, corrected.faces.map((f: any) => f.ring));
        const obstructions = obs.map((o) => o.ring);
        const pack = process.env.BEAUTIFY ? beautifyPanelsForFaces : generatePanelsForFaces;
        const P = pack(corrected.faces, dims, { orientation: "PORTRAIT", pitchDeg: 25, obstructions }, axis);
        const L = pack(corrected.faces, dims, { orientation: "LANDSCAPE", pitchDeg: 25, obstructions }, axis);
        return { rawOutlines: snap.outlines.map((o) => o.ring), outline, faces: corrected.faces.map((f: any) => f.ring), obstructions, obsKinds: obs.map((o) => o.kind), panels: { PORTRAIT: P, LANDSCAPE: L } };
      })();
  const b = snapshotBounds(geo);
  const toPx = (p: { lat: number; lng: number }) => {
    const W = 256 * 2 ** geo.zoom * geo.scale, x = ((p.lng + 180) / 360) * W, s = Math.sin((p.lat * Math.PI) / 180), y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W;
    const xc = ((lng + 180) / 360) * W, sc = Math.sin((lat * Math.PI) / 180), yc = (0.5 - Math.log((1 + sc) / (1 - sc)) / (4 * Math.PI)) * W;
    return [x - xc + geo.widthPx / 2, y - yc + geo.heightPx / 2];
  };
  const ring = (r: any[]) => r.map(toPx);
  const panelPx = (pn: any) => pn.corners ? pn.corners.map(toPx) : null;
  const j = {
    areaM2: snap.areaM2, mpp: snap.metresPerPixel, bounds: b,
    rawOutlines: res.rawOutlines.map(ring), outline: res.outline.map(ring), faces: res.faces.map(ring),
    obstructions: (res.obstructions ?? []).map(ring),
    counts: { PORTRAIT: res.panels.PORTRAIT.length, LANDSCAPE: res.panels.LANDSCAPE.length },
    panels: Object.fromEntries(Object.entries(res.panels).map(([o, ps]: any) => [o, ps.map((pn: any) => ({ c: toPx(pn.center), rot: pn.rotationDegrees, slope: pn.slopeDegrees, orientation: pn.orientation }))])),
  };
  writeFileSync(`${out}/pipeline.json`, JSON.stringify(j));
  console.log(JSON.stringify({ areaM2: j.areaM2, outlines: j.outline.length, outlinePts: j.outline.map((r: any) => r.length), faces: j.faces.length, obstructions: j.obstructions.length, counts: j.counts }));
})();
