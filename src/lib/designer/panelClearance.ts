/**
 * Last check on every layout, whatever packed it: each panel's footprint
 * must sit inside one face and keep `clearM` (the 100 mm setback) from every
 * line of that face — eaves, hips, valleys, ridges — and from the roof
 * outline. Panels that don't are removed (25 Gilbert St, Oct 2026: panels
 * reached the east eave when faces ran past the saved outline).
 */
import type { SolarPanel } from "@/types/solar";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };
const M_PER_LAT = 111320;

/** Panel corners as the map draws them (seen from above: the slope side shortened by cos(pitch)). */
export function panelCornersLatLng(p: SolarPanel, dims: { heightM: number; widthM: number }): LatLng[] {
  const land = p.orientation === "LANDSCAPE";
  const hh = ((land ? dims.widthM : dims.heightM) / 2) * Math.cos(((p.slopeDegrees ?? 0) * Math.PI) / 180);
  const hw = (land ? dims.heightM : dims.widthM) / 2;
  const a = ((p.rotationDegrees ?? 0) * Math.PI) / 180;
  const co = Math.cos(a), si = Math.sin(a);
  const mL = M_PER_LAT * Math.cos((p.center.lat * Math.PI) / 180);
  return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => ({
    lat: p.center.lat + (x * si + y * co) / M_PER_LAT,
    lng: p.center.lng + (x * co - y * si) / mL,
  }));
}

function inside(p: XY, r: XY[]): boolean {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ins = !ins;
  }
  return ins;
}

function distToRing(p: XY, r: XY[]): number {
  let best = Infinity;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j], b = r[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

/** Points between the corners too, so a long edge crossing a line is caught. */
function edgePoints(c: XY[], perEdge = 4): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length];
    for (let k = 0; k < perEdge; k++) out.push({ x: a.x + ((b.x - a.x) * k) / perEdge, y: a.y + ((b.y - a.y) * k) / perEdge });
  }
  return out;
}

export function keepPanelsClear(
  panels: SolarPanel[],
  faces: LatLng[][],
  outlines: LatLng[][],
  dims: { heightM: number; widthM: number },
  { clearM = 0.1, toleranceM = 0.02 }: { clearM?: number; toleranceM?: number } = {},
): SolarPanel[] {
  if (panels.length === 0) return panels;
  const all = [...faces.flat(), ...outlines.flat()];
  if (all.length === 0) return panels;
  const lat0 = all.reduce((s, p) => s + p.lat, 0) / all.length;
  const lng0 = all.reduce((s, p) => s + p.lng, 0) / all.length;
  const mL = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  const xy = (p: LatLng): XY => ({ x: (p.lng - lng0) * mL, y: (p.lat - lat0) * M_PER_LAT });
  const F = faces.filter((f) => f.length >= 3).map((f) => f.map(xy));
  const O = outlines.filter((o) => o.length >= 3).map((o) => o.map(xy));
  const need = clearM - toleranceM;
  return panels.filter((p) => {
    const pts = edgePoints(panelCornersLatLng(p, dims).map(xy));
    // Inside one roof outline, clear of its edge.
    const inOutline = O.length === 0 || O.some((o) => pts.every((q) => inside(q, o) && distToRing(q, o) >= need));
    if (!inOutline) return false;
    // Inside one face, clear of all its lines.
    if (F.length === 0) return true;
    return F.some((f) => pts.every((q) => inside(q, f) && distToRing(q, f) >= need));
  });
}
