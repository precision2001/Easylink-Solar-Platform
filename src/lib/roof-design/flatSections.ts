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
import type { GeoTiffRaster } from "@/utils/geotiff";
import { sampler } from "./junctions";

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

/**
 * Sections of a flat roof read from the visible lines and their visible
 * intersections (owner's rule, 9 Nov 2026: "always identify the visible lines
 * and visible intersections"). Each visible line is extended (up to `reachM`)
 * to where it meets another visible line or the border; the meeting points
 * are the intersections; lines are cut at them; loose ends that meet nothing
 * are dropped; the closed shapes the lines make are the sections.
 * Returns the sections and the intersection points (where 3+ lines meet).
 */
export function flatSectionsFromLines(
  outline: LatLng[],
  lines: SeenLine[],
  { minLengthM = 1.5, reachM = 1.2, minPieceM2 = 3 }: { minLengthM?: number; reachM?: number; minPieceM2?: number } = {},
): { sections: LatLng[][]; intersections: LatLng[] } {
  if (outline.length < 3) return { sections: [outline], intersections: [] };
  const { toXY, toLL } = frameOf(outline);
  const ring = outline.map(toXY);
  const segs: { a: XY; b: XY; border: boolean }[] = ring.map((p, i) => ({ a: p, b: ring[(i + 1) % ring.length], border: true }));
  const seen = joinLinePieces(lines.map((l) => ({ a: toXY(l.a), b: toXY(l.b) }))).filter((l) => Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) >= minLengthM);
  // Drop lines along the border (gutters, eave shadows): within 0.6 m and parallel.
  const nearBorder = (l: { a: XY; b: XY }) => {
    const len = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);
    const d = { x: (l.b.x - l.a.x) / len, y: (l.b.y - l.a.y) / len };
    return segs.some((s) => {
      const el = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
      return el > 0.5 && Math.abs((s.b.x - s.a.x) * d.y - (s.b.y - s.a.y) * d.x) / el < Math.sin((10 * Math.PI) / 180) && distToSeg({ x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 }, s.a, s.b) < 0.6;
    });
  };
  const inner = seen.filter((l) => !nearBorder(l) && inside({ x: (l.a.x + l.b.x) / 2, y: (l.a.y + l.b.y) / 2 }, ring));
  const dbg = (globalThis as { __flatDbg?: (k: string, v: unknown) => void }).__flatDbg;
  dbg?.("seen", seen.map((l) => [toLL(l.a), toLL(l.b)]));
  dbg?.("inner", inner.map((l) => [toLL(l.a), toLL(l.b)]));
  // Extend each end to the nearest crossing with another line or the border, within reach.
  const all = () => [...segs, ...inner.map((l) => ({ ...l, border: false }))];
  for (const l of inner) {
    for (const end of ["a", "b"] as const) {
      const p = l[end];
      const q = end === "a" ? l.b : l.a;
      const len = Math.hypot(p.x - q.x, p.y - q.y);
      const d = { x: (p.x - q.x) / len, y: (p.y - q.y) / len };
      let best: number | null = null;
      for (const s of all()) {
        if (s.a === l.a && s.b === l.b) continue;
        const c = cross(p, d, s.a, s.b);
        if (c && c.s > -0.3 && c.s <= reachM && (best === null || Math.abs(c.s) < Math.abs(best))) best = c.s;
      }
      if (best !== null) l[end] = { x: p.x + best * d.x, y: p.y + best * d.y };
    }
  }
  // Cut every segment at every crossing; merge points within 15 cm.
  const pts: XY[] = [];
  const pid = (p: XY) => {
    for (let i = 0; i < pts.length; i++) if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < 0.15) return i;
    pts.push(p);
    return pts.length - 1;
  };
  const edges = new Set<string>();
  const ek = (i: number, j: number) => (i < j ? `${i}|${j}` : `${j}|${i}`);
  const list = all();
  for (const s of list) {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
    if (len < 1e-6) continue;
    const d = { x: (s.b.x - s.a.x) / len, y: (s.b.y - s.a.y) / len };
    const ts = [0, len];
    for (const o of list) {
      if (o === s) continue;
      const c = cross(s.a, d, o.a, o.b);
      if (c && c.s > 0.05 && c.s < len - 0.05) ts.push(c.s);
      // A line ending on this one (within 15 cm) cuts it there too.
      for (const e of [o.a, o.b]) {
        const t = (e.x - s.a.x) * d.x + (e.y - s.a.y) * d.y;
        if (t > 0.05 && t < len - 0.05 && distToSeg(e, s.a, s.b) < 0.15) ts.push(t);
      }
    }
    ts.sort((x, y) => x - y);
    for (let k = 0; k + 1 < ts.length; k++) {
      if (ts[k + 1] - ts[k] < 0.05) continue;
      const i = pid({ x: s.a.x + ts[k] * d.x, y: s.a.y + ts[k] * d.y });
      const j = pid({ x: s.a.x + ts[k + 1] * d.x, y: s.a.y + ts[k + 1] * d.y });
      if (i !== j) edges.add(ek(i, j));
    }
  }
  // Loose ends (a line that meets nothing at one end) are dropped, repeatedly.
  const nbr = () => {
    const m = new Map<number, Set<number>>();
    for (const e of edges) {
      const [i, j] = e.split("|").map(Number);
      if (!m.has(i)) m.set(i, new Set());
      if (!m.has(j)) m.set(j, new Set());
      m.get(i)!.add(j);
      m.get(j)!.add(i);
    }
    return m;
  };
  for (let changed = true; changed; ) {
    changed = false;
    for (const [i, ns] of nbr()) {
      if (ns.size === 1) {
        edges.delete(ek(i, [...ns][0]));
        changed = true;
      }
    }
  }
  dbg?.("kept", [...edges].map((e) => e.split("|").map((k) => toLL(pts[Number(k)]))));
  // Closed shapes: walk each edge side, always taking the next edge clockwise.
  const N = nbr();
  const used = new Set<string>();
  const faces: number[][] = [];
  const ang = (i: number, j: number) => Math.atan2(pts[j].y - pts[i].y, pts[j].x - pts[i].x);
  for (const e of edges) {
    const [i0, j0] = e.split("|").map(Number);
    for (const [u0, v0] of [[i0, j0], [j0, i0]]) {
      if (used.has(`${u0}>${v0}`)) continue;
      const face: number[] = [];
      let u = u0;
      let v = v0;
      for (let guard = 0; guard < 500; guard++) {
        used.add(`${u}>${v}`);
        face.push(u);
        // At v, coming from u: the next edge clockwise from the way back.
        const back = ang(v, u);
        let best: number | null = null;
        let bestTurn = Infinity;
        for (const w of N.get(v) ?? []) {
          if (w === u && (N.get(v)?.size ?? 0) > 1) continue;
          let t = back - ang(v, w);
          while (t <= 0) t += 2 * Math.PI;
          if (t < bestTurn) {
            bestTurn = t;
            best = w;
          }
        }
        if (best === null) break;
        u = v;
        v = best;
        if (u === u0 && v === v0) break;
      }
      faces.push(face);
    }
  }
  const signed = (f: number[]) => {
    let s = 0;
    for (let k = 0; k < f.length; k++) s += pts[f[k]].x * pts[f[(k + 1) % f.length]].y - pts[f[(k + 1) % f.length]].x * pts[f[k]].y;
    return s / 2;
  };
  // The outside of the roof is the one loop with the opposite turn (largest |area|).
  const orient = Math.sign(signed(faces.reduce((b, f) => (Math.abs(signed(f)) > Math.abs(signed(b)) ? f : b), faces[0] ?? [])));
  const sections = faces.filter((f) => f.length >= 3 && Math.sign(signed(f)) !== orient && Math.abs(signed(f)) >= minPieceM2);
  if (sections.length === 0) return { sections: [outline], intersections: [] };
  const deg = nbr();
  const onBorder = (p: XY) => segs.some((s) => distToSeg(p, s.a, s.b) < 0.05);
  const intersections = [...deg.entries()].filter(([i, ns]) => ns.size >= 3 || (ns.size >= 3 && onBorder(pts[i]))).map(([i]) => toLL(pts[i]));
  return { sections: sections.map((f) => f.map((k) => toLL(pts[k]))), intersections };
}

