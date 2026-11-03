/**
 * Beautify Design — the optional "Beautify" button on the Designs page
 * (process step 9 in docs/ROOF_DESIGN_PROCESS.md; script version
 * scripts/roof-design/beautify.py, tried on UTS Block A, Haymarket).
 *
 * After the normal packer has placed the most panels a roof holds, this lays
 * each face out for looks instead:
 *  - one shared grid per face, so columns line up from row to row (the
 *    packer starts every row at the edge, which staggers rows);
 *  - panels kept only in full rectangles (ragged ends trimmed), largest
 *    first, and tiny blocks dropped, so there are no stray single panels;
 *  - the grid is centred on the face, for even margins;
 *  - on large (commercial) faces: strips of 2 rows with a 0.8 m walkway
 *    between strips and an access gap every 20 columns.
 * All the normal rules still hold: 100 mm clear of every roof line and
 * obstruction, one orientation, rows along the walls, panels in one face.
 */
import type { SolarPanel } from "@/types/solar";
import { DESIGN_RULES, type PanelOrientation } from "@/lib/designer/designRules";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

const M_LAT = 111320;
const mLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

export type BeautifyFace = { ring: LatLng[]; eaveDeg: number; pitchDeg?: number };

export type BeautifyOptions = {
  orientation: PanelOrientation;
  pitchDeg?: number;
  obstructions?: LatLng[][];
  setbackM?: number;
  gapM?: number;
  /** Faces larger than this (m², plan) get strips and walkways. */
  largeFaceM2?: number;
};

function inPoly(p: XY, r: XY[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i];
    const b = r[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function segsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const o = (p: XY, q: XY, r: XY) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Axis-aligned rectangle (in the rotated frame) fully inside ring `r`. */
function rectInside(x0: number, y0: number, x1: number, y1: number, r: XY[]): boolean {
  const cs = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  if (!cs.every((p) => inPoly(p, r))) return false;
  for (const p of r) if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) return false;
  for (let i = 0; i < 4; i++) {
    const a = cs[i], b = cs[(i + 1) % 4];
    for (let k = 0, j = r.length - 1; k < r.length; j = k++) if (segsCross(a, b, r[j], r[k])) return false;
  }
  return true;
}

/** Rectangle overlaps ring `r` at all. */
function rectHits(x0: number, y0: number, x1: number, y1: number, r: XY[]): boolean {
  const cs = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  if (cs.some((p) => inPoly(p, r))) return true;
  for (const p of r) if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return true;
  for (let i = 0; i < 4; i++) {
    const a = cs[i], b = cs[(i + 1) % 4];
    for (let k = 0, j = r.length - 1; k < r.length; j = k++) if (segsCross(a, b, r[j], r[k])) return true;
  }
  return false;
}

/** Largest all-filled rectangle in an occupancy grid (histogram method); full-height blocks win ties. */
function largestRect(grid: boolean[][]): { r0: number; r1: number; c0: number; c1: number; area: number } | null {
  const R = grid.length;
  const C = R ? grid[0].length : 0;
  const h = new Array(C).fill(0);
  let best: { r0: number; r1: number; c0: number; c1: number; area: number; score: number } | null = null;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) h[c] = grid[r][c] ? h[c] + 1 : 0;
    const st: number[] = [];
    for (let c = 0; c <= C; c++) {
      const cur = c === C ? 0 : h[c];
      while (st.length && h[st[st.length - 1]] >= cur) {
        const top = st.pop()!;
        const height = h[top];
        const left = st.length ? st[st.length - 1] + 1 : 0;
        const area = height * (c - left);
        const score = area * (height === R ? 2 : 1);
        if (height > 0 && (!best || score > best.score)) best = { r0: r - height + 1, r1: r, c0: left, c1: c - 1, area, score };
      }
      st.push(c);
    }
  }
  return best ? { r0: best.r0, r1: best.r1, c0: best.c0, c1: best.c1, area: best.area } : null;
}

