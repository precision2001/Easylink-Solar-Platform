/**
 * PRIORITY RULE (DESIGN_RULES.roofJunctions): roof junctions fitted to the image (owner, 9 Nov 2026, 12 Fursorb St,
 * Marayong: "the intersection points of the roof are coming off, that's why
 * lines and faces are not aligning — use the intersection points that connect
 * two or more lines").
 *
 * A roof's lines meet at points: hips and ridges at an apex, a valley and a
 * ridge where a wing joins, eaves and a hip at a corner. Each such point is
 * shared by every line that meets there, so it is fitted once, for all of
 * them: moved (a short way) to where its lines together best match the
 * edges and capping lines seen in the image. Every line stays straight and
 * stays connected, because its ends are the shared points.
 *
 *  - Junctions inside the roof move up to `junctionM` (default 1 m).
 *  - Outline corners can move up to `cornerM` (default 0.5 m), scored by
 *    their two eaves and any hip from the corner — off in the engine for now
 *    (fr1 in the checks: a corner moved off its eave and cut a wing).
 *  - Points on an eave between corners (a gable's ridge end, a valley's
 *    foot) keep their place along the eave as its corners move.
 *  - A move is kept only when it clearly improves the match (by 10%) and
 *    leaves every face a simple polygon.
 */
import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { GeoTiffRaster } from "@/utils/geotiff";
import { rasterPixelOf } from "@/utils/geotiff";

type LatLng = { lat: number; lng: number };
type XY = { x: number; y: number };

const M_PER_LAT = 111320;

export type JunctionFitOptions = {
  junctionM?: number;
  cornerM?: number;
  /** Outline corners stay where they are (an outline a person drew). */
  fixedOutline?: boolean;
  /** Share by which a junction's match must improve for it to move. */
  minGain?: number;
};

export type JunctionFit<F> = { outline: LatLng[][]; faces: F[]; moved: number };

type Node = {
  key: string;
  p: XY;
  kind: "corner" | "eave" | "inside";
  /** For "eave" points: the outline corners either side and where between them. */
  on?: { a: string; b: string; t: number };
  nbrs: Set<string>;
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

/** The image's brightness at a point (bilinear), null off the image. */
function sampler(luma: GeoTiffRaster, toLL: (q: XY) => LatLng) {
  return (q: XY): number | null => {
    const ll = toLL(q);
    const { col, row } = rasterPixelOf(luma, ll.lat, ll.lng);
    const c0 = Math.floor(col - 0.5);
    const r0 = Math.floor(row - 0.5);
    if (c0 < 0 || r0 < 0 || c0 + 1 >= luma.width || r0 + 1 >= luma.height) return null;
    const fx = col - 0.5 - c0;
    const fy = row - 0.5 - r0;
    const d = luma.data;
    const w = luma.width;
    return (
      d[r0 * w + c0] * (1 - fx) * (1 - fy) + d[r0 * w + c0 + 1] * fx * (1 - fy) + d[(r0 + 1) * w + c0] * (1 - fx) * fy + d[(r0 + 1) * w + c0 + 1] * fx * fy
    );
  };
}

/**
 * How strongly the image shows a line from a to b: along its middle 80%, the
 * brightness step across it or a capping line along it (whichever is
 * stronger), averaged.
 */
function lineResponse(at: (q: XY) => number | null, a: XY, b: XY): number {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 0.3) return 0;
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  // Narrow (6 cm): wider, a line scores the same anywhere within that band and junctions slide.
  const h = 0.06;
  const steps = Math.max(4, Math.round((len * 0.8) / 0.08));
  let sum = 0;
  let cnt = 0;
  for (let k = 0; k <= steps; k++) {
    const t = 0.1 + (0.8 * k) / steps;
    const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    const l0 = at(p);
    const l1 = at({ x: p.x + h * n.x, y: p.y + h * n.y });
    const l2 = at({ x: p.x - h * n.x, y: p.y - h * n.y });
    if (l0 === null || l1 === null || l2 === null) continue;
    sum += Math.max(Math.abs(l1 - l2), Math.abs(l0 - (l1 + l2) / 2));
    cnt++;
  }
  return cnt > 0 ? sum / cnt : 0;
}

function segmentsCross(a: XY, b: XY, c: XY, d: XY): boolean {
  const o = (p: XY, q: XY, r: XY) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a);
  const d2 = o(c, d, b);
  const d3 = o(a, b, c);
  const d4 = o(a, b, d);
  return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9));
}