/**
 * Visible lines on a flat roof, along and across the walls (owner's rule:
 * visible lines first). The general line finder sees the dark shadow edges
 * of a white metal roof but not the thin light lines of a box edge or a
 * section step. Here every line parallel to a wall is scored at each point by
 * how much it stands out from the roof right beside it (a brightness step or
 * a thin light/dark line, against the median of the roof 0.3–0.9 m either
 * side). Where it stands out for at least `minLengthM` it is a visible line.
 */
export function flatRoofAxisLines(
  luma: GeoTiffRaster,
  ring: LatLng[],
  axisDeg: number,
  { insetM = 0.25, minLengthM = 1.0, minRatio = 1.8, minResponse = 6, gapM = 0.3 }: { insetM?: number; minLengthM?: number; minRatio?: number; minResponse?: number; gapM?: number } = {},
): SeenLine[] {
  const { toXY, toLL } = frameOf(ring);
  const r = ring.map(toXY);
  const at = sampler(luma, toLL);
  const h = 0.08;
  const out: SeenLine[] = [];
  const dist = (q: XY) => Math.min(...r.map((p, i) => distToSeg(q, p, r[(i + 1) % r.length])));
  for (const deg of [axisDeg, axisDeg + 90]) {
    const t = (deg * Math.PI) / 180;
    const u = { x: Math.cos(t), y: Math.sin(t) };
    const n = { x: -u.y, y: u.x };
    const along = r.map((p) => p.x * u.x + p.y * u.y);
    const across = r.map((p) => p.x * n.x + p.y * n.y);
    const [a0, a1] = [Math.min(...along), Math.max(...along)];
    const [o0, o1] = [Math.min(...across), Math.max(...across)];
    const dO = 0.05;
    const dA = 0.1;
    const NO = Math.ceil((o1 - o0) / dO) + 1;
    const NA = Math.ceil((a1 - a0) / dA) + 1;
    const resp = new Float32Array(NO * NA).fill(NaN);
    for (let i = 0; i < NO; i++) {
      for (let j = 0; j < NA; j++) {
        const o = o0 + i * dO;
        const s = a0 + j * dA;
        const p = { x: s * u.x + o * n.x, y: s * u.y + o * n.y };
        if (!inside(p, r) || dist(p) < insetM) continue;
        const l0 = at(p);
        const l1 = at({ x: p.x + h * n.x, y: p.y + h * n.y });
        const l2 = at({ x: p.x - h * n.x, y: p.y - h * n.y });
        if (l0 === null || l1 === null || l2 === null) continue;
        resp[i * NA + j] = Math.max(Math.abs(l1 - l2), Math.abs(l0 - (l1 + l2) / 2));
      }
    }
    // Smooth along each line over ±0.25 m.
    const sm = new Float32Array(NO * NA).fill(NaN);
    for (let i = 0; i < NO; i++) {
      for (let j = 0; j < NA; j++) {
        let s = 0;
        let c = 0;
        for (let k = -2; k <= 2; k++) {
          const v = resp[i * NA + j + k];
          if (j + k >= 0 && j + k < NA && Number.isFinite(v)) {
            s += v;
            c++;
          }
        }
        if (c >= 3 && Number.isFinite(resp[i * NA + j])) sm[i * NA + j] = s / c;
      }
    }
    const vis = new Uint8Array(NO * NA);
    for (let i = 0; i < NO; i++) {
      for (let j = 0; j < NA; j++) {
        const v = sm[i * NA + j];
        if (!Number.isFinite(v) || v < minResponse) continue;
        // A peak across (within ±0.15 m)...
        let peak = true;
        for (let k = -3; k <= 3 && peak; k++) if (k && i + k >= 0 && i + k < NO && sm[(i + k) * NA + j] > v) peak = false;
        if (!peak) continue;
        // ...standing out from the roof 0.3–0.9 m either side.
        const bg: number[] = [];
        for (let k = 6; k <= 18; k++) for (const sg of [-1, 1]) {
          const w = sm[(i + sg * k) * NA + j];
          if (i + sg * k >= 0 && i + sg * k < NO && Number.isFinite(w)) bg.push(w);
        }
        if (bg.length < 6) continue;
        bg.sort((x, y) => x - y);
        if (v >= minRatio * Math.max(bg[Math.floor(bg.length / 2)], 1)) vis[i * NA + j] = 1;
      }
    }
    // Runs along each offset (a line may wander ±1 offset step).
    const gap = Math.round(gapM / dA);
    const used = new Uint8Array(NO * NA);
    for (let i = 1; i < NO - 1; i++) {
      let start = -1;
      let last = -1;
      let n0 = 0;
      let oSum = 0;
      const flush = () => {
        if (start >= 0 && (last - start + 1) * dA >= minLengthM && n0 / (last - start + 1) >= 0.6) {
          const o = o0 + (oSum / n0) * dO;
          const pa = { x: (a0 + start * dA) * u.x + o * n.x, y: (a0 + start * dA) * u.y + o * n.y };
          const pb = { x: (a0 + last * dA) * u.x + o * n.x, y: (a0 + last * dA) * u.y + o * n.y };
          out.push({ a: toLL(pa), b: toLL(pb), lengthM: (last - start + 1) * dA });
        }
        start = -1;
        n0 = 0;
        oSum = 0;
      };
      for (let j = 0; j < NA; j++) {
        let hit = -1;
        for (const k of [0, -1, 1]) if (vis[(i + k) * NA + j] && !used[(i + k) * NA + j]) { hit = i + k; break; }
        if (hit >= 0) {
          if (start >= 0 && j - last > gap) flush();
          if (start < 0) start = j;
          last = j;
          n0++;
          oSum += hit;
          used[hit * NA + j] = 1;
        }
      }
      flush();
    }
  }
  return out;
}

