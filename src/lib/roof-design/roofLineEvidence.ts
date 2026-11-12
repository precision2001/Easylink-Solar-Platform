/**
 * The image's evidence for a roof reading, both ways (owner's rule, 5 Nov
 * 2026: "the roof lines have to be 100% determined"):
 *
 * - `imageLines`: the straight lines the zoomed image shows on the roof —
 *   hips, valleys, ridges, steps — found as runs of strong brightness edges
 *   along, square to or at 45° to the walls.
 * - `unexplainedLength`: how much of those lines no face border of a reading
 *   accounts for. A reading that leaves a line in the image unexplained has
 *   missed a face (264 Wangee Rd: a plain pyramid passed Google's check and
 *   saw all its own hips, but left the north wing's two lines unexplained).
 */
import { rasterLatLngOf, rasterPixelOf, rasterPixelSizeM, type GeoTiffRaster } from "@/utils/geotiff";
import { pointInRing, type LatLng, type LatLngRing } from "./geometry";

const M_PER_LAT = 111_320;

export type ImageLine = { a: LatLng; b: LatLng; lengthM: number };

type Frame = { toXY: (p: LatLng) => { x: number; y: number } };

function frameAt(p0: LatLng): Frame {
  const mL = M_PER_LAT * Math.cos((p0.lat * Math.PI) / 180);
  return { toXY: (p) => ({ x: (p.lng - p0.lng) * mL, y: (p.lat - p0.lat) * M_PER_LAT }) };
}

