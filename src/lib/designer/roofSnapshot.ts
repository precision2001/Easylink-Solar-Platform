import { rasterPixelOf, type GeoTiffBounds, type GeoTiffRaster } from "@/utils/geotiff";
import { squareRoofOutline, type SquaredOutline } from "@/lib/designer/squareRoof";
import { extractRoofOutlinesFromMask, type RoofOutline } from "@/utils/roofMaskContour";

/**
 * Roof snapshot: a zoomed-in Google satellite image of the roof (zoom 21,
 * about 3 cm per pixel), analysed the way a designer reads it by eye.
 *
 *  1. Roof colour is sampled around the pin (or inside a hint outline).
 *  2. The roof is grown outwards from there over pixels of that colour —
 *     shaded faces included — and stops at gutters, gaps, walls, paths
 *     and neighbouring roofs.
 *  3. Holes (vents, skylights, panels) are filled, thin spill-overs removed.
 *  4. The result is traced into a roof outline; it also serves as the
 *     high-resolution roof mask for fitting eaves, and its brightness for
 *     checking hips, ridges and valleys.
 */

type LatLng = { lat: number; lng: number };

export type SnapshotGeo = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  /** Static Maps `scale` (2 = double-density pixels). */
  scale: number;
  widthPx: number;
  heightPx: number;
};

/** Google Static Maps snapshot settings used for roof analysis. */
export const ROOF_SNAPSHOT = { zoom: 21, scale: 2, sizePx: 640 } as const;

const EARTH_M_PER_PX_Z0 = 156543.03392;

/** Ground size of one image pixel in metres. */
export function snapshotMetresPerPixel(g: SnapshotGeo): number {
  return (EARTH_M_PER_PX_Z0 * Math.cos((g.centerLat * Math.PI) / 180)) / 2 ** g.zoom / g.scale;
}

/** Lat/lng bounds of a Static Maps image (Web Mercator, centred on centerLat/Lng). */
export function snapshotBounds(g: SnapshotGeo): GeoTiffBounds {
  const worldPx = 256 * 2 ** g.zoom * g.scale;
  const x0 = ((g.centerLng + 180) / 360) * worldPx;
  const s = Math.sin((g.centerLat * Math.PI) / 180);
  const y0 = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldPx;
  const lngOf = (x: number) => (x / worldPx) * 360 - 180;
  const latOf = (y: number) => {
    const n = Math.PI - (2 * Math.PI * y) / worldPx;
    return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
  };
  return {
    north: latOf(y0 - g.heightPx / 2),
    south: latOf(y0 + g.heightPx / 2),
    west: lngOf(x0 - g.widthPx / 2),
    east: lngOf(x0 + g.widthPx / 2),
  };
}

export type RoofSnapshotAnalysis = {
  /** 1 = roof, 0 = not roof, at the snapshot's resolution. */
  mask: GeoTiffRaster;
  /** Brightness (0–255) for checking hips, ridges and valleys. */
  luma: GeoTiffRaster;
  /** Roof outline(s) traced from the mask, largest first. */
  outlines: RoofOutline[];
  metresPerPixel: number;
  areaM2: number;
  /** Square-walled outline drawn along the walls (see squareRoof.ts), when the roof is square-walled. */
  squared?: SquaredOutline | null;
  /**
   * More readings of the roof for the Relook button: the square outline
   * redrawn with other cell sizes, colour limits and step limits, with and
   * without growing into shade. Computed on demand (about a second).
   */
  relook?: () => LatLng[][];
};

