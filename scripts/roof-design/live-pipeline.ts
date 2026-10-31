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
import { keepPanelsClear } from "@/lib/designer/panelClearance";
import { bestSquareRoof, hipFacesForSquareRoof } from "@/lib/designer/squareRoof";
import { beautifyPanelsForFaces } from "@/lib/designer/beautify";

const [lat, lng] = [Number(process.argv[2]), Number(process.argv[3])];
const out = process.argv[4]; mkdirSync(out, { recursive: true });
const key = process.env.GKEY!;
async function get(url: string) { const r = await fetch(url); if (!r.ok) throw new Error(url.split("?")[0] + " " + r.status); return r.arrayBuffer(); }
(async () => {
  const dl = await (await fetch(`https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${process.env.RADIUS ?? 35}&view=FULL_LAYERS&requiredQuality=LOW&pixelSizeMeters=0.5&key=${key}`)).json();
  const mask: GeoTiffRaster | null = dl.maskUrl ? await parseGeoTiffDsm(await get(`${dl.maskUrl}&key=${key}`)) : null;
  const dsm: GeoTiffRaster | null = dl.dsmUrl ? await parseGeoTiffDsm(await get(`${dl.dsmUrl}&key=${key}`)) : null;
  const png = await get(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${ROOF_SNAPSHOT.zoom}&size=640x640&scale=2&maptype=satellite&format=png32&key=${key}`);
  writeFileSync(`${out}/snap.png`, Buffer.from(png));
  const { data, info } = await sharp(Buffer.from(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const geo: SnapshotGeo = { centerLat: lat, centerLng: lng, zoom: ROOF_SNAPSHOT.zoom, scale: ROOF_SNAPSHOT.scale, widthPx: info.width, heightPx: info.height };
  const rgba = new Uint8Array(data);
  if (process.env.SQ_DEBUG) (globalThis as any).__sqDebug = (name: string, g: Uint8Array, w: number, h: number) => writeFileSync(`${out}/sq_${name}.json`, JSON.stringify({ w, h, d: Array.from(g) }));
  if (process.env.SQ_DEBUG) (globalThis as any).__sqWhy = (w: number) => console.log('square', JSON.stringify(w));
  const parcel = process.env.PARCEL ? JSON.parse(process.env.PARCEL) : null;
  const snap = analyseRoofSnapshot(rgba, geo, { pin: { lat, lng }, hint: mask, dsm, parcel });
  if (!snap) { console.log("no snapshot roof"); return; }
  const dims = { heightM: 1.762, widthM: 1.134 };
  void rgba;
  const res = (() => {
        const straight = regularizeRoofOutlines(snap.outlines.map((o) => o.ring));
        const segs = process.env.SEGS ? JSON.parse(process.env.SEGS) : null;
        const sw = (globalThis as any).__sqSweep;
        if (sw) {
          const why = (globalThis as any).__sqWhy; (globalThis as any).__sqWhy = undefined;
          for (const cellM of [0.2, 0.25, 0.33]) for (const maxColourDist of [3, 4, 6]) for (const openR of [2, 3, 4]) for (const jogM of [0.6, 1.0]) for (const grow of [true, false]) {
            const o = sw({ cellM, maxColourDist, openR, jogM, grow });
            if (!o) continue;
            let last: any = null; (globalThis as any).__sqWhy = (w: any) => { if (typeof w === "object" && w.diff !== undefined) last = w; };
            const hf = hipFacesForSquareRoof(o.ring, segs, { maxShareDiff: 9, minAreaRatio: 0 });
            (globalThis as any).__sqWhy = undefined;
            console.log("SW", JSON.stringify({ cellM, maxColourDist, openR, jogM, grow, pts: o.ring.length, area: Math.round(o.areaM2), diff: last?.diff, ratio: last ? +(last.fTotal / last.gTotal).toFixed(2) : null, gables: last?.gables, faces: hf?.length }));
          }
          (globalThis as any).__sqWhy = why;
        }
        const t0 = Date.now();
        const bestSq = !process.env.NO_SQUARE ? bestSquareRoof(snap.squared, segs, snap.luma) : null;
        console.log("bestSquareRoof ms", Date.now() - t0, "seen", bestSq?.seen?.toFixed(2), "gables", JSON.stringify(bestSq?.gables));
        if (process.env.RELOOK && snap.relook) { const t1 = Date.now(); const rs = snap.relook(); console.log("relook readings", rs.length, "ms", Date.now() - t1); }
        if (snap.squared) for (const r of [snap.squared.ring, ...(snap.squared.alternatives ?? [])]) hipFacesForSquareRoof(r, segs, { luma: snap.luma, report: (x) => console.log("candidate", r.length, JSON.stringify({ diff: x.diff, gables: x.gables, area: x.areaRatio, seen: x.seen, lines: x.lines.map((l) => (l.offsetM === null ? "-" : Math.abs(l.offsetM) <= 0.4 ? "Y" : "o")).join("") })) });
        const hip = bestSq?.faces ?? null;
        const outline = bestSq ? [bestSq.ring] : regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring));
        console.log("squared", !!snap.squared, snap.squared?.axisDeg, snap.squared?.areaM2, "hip faces", hip?.length ?? null);
        const detected = hip ? null : detectRoofFaces(dsm, outline, mask);
        let faces: any[] = hip ? hip : detected
          ? (() => { const rings = regularizeRoofOutlines(detected.map((f) => f.ring)); return detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg })); })()
          : splitRoofsIntoFaces(outline).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
        if (detected) faces = fillFacesOnRoofs(faces, outline, snap.mask, snap.metresPerPixel);
        const corrected = hip ? { faces: hip } : correctInteriorLines(faces, outline, snap.luma);
        const axis = longestEdgeAngleDegrees(outline[0]);
        const obs = process.env.NO_OBS ? [] : findRoofObstructions(snap.luma, corrected.faces.map((f: any) => f.ring));
        const obstructions = obs.map((o) => o.ring);
        const pack = process.env.BEAUTIFY ? beautifyPanelsForFaces : generatePanelsForFaces;
        const clear = (ps: any[]) => keepPanelsClear(ps, corrected.faces.map((f: any) => f.ring), outline, dims);
        const P = clear(pack(corrected.faces, dims, { orientation: "PORTRAIT", pitchDeg: 25, obstructions }, axis));
        const L = clear(pack(corrected.faces, dims, { orientation: "LANDSCAPE", pitchDeg: 25, obstructions }, axis));
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
    rawOutlines: res.rawOutlines.map(ring), squared: snap.squared ? ring(snap.squared.ring) : null, alts: (snap.squared?.alternatives ?? []).map(ring), outline: res.outline.map(ring), faces: res.faces.map(ring),
    obstructions: (res.obstructions ?? []).map(ring),
    counts: { PORTRAIT: res.panels.PORTRAIT.length, LANDSCAPE: res.panels.LANDSCAPE.length },
    panels: Object.fromEntries(Object.entries(res.panels).map(([o, ps]: any) => [o, ps.map((pn: any) => ({ c: toPx(pn.center), rot: pn.rotationDegrees, slope: pn.slopeDegrees, orientation: pn.orientation }))])),
  };
  writeFileSync(`${out}/pipeline.json`, JSON.stringify(j));
  console.log(JSON.stringify({ areaM2: j.areaM2, outlines: j.outline.length, outlinePts: j.outline.map((r: any) => r.length), faces: j.faces.length, obstructions: j.obstructions.length, counts: j.counts }));
})();