/** The edge on the sun's side (north) of a long shadow: the edge that casts it. */
export function shadowCastingEdge(shadow: LatLng[]): SeenLine | null {
  if (shadow.length < 3) return null;
  const { toXY, toLL } = frameOf(shadow);
  const r = shadow.map(toXY);
  let best: { a: XY; b: XY; len: number; y: number } | null = null;
  const longest = Math.max(...r.map((p, i) => Math.hypot(r[(i + 1) % r.length].x - p.x, r[(i + 1) % r.length].y - p.y)));
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 0.7 * longest) continue;
    const y = (a.y + b.y) / 2;
    if (!best || y > best.y) best = { a, b, len, y };
  }
  if (!best || best.len < 1) return null;
  return { a: toLL(best.a), b: toLL(best.b), lengthM: best.len };
}

/** Per 10 cm along a→b: does the line stand out from the roof beside it (0.3–0.9 m either side)? */
export function seenAlong(luma: GeoTiffRaster, a: LatLng, b: LatLng, { minRatio = 1.6, minResponse = 5 } = {}): boolean[] {
  const { toXY, toLL } = frameOf([a, b]);
  const at = sampler(luma, toLL);
  const A = toXY(a);
  const B = toXY(b);
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  if (len < 0.1) return [];
  const u = { x: (B.x - A.x) / len, y: (B.y - A.y) / len };
  const n = { x: -u.y, y: u.x };
  const h = 0.08;
  const resp = (p: XY): number | null => {
    const l0 = at(p);
    const l1 = at({ x: p.x + h * n.x, y: p.y + h * n.y });
    const l2 = at({ x: p.x - h * n.x, y: p.y - h * n.y });
    if (l0 === null || l1 === null || l2 === null) return null;
    return Math.max(Math.abs(l1 - l2), Math.abs(l0 - (l1 + l2) / 2));
  };
  const out: boolean[] = [];
  for (let s = 0; s <= len + 1e-9; s += 0.1) {
    let v = 0;
    let c = 0;
    // Best of ±5 cm across (the line may be a pixel off).
    let best = 0;
    for (const o of [-0.05, 0, 0.05]) {
      let sum = 0;
      let k = 0;
      for (const ds of [-0.1, 0, 0.1]) {
        const r = resp({ x: A.x + (s + ds) * u.x + o * n.x, y: A.y + (s + ds) * u.y + o * n.y });
        if (r !== null) { sum += r; k++; }
      }
      if (k) best = Math.max(best, sum / k);
    }
    v = best;
    const bg: number[] = [];
    for (const o of [0.3, 0.45, 0.6, 0.75, 0.9]) for (const sg of [-1, 1]) {
      const r = resp({ x: A.x + s * u.x + sg * o * n.x, y: A.y + s * u.y + sg * o * n.y });
      if (r !== null) { bg.push(r); c++; }
    }
    if (c < 4) { out.push(false); continue; }
    bg.sort((x, y) => x - y);
    out.push(v >= minResponse && v >= minRatio * Math.max(bg[Math.floor(bg.length / 2)], 1));
  }
  return out;
}

