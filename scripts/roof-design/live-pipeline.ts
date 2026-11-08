// Runs the shared roof-design engine (src/lib/roof-design — the same code the
// Designs page, Quotes & Leads and the roof-design API run) for one pin,
// outside the browser, on Google's data. Writes the snapshot (snap.png) and
// the result in image pixels (pipeline.json) to the output folder, for
// drawing and checking (draw with live-draw.py).
//
// Usage: GKEY=... [PARCEL='[{lat,lng},...]'] [BEAUTIFY=1] [RELOOK=1] [SQ_DEBUG=1]
//        npx tsx scripts/roof-design/live-pipeline.ts <lat> <lng> <outDir>
import { writeFileSync, mkdirSync } from "fs";
import { snapshotBounds } from "@/lib/designer/roofSnapshot";
import { hipFacesForSquareRoof } from "@/lib/designer/squareRoof";
import { designRoof, layoutRoofPanels, relookReadings, ringAreaM2, type LatLngRing } from "@/lib/roof-design";
import { panelCorners } from "@/lib/roof-design/geometry";
import { analyseSnapshotAt, fetchSnapshot, loadRoofContext, toPx as toPxAt, type Snapshot } from "@/lib/roof-design/server";

const [lat, lng] = [Number(process.argv[2]), Number(process.argv[3])];
const out = process.argv[4];
mkdirSync(out, { recursive: true });
const key = process.env.GKEY!;

const dbg = globalThis as unknown as Record<string, unknown>;

(async () => {
  if (process.env.SQ_DEBUG) {
    dbg.__sqDebug = (name: string, g: Uint8Array, w: number, h: number) => writeFileSync(`${out}/sq_${name}.json`, JSON.stringify({ w, h, d: Array.from(g) }));
    dbg.__sqWhy = (w: unknown) => console.log("square", JSON.stringify(w));
  }
  if (process.env.CLUTTER_DEBUG) dbg.__clutterDebug = (m: Uint8Array, r: Uint8Array, w: number, h: number) => { const d = new Uint8Array(w * h); for (let i = 0; i < d.length; i++) d[i] = (r[i] ? 1 : 0) + (m[i] ? 2 : 0); writeFileSync(`${out}/clutter.bin`, d); writeFileSync(`${out}/clutter.json`, JSON.stringify({ w, h })); };
  if (process.env.ROOF_DEBUG) dbg.__roofDebug = (k: string, v: unknown) => console.log(k, JSON.stringify(v));
  const parcelRing: LatLngRing | null = process.env.PARCEL ? JSON.parse(process.env.PARCEL) : null;
  const ctx = await loadRoofContext({ lat, lng }, { kind: "google", key }, { parcel: parcelRing ? { ring: parcelRing, areaM2: ringAreaM2(parcelRing) } : null });
  let image: Snapshot | null = null;
  const fetchImage = async (pin: { lat: number; lng: number }, zoom: number) => (image = await fetchSnapshot(pin, zoom, key));
  const { analysis } = await analyseSnapshotAt(ctx, fetchImage);
  ctx.snapshot = analysis;
  if (!analysis || !image) {
    console.log("no snapshot roof");
    return;
  }
  const img: Snapshot = image;
  writeFileSync(`${out}/snap.png`, img.png);
  const segs = ctx.estimate?.roofSegments;
  if (analysis.squared && segs) {
    for (const r of [analysis.squared.ring, ...(analysis.squared.alternatives ?? [])]) {
      hipFacesForSquareRoof(r, segs, {
        luma: analysis.luma,
        report: (x) =>
          console.log("candidate", r.length, JSON.stringify({ diff: x.diff, gables: x.gables, area: x.areaRatio, seen: x.seen, lines: x.lines.map((l) => (l.offsetM === null ? "-" : Math.abs(l.offsetM) <= 0.4 ? "Y" : "o")).join("") })),
      });
    }
  }
  if (process.env.RELOOK) {
    const t1 = Date.now();
    console.log("relook readings", relookReadings(ctx).length, "ms", Date.now() - t1);
  }
  const t0 = Date.now();
  const d = designRoof(ctx, { beautify: Boolean(process.env.BEAUTIFY) });
  console.log("design ms", Date.now() - t0);
  if (!d) {
    console.log("no design");
    return;
  }
  // The other orientation's panels, for drawing both.
  const otherOrientation = d.orientation === "PORTRAIT" ? "LANDSCAPE" : "PORTRAIT";
  const panels = {
    [d.orientation]: d.panels,
    [otherOrientation]: layoutRoofPanels(d.outline, d.faceSet, ctx, { orientation: otherOrientation, beautify: Boolean(process.env.BEAUTIFY), dims: d.dims }),
  } as Record<string, typeof d.panels>;
  const toPx = (p: { lat: number; lng: number }) => toPxAt(img.geo, p);
  const ring = (r: LatLngRing) => r.map(toPx);
  const j = {
    areaM2: analysis.areaM2,
    mpp: analysis.metresPerPixel,
    bounds: snapshotBounds(img.geo),
    outlineSource: d.outlineSource,
    faceSource: d.faceSet.source,
    rawOutlines: analysis.outlines.map((o) => ring(o.ring)),
    squared: analysis.squared ? ring(analysis.squared.ring) : null,
    alts: (analysis.squared?.alternatives ?? []).map(ring),
    outline: d.outline.map(ring),
    faces: d.faceSet.faces.map((f) => ring(f.ring)),
    obstructions: d.faceSet.obstructions.map((o) => ring(o.ring)),
    counts: d.counts,
    panels: Object.fromEntries(Object.entries(panels).map(([o, ps]) => [o, ps.map((pn) => ({ c: toPx(pn.center), rot: pn.rotationDegrees, slope: pn.slopeDegrees, orientation: pn.orientation, corners: panelCorners(pn, d.dims).map(toPx) }))])),
  };
  writeFileSync(`${out}/pipeline.json`, JSON.stringify(j));
  console.log(
    JSON.stringify({
      areaM2: j.areaM2,
      outlineSource: d.outlineSource,
      faceSource: d.faceSet.source,
      outlines: j.outline.length,
      outlinePts: j.outline.map((r) => r.length),
      faces: j.faces.length,
      obstructions: j.obstructions.length,
      counts: j.counts,
      pitchDeg: d.pitchDeg,
      lines: `${d.lines.ok}/${d.lines.checked}`,
    }),
  );
})();
