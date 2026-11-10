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

/** The square of the photo at (left, top), `side` px across, enlarged to `out` px. */
export function enlargeRegion(photo: Rgba, left: number, top: number, side: number, out: number): Rgba {
  const img: Rgba = { width: out, height: out, data: new Uint8Array(out * out * 4) };
  const k = side / out;
  for (let y = 0; y < out; y++)
    for (let x = 0; x < out; x++) {
      const [r, g, b] = sample(photo, left + x * k, top + y * k);
      const i = (y * out + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  return img;
}

/** Every coordinate of the buildings through `f` (points, borders, faces, obstructions). */
export function mapBuildings(buildings: RoofBuilding[], f: (x: number, y: number) => [number, number]): RoofBuilding[] {
  const ring = (r: [number, number][]) => r.map(([x, y]) => f(x, y));
  return buildings.map((b) => ({
    ...b,
    outline: ring(b.outline),
    points: b.points.map((p) => { const [x, y] = f(p.x, p.y); return { ...p, x, y }; }),
    faces: b.faces.map((fc) => ({ ...fc, ring: ring(fc.ring) })),
    obstructions: b.obstructions.map((o) => ({ ...o, ring: ring(o.ring) })),
  }));
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

export const CLOSEUP_CHECK_SYSTEM = `You check calculated roof corners on aerial close-ups. Each numbered tile is a ${ZOOM}x close-up (${TILE} px across) of one intersection point: the red ring marks the point, which was CALCULATED as the crossing of its measured lines (dashed yellow). Say whether the ring sits on the real tile corner or junction the photo shows (where the tiles of the faces meet, not the gutter or the shadow). Do not move anything. Reply with JSON only: {"points":[{"tile":1,"on":true},{"tile":2,"on":false,"why":"..."}]}`;

/** Marks every line at a point for a site check. */
function markPoint(b: RoofBuilding, id: string) {
  for (const l of b.lines) if (l.from === id || l.to === id) l.seen = "faint";
}

/**
 * The intersection rule's step 3: every calculated point on its close-up,
 * checked by Opus (never moved by eye). A point Opus says is off its corner
 * is marked for a site check. Returns how many were flagged.
 */
export async function checkByCloseups(model: ModelClient, photoPng: Buffer, buildings: RoofBuilding[], opts: { maxSheets?: number; only?: { b: number; id: string }[]; jsonIn: (t: string) => unknown }): Promise<{ flagged: number; usage: { inputTokens: number; outputTokens: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const photo = decodePng(photoPng);
  if (!photo) return { flagged: 0, usage };
  const wanted = opts.only ? new Set(opts.only.map((o) => `${o.b}|${o.id}`)) : null;
  const all: At[] = buildings.flatMap((b, bi) => b.points.filter((p) => !wanted || wanted.has(`${bi}|${p.id}`)).map((p) => ({ b: bi, id: p.id, x: p.x, y: p.y })));
  let flagged = 0;
  for (let i = 0, s = 0; i < all.length && s < (opts.maxSheets ?? 3); i += PER_SHEET, s++) {
    const pts = all.slice(i, i + PER_SHEET);
    const turn = await model.converse({ tier: "smart", effort: "high", maxTokens: 2000, system: CLOSEUP_CHECK_SYSTEM, messages: [{ role: "user", image: { format: "png", bytes: closeupSheet(photo, buildings, pts) }, text: `${pts.length} close-ups. Is each ring on its corner?` }] });
    usage.inputTokens += turn.usage.inputTokens;
    usage.outputTokens += turn.usage.outputTokens;
    const j = opts.jsonIn(turn.text) as { points?: { tile?: number; on?: boolean }[] } | null;
    for (const m of j?.points ?? []) {
      const p = pts[(m.tile ?? 0) - 1];
      if (p && m.on === false) {
        markPoint(buildings[p.b]!, p.id);
        flagged++;
      }
    }
  }
  return { flagged, usage };
}

export const POINTS_CONFIRM_TEXT = `These are the roof's intersection points ON THEIR OWN (numbered dots, no lines yet), calculated from the measured roof lines. Confirm each one before they are joined into lines: is it a real corner or junction of this roof (eave corner, hip or valley end, ridge end, step corner)? Also say if any corner of the roof has no point. Reply with JSON only: {"points":[{"n":1,"real":true},{"n":2,"real":false,"why":"..."}],"missing":"none, or where"}`;

/**
 * The intersection rule's step 5: the points alone, for confirmation before
 * they're joined into lines. A point Opus doesn't confirm is marked for a
 * site check; a missing corner is noted. Returns what Opus said.
 */
export async function confirmPoints(model: ModelClient, photoPng: Buffer, buildings: RoofBuilding[], opts: { jsonIn: (t: string) => unknown }): Promise<{ rejected: number; missing: string | null; usage: { inputTokens: number; outputTokens: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const img = decodePng(photoPng);
  if (!img) return { rejected: 0, missing: null, usage };
  const order: { b: number; id: string }[] = [];
  buildings.forEach((b, bi) => b.points.forEach((p) => {
    order.push({ b: bi, id: p.id });
    const n = order.length;
    for (let a = 0; a < 360; a += 4) {
      const x = Math.round(p.x + 5 * Math.cos((a * Math.PI) / 180)), y = Math.round(p.y + 5 * Math.sin((a * Math.PI) / 180));
      if (x >= 0 && y >= 0 && x < img.width && y < img.height) { const k = (y * img.width + x) * 4; img.data[k] = 0; img.data[k + 1] = 230; img.data[k + 2] = 255; }
    }
    drawNumber(img, n, Math.round(p.x + 7), Math.round(p.y - 12), 2);
  }));
  const turn = await model.converse({ tier: "smart", effort: "high", maxTokens: 2000, system: "You confirm roof intersection points on aerial photos. Reply with JSON only.", messages: [{ role: "user", image: { format: "png", bytes: encodePng(img) }, text: POINTS_CONFIRM_TEXT }] });
  usage.inputTokens += turn.usage.inputTokens;
  usage.outputTokens += turn.usage.outputTokens;
  const j = opts.jsonIn(turn.text) as { points?: { n?: number; real?: boolean }[]; missing?: string } | null;
  let rejected = 0;
  for (const m of j?.points ?? []) {
    const o = order[(m.n ?? 0) - 1];
    if (o && m.real === false) {
      markPoint(buildings[o.b]!, o.id);
      rejected++;
    }
  }
  const missing = typeof j?.missing === "string" && !/^\s*none\b/i.test(j.missing) ? j.missing.slice(0, 300) : null;
  return { rejected, missing, usage };
}