function areaOf(r: XY[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function angleDiff(a: number, b: number): number {
  const d = (((a - b) % 180) + 180) % 180;
  return Math.min(d, 180 - d);
}

export function beautifyPanelsForFaces(
  faces: BeautifyFace[],
  panelDimensions: { heightM: number; widthM: number },
  opts: BeautifyOptions,
  mainAxisDeg?: number,
): SolarPanel[] {
  if (faces.length === 0) return [];
  const setback = opts.setbackM ?? DESIGN_RULES.edgeSetbackM;
  const gap = opts.gapM ?? DESIGN_RULES.panelGapM;
  const large = opts.largeFaceM2 ?? 300;
  const long = Math.max(panelDimensions.heightM, panelDimensions.widthM);
  const short = Math.min(panelDimensions.heightM, panelDimensions.widthM);
  const main = mainAxisDeg ?? faces[0].eaveDeg;
  const out: SolarPanel[] = [];

  faces.forEach((face, index) => {
    if (face.ring.length < 3) return;
    // Same alignment rule as the packer: rows along the main walls.
    let angle = face.eaveDeg;
    let bestDiff = Infinity;
    for (let k = -4; k <= 4; k++) {
      const cand = main + k * 90;
      const d = angleDiff(face.eaveDeg, cand);
      if (d < bestDiff) {
        bestDiff = d;
        if (d <= DESIGN_RULES.alignmentSnapDeg) angle = cand;
      }
    }
    const pitch = Math.min(Math.max(face.pitchDeg ?? opts.pitchDeg ?? 0, 0), 89);
    const cosP = Math.cos((pitch * Math.PI) / 180);
    const pw = opts.orientation === "LANDSCAPE" ? long : short;
    const ph = (opts.orientation === "LANDSCAPE" ? short : long) * cosP;
    const rowGap = gap * cosP;

    const refLat = face.ring.reduce((s, p) => s + p.lat, 0) / face.ring.length;
    const toXY = (p: LatLng): XY => ({ x: p.lng * mLng(refLat), y: p.lat * M_LAT });
    const ringXY = face.ring.map(toXY);
    const cx = ringXY.reduce((s, p) => s + p.x, 0) / ringXY.length;
    const cy = ringXY.reduce((s, p) => s + p.y, 0) / ringXY.length;
    const a = (-angle * Math.PI) / 180;
    const rot = (p: XY): XY => ({
      x: cx + (p.x - cx) * Math.cos(a) - (p.y - cy) * Math.sin(a),
      y: cy + (p.x - cx) * Math.sin(a) + (p.y - cy) * Math.cos(a),
    });
    const unrot = (p: XY): LatLng => {
      const b = -a;
      const x = cx + (p.x - cx) * Math.cos(b) - (p.y - cy) * Math.sin(b);
      const y = cy + (p.x - cx) * Math.sin(b) + (p.y - cy) * Math.cos(b);
      return { lat: y / M_LAT, lng: x / mLng(refLat) };
    };
    const R = ringXY.map(rot);
    const obs = (opts.obstructions ?? []).filter((o) => o.length >= 3).map((o) => o.map(toXY).map(rot));
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of R) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const isLarge = areaOf(R) > large;
    const rowsPerBlock = isLarge ? 2 : 1000;
    const colsPerBlock = isLarge ? 20 : 1000;
    const walk = isLarge ? 0.8 : 0;
    const minBlock = isLarge ? 8 : 2;
    const sx = pw + gap;
    const sy = ph + rowGap;

    const fits = (px: number, py: number) => {
      const e = setback;
      if (!rectInside(px - e, py - e, px + pw + e, py + ph + e, R)) return false;
      return !obs.some((o) => rectHits(px - e, py - e, px + pw + e, py + ph + e, o));
    };
    const colX = (i: number, ox: number) => ox + i * sx + Math.floor(i / colsPerBlock) * walk;
    const rowY = (j: number, oy: number) => oy + j * sy + Math.floor(j / rowsPerBlock) * walk;
    const nCols = Math.ceil((x1 - x0) / sx) + 2;
    const nRows = Math.ceil((y1 - y0) / sy) + 2;

    let best: { score: [number, number]; panels: XY[] } | null = null;
    const steps = 8;
    for (let ix = 0; ix < steps; ix++) {
      for (let iy = 0; iy < steps; iy++) {
        const ox = x0 - sx + (sx * ix) / steps;
        const oy = y0 - sy + (sy * iy) / steps;
        const cells: boolean[][] = [];
        for (let j = 0; j < nRows; j++) {
          cells.push([]);
          for (let i = 0; i < nCols; i++) cells[j].push(fits(colX(i, ox), rowY(j, oy)));
        }
        // Blocks of rowsPerBlock x colsPerBlock; keep full rectangles in each.
        const kept: XY[] = [];
        for (let bj = 0; bj * rowsPerBlock < nRows; bj++) {
          for (let bi = 0; bi * colsPerBlock < nCols; bi++) {
            const rs = bj * rowsPerBlock, cs = bi * colsPerBlock;
            const g = cells.slice(rs, rs + rowsPerBlock).map((row) => row.slice(cs, cs + colsPerBlock));
            for (let guard = 0; guard < 200; guard++) {
              const rect = largestRect(g);
              if (!rect || rect.area < minBlock) break;
              for (let r = rect.r0; r <= rect.r1; r++) {
                for (let c = rect.c0; c <= rect.c1; c++) {
                  g[r][c] = false;
                  kept.push({ x: colX(cs + c, ox), y: rowY(rs + r, oy) });
                }
              }
            }
          }
        }
        if (kept.length === 0) continue;
        // Tie-break: centred on the face (even margins).
        let mx0 = Infinity, mx1 = -Infinity, my0 = Infinity, my1 = -Infinity;
        for (const p of kept) {
          mx0 = Math.min(mx0, p.x); mx1 = Math.max(mx1, p.x + pw); my0 = Math.min(my0, p.y); my1 = Math.max(my1, p.y + ph);
        }
        const off = Math.abs(mx0 - x0 - (x1 - mx1)) + Math.abs(my0 - y0 - (y1 - my1));
        const score: [number, number] = [kept.length, -off];
        if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && score[1] > best.score[1])) best = { score, panels: kept };
      }
    }
    for (const p of best?.panels ?? []) {
      out.push({
        center: unrot({ x: p.x + pw / 2, y: p.y + ph / 2 }),
        orientation: opts.orientation,
        rotationDegrees: angle,
        ...(pitch > 0 ? { slopeDegrees: pitch } : {}),
        segmentIndex: index,
        yearlyEnergyDcKwh: 0,
      });
    }
  });
  return out;
}
