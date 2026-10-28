import { readFileSync, writeFileSync } from "fs";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";
import { eaveAlongOutline } from "@/lib/designer/roofLineCorrect";
const MPP = 0.030995156885054814, lat0 = -33.8537285, lng0 = 151.0505456, PIN = [484, 450];
const M = 111320, mL = M * Math.cos((lat0 * Math.PI) / 180);
const ll = (p: number[]) => ({ lat: lat0 - ((p[1] - PIN[1]) * MPP) / M, lng: lng0 + ((p[0] - PIN[0]) * MPP) / mL });
const px = (q: { lat: number; lng: number }) => [PIN[0] + ((q.lng - lng0) * mL) / MPP, PIN[1] - ((q.lat - lat0) * M) / MPP];
const R = JSON.parse(readFileSync(process.argv[2], "utf8"));
const outline = R.outline.map(ll);
const axis = -28;
const obstructions = (R.obstructions ?? []).map((o: number[][]) => o.map(ll));
const res: any = {};
for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
  res[orientation] = R.faces.map((f: any) => {
    const ring = f.ring.map(ll);
    // Row direction: the eave the face sits on; else square to its slope.
    // Rows run along the contour: square to the downslope bearing (compass b ->
    // degrees from east, counter-clockwise: -b). Exact, as bearings are snapped
    // to the walls; an "edge on the outline" guess picked hips on small faces.
    void eaveAlongOutline; void outline;
    const eave = -f.bearing;
    const panels = generatePanelsForFaces([{ ring, eaveDeg: eave, pitchDeg: f.pitch }], { heightM: 1.762, widthM: 1.134 }, { orientation, pitchDeg: f.pitch, obstructions }, axis);
    return { bearing: f.bearing, n: panels.length, panels: panels.map((pn) => {
      const hh = ((orientation === "LANDSCAPE" ? 1.134 : 1.762) / 2) * Math.cos(((pn.slopeDegrees ?? 0) * Math.PI) / 180);
      const hw = (orientation === "LANDSCAPE" ? 1.762 : 1.134) / 2;
      const a = ((pn.rotationDegrees ?? 0) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
      return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => px({ lat: pn.center.lat + (x * si + y * co) / M, lng: pn.center.lng + (x * co - y * si) / mL }));
    }) };
  });
  console.log(orientation, res[orientation].map((p: any) => `${p.bearing}:${p.n}`).join(" "), "total", res[orientation].reduce((s: number, p: any) => s + p.n, 0));
}
writeFileSync(process.argv[3], JSON.stringify(res));
