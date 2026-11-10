import type { ChatMessage, ModelClient } from "../ai/model.js";
import { decodePng, drawLine, drawNumber, encodePng, type Rgba } from "./overlay.js";
import type { RoofBuilding } from "./faces.js";

/*
 * Two steps after the self-check (owner, 10 Nov 2026: "Opus can't draw simple
 * roof lines" — its points land 0.5-1 m off on low-contrast roofs):
 *
 * 1. Close-ups: every intersection point is shown to Opus enlarged 4× in its
 *    own tile, with the trace drawn and the point marked, and Opus moves it
 *    onto the real corner or junction (coarse-to-fine: a 1 m error is ~4 px
 *    on the whole photo, ~150 px in a tile).
 * 2. Edge snap: each line is moved onto the strongest straight edge within
 *    `maxM` (30 cm) of it, only where the photo's edge is clearly stronger
 *    there, and each point is re-placed where its (moved) lines meet, so a
 *    shared point stays one point. Never further than `maxM`.
 */

const TILE_SRC = 96; // photo pixels across a close-up
const ZOOM = 3;
const TILE = TILE_SRC * ZOOM; // 288 px
const COLS = 4;
const PER_SHEET = 16;

type At = { b: number; id: string; x: number; y: number };

function sample(img: Rgba, x: number, y: number): [number, number, number] {
  const cx = Math.min(img.width - 1, Math.max(0, x));
  const cy = Math.min(img.height - 1, Math.max(0, y));
  const x0 = Math.floor(cx), y0 = Math.floor(cy);
  const x1 = Math.min(img.width - 1, x0 + 1), y1 = Math.min(img.height - 1, y0 + 1);
  const fx = cx - x0, fy = cy - y0;
  const px = (xx: number, yy: number, c: number) => img.data[(yy * img.width + xx) * 4 + c]!;
  const out: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++)
    out[c] = (px(x0, y0, c) * (1 - fx) + px(x1, y0, c) * fx) * (1 - fy) + (px(x0, y1, c) * (1 - fx) + px(x1, y1, c) * fx) * fy;
  return out;
}

/** One sheet of close-ups: the tiles, numbered 1.., each centred on its point. */
export function closeupSheet(photo: Rgba, buildings: RoofBuilding[], pts: At[]): Buffer {
  const rows = Math.ceil(pts.length / COLS);
  const W = COLS * TILE + (COLS - 1) * 6;
  const H = rows * TILE + (rows - 1) * 6;
  const img: Rgba = { width: W, height: H, data: new Uint8Array(W * H * 4).fill(255) };
  pts.forEach((p, i) => {
    const ox = (i % COLS) * (TILE + 6);
    const oy = Math.floor(i / COLS) * (TILE + 6);
    // Each tile drawn on its own (so nothing spills into its neighbours), then copied in.
    const t: Rgba = { width: TILE, height: TILE, data: new Uint8Array(TILE * TILE * 4) };
    const x0 = p.x - TILE_SRC / 2, y0 = p.y - TILE_SRC / 2;
    for (let ty = 0; ty < TILE; ty++)
      for (let tx = 0; tx < TILE; tx++) {
        const [r, g, b] = sample(photo, x0 + tx / ZOOM, y0 + ty / ZOOM);
        const k = (ty * TILE + tx) * 4;
        t.data[k] = r; t.data[k + 1] = g; t.data[k + 2] = b; t.data[k + 3] = 255;
      }
    // The trace's lines leaving this point, thin and dashed, so the roof under them shows.
    const bld = buildings[p.b]!;
    const at = new Map(bld.points.map((q) => [q.id, q]));
    const toTile = (q: { x: number; y: number }): [number, number] => [(q.x - x0) * ZOOM, (q.y - y0) * ZOOM];
    for (const l of bld.lines) {
      if (l.from !== p.id && l.to !== p.id) continue;
      const other = at.get(l.from === p.id ? l.to : l.from);
      if (!other) continue;
      const from = toTile(p), to = toTile(other);
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      if (len < 1) continue;
      const reach = Math.min(len, TILE);
      drawLine(t, from, [from[0] + ((to[0] - from[0]) / len) * reach, from[1] + ((to[1] - from[1]) / len) * reach], 1, [255, 230, 0], true);
    }
    // The point: a red ring with a gap in the middle so the corner shows.
    const c = TILE / 2;
    for (let a = 0; a < 360; a += 3) {
      const x = Math.round(c + 10 * Math.cos((a * Math.PI) / 180)), y = Math.round(c + 10 * Math.sin((a * Math.PI) / 180));
      const k = (y * TILE + x) * 4;
      t.data[k] = 255; t.data[k + 1] = 0; t.data[k + 2] = 0;
    }
    drawNumber(t, i + 1, 6, 6, 3);
    for (let y = 0; y < TILE; y++) img.data.set(t.data.subarray(y * TILE * 4, (y + 1) * TILE * 4), ((oy + y) * W + ox) * 4);
  });
  return encodePng(img);
}

