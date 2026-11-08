/**
 * Flat roofs read as sections (owner, 9 Nov 2026, 66 Frances St, Lidcombe:
 * "these are the roof lines"). A flat or low-pitch roof (under
 * DESIGN_RULES.flatRoofMaxPitchDeg) has no hips: it is one flat face, cut
 * into sections only along lines the image shows — the step between two
 * levels, the edge of a raised box, a fold. A line becomes a section border
 * when it runs from one roof line to another (an eave, or another section
 * border) and the image shows it most of the way; its ends are intersection
 * points. No visible line between two intersection points, no split.
 *
 * Longest lines first, so a step across the roof is cut before the short
 * sides of a box that end on it.
 */
type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

const M_PER_LAT = 111320;

export type SeenLine = { a: LatLng; b: LatLng; lengthM: number };

export type FlatSectionOptions = {
  /** A line must be seen at least this long (after joining its pieces). */
  minLengthM?: number;
  /** ...and reach the roof lines at both ends within this distance past what's seen, */
  reachM?: number;
  /** ...or be seen along at least this share of the run between them. */
  minSeenShare?: number;
  /** Each section at least this big, and at least this wide on average. */
  minPieceM2?: number;
  minWidthM?: number;
  maxSections?: number;
};

function frameOf(points: LatLng[]) {
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng0 = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const mLng = M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: (p: LatLng): XY => ({ x: (p.lng - lng0) * mLng, y: (p.lat - lat0) * M_PER_LAT }),
    toLL: (q: XY): LatLng => ({ lat: lat0 + q.y / M_PER_LAT, lng: lng0 + q.x / mLng }),
  };
}

const area = (r: XY[]) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) s += r[i].x * r[(i + 1) % r.length].y - r[(i + 1) % r.length].x * r[i].y;
  return Math.abs(s) / 2;
};

function inside(q: XY, r: XY[]): boolean {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i];
    const b = r[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function cross(p: XY, d: XY, a: XY, b: XY): { s: number } | null {
  const e = { x: b.x - a.x, y: b.y - a.y };
  const den = d.x * e.y - d.y * e.x;
  if (Math.abs(den) < 1e-9) return null;
  const w = { x: a.x - p.x, y: a.y - p.y };
  const s = (w.x * e.y - w.y * e.x) / den;
  const t = (w.x * d.y - w.y * d.x) / den;
  return t >= -1e-6 && t <= 1 + 1e-6 ? { s } : null;
}

const distToSeg = (q: XY, a: XY, b: XY) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy);
};

/** Puts q into every ring whose edge it lies on, so neighbouring sections share it. */
function insertPoint(rings: XY[][], q: XY): void {
  for (const r of rings) {
    if (r.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 0.02)) continue;
    for (let i = 0; i < r.length; i++) {
      if (distToSeg(q, r[i], r[(i + 1) % r.length]) < 0.02) {
        r.splice(i + 1, 0, q);
        break;
      }
    }
  }
}

/**
 * A line in the image comes back in pieces (broken by marks, doubled along
 * both edges of a step's shadow): pieces within 8° and 0.4 m of the same
 * line, with gaps under 1.5 m, are one line.
 */
export function joinLinePieces(segs: { a: XY; b: XY }[]): { a: XY; b: XY }[] {
  const out: { a: XY; b: XY }[] = [];
  const used = new Array(segs.length).fill(false);
  const order = segs.map((sg, i) => ({ i, len: Math.hypot(sg.b.x - sg.a.x, sg.b.y - sg.a.y) })).sort((x, y) => y.len - x.len);
  for (const { i } of order) {
    if (used[i]) continue;
    used[i] = true;
    const base = segs[i];
    const len = Math.hypot(base.b.x - base.a.x, base.b.y - base.a.y);
    if (len < 1e-6) continue;
    const d = { x: (base.b.x - base.a.x) / len, y: (base.b.y - base.a.y) / len };
    const n = { x: -d.y, y: d.x };
    const o = base.a;
    const along = (p: XY) => (p.x - o.x) * d.x + (p.y - o.y) * d.y;
    const off = (p: XY) => (p.x - o.x) * n.x + (p.y - o.y) * n.y;
    let lo = Math.min(along(base.a), along(base.b));
    let hi = Math.max(along(base.a), along(base.b));
    let offSum = 0;
    let offN = 0;
    for (let grew = true; grew; ) {
      grew = false;
      for (let k = 0; k < segs.length; k++) {
        if (used[k]) continue;
        const sg = segs[k];
        const sl = Math.hypot(sg.b.x - sg.a.x, sg.b.y - sg.a.y);
        if (sl < 1e-6) continue;
        if (Math.abs(((sg.b.x - sg.a.x) * d.x + (sg.b.y - sg.a.y) * d.y) / sl) < Math.cos((8 * Math.PI) / 180)) continue;
        if (Math.abs(off(sg.a)) > 0.4 || Math.abs(off(sg.b)) > 0.4) continue;
        const s0 = Math.min(along(sg.a), along(sg.b));
        const s1 = Math.max(along(sg.a), along(sg.b));
        if (s0 > hi + 1.5 || s1 < lo - 1.5) continue;
        lo = Math.min(lo, s0);
        hi = Math.max(hi, s1);
        offSum += (off(sg.a) + off(sg.b)) / 2;
        offN++;
        used[k] = true;
        grew = true;
      }
    }
    const shift = offN > 0 ? offSum / (offN + 1) : 0;
    out.push({
      a: { x: o.x + lo * d.x + shift * n.x, y: o.y + lo * d.y + shift * n.y },
      b: { x: o.x + hi * d.x + shift * n.x, y: o.y + hi * d.y + shift * n.y },
    });
  }
  return out;
}

