/**
 * Manual roof design (see docs/ROOF_DESIGN_PROCESS.md): lays panels out on a
 * roof whose corners and faces were read from a zoomed screenshot and checked
 * against its edges (check-lines.py). Uses the same packer as the Designs page.
 *
 *   npx esbuild scripts/roof-design/layout.ts --bundle --platform=node \
 *     --alias:@=./src --outfile=/tmp/layout.cjs && node /tmp/layout.cjs scripts/roof-design/roofs/85-bombay-st.json out.json
 */
import { readFileSync, writeFileSync } from "fs";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";

type Cfg = {
  pin: { lat: number; lng: number; px: [number, number] };
  metresPerPixel: number;
  points: Record<string, [number, number]>;
  faces: { name: string; ring: string[]; eave: [string, string]; pitchDeg: number }[];
  obstructions?: [number, number][][];
  mainAxis: [string, string];
  panel: { heightM: number; widthM: number; watts: number };
};
const cfg: Cfg = JSON.parse(readFileSync(process.argv[2], "utf8"));
const M = 111320;
const mL = M * Math.cos((cfg.pin.lat * Math.PI) / 180);
const ll = (p: [number, number]) => ({
  lat: cfg.pin.lat - ((p[1] - cfg.pin.px[1]) * cfg.metresPerPixel) / M,
  lng: cfg.pin.lng + ((p[0] - cfg.pin.px[0]) * cfg.metresPerPixel) / mL,
});
const px = (q: { lat: number; lng: number }): [number, number] => [
  cfg.pin.px[0] + ((q.lng - cfg.pin.lng) * mL) / cfg.metresPerPixel,
  cfg.pin.px[1] - ((q.lat - cfg.pin.lat) * M) / cfg.metresPerPixel,
];
// Image y runs down: convert a segment to degrees from east, counter-clockwise.
const deg = (a: [number, number], b: [number, number]) => (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
const P = cfg.points;
const axis = deg(P[cfg.mainAxis[0]], P[cfg.mainAxis[1]]);
const obstructions = (cfg.obstructions ?? []).map((o) => o.map(ll));
const result: Record<string, unknown> = {};
for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
  const perFace = cfg.faces.map((f) => {
    const panels = generatePanelsForFaces(
      [{ ring: f.ring.map((k) => ll(P[k])), eaveDeg: deg(P[f.eave[0]], P[f.eave[1]]), pitchDeg: f.pitchDeg }],
      cfg.panel,
      { orientation, pitchDeg: f.pitchDeg, obstructions },
      axis,
    );
    // Panel corners in image pixels, for drawing.
    const long = Math.max(cfg.panel.heightM, cfg.panel.widthM);
    const short = Math.min(cfg.panel.heightM, cfg.panel.widthM);
    const corners = panels.map((pn) => {
      const hh = ((orientation === "LANDSCAPE" ? short : long) / 2) * Math.cos(((pn.slopeDegrees ?? 0) * Math.PI) / 180);
      const hw = (orientation === "LANDSCAPE" ? long : short) / 2;
      const a = ((pn.rotationDegrees ?? 0) * Math.PI) / 180;
      const co = Math.cos(a);
      const si = Math.sin(a);
      return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) =>
        px({ lat: pn.center.lat + (x * si + y * co) / M, lng: pn.center.lng + (x * co - y * si) / mL }),
      );
    });
    return { face: f.name, n: panels.length, panels: corners };
  });
  const total = perFace.reduce((s, f) => s + f.n, 0);
  result[orientation] = perFace;
  console.log(orientation, perFace.map((f) => `${f.face}: ${f.n}`).join(", "), `total ${total} = ${((total * cfg.panel.watts) / 1000).toFixed(1)} kW`);
}
writeFileSync(process.argv[3], JSON.stringify(result));
