import { readFileSync, writeFileSync } from "fs";
import { layoutRoofPanels } from "@/lib/roof-design";
import { panelCorners } from "@/lib/roof-design/geometry";
import { longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
type LL = { lat: number; lng: number };
const f = process.argv[2];
const j = JSON.parse(readFileSync(f, "utf8"));
const toLL = (r: number[][]): LL[] => r.map(([lat, lng]) => ({ lat, lng }));
const outline = (j.outline as number[][][]).map(toLL);
const axis = longestEdgeAngleDegrees(outline[0]);
const faceSet = { source: "square-hip", faces: (j.faces as number[][][]).map((r) => ({ ring: toLL(r), eaveDeg: axis, pitchDeg: j.pitch })), interiorChecks: [], moved: 0, obstructions: (j.obstructions as number[][][]).map((r) => ({ kind: "spot", ring: toLL(r), sizePx: 0 })), gables: 0, evidence: [], determined: false } as never;
const dims = { heightM: 1.879, widthM: 1.045 };
const ctx = { pin: outline[0][0] } as never;
const out: Record<string, number[][][]> = {};
for (const [k, o, b] of [["P", "PORTRAIT", false], ["L", "LANDSCAPE", false], ["PB", "PORTRAIT", true], ["LB", "LANDSCAPE", true]] as const)
  out[k] = layoutRoofPanels(outline, faceSet, ctx, { orientation: o, dims, beautify: b }).map((p) => panelCorners(p, dims).map((q) => [q.lat, q.lng]));
j.panels = out;
writeFileSync(f, JSON.stringify(j));
console.log(f.split("/").slice(-2).join("/"), Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