function signedArea(r: XY[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i];
    const q = r[(i + 1) % r.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

function simple(r: XY[]): boolean {
  const n = r.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return false;
    }
  }
  return true;
}

export function fitRoofJunctions<F extends { ring: LatLng[] }>(
  outline: LatLng[][],
  faces: F[],
  luma: GeoTiffRaster | null,
  {
    junctionM = DESIGN_RULES.roofJunctions.maxShiftM,
    cornerM = DESIGN_RULES.roofJunctions.cornerMaxShiftM,
    fixedOutline = !DESIGN_RULES.roofJunctions.moveCorners,
    minGain = DESIGN_RULES.roofJunctions.minGain,
  }: JunctionFitOptions = {},
): JunctionFit<F> {
  const all = [...outline.flat(), ...faces.flatMap((f) => f.ring)];
  if (!luma || all.length === 0 || faces.length === 0) return { outline, faces, moved: 0 };
  const { toXY, toLL } = frameOf(all);
  const at = sampler(luma, toLL);
  const keyOf = (q: XY) => `${Math.round(q.x * 50)},${Math.round(q.y * 50)}`; // 2 cm

  const nodes = new Map<string, Node>();
  const node = (q: XY, kind: Node["kind"]): Node => {
    const k = keyOf(q);
    let n = nodes.get(k);
    if (!n) {
      n = { key: k, p: q, kind, nbrs: new Set() };
      nodes.set(k, n);
    } else if (kind === "corner") n.kind = "corner";
    return n;
  };
  const link = (a: Node, b: Node) => {
    if (a.key === b.key) return;
    a.nbrs.add(b.key);
    b.nbrs.add(a.key);
  };

  // Outline corners and eaves.
  const outlineXY = outline.map((r) => r.map(toXY));
  const eaves: [Node, Node][] = [];
  for (const r of outlineXY) {
    const ns = r.map((q) => node(q, "corner"));
    for (let i = 0; i < ns.length; i++) {
      link(ns[i], ns[(i + 1) % ns.length]);
      eaves.push([ns[i], ns[(i + 1) % ns.length]]);
    }
  }
  // Face corners: on a corner, on an eave, or inside the roof.
  const faceKeys: string[][] = [];
  for (const f of faces) {
    const keys: string[] = [];
    for (const p of f.ring) {
      const q = toXY(p);
      let n = nodes.get(keyOf(q));
      if (!n) {
        // A face corner within 15 cm of an outline corner is that corner.
        let near: Node | undefined;
        let nd = 0.15;
        for (const c of nodes.values()) {
          if (c.kind !== "corner") continue;
          const d = Math.hypot(c.p.x - q.x, c.p.y - q.y);
          if (d < nd) {
            nd = d;
            near = c;
          }
        }
        if (near) n = near;
      }
      if (!n) {
        let on: Node["on"] | undefined;
        let best = 0.1;
        for (const [a, b] of eaves) {
          const dx = b.p.x - a.p.x;
          const dy = b.p.y - a.p.y;
          const l2 = dx * dx + dy * dy;
          if (l2 < 1e-6) continue;
          const t = ((q.x - a.p.x) * dx + (q.y - a.p.y) * dy) / l2;
          if (t <= 0.001 || t >= 0.999) continue;
          const d = Math.abs(dx * (a.p.y - q.y) - (a.p.x - q.x) * dy) / Math.sqrt(l2);
          if (d < best) {
            best = d;
            on = { a: a.key, b: b.key, t };
          }
        }
        n = node(q, on ? "eave" : "inside");
        if (on) n.on = on;
      }
      keys.push(n.key);
    }
    for (let i = 0; i < keys.length; i++) link(nodes.get(keys[i])!, nodes.get(keys[(i + 1) % keys.length])!);
    faceKeys.push(keys);
  }
  // Eave points sit between their corners; an eave between two corners now
  // runs through them, not straight corner to corner (and that's the line).
  for (const n of nodes.values()) {
    if (n.kind !== "eave" || !n.on) continue;
    const a = nodes.get(n.on.a)!;
    const b = nodes.get(n.on.b)!;
    a.nbrs.delete(b.key);
    b.nbrs.delete(a.key);
  }

  const facesOf = new Map<string, number[]>();
  faceKeys.forEach((ks, i) => ks.forEach((k) => facesOf.set(k, [...(facesOf.get(k) ?? []), i])));
  const pos = (k: string) => nodes.get(k)!.p;

  const score = (n: Node, q: XY): number => {
    let s = 0;
    let w = 0;
    for (const m of n.nbrs) {
      const o = pos(m);
      const len = Math.hypot(o.x - q.x, o.y - q.y);
      s += lineResponse(at, q, o) * len;
      w += len;
    }
    return w > 0 ? s / w : 0;
  };
  const insideOutline = (q: XY): boolean => {
    let inside = false;
    for (const r of outline) {
      const ring = r.map((p) => pos(keyOf(toXY(p))));
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i];
        const b = ring[j];
        if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
      }
    }
    return inside;
  };
  const valid = (n: Node, q: XY, moved: Map<string, XY>): boolean => {
    if (n.kind === "inside" && !insideOutline(q)) return false;
    for (const fi of facesOf.get(n.key) ?? []) {
      const before = faceKeys[fi].map((k) => pos(k));
      const after = faceKeys[fi].map((k) => (k === n.key ? q : moved.get(k) ?? pos(k)));
      const a0 = signedArea(before);
      const a1 = signedArea(after);
      if (Math.sign(a0) !== Math.sign(a1) || Math.abs(a1) < 0.5 * Math.abs(a0) || !simple(after)) return false;
    }
    return true;
  };
  /** Eave points follow their corners. */
  const followEaves = (moved: Map<string, XY>) => {
    for (const n of nodes.values()) {
      if (n.kind !== "eave" || !n.on) continue;
      const a = moved.get(n.on.a) ?? pos(n.on.a);
      const b = moved.get(n.on.b) ?? pos(n.on.b);
      moved.set(n.key, { x: a.x + n.on.t * (b.x - a.x), y: a.y + n.on.t * (b.y - a.y) });
    }
  };

  let movedCount = 0;
  const everMoved = new Set<string>();
  const order = [...nodes.values()]
    .filter((n) => (n.kind === "inside" && n.nbrs.size >= 2) || (n.kind === "corner" && !fixedOutline))
    .sort((a, b) => (a.kind === b.kind ? b.nbrs.size - a.nbrs.size : a.kind === "inside" ? -1 : 1));
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (const n of order) {
      const R = n.kind === "corner" ? cornerM : junctionM;
      const home = n.p;
      const cur = score(n, home);
      let best = { q: home, s: cur };
      const coarse = 0.1;
      for (let dx = -R; dx <= R + 1e-9; dx += coarse) {
        for (let dy = -R; dy <= R + 1e-9; dy += coarse) {
          if (dx * dx + dy * dy > R * R) continue;
          const q = { x: home.x + dx, y: home.y + dy };
          const s = score(n, q);
          if (s > best.s) best = { q, s };
        }
      }
      const c0 = best.q;
      for (let dx = -0.08; dx <= 0.08 + 1e-9; dx += 0.02) {
        for (let dy = -0.08; dy <= 0.08 + 1e-9; dy += 0.02) {
          const q = { x: c0.x + dx, y: c0.y + dy };
          const s = score(n, q);
          if (s > best.s) best = { q, s };
        }
      }
      if (best.q === home || best.s < cur * (1 + minGain) || Math.hypot(best.q.x - home.x, best.q.y - home.y) < 0.03) continue;
      const moved = new Map<string, XY>([[n.key, best.q]]);
      if (n.kind === "corner") followEaves(moved);
      let ok = true;
      for (const [k, q] of moved) if (!valid(nodes.get(k)!, q, moved)) ok = false;
      if (!ok) continue;
      for (const [k, q] of moved) nodes.get(k)!.p = q;
      everMoved.add(n.key);
      changed = true;
    }
    if (!changed) break;
  }
  movedCount = everMoved.size;
  if (movedCount === 0) return { outline, faces, moved: 0 };

  // Rebuild rings from the (shared) points.
  const outlineOut = outline.map((r) => r.map((p) => toLL(nodes.get(keyOf(toXY(p)))!.p)));
  const facesOut = faces.map((f, i) => ({ ...f, ring: faceKeys[i].map((k) => toLL(nodes.get(k)!.p)) }));
  return { outline: outlineOut, faces: facesOut, moved: movedCount };
}
