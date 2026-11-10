import { decodePng, type Rgba, type TraceToDraw } from "./overlay.js";

/**
 * Which traced lines lie on an edge the photo actually shows (owner, 10 Nov
 * 2026: a trace whose lines weren't confirmed in the photo was kept, with a
 * border cut straight across the roof). Along each line, every 2 px, the
 * photo must change across it: a step in brightness (an edge, a parapet, a
 * wall) or a thin line darker or lighter than both sides (a hip, a ridge, a
 * seam). A line is seen when at least `minShare` of it does.
 */

const luma = (img: Rgba) => {
  const out = new Float32Array(img.width * img.height);
  for (let i = 0; i < out.length; i++) {
    const r = img.data[i * 4]!, g = img.data[i * 4 + 1]!, b = img.data[i * 4 + 2]!;
    out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
};

/** Mean brightness of the 3×3 pixels around (x, y), or NaN off the image. */
function at(l: Float32Array, w: number, h: number, x: number, y: number): number {
  const cx = Math.round(x), cy = Math.round(y);
  if (cx < 1 || cy < 1 || cx >= w - 1 || cy >= h - 1) return Number.NaN;
  let s = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += l[(cy + dy) * w + cx + dx]!;
  return s / 9;
}

export type LineSeen = { building: number; from: string; to: string; share: number; seen: boolean };

export function lineEvidence(png: Uint8Array, buildings: TraceToDraw[], opts: { minContrast?: number; minShare?: number } = {}): LineSeen[] | null {
  const img = decodePng(png);
  if (!img) return null;
  const L = luma(img);
  const W = img.width, H = img.height;
  const minC = opts.minContrast ?? 14;
  const minShare = opts.minShare ?? 0.55;
  const out: LineSeen[] = [];
  buildings.forEach((b, bi) => {
    const pts = new Map(b.points.map((p) => [p.id, p]));
    for (const ln of b.lines) {
      const a = pts.get(ln.from), c = pts.get(ln.to);
      if (!a || !c) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 8) continue;
      const nx = -dy / len, ny = dx / len;
      let n = 0, hit = 0;
      for (let s = 0.1 * len; s <= 0.9 * len; s += 2) {
        const x = a.x + (dx * s) / len, y = a.y + (dy * s) / len;
        let best = 0;
        for (const d of [2, 3, 4]) {
          const p = at(L, W, H, x + nx * d, y + ny * d);
          const q = at(L, W, H, x - nx * d, y - ny * d);
          const m = at(L, W, H, x, y);
          if (Number.isNaN(p) || Number.isNaN(q) || Number.isNaN(m)) continue;
          best = Math.max(best, Math.abs(p - q), Math.abs(2 * m - p - q) / 2);
        }
        n++;
        if (best >= minC) hit++;
      }
      if (!n) continue;
      const share = hit / n;
      out.push({ building: bi, from: ln.from, to: ln.to, share, seen: share >= minShare });
    }
  });
  return out;
}