export type SnapshotOptions = {
  pin: LatLng;
  /** Optional coarse roof mask (Google Solar) the roof must stay near. */
  hint?: GeoTiffRaster | null;
  /** How far (m) the roof may extend beyond the hint mask. */
  hintMarginM?: number;
  /**
   * Google's height model (DSM). When given, only pixels at least
   * `minHeightM` above the ground count as roof — so paving, paths and
   * courtyards the colour of the tiles are left out (77 Harry Ave).
   */
  dsm?: GeoTiffRaster | null;
  /**
   * The property's land lot (NSW cadastre). When given, the roof can't
   * extend more than `parcelMarginM` past it — houses built close together
   * have similar roofs with only a shaded gap between them, and the colour
   * growth crossed those gaps into the neighbours (134 Old Canterbury Rd,
   * Summer Hill: 430 m² over three houses, so the page fell back to
   * Google's mask, which also joins them).
   */
  parcel?: LatLng[] | null;
  /**
   * How far (m) the roof may reach past the lot line. Small: the lot line
   * usually runs down the middle of the side passage, and 0.5 m reached the
   * neighbour's tiles, so the growth bridged the gap again.
   */
  parcelMarginM?: number;
  minHeightM?: number;
};

const MIN_ROOF_M2 = 25;
const MAX_ROOF_M2 = 3000;

function pointInRaster(b: GeoTiffBounds, w: number, h: number, p: LatLng) {
  return {
    col: ((p.lng - b.west) / (b.east - b.west)) * w,
    row: ((b.north - p.lat) / (b.north - b.south)) * h,
  };
}

/** Chamfer distance (in pixels) to the nearest set pixel. */
function distanceTo(bin: Uint8Array, W: number, H: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(W * H);
  for (let i = 0; i < d.length; i++) d[i] = bin[i] ? 0 : INF;
  const a = 1;
  const b = Math.SQRT2;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c;
      let v = d[i];
      if (c > 0) v = Math.min(v, d[i - 1] + a);
      if (r > 0) {
        v = Math.min(v, d[i - W] + a);
        if (c > 0) v = Math.min(v, d[i - W - 1] + b);
        if (c < W - 1) v = Math.min(v, d[i - W + 1] + b);
      }
      d[i] = v;
    }
  }
  for (let r = H - 1; r >= 0; r--) {
    for (let c = W - 1; c >= 0; c--) {
      const i = r * W + c;
      let v = d[i];
      if (c < W - 1) v = Math.min(v, d[i + 1] + a);
      if (r < H - 1) {
        v = Math.min(v, d[i + W] + a);
        if (c < W - 1) v = Math.min(v, d[i + W + 1] + b);
        if (c > 0) v = Math.min(v, d[i + W - 1] + b);
      }
      d[i] = v;
    }
  }
  return d;
}

function erode(bin: Uint8Array, W: number, H: number, rPx: number): Uint8Array {
  const inv = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) inv[i] = bin[i] ? 0 : 1;
  const d = distanceTo(inv, W, H);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = d[i] > rPx ? 1 : 0;
  return out;
}

function dilate(bin: Uint8Array, W: number, H: number, rPx: number): Uint8Array {
  const d = distanceTo(bin, W, H);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = d[i] <= rPx ? 1 : 0;
  return out;
}

