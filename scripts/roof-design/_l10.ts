import { writeFileSync, mkdirSync } from "fs";
import { designRoof, ringAreaM2 } from "@/lib/roof-design";
import { analyseSnapshotAt, fetchSnapshot, loadRoofContext, toPx, type Snapshot } from "@/lib/roof-design/server";
import { panelCorners } from "@/lib/roof-design/geometry";
import { interiorEdges } from "@/lib/designer/roofLineCheck";
const [lat, lng, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
(async () => {
  mkdirSync(out, { recursive: true });
  const parcel = process.env.PARCEL ? JSON.parse(process.env.PARCEL) : null;
  const footprint = process.env.FOOTPRINT ? JSON.parse(process.env.FOOTPRINT) : null;
  const ctx = await loadRoofContext({ lat, lng }, { kind: "google", key: process.env.GKEY! }, { parcel: parcel ? { ring: parcel, areaM2: ringAreaM2(parcel) } : null, footprint });
  let image: Snapshot | null = null;
  const { analysis } = await analyseSnapshotAt(ctx, async (p, z) => (image = await fetchSnapshot(p, z, process.env.GKEY!)));
  ctx.snapshot = analysis;
  const d = designRoof(ctx, { orientation: "best" });
  if (!analysis) image = await fetchSnapshot({ lat, lng }, 19, process.env.GKEY!);
  const img = image!;
  writeFileSync(`${out}/snap.png`, img.png);
  if (!d) { writeFileSync(`${out}/d.json`, JSON.stringify({ none: true })); console.log("no design"); return; }
  const px = (p: { lat: number; lng: number }) => toPx(img.geo, p);
  writeFileSync(`${out}/d.json`, JSON.stringify({
    outline: d.outline.map((r) => r.map(px)), outlineSource: d.outlineSource, faceSource: d.faceSet.source,
    faces: d.faceSet.faces.map((f) => f.ring.map(px)), lines: interiorEdges(d.faceSet.faces, d.outline).map(([a, b]) => [px(a), px(b)]),
    obstructions: d.faceSet.obstructions.map((o) => o.ring.map(px)),
    panels: d.panels.map((p) => panelCorners(p, d.dims).map(px)), orientation: d.orientation, watts: d.panelWatts, kw: d.systemKw,
    pitch: d.pitchDeg, area: d.roofAreaM2, determined: d.determined, notes: d.notes,
  }));
  console.log(d.outlineSource, d.faceSet.source, d.faceSet.faces.length, "faces", d.panels.length, "panels", d.pitchDeg.toFixed(1) + "°");
})();