export const CLOSEUP_SYSTEM = `You place roof intersection points exactly on aerial close-ups. Each numbered tile is a ${ZOOM}x close-up (${TILE} px across = ${TILE_SRC} photo pixels) of one point of a roof trace: the red ring marks where the point is now, the dashed yellow lines are the trace's lines leaving it. Find the real corner or junction this point stands for (where the roof's own edges, ridges, hips or valleys meet, as the photo shows them) and say how far to move the point, in tile pixels (right and down are positive). If the ring is already on it, move 0,0. Never jump to a different corner. Reply with JSON only: {"points":[{"tile":1,"dx":0,"dy":0},...]}`;

/** Step 1: Opus moves each point onto the real corner in its close-up. Returns how many moved. */
export async function refineByCloseups(model: ModelClient, photoPng: Buffer, buildings: RoofBuilding[], opts: { maxSheets?: number; jsonIn: (t: string) => unknown }): Promise<{ moved: number; usage: { inputTokens: number; outputTokens: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const photo = decodePng(photoPng);
  if (!photo) return { moved: 0, usage };
  const all: At[] = buildings.flatMap((b, bi) => b.points.map((p) => ({ b: bi, id: p.id, x: p.x, y: p.y })));
  const sheets: At[][] = [];
  for (let i = 0; i < all.length && sheets.length < (opts.maxSheets ?? 3); i += PER_SHEET) sheets.push(all.slice(i, i + PER_SHEET));
  const moves = new Map<string, [number, number]>();
  for (const pts of sheets) {
    const sheet = closeupSheet(photo, buildings, pts);
    const messages: ChatMessage[] = [{ role: "user", image: { format: "png", bytes: sheet }, text: `${pts.length} close-ups. Place each point exactly.` }];
    const turn = await model.converse({ tier: "smart", effort: "high", maxTokens: 3000, system: CLOSEUP_SYSTEM, messages });
    usage.inputTokens += turn.usage.inputTokens;
    usage.outputTokens += turn.usage.outputTokens;
    const j = opts.jsonIn(turn.text) as { points?: { tile?: number; dx?: number; dy?: number }[] } | null;
    for (const m of j?.points ?? []) {
      const p = pts[(m.tile ?? 0) - 1];
      if (!p || typeof m.dx !== "number" || typeof m.dy !== "number") continue;
      const dx = m.dx / ZOOM, dy = m.dy / ZOOM;
      if (Math.hypot(dx, dy) < 0.5 || Math.hypot(dx, dy) > TILE_SRC / 2) continue; // no move, or off its tile
      moves.set(`${p.b}|${p.id}`, [p.x + dx, p.y + dy]);
    }
  }
  movePoints(buildings, moves);
  return { moved: moves.size, usage };
}

/** Moves points (key "building|id") and every ring corner that sat on them. */
export function movePoints(buildings: RoofBuilding[], moves: Map<string, [number, number]>) {
  buildings.forEach((b, bi) => {
    const shift: { from: [number, number]; to: [number, number] }[] = [];
    for (const p of b.points) {
      const to = moves.get(`${bi}|${p.id}`);
      if (!to) continue;
      shift.push({ from: [p.x, p.y], to });
      p.x = to[0];
      p.y = to[1];
    }
    if (!shift.length) return;
    const fix = (ring: [number, number][]) => ring.map((q): [number, number] => {
      const s = shift.find((m) => Math.hypot(m.from[0] - q[0], m.from[1] - q[1]) <= 2);
      return s ? [s.to[0], s.to[1]] : q;
    });
    b.outline = fix(b.outline);
    b.faces = b.faces.map((f) => ({ ...f, ring: fix(f.ring) }));
  });
}

const lumaOf = (img: Rgba) => {
  const l = new Float32Array(img.width * img.height);
  for (let i = 0; i < l.length; i++) l[i] = 0.299 * img.data[i * 4]! + 0.587 * img.data[i * 4 + 1]! + 0.114 * img.data[i * 4 + 2]!;
  return l;
};

/**
 * How strongly the photo shows a line (shifted `d` px along its normal) as an
 * edge or thin line: the mean contrast across it (1-2 px either side), and
 * the share of it at or above `minC`.
 */
function edgeScore(l: Float32Array, W: number, H: number, a: [number, number], c: [number, number], d: number, minC = 14): { mean: number; share: number } {
  const dx = c[0] - a[0], dy = c[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 8) return { mean: 0, share: 0 };
  const nx = -dy / len, ny = dx / len;
  const at = (x: number, y: number) => {
    const X = Math.round(x), Y = Math.round(y);
    return X < 0 || Y < 0 || X >= W || Y >= H ? Number.NaN : l[Y * W + X]!;
  };
  let n = 0, hit = 0, sum = 0;
  for (let s = 0.12 * len; s <= 0.88 * len; s += 2) {
    const x = a[0] + (dx * s) / len + nx * d, y = a[1] + (dy * s) / len + ny * d;
    let best = 0;
    for (const k of [1, 2]) {
      const p = at(x + nx * k, y + ny * k), q = at(x - nx * k, y - ny * k), m = at(x, y);
      if (Number.isNaN(p) || Number.isNaN(q) || Number.isNaN(m)) continue;
      best = Math.max(best, Math.abs(p - q), Math.abs(2 * m - p - q) / 2);
    }
    n++;
    sum += best;
    if (best >= minC) hit++;
  }
  return n ? { mean: sum / n, share: hit / n } : { mean: 0, share: 0 };
}

/** Step 2: lines onto the strongest edge within `maxPx`; points re-placed where their lines meet. Returns how many points moved. */
export function snapToEdges(photoPng: Buffer, buildings: RoofBuilding[], maxPx: number): number {
  const photo = decodePng(photoPng);
  if (!photo || maxPx < 1) return 0;
  const L = lumaOf(photo);
  const W = photo.width, H = photo.height;
  const moves = new Map<string, [number, number]>();
  buildings.forEach((b, bi) => {
    const at = new Map(b.points.map((p) => [p.id, [p.x, p.y] as [number, number]]));
    const shifts: { from: string; to: string; n: [number, number]; d: number }[] = [];
    for (const ln of b.lines) {
      const a = at.get(ln.from), c = at.get(ln.to);
      if (!a || !c) continue;
      const base = edgeScore(L, W, H, a, c, 0);
      let best = { d: 0, ...base };
      for (let d = -Math.floor(maxPx); d <= Math.floor(maxPx); d++) {
        if (d === 0) continue;
        const s = edgeScore(L, W, H, a, c, d);
        if (s.mean > best.mean + 1e-9) best = { d, ...s };
      }
      // Only onto an edge the photo clearly shows, and clearly stronger than where the line is.
      if (best.d === 0 || best.share < 0.55 || best.mean < base.mean * 1.25 + 2) continue;
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      shifts.push({ from: ln.from, to: ln.to, n: [-(c[1] - a[1]) / len, (c[0] - a[0]) / len], d: best.d });
    }
    for (const p of b.points) {
      const mine = shifts.filter((s) => s.from === p.id || s.to === p.id);
      if (!mine.length) continue;
      // Least squares: n_i · move = d_i for each moved line through the point.
      let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      for (const s of mine) {
        a11 += s.n[0] * s.n[0]; a12 += s.n[0] * s.n[1]; a22 += s.n[1] * s.n[1];
        b1 += s.n[0] * s.d; b2 += s.n[1] * s.d;
      }
      const det = a11 * a22 - a12 * a12;
      let mx: number, my: number;
      if (Math.abs(det) > 1e-3) {
        mx = (b1 * a22 - b2 * a12) / det;
        my = (a11 * b2 - a12 * b1) / det;
      } else {
        // one direction only (one line, or parallel lines): move along it
        const s = mine[0]!;
        mx = s.n[0] * s.d;
        my = s.n[1] * s.d;
      }
      if (Math.hypot(mx, my) > maxPx * 1.5) continue; // never further than the limit allows
      moves.set(`${bi}|${p.id}`, [p.x + mx, p.y + my]);
    }
  });
  movePoints(buildings, moves);
  return moves.size;
}