/** Fill every hole not connected to the image border. */
function fillHoles(bin: Uint8Array, W: number, H: number): Uint8Array {
  const outside = new Uint8Array(bin.length);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!bin[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let c = 0; c < W; c++) {
    push(c);
    push((H - 1) * W + c);
  }
  for (let r = 0; r < H; r++) {
    push(r * W);
    push(r * W + W - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const r = (i / W) | 0;
    const c = i - r * W;
    if (c > 0) push(i - 1);
    if (c < W - 1) push(i + 1);
    if (r > 0) push(i - W);
    if (r < H - 1) push(i + W);
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/** Keep only the connected component(s) touching the seed pixels. */
function keepSeeded(bin: Uint8Array, seed: Uint8Array, W: number, H: number): Uint8Array {
  const out = new Uint8Array(bin.length);
  const stack: number[] = [];
  for (let i = 0; i < bin.length; i++) {
    if (seed[i] && bin[i]) {
      out[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const r = (i / W) | 0;
    const c = i - r * W;
    const nb = [c > 0 ? i - 1 : -1, c < W - 1 ? i + 1 : -1, r > 0 ? i - W : -1, r < H - 1 ? i + W : -1];
    for (const j of nb) {
      if (j >= 0 && bin[j] && !out[j]) {
        out[j] = 1;
        stack.push(j);
      }
    }
  }
  return out;
}

/** In-place separable box blur of radius k pixels. */
function boxBlur(ch: Float32Array, W: number, H: number, k: number) {
  const tmp = new Float32Array(Math.max(W, H));
  for (let r = 0; r < H; r++) {
    let acc = 0;
    const o = r * W;
    for (let c = -k; c <= k; c++) acc += ch[o + Math.min(W - 1, Math.max(0, c))];
    for (let c = 0; c < W; c++) {
      tmp[c] = acc / (2 * k + 1);
      acc += ch[o + Math.min(W - 1, c + k + 1)] - ch[o + Math.max(0, c - k)];
    }
    for (let c = 0; c < W; c++) ch[o + c] = tmp[c];
  }
  for (let c = 0; c < W; c++) {
    let acc = 0;
    for (let r = -k; r <= k; r++) acc += ch[Math.min(H - 1, Math.max(0, r)) * W + c];
    for (let r = 0; r < H; r++) {
      tmp[r] = acc / (2 * k + 1);
      acc += ch[Math.min(H - 1, r + k + 1) * W + c] - ch[Math.max(0, r - k) * W + c];
    }
    for (let r = 0; r < H; r++) ch[r * W + c] = tmp[r];
  }
}

function median(v: number[]): number {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Analyse an RGBA snapshot. Returns null when no believable roof is found
 * around the pin (caller falls back to the footprint / Google outline).
 */
export function analyseRoofSnapshot(
  rgba: Uint8ClampedArray | Uint8Array,
  geo: SnapshotGeo,
  { pin, hint = null, hintMarginM = 1.5, dsm = null, minHeightM = 2.2, parcel = null, parcelMarginM = 0.15 }: SnapshotOptions,
): RoofSnapshotAnalysis | null {
  const W = geo.widthPx;
  const H = geo.heightPx;
  if (rgba.length < W * H * 4) return null;
  const bounds = snapshotBounds(geo);
  const mpp = snapshotMetresPerPixel(geo);

  // Colour averaged over ~20 cm so tile texture and shadow speckle don't
  // break the roof up: brightness (log scale — a shaded face is a fixed
  // fraction darker) plus two brightness-free colour ratios.
  const luma = new Float32Array(W * H);
  const R = new Float32Array(W * H);
  const G = new Float32Array(W * H);
  const Bl = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    R[i] = rgba[i * 4];
    G[i] = rgba[i * 4 + 1];
    Bl[i] = rgba[i * 4 + 2];
    luma[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * Bl[i];
  }
  const k = Math.max(1, Math.round(0.2 / mpp));
  for (const ch of [R, G, Bl]) boxBlur(ch, W, H, k);
  const L = new Float32Array(W * H);
  const A = new Float32Array(W * H);
  const B = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const sum = R[i] + G[i] + Bl[i] + 1e-6;
    L[i] = Math.log(Math.max(8, 0.299 * R[i] + 0.587 * G[i] + 0.114 * Bl[i]));
    A[i] = R[i] / sum;
    B[i] = G[i] / sum;
  }

  // Coarse hint (Google's roof mask), resampled to the snapshot.
  let near: Uint8Array | null = null;
  let hintCore: Uint8Array | null = null;
  if (hint) {
    const hb = new Uint8Array(W * H);
    let any = 0;
    for (let r = 0; r < H; r++) {
      const lat = bounds.north + ((r + 0.5) / H) * (bounds.south - bounds.north);
      for (let c = 0; c < W; c++) {
        const lng = bounds.west + ((c + 0.5) / W) * (bounds.east - bounds.west);
        const hp = hintPixel(hint, lat, lng);
        if (hp) {
          hb[r * W + c] = 1;
          any++;
        }
      }
    }
    if (any > 0) {
      // Only the building under the pin: Google's mask covers every building
      // around it, and a roof-coloured path or courtyard can join them
      // (77 Harry Ave, Oct 2026: paving the colour of the tiles led the trace
      // to the image edge). Keep the mask's part within 3 m of the pin.
      const pin0 = pointInRaster(bounds, W, H, pin);
      const near3 = new Uint8Array(W * H);
      const r3 = 3 / mpp;
      for (let r = Math.max(0, Math.floor(pin0.row - r3)); r <= Math.min(H - 1, Math.ceil(pin0.row + r3)); r++) {
        for (let c = Math.max(0, Math.floor(pin0.col - r3)); c <= Math.min(W - 1, Math.ceil(pin0.col + r3)); c++) {
          if (Math.hypot(r - pin0.row, c - pin0.col) <= r3) near3[r * W + c] = 1;
        }
      }
      const building = keepSeeded(hb, near3, W, H);
      let n = 0;
      for (let i = 0; i < building.length; i++) n += building[i];
      const base = n > 0 ? building : hb;
      near = dilate(base, W, H, hintMarginM / mpp);
      hintCore = erode(base, W, H, 0.3 / mpp);
    }
  }

  // Height filter: only pixels clearly above the ground can be roof. Ground
  // is the yard level (25th percentile of the tile), not the lowest point —
  // the street sits lower, and a raised deck or courtyard (77 Harry Ave: 1.3 m
  // above the lawn, tile-coloured paving) must not pass as roof. Eaves of a
  // single-storey house are ~2.5–3 m up.
  let high: Uint8Array | null = null;
  if (dsm) {
    const vals: number[] = [];
    for (let i = 0; i < dsm.data.length; i += 3) {
      const v = dsm.data[i];
      if (Number.isFinite(v) && (dsm.noDataValue === null || v !== dsm.noDataValue)) vals.push(v);
    }
    if (vals.length > 20) {
      vals.sort((p, q) => p - q);
      const ground = vals[Math.floor(vals.length * 0.25)];
      high = new Uint8Array(W * H);
      // Sample the (0.5 m) height model on a coarse step and fill blocks.
      const step = Math.max(1, Math.round(0.25 / mpp));
      for (let r = 0; r < H; r += step) {
        const lat = bounds.north + ((r + step / 2) / H) * (bounds.south - bounds.north);
        for (let c = 0; c < W; c += step) {
          const lng = bounds.west + ((c + step / 2) / W) * (bounds.east - bounds.west);
          const { col, row } = rasterPixelOf(dsm, lat, lng);
          const ci = Math.floor(col);
          const ri = Math.floor(row);
          if (ci < 0 || ri < 0 || ci >= dsm.width || ri >= dsm.height) continue;
          const z = dsm.data[ri * dsm.width + ci];
          if (!(z - ground >= minHeightM)) continue;
          for (let rr = r; rr < Math.min(H, r + step); rr++) for (let cc = c; cc < Math.min(W, c + step); cc++) high[rr * W + cc] = 1;
        }
      }
      // The height model is coarse: allow 0.5 m beyond it at the eaves.
      high = dilate(high, W, H, 0.5 / mpp);
    }
  }

  // Land lot: pixels inside the property (plus the eave margin).
  let lot: Uint8Array | null = null;
  if (parcel && parcel.length >= 3) {
    const ring = parcel.map((p) => pointInRaster(bounds, W, H, p));
    const inLot = new Uint8Array(W * H);
    let any = 0;
    for (let r = 0; r < H; r++) {
      const y = r + 0.5;
      for (let c = 0; c < W; c++) {
        const x = c + 0.5;
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const a = ring[i];
          const b = ring[j];
          if (a.row > y !== b.row > y && x < ((b.col - a.col) * (y - a.row)) / (b.row - a.row) + a.col) inside = !inside;
        }
        if (inside) {
          inLot[r * W + c] = 1;
          any++;
        }
      }
    }
    if (any > 0) lot = dilate(inLot, W, H, parcelMarginM / mpp);
  }

  // Seed: a disc around the pin (and Google's roof near it, when known).
  const pp = pointInRaster(bounds, W, H, pin);
  if (pp.col < 0 || pp.row < 0 || pp.col >= W || pp.row >= H) return null;
  const seed = new Uint8Array(W * H);
  const seedR = 1.5 / mpp;
  for (let r = Math.max(0, Math.floor(pp.row - seedR)); r <= Math.min(H - 1, Math.ceil(pp.row + seedR)); r++) {
    for (let c = Math.max(0, Math.floor(pp.col - seedR)); c <= Math.min(W - 1, Math.ceil(pp.col + seedR)); c++) {
      if (Math.hypot(r - pp.row, c - pp.col) <= seedR) seed[r * W + c] = 1;
    }
  }
  const spread = (v: number[], m: number) => median(v.map((x) => Math.abs(x - m)));
  const darkest = Math.log(30);
  const linkDarkest = Math.log(50);
  const open = Math.max(1, 0.15 / mpp);

  // Two passes: grow from the pin's colour, then re-sample the colour over
  // everything found (all faces, sunny and shaded) and grow again.
  let region: Uint8Array = seed;
  let roof: Uint8Array = new Uint8Array(W * H);
  for (let pass = 0; pass < 2; pass++) {
    const sL: number[] = [], sA: number[] = [], sB: number[] = [];
    const step = pass === 0 ? 1 : 5;
    for (let i = 0; i < W * H; i += step) {
      if (region[i]) { sL.push(L[i]); sA.push(A[i]); sB.push(B[i]); }
    }
    if (sL.length < 20) return null;
    const mL = median(sL), mA = median(sA), mB = median(sB);
    // Generous on brightness (shaded faces), tighter on colour. Grey roofs
    // (little colour to go on) lean on brightness and on Google's roof mask.
    const tL = Math.max(0.6, 3.5 * spread(sL, mL));
    const tA = Math.max(0.07, 3.5 * spread(sA, mA));
    const tB = Math.max(0.05, 3.5 * spread(sB, mB));
    // `like`: roof colour. `link`: anything roughly roof-coloured and not
    // dark — ridge and hip capping, shadow lines between faces — which joins
    // faces of one roof; dark gaps, driveways and gutters between houses
    // don't, so neighbours stay out.
    const like = new Uint8Array(W * H);
    const link = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (near && !near[i]) continue;
      if (high && !high[i]) continue;
      if (lot && !lot[i]) continue;
      if (L[i] < darkest) continue; // gaps, gutters and deep shadow between buildings
      const d = ((L[i] - mL) / tL) ** 2 + ((A[i] - mA) / tA) ** 2 + ((B[i] - mB) / tB) ** 2;
      if (d <= 1) like[i] = 1;
      if (d <= 4 && L[i] >= linkDarkest) link[i] = 1;
    }
    // Cut thin bridges (fences, a gutter touching a neighbour's roof), keep
    // what connects to the pin, then give back the width the cut took off.
    const joined = dilate(keepSeeded(erode(link, W, H, open), seed, W, H), W, H, open);
    roof = new Uint8Array(W * H);
    for (let i = 0; i < roof.length; i++) if (like[i] && joined[i]) roof[i] = 1;
    roof = fillHoles(roof, W, H);
    region = roof;
  }
  // Close notches along the eaves (shadowed tiles, gutters, hip capping).
  for (const radiusM of [0.25, 0.8]) {
    const close = Math.max(1, radiusM / mpp);
    roof = erode(dilate(roof, W, H, close), W, H, close);
    roof = fillHoles(roof, W, H);
  }
  // Wider notches open to the outside (a ridge strip or parapet of another
  // colour) are filled only where Google's roof mask also says roof.
  if (hintCore) {
    const wide = Math.max(1, 1.2 / mpp);
    const closed = erode(dilate(roof, W, H, wide), W, H, wide);
    for (let i = 0; i < roof.length; i++) if (closed[i] && hintCore[i]) roof[i] = 1;
    roof = fillHoles(roof, W, H);
  }

  // The closings above can reach back across the lot line: trim to the lot.
  if (lot) for (let i = 0; i < roof.length; i++) if (!lot[i]) roof[i] = 0;

  let count = 0;
  for (let i = 0; i < roof.length; i++) count += roof[i];
  const areaM2 = count * mpp * mpp;
  if (areaM2 < MIN_ROOF_M2 || areaM2 > MAX_ROOF_M2) return null;
  // A roof running off the image edge is cut off — not a believable outline.
  for (let c = 0; c < W; c++) if (roof[c] || roof[(H - 1) * W + c]) return null;
  for (let r = 0; r < H; r++) if (roof[r * W] || roof[r * W + W - 1]) return null;

  const mask: GeoTiffRaster = { data: roof, width: W, height: H, bounds, noDataValue: null };
  const outlines = extractRoofOutlinesFromMask(mask, { simplifyPx: Math.max(1, 0.12 / mpp) });
  if (outlines.length === 0) return null;
  return {
    mask,
    luma: { data: luma, width: W, height: H, bounds, noDataValue: null },
    outlines,
    metresPerPixel: mpp,
    areaM2,
    relook: () => {
      const out: LatLng[][] = [];
      const key = (r: LatLng[]) => r.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(";");
      const seen = new Set<string>();
      let allow: Uint8Array | null = null;
      if (high || lot) {
        allow = new Uint8Array(W * H);
        for (let i = 0; i < allow.length; i++) allow[i] = (!high || high[i]) && (!lot || lot[i]) ? 1 : 0;
      }
      const variants = [
        {},
        { grow: false },
        { cellM: 0.2 },
        { cellM: 0.33 },
        { maxColourDist: 6, giveBackDist: 8 },
        { jogM: 0.6 },
        { openR: 4, bumpR: 7 },
      ];
      for (const v of variants) {
        try {
          const sq = squareRoofOutline(rgba, W, H, bounds, roof, { allow, ...v });
          for (const r of sq ? [sq.ring, ...(sq.alternatives ?? [])] : []) {
            const k = key(r);
            if (!seen.has(k)) { seen.add(k); out.push(r); }
          }
        } catch {
          /* a variant that fails is skipped */
        }
      }
      return out;
    },
    squared: (() => {
      try {
        // Growth only where Google's height model says above ground, inside the lot.
        let allow: Uint8Array | null = null;
        if (high || lot) {
          allow = new Uint8Array(W * H);
          for (let i = 0; i < allow.length; i++) allow[i] = (!high || high[i]) && (!lot || lot[i]) ? 1 : 0;
        }
        const sweep = typeof process !== "undefined" ? process.env?.SQ_SWEEP : undefined;
        if (sweep) (globalThis as { __sqSweep?: unknown }).__sqSweep = (o: Parameters<typeof squareRoofOutline>[5]) => squareRoofOutline(rgba, W, H, bounds, roof, { allow, ...o });
        return squareRoofOutline(rgba, W, H, bounds, roof, { allow });
      } catch (e) {
        if (typeof process !== "undefined" && process.env?.SQ_DEBUG) console.error(e);
        return null;
      }
    })(),
  };
}

function hintPixel(h: GeoTiffRaster, lat: number, lng: number): boolean {
  const { col, row } = rasterPixelOf(h, lat, lng);
  const c = Math.floor(col);
  const r = Math.floor(row);
  if (c < 0 || r < 0 || c >= h.width || r >= h.height) return false;
  return h.data[r * h.width + c] > 0;
}