/** The sections of one flat roof: its outline cut along the lines the image shows. */
export function flatRoofSections(
  outline: LatLng[],
  lines: SeenLine[],
  { minLengthM = 1.5, reachM = 1.2, minSeenShare = 0.6, minPieceM2 = 3, minWidthM = 1.0, maxSections = 12 }: FlatSectionOptions = {},
): LatLng[][] {
  if (outline.length < 3) return [outline];
  const { toXY, toLL } = frameOf(outline);
  const rings: XY[][] = [outline.map(toXY)];
  const why = (globalThis as { __flatWhy?: (w: unknown) => void }).__flatWhy;
  const joined = joinLinePieces(lines.map((l) => ({ a: toXY(l.a), b: toXY(l.b) })))
    .map((l) => ({ ...l, len: Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) }))
    .filter((l) => l.len >= minLengthM)
    .sort((x, y) => y.len - x.len);
  // Repeat until nothing more is cut: a short side can end on a line cut in an earlier pass.
  const done = new Set<number>();
  for (let pass = 0, cut = true; cut && pass < 6; pass++) {
    cut = false;
  for (const [li, l] of joined.entries()) {
    if (done.has(li)) continue;
    if (rings.length >= maxSections) break;
    const d = { x: (l.b.x - l.a.x) / l.len, y: (l.b.y - l.a.y) / l.len };
    const mid = { x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 };
    // Already a section border or eave (parallel within 10°, within 0.4 m)?
    const known = rings.some((r) =>
      r.some((p, i) => {
        const q = r[(i + 1) % r.length];
        const el = Math.hypot(q.x - p.x, q.y - p.y);
        return el > 0.5 && Math.abs((q.x - p.x) * d.y - (q.y - p.y) * d.x) / el < Math.sin((10 * Math.PI) / 180) && distToSeg(mid, p, q) < 0.4;
      }),
    );
    if (known) {
      done.add(li);
      continue;
    }
    const fi = rings.findIndex((r) => inside(mid, r));
    if (fi < 0) continue;
    const r = rings[fi];
    let lo: { s: number; i: number } | null = null;
    let hi: { s: number; i: number } | null = null;
    for (let i = 0; i < r.length; i++) {
      const c = cross(mid, d, r[i], r[(i + 1) % r.length]);
      if (!c) continue;
      if (c.s < 0 && (!lo || c.s > lo.s)) lo = { s: c.s, i };
      if (c.s > 0 && (!hi || c.s < hi.s)) hi = { s: c.s, i };
    }
    if (!lo || !hi || lo.i === hi.i) continue;
    // Seen nearly from one roof line to the other.
    const run = hi.s - lo.s;
    if ((-lo.s - l.len / 2 > reachM || hi.s - l.len / 2 > reachM) && l.len / run < minSeenShare) {
      why?.({ len: +l.len.toFixed(1), r: "reach", lo: +(-lo.s - l.len / 2).toFixed(1), hi: +(hi.s - l.len / 2).toFixed(1) });
      continue;
    }
    const p1 = { x: mid.x + lo.s * d.x, y: mid.y + lo.s * d.y };
    const p2 = { x: mid.x + hi.s * d.x, y: mid.y + hi.s * d.y };
    const n = r.length;
    const A: XY[] = [p1];
    for (let k = (lo.i + 1) % n; ; k = (k + 1) % n) {
      A.push(r[k]);
      if (k === hi.i) break;
    }
    A.push(p2);
    const B: XY[] = [p2];
    for (let k = (hi.i + 1) % n; ; k = (k + 1) % n) {
      B.push(r[k]);
      if (k === lo.i) break;
    }
    B.push(p1);
    const clean = (pc: XY[]) => pc.filter((p, i) => Math.hypot(p.x - pc[(i + 1) % pc.length].x, p.y - pc[(i + 1) % pc.length].y) > 0.02);
    const a = clean(A);
    const b = clean(B);
    const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (a.length < 3 || b.length < 3 || area(a) < minPieceM2 || area(b) < minPieceM2 || area(a) / chord < minWidthM || area(b) / chord < minWidthM) {
      why?.({ len: +l.len.toFixed(1), r: "piece" });
      continue;
    }
    rings.splice(fi, 1, a, b);
    insertPoint(rings, p1);
    insertPoint(rings, p2);
    why?.({ len: +l.len.toFixed(1), r: "CUT" });
    done.add(li);
    cut = true;
  }
  }
  return rings.map((r) => r.map(toLL));
}
