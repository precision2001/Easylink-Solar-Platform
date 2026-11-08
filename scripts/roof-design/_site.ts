import { writeFileSync, mkdirSync } from "fs";
import { designRoof, layoutRoofPanels, ringAreaM2 } from "@/lib/roof-design";
import { analyseSnapshotAt, fetchSnapshot, loadRoofContext, type Snapshot } from "@/lib/roof-design/server";
import { panelCorners } from "@/lib/roof-design/geometry";
import { longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { flatSectionsFromLines, shadowStructureLines, shadowCastingEdge } from "@/lib/roof-design/flatSections";
const [lat, lng, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
type LL = { lat: number; lng: number };
(async () => {
  mkdirSync(out, { recursive: true });
  const parcel = JSON.parse(process.env.PARCEL!);
  const ctx = await loadRoofContext({ lat, lng }, { kind: "google", key: process.env.GKEY! }, { parcel: { ring: parcel, areaM2: ringAreaM2(parcel) } });
  let image: Snapshot | null = null;
  const { analysis } = await analyseSnapshotAt(ctx, async (p, z) => (image = await fetchSnapshot(p, z, process.env.GKEY!)));
  ctx.snapshot = analysis;
  const d = designRoof(ctx, { orientation: "best" });
  if (!d) { writeFileSync(`${out}/d.json`, JSON.stringify({ none: true })); console.log("no design"); return; }
  let faceSet = d.faceSet;
  let flat = false;
  if (d.pitchDeg < 5 && analysis) {
    flat = true;
    const steps = d.faceSet.obstructions.filter((o) => o.kind === "step");
    const faces = d.outline.flatMap((o) => {
      const sh = shadowStructureLines(analysis.luma, o, steps.map((s) => s.ring));
      return flatSectionsFromLines(o, sh.lines).sections.map((ring) => ({ ring, eaveDeg: longestEdgeAngleDegrees(o), pitchDeg: d.pitchDeg }));
    });
    // Shadows at their true shape: a wedge from the casting edge, not a rectangle.
    const obstructions = d.faceSet.obstructions.map((o) => {
      if (o.kind !== "step") return o;
      const ce = shadowCastingEdge(o.ring);
      if (!ce) return o;
      // The far corner: the shadow's vertex furthest from the casting edge, at the end nearest the eave (the wedge's wide end).
      const far = o.ring.reduce((b, p) => {
        const dd = (q: LL) => Math.abs((ce.b.lng - ce.a.lng) * (ce.a.lat - q.lat) - (ce.a.lng - q.lng) * (ce.b.lat - ce.a.lat));
        return dd(p) > dd(b) ? p : b;
      }, o.ring[0]);
      const da = Math.hypot(far.lat - ce.a.lat, far.lng - ce.a.lng), db = Math.hypot(far.lat - ce.b.lat, far.lng - ce.b.lng);
      return { ...o, ring: [ce.a, ce.b, da < db ? far : far] as LL[] };
    });
    faceSet = { ...d.faceSet, faces, obstructions };
  }
  const lay = (o: "PORTRAIT" | "LANDSCAPE", beautify = false) => layoutRoofPanels(d.outline, faceSet, ctx, { orientation: o, dims: d.dims, beautify });
  const opts = { P: lay("PORTRAIT"), L: lay("LANDSCAPE"), PB: lay("PORTRAIT", true), LB: lay("LANDSCAPE", true) };
  const ll = (p: LL) => [p.lat, p.lng];
  writeFileSync(`${out}/d.json`, JSON.stringify({
    flat, pitch: d.pitchDeg, area: d.roofAreaM2, outlineSource: d.outlineSource, faceSource: faceSet.source, watts: d.panelWatts,
    outline: d.outline.map((r) => r.map(ll)), faces: faceSet.faces.map((f) => f.ring.map(ll)), obstructions: faceSet.obstructions.map((o) => o.ring.map(ll)),
    panels: Object.fromEntries(Object.entries(opts).map(([k, ps]) => [k, ps.map((p) => panelCorners(p, d.dims).map(ll))])),
  }));
  console.log(d.outlineSource, flat ? "flat" : faceSet.source, faceSet.faces.length, "faces", d.pitchDeg.toFixed(1) + "°", Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, v.length])));
})();