const share = (v: boolean[]) => (v.length ? v.filter(Boolean).length / v.length : 0);

/**
 * Roof lines a shadow points to (owner's rules: a shadow means a higher edge
 * beside it; roof lines take priority). For each long shadow on a flat roof:
 * - its casting edge (the sun-side edge) is a roof line;
 * - a line parallel to it just past the shadow (0.2–1.5 m), running eave to
 *   eave, is a section step when the image shows it along 55% of its length;
 * - from the casting edge's inner end, a line along the walls away from the
 *   eave is a raised box's side when seen for at least 1.2 m; it ends where
 *   it stops being seen, and a line back to the eave parallel to the casting
 *   edge closes the box when seen along half its length.
 * The lines go to flatSectionsFromLines, which keeps only those that meet
 * other lines at intersections.
 */
export function shadowStructureLines(luma: GeoTiffRaster, ring: LatLng[], shadows: LatLng[][]): { lines: SeenLine[]; casting: SeenLine[] } {
  const { toXY, toLL } = frameOf(ring);
  const r = ring.map(toXY);
  const lines: SeenLine[] = [];
  const casting: SeenLine[] = [];
  const nearestEaveDist = (q: XY) => Math.min(...r.map((p, i) => distToSeg(q, p, r[(i + 1) % r.length])));
  const chord = (p: XY, d: XY): [XY, XY] | null => {
    let lo: number | null = null;
    let hi: number | null = null;
    for (let i = 0; i < r.length; i++) {
      const c = cross(p, d, r[i], r[(i + 1) % r.length]);
      if (!c) continue;
      if (c.s <= 0 && (lo === null || c.s > lo)) lo = c.s;
      if (c.s >= 0 && (hi === null || c.s < hi)) hi = c.s;
    }
    return lo === null || hi === null ? null : [{ x: p.x + lo * d.x, y: p.y + lo * d.y }, { x: p.x + hi * d.x, y: p.y + hi * d.y }];
  };
  for (const sh of shadows) {
    const ce = shadowCastingEdge(sh);
    if (!ce || ce.lengthM < 1.5) continue;
    let A = toXY(ce.a);
    let B = toXY(ce.b);
    // A = the end at the eave, B = the inner end (the box's corner).
    if (nearestEaveDist(A) > nearestEaveDist(B)) [A, B] = [B, A];
    if (nearestEaveDist(A) > 1.2) continue;
    // A shadow along an eave is the wall below it (a unit stepping back), not a roof line.
    const alongEave = r.some((p, i) => {
      const q = r[(i + 1) % r.length];
      const el = Math.hypot(q.x - p.x, q.y - p.y);
      const sin = Math.abs((q.x - p.x) * (B.y - A.y) - (q.y - p.y) * (B.x - A.x)) / (el * Math.hypot(B.x - A.x, B.y - A.y));
      return el > 0.5 && sin < Math.sin((15 * Math.PI) / 180) && distToSeg({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, p, q) < 1.0;
    });
    if (alongEave) continue;
    casting.push({ a: toLL(A), b: toLL(B), lengthM: ce.lengthM });
    lines.push({ a: toLL(A), b: toLL(B), lengthM: ce.lengthM });
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const d = { x: (B.x - A.x) / len, y: (B.y - A.y) / len };
    // The shadow side of the casting edge.
    const sc = sh.map(toXY).reduce((s, p) => ({ x: s.x + p.x / sh.length, y: s.y + p.y / sh.length }), { x: 0, y: 0 });
    let n = { x: -d.y, y: d.x };
    if ((sc.x - A.x) * n.x + (sc.y - A.y) * n.y < 0) n = { x: -n.x, y: -n.y };
    // Section step: eave to eave, just past the shadow.
    let bestStep: { s: number; p: [XY, XY] } | null = null;
    for (let off = 0.2; off <= 1.5 + 1e-9; off += 0.05) {
      const p0 = { x: A.x + off * n.x, y: A.y + off * n.y };
      const c = chord(p0, d);
      if (!c) continue;
      const v = seenAlong(luma, toLL(c[0]), toLL(c[1]));
      // Judge the part beyond the shadow's tip (the shadow itself is seen anyway).
      const tipAlong = (B.x - c[0].x) * d.x + (B.y - c[0].y) * d.y;
      const rest = v.slice(Math.max(0, Math.round(tipAlong / 0.1)));
      const sv = share(rest);
      if (rest.length >= 15 && sv >= 0.55 && (!bestStep || sv > bestStep.s)) bestStep = { s: sv, p: c };
    }
    if (bestStep) lines.push({ a: toLL(bestStep.p[0]), b: toLL(bestStep.p[1]), lengthM: Math.hypot(bestStep.p[1].x - bestStep.p[0].x, bestStep.p[1].y - bestStep.p[0].y) });
    // Raised box: a side from the inner end, away from the casting edge.
    let side: { lat: number; lng: number; end: XY; start: XY } | null = null;
    let bestLen = 0;
    for (const lat of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const s0 = { x: B.x + lat * d.x, y: B.y + lat * d.y };
      const far = { x: s0.x + 9 * n.x, y: s0.y + 9 * n.y };
      const v = seenAlong(luma, toLL(s0), toLL(far), { minRatio: 1.4, minResponse: 4 });
      // Seen run from the start, gaps up to 0.5 m.
      let end = 0;
      let gap = 0;
      for (let k = 0; k < v.length; k++) {
        if (v[k]) { end = k; gap = 0; } else if (++gap > 5) break;
      }
      const runM = end * 0.1;
      if (runM >= 1.2 && share(v.slice(0, end + 1)) >= 0.6 && runM > bestLen) {
        bestLen = runM;
        side = { lat: 0, lng: 0, start: s0, end: { x: s0.x + runM * n.x, y: s0.y + runM * n.y } };
      }
    }
    if (side) {
      // Bottom back to the eave, parallel to the casting edge: tried within
      // ±0.6 m of where the side stops being seen; the side ends on it.
      let bottom: { s: number; e: XY; eave: XY } | null = null;
      for (let dl = -0.6; dl <= 0.6 + 1e-9; dl += 0.1) {
        const L = bestLen + dl;
        if (L < 1.2) continue;
        const e = { x: side.start.x + L * n.x, y: side.start.y + L * n.y };
        const c = chord(e, d);
        if (!c) continue;
        // Back toward the eave the casting edge starts from (against d).
        const eave = (c[0].x - e.x) * d.x + (c[0].y - e.y) * d.y < 0 ? c[0] : c[1];
        const sv = share(seenAlong(luma, toLL(e), toLL(eave), { minRatio: 1.4, minResponse: 4 }));
        if (sv >= 0.45 && (!bottom || sv > bottom.s)) bottom = { s: sv, e, eave };
      }
      const end = bottom ? bottom.e : side.end;
      lines.push({ a: toLL(side.start), b: toLL(end), lengthM: Math.hypot(end.x - side.start.x, end.y - side.start.y) });
      if (bottom) lines.push({ a: toLL(bottom.eave), b: toLL(bottom.e), lengthM: Math.hypot(bottom.eave.x - bottom.e.x, bottom.eave.y - bottom.e.y) });
    }
  }
  return { lines, casting };
}
