import type { GeoTiffRaster } from "@/utils/geotiff";
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";

/**
 * Roof-line finder: every roof's faces come from Google's height model (DSM),
 * not from an assumed hip shape.
 *
 *  1. Inside the drawn roof outline, each DSM pixel gets the compass direction
 *     it slopes down towards, and how steeply.
 *  2. Pixels sloping the same way (snapped to the four directions square to
 *     the main walls) form a face; flat areas, walls, trees and ground are
 *     left out (too flat, too steep, or below roof height).
 *  3. Each face is traced to an outline. Where two faces meet is a ridge, hip
 *     or valley — those are the roof lines.
 *  4. Each face gets its own pitch and azimuth from a plane fitted to its
 *     heights, so panel rows run along its contour at the right pitch.
 *
 * Returns null when the DSM can't support it (missing, misaligned, or the
 * faces found cover too little of the outline) so the caller can fall back.
 */

type LatLng = { lat: number; lng: number };

export type DetectedFace = {
  ring: LatLng[];
  /** Compass direction the face slopes down towards (0 = north, clockwise). */
  azimuthDeg: number;
  pitchDeg: number;
  areaM2: number;
  /** Row direction (degrees from east, counter-clockwise) — along the contour. */
  eaveDeg: number;
};

const M_PER_LAT = 111320;
const MIN_PITCH_DEG = 5;
const MAX_PITCH_DEG = 60;
const MIN_ROOF_HEIGHT_M = 2.0;
const MIN_FACE_AREA_M2 = 2;
const MIN_COVERAGE = 0.35;

function plausible(r: GeoTiffRaster | null): r is GeoTiffRaster {
  if (!r) return false;
  const { north, south, east, west } = r.bounds;
  return Math.abs(north) <= 90 && Math.abs(south) <= 90 && Math.abs(east) <= 180 && Math.abs(west) <= 180 &&
    north !== south && east !== west && r.width > 4 && r.height > 4;
}

function pointInRing(lat: number, lng: number, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > lat !== b.lat > lat && lng < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat) + a.lng) {
      inside = !inside;
    }
  }
  return inside;
}