function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Straight lines in the image inside the roof (kept `insetM` inside the
 * outline, so eaves don't count), along the wall directions and 45° to them.
 * `skip` rings (obstructions) are left out.
 */
export function imageLines(
  luma: GeoTiffRaster | null,
  roofs: LatLngRing[],
  wallAxisDeg: number,
  { skip = [] as LatLngRing[], insetM = 0.45, minLengthM = 1.5, strongFloor = 40, strongShare = 0.8 } = {},
): ImageLine[] {
  if (!luma || roofs.length === 0) return [];
  const px = rasterPixelSizeM(luma);
  if (!(px > 0 && px < 0.2)) return [];
  const all = roofs.flat();
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const c0 = rasterPixelOf(luma, Math.max(...lats), Math.min(...lngs));
  const c1 = rasterPixelOf(luma, Math.min(...lats), Math.max(...lngs));
  const x0 = Math.max(2, Math.floor(Math.min(c0.col, c1.col)));
  const x1 = Math.min(luma.width - 3, Math.ceil(Math.max(c0.col, c1.col)));
  const y0 = Math.max(2, Math.floor(Math.min(c0.row, c1.row)));
  const y1 = Math.min(luma.height - 3, Math.ceil(Math.max(c0.row, c1.row)));
  if (x1 <= x0 || y1 <= y0) return [];
  const W = luma.width;
  const BW = x1 - x0 + 1;
  const BH = y1 - y0 + 1;
  const F = frameAt(all[0]);
  // Pixel masks: inside a roof (eroded by the inset) and not on an obstruction (dilated 0.2 m).
  const fill = (rings: LatLngRing[]) => {
    const m = new Uint8Array(BW * BH);
    for (const ring of rings) {
      const pts = ring.map((p) => rasterPixelOf(luma, p.lat, p.lng));
      for (let y = 0; y < BH; y++) {
        const yy = y0 + y + 0.5;
        const xs: number[] = [];
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const a = pts[i];
          const b = pts[j];
          if (a.row > yy !== b.row > yy) xs.push(a.col + ((yy - a.row) * (b.col - a.col)) / (b.row - a.row));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const xa = Math.max(0, Math.ceil(xs[k] - 0.5 - x0));
          const xb = Math.min(BW - 1, Math.floor(xs[k + 1] - 0.5 - x0));
          for (let x = xa; x <= xb; x++) m[y * BW + x] ^= 1;
        }
      }
    }
    return m;
  };
  const boxFilter = (m: Uint8Array, r: number, keepIfAll: boolean) => {
    // Separable min (erode) or max (dilate) over a (2r+1) square.
    const pass = (src: Uint8Array, horiz: boolean) => {
      const out = new Uint8Array(BW * BH);
      for (let y = 0; y < BH; y++) {
        for (let x = 0; x < BW; x++) {
          let v = keepIfAll ? 1 : 0;
          for (let d = -r; d <= r; d++) {
            const xx = horiz ? x + d : x;
            const yy = horiz ? y : y + d;
            const inside = xx >= 0 && yy >= 0 && xx < BW && yy < BH ? src[yy * BW + xx] : 0;
            if (keepIfAll && !inside) { v = 0; break; }
            if (!keepIfAll && inside) { v = 1; break; }
          }
          out[y * BW + x] = v;
        }
      }
      return out;
    };
    return pass(pass(m, true), false);
  };
  const roofMask = boxFilter(fill(roofs), Math.round(insetM / px), true);
  const skipMask = skip.length ? boxFilter(fill(skip), Math.round(0.2 / px), false) : null;
  // Smoothed brightness (3×3 mean) over the box, then its gradient.
  const S = new Float32Array(BW * BH);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      let s2 = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s2 += luma.data[(y0 + y + j) * W + (x0 + x + i)];
      S[y * BW + x] = s2 / 9;
    }
  }
  const at = (x: number, y: number) => S[Math.min(BH - 1, Math.max(0, y)) * BW + Math.min(BW - 1, Math.max(0, x))];
  type Pix = { x: number; y: number; dir: number; mag: number };
  const pix: Pix[] = [];
  const mags: number[] = [];
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const k = y * BW + x;
      if (!roofMask[k] || (skipMask && skipMask[k])) continue;
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const mag = Math.hypot(gx, gy);
      if (mag < 24) continue;
      const p = F.toXY(rasterLatLngOf(luma, x0 + x + 0.5, y0 + y + 0.5));
      // Image rows run south: flip y for the direction in east/north terms.
      const lineDir = ((Math.atan2(-gy, gx) * 180) / Math.PI + 90 + 360) % 180;
      pix.push({ x: p.x, y: p.y, dir: lineDir, mag });
      mags.push(mag);
    }
  }
  if (pix.length < 20) return [];
  mags.sort((a, b) => a - b);
  const strong = Math.max(strongFloor, mags[Math.floor(mags.length * strongShare)]);
  const lines: ImageLine[] = [];
  const toLL = (x: number, y: number): LatLng => ({ lat: all[0].lat + y / M_PER_LAT, lng: all[0].lng + x / (M_PER_LAT * Math.cos((all[0].lat * Math.PI) / 180)) });
  for (let k = 0; k < 4; k++) {
    const d = (wallAxisDeg + 45 * k) % 180;
    const t = (d * Math.PI) / 180;
    const ux = Math.cos(t);
    const uy = Math.sin(t);
    // Pixels whose edge runs this way, binned by offset across (0.1 m) and position along (0.1 m).
    const bins = new Map<number, Set<number>>();
    for (const p of pix) {
      if (p.mag < strong) continue;
      const diff = Math.abs(((p.dir - d + 270) % 180) - 90);
      if (diff > 12) continue;
      const along = p.x * ux + p.y * uy;
      const across = -p.x * uy + p.y * ux;
      const key = Math.round(across / 0.1);
      if (!bins.has(key)) bins.set(key, new Set());
      bins.get(key)!.add(Math.round(along / 0.1));
    }
    // A line: three neighbouring offset bins together, filled ≥ 60% over ≥ minLength (gaps under 0.4 m).
    const keys = [...bins.keys()].sort((a, b) => a - b);
    const used = new Set<number>();
    for (const key of keys) {
      if (used.has(key)) continue;
      const cells = new Set<number>([...(bins.get(key - 1) ?? []), ...(bins.get(key) ?? []), ...(bins.get(key + 1) ?? [])]);
      const pos = [...cells].sort((a, b) => a - b);
      let start = pos[0];
      let prev = pos[0];
      let filled = 1;
      const flush = (end: number) => {
        const len = (end - start + 1) * 0.1;
        if (len >= minLengthM && filled / (end - start + 1) >= 0.6) {
          const across = key * 0.1;
          const a = toLL(start * 0.1 * ux - across * uy, start * 0.1 * uy + across * ux);
          const b = toLL(end * 0.1 * ux - across * uy, end * 0.1 * uy + across * ux);
          lines.push({ a, b, lengthM: len });
          used.add(key - 1).add(key).add(key + 1);
        }
      };
      for (let i = 1; i < pos.length; i++) {
        if (pos[i] - prev > 4) {
          flush(prev);
          start = pos[i];
          filled = 0;
        }
        filled++;
        prev = pos[i];
      }
      flush(prev);
    }
  }
  return lines;
}

/**
 * Length of image lines that no face border or outline edge of a reading
 * runs along (within `tolM`, about the same direction).
 */
export function unexplainedLength(lines: ImageLine[], faces: LatLngRing[], outlines: LatLngRing[], tolM = 0.4): number {
  if (lines.length === 0) return 0;
  const F = frameAt(lines[0].a);
  const edges: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  for (const r of [...faces, ...outlines]) {
    const q = r.map(F.toXY);
    for (let i = 0; i < q.length; i++) edges.push({ a: q[i], b: q[(i + 1) % q.length] });
  }
  let missing = 0;
  for (const l of lines) {
    const a = F.toXY(l.a);
    const b = F.toXY(l.b);
    const n = Math.max(2, Math.round(l.lengthM / 0.2));
    let off = 0;
    for (let i = 0; i <= n; i++) {
      const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n };
      if (!edges.some((e) => distToSegment(p, e.a, e.b) <= tolM)) off++;
    }
    missing += (off / (n + 1)) * l.lengthM;
  }
  return missing;
}

export { pointInRing };
