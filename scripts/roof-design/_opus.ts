import { readFileSync, writeFileSync } from "fs";
import { designRoof } from "@/lib/roof-design";
import { analyseSnapshotAt, fetchSnapshot, loadRoofContext, type Snapshot } from "@/lib/roof-design/server";
import { fromPx } from "@/lib/roof-design/aiFaces";
import { panelCorners } from "@/lib/roof-design/geometry";
import type { AiRoofTrace } from "@/lib/roof-design/engine";
const [k, lat, lng, zoom, file, out] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), Number(process.argv[5]), process.argv[6], process.argv[7]];
(async () => {
  const F = JSON.parse(readFileSync(file, "utf8"))[k];
  const geo = { centerLat: lat, centerLng: lng, zoom, scale: 2, widthPx: 960, heightPx: 960 };
  const L = (p: number[]) => fromPx(geo, p[0], p[1]);
  const trace: AiRoofTrace = {
    noRoof: false, flat: F.flat, outline: F.outline.map(L),
    faces: F.faces.map((f: [string, number | null, number[][]]) => ({ name: f[0], azimuthDeg: f[1] ?? undefined, ring: f[2].map(L) })),
    lines: F.lines.map((l: [number[], number[], string]) => ({ a: L(l[0]), b: L(l[1]), kind: "line", seen: l[2] === "f" ? "faint" : "clear" })),
    obstructions: F.obs.map((r: number[][]) => ({ kind: "vent", ring: r.map(L) })),
  };
  const ctx = await loadRoofContext({ lat, lng }, { kind: "google", key: process.env.GKEY! }, {});
  let image: Snapshot | null = null;
  const { analysis } = await analyseSnapshotAt(ctx, async (p, z) => (image = await fetchSnapshot(p, z, process.env.GKEY!)));
  ctx.snapshot = analysis;
  ctx.aiTrace = trace;
  const d = designRoof(ctx, { orientation: "best", beautify: process.env.BEAUTIFY !== "0" })!;
  const W = 256 * 2 ** zoom * 2;
  const merc = (la: number, ln: number) => { const s = Math.sin((la * Math.PI) / 180); return [((ln + 180) / 360) * W, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W]; };
  const [xc, yc] = merc(lat, lng);
  const px = (p: { lat: number; lng: number }) => { const [x, y] = merc(p.lat, p.lng); return [x - xc + 480, y - yc + 480]; };
  writeFileSync(out, JSON.stringify({ src: d.faceSet.source, faces: d.faceSet.faces.map((f) => f.ring.map(px)), outline: d.outline.map((r) => r.map(px)), panels: d.panels.map((p) => panelCorners(p, d.dims).map(px)), obs: d.faceSet.obstructions.map((o) => o.ring.map(px)), n: d.panels.length, kw: d.systemKw, o: d.orientation, notes: d.notes }));
  console.log(k, d.outlineSource, d.faceSet.source, d.faceSet.faces.length, "faces", d.panels.length, d.orientation, d.systemKw, "kW");
})();