function circularMeanAxis(azimuths: number[]): number {
  // Faces of a building slope in four directions 90° apart: fold onto 90°.
  let sx = 0;
  let sy = 0;
  for (const a of azimuths) {
    const r = (4 * a * Math.PI) / 180;
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  return ((Math.atan2(sy, sx) * 180) / Math.PI / 4 + 360) % 90;
}

export function detectRoofFaces(
  dsm: GeoTiffRaster | null,
  outlines: LatLng[][],
  mask: GeoTiffRaster | null = null,
): DetectedFace[] | null {
  if (!plausible(dsm) || outlines.every((r) => r.length < 3)) return null;
  const { width: W, height: H, bounds } = dsm;
  const lat0 = (bounds.north + bounds.south) / 2;
  const pxW = (Math.abs(bounds.east - bounds.west) / W) * M_PER_LAT * Math.cos((lat0 * Math.PI) / 180);
  const pxH = (Math.abs(bounds.north - bounds.south) / H) * M_PER_LAT;
  const pxArea = pxW * pxH;
  const latOf = (row: number) => bounds.north + ((row + 0.5) / H) * (bounds.south - bounds.north);
  const lngOf = (col: number) => bounds.west + ((col + 0.5) / W) * (bounds.east - bounds.west);
  const z = (c: number, r: number) => dsm.data[r * W + c];
  const valid = (v: number) => Number.isFinite(v) && (dsm.noDataValue === null || v !== dsm.noDataValue);

  // Ground level: a low percentile of the whole tile.
  const sample: number[] = [];
  for (let i = 0; i < dsm.data.length; i += 7) if (valid(dsm.data[i])) sample.push(dsm.data[i]);
  if (sample.length < 20) return null;
  sample.sort((a, b) => a - b);
  const ground = sample[Math.floor(sample.length * 0.1)];

  const maskAt = (row: number, col: number): boolean => {
    if (!plausible(mask)) return true;
    const mc = Math.floor(((lngOf(col) - mask.bounds.west) / (mask.bounds.east - mask.bounds.west)) * mask.width);
    const mr = Math.floor(((mask.bounds.north - latOf(row)) / (mask.bounds.north - mask.bounds.south)) * mask.height);
    if (mc < 0 || mr < 0 || mc >= mask.width || mr >= mask.height) return false;
    return mask.data[mr * mask.width + mc] > 0;
  };

  // 1. Slope direction per pixel inside the outline.
  const inside = new Uint8Array(W * H);
  const az = new Float32Array(W * H).fill(NaN);
  const pitch = new Float32Array(W * H).fill(NaN);
  let outlinePx = 0;
  for (let r = 1; r < H - 1; r++) {
    const lat = latOf(r);
    for (let c = 1; c < W - 1; c++) {
      if (!outlines.some((ring) => ring.length >= 3 && pointInRing(lat, lngOf(c), ring))) continue;
      inside[r * W + c] = 1;
      outlinePx++;
      const zc = z(c, r);
      if (!valid(zc) || zc - ground < MIN_ROOF_HEIGHT_M || !maskAt(r, c)) continue;
      // 3x3 Sobel gradient in metres.
      const g = [z(c - 1, r - 1), z(c, r - 1), z(c + 1, r - 1), z(c - 1, r), z(c + 1, r), z(c - 1, r + 1), z(c, r + 1), z(c + 1, r + 1)];
      if (!g.every(valid)) continue;
      const dzdx = (g[2] + 2 * g[4] + g[7] - (g[0] + 2 * g[3] + g[5])) / (8 * pxW); // towards east
      const dzdy = (g[0] + 2 * g[1] + g[2] - (g[5] + 2 * g[6] + g[7])) / (8 * pxH); // towards north
      const p = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
      if (p < MIN_PITCH_DEG || p > MAX_PITCH_DEG) continue;
      // Downslope is -gradient; compass azimuth from north, clockwise.
      az[r * W + c] = ((Math.atan2(-dzdx, -dzdy) * 180) / Math.PI + 360) % 360;
      pitch[r * W + c] = p;
    }
  }
  if (outlinePx === 0) return null;

  // 2. Snap directions onto the four square to the main walls; clean up.
  const sloped: number[] = [];
  az.forEach((a) => {
    if (!Number.isNaN(a)) sloped.push(a);
  });
  if (sloped.length < 20) return null;
  const axis = circularMeanAxis(sloped);
  let cls = new Int8Array(W * H).fill(-1);
  az.forEach((a, i) => {
    if (Number.isNaN(a)) return;
    cls[i] = (((Math.round((a - axis) / 90) % 4) + 4) % 4) as number;
  });
  for (let pass = 0; pass < 2; pass++) {
    const next = new Int8Array(cls);
    for (let r = 1; r < H - 1; r++) {
      for (let c = 1; c < W - 1; c++) {
        if (!inside[r * W + c]) continue;
        const votes = [0, 0, 0, 0];
        let roofN = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const k = cls[(r + dr) * W + (c + dc)];
            if (k >= 0) {
              votes[k]++;
              roofN++;
            }
          }
        }
        if (roofN < 4) continue;
        const best = votes.indexOf(Math.max(...votes));
        if (votes[best] >= 5) next[r * W + c] = best;
      }
    }
    cls = next;
  }

  // 3. Each direction class → connected faces → traced outlines.
  const faces: DetectedFace[] = [];
  let facePx = 0;
  for (let k = 0; k < 4; k++) {
    const bin = new Uint8Array(W * H);
    let any = false;
    for (let i = 0; i < bin.length; i++) {
      if (cls[i] === k && inside[i]) {
        bin[i] = 1;
        any = true;
      }
    }
    if (!any) continue;
    const outlinesK = extractRoofOutlinesFromMask({ ...dsm, data: bin, noDataValue: null });
    for (const o of outlinesK) {
      if (o.areaM2 < MIN_FACE_AREA_M2 || o.ring.length < 3) continue;
      // 4. Plane fit over the face's pixels: z = a·x + b·y + c (x east, y north, metres).
      let n = 0, sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
      for (let r = 0; r < H; r++) {
        const lat = latOf(r);
        for (let c = 0; c < W; c++) {
          const i = r * W + c;
          if (bin[i] !== 1 || !pointInRing(lat, lngOf(c), o.ring)) continue;
          const x = c * pxW;
          const y = -r * pxH;
          const zz = dsm.data[i];
          n++; sx += x; sy += y; sz += zz; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * zz; syz += y * zz;
        }
      }
      if (n < 6) continue;
      facePx += n;
      // Solve the 2x2 normal equations on centred sums.
      const mx = sx / n, my = sy / n, mz = sz / n;
      const cxx = sxx / n - mx * mx, cyy = syy / n - my * my, cxy = sxy / n - mx * my;
      const cxz = sxz / n - mx * mz, cyz = syz / n - my * mz;
      const det = cxx * cyy - cxy * cxy;
      let a: number, b: number;
      if (Math.abs(det) > 1e-9) {
        a = (cxz * cyy - cyz * cxy) / det;
        b = (cyz * cxx - cxz * cxy) / det;
      } else {
        const t = ((axis + k * 90) * Math.PI) / 180;
        a = -Math.sin(t) * 0.45;
        b = -Math.cos(t) * 0.45;
      }
      const pitchDeg = (Math.atan(Math.hypot(a, b)) * 180) / Math.PI;
      const azimuthDeg = ((Math.atan2(-a, -b) * 180) / Math.PI + 360) % 360;
      const azRad = (azimuthDeg * Math.PI) / 180;
      // Row direction is along the contour, square to the downslope (east, north) = (sin, cos).
      const eaveDeg = (Math.atan2(Math.sin(azRad), -Math.cos(azRad)) * 180) / Math.PI;
      faces.push({ ring: o.ring, azimuthDeg, pitchDeg, areaM2: n * pxArea, eaveDeg });
    }
  }
  if (faces.length === 0 || facePx / outlinePx < MIN_COVERAGE) return null;
  return faces.sort((p, q) => q.areaM2 - p.areaM2);
}
