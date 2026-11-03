import { rasterLatLngOf, type GeoTiffRaster } from "@/utils/geotiff";

export type LatLngRing = { lat: number; lng: number }[];

export type RoofOutline = {
  ring: LatLngRing;
  /** Approximate — pixel count × pixel footprint. The UI recomputes exact area from the saved polygon anyway. */
  areaM2: number;
};

/**
 * Roofs below this are treated as noise (antenna shadow, a single stray
 * pixel at a mask edge, etc.) rather than a real section worth drawing —
 * smaller than a single solar panel.
 */
const MIN_OUTLINE_AREA_M2 = 3;

/** Hard cap so a pathologically fragmented mask can't hand the editor hundreds of tiny polygons. */
const MAX_OUTLINES = 25;

function isRoof(
  data: GeoTiffRaster["data"],
  idx: number,
  noData: number | null,
): boolean {
  const v = data[idx];
  if (typeof v !== "number") return false;
  if (noData !== null && Math.abs(v - noData) < 1e-6) return false;
  return v > 0;
}

/**
 * Real-world area of one raster pixel, in m². Google's mask/DSM rasters are
 * small enough (a few hundred pixels per side, covering one building) that
 * treating the pixel grid as locally flat is accurate to well under 1%.
 */
function pixelAreaM2(raster: GeoTiffRaster): number {
  if (raster.utm) return Math.abs(raster.utm.resX * raster.utm.resY);
  const { bounds, width, height } = raster;
  const centerLatRad = ((bounds.north + bounds.south) / 2) * (Math.PI / 180);
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos(centerLatRad);
  const pixelWidthDeg = Math.abs(bounds.east - bounds.west) / width;
  const pixelHeightDeg = Math.abs(bounds.north - bounds.south) / height;
  return (
    pixelWidthDeg * metersPerDegLng * (pixelHeightDeg * metersPerDegLat)
  );
}

/**
 * Labels every "is roof" pixel in the raster with which connected blob it
 * belongs to (4-connected flood fill from every unvisited roof pixel).
 * Label 0 means "not roof". Large commercial/industrial roofs commonly come
 * back as *several* disconnected blobs — ridge lines, rooftop plant, vents
 * and skylights all break the mask — so this intentionally finds all of
 * them rather than stopping at the first one.
 */
function labelConnectedComponents(raster: GeoTiffRaster): {
  labels: Int32Array;
  sizes: number[];
} {
  const { data, width, height, noDataValue } = raster;
  const n = width * height;
  const labels = new Int32Array(n);
  const sizes: number[] = [0]; // sizes[0] is unused — labels start at 1

  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (labels[start] !== 0 || !isRoof(data, start, noDataValue)) continue;

    const label = sizes.length;
    let size = 0;
    labels[start] = label;
    stack.push(start);

    while (stack.length > 0) {
      const cur = stack.pop()!;
      size++;
      const r = Math.floor(cur / width);
      const c = cur - r * width;
      const neighbors = [
        r > 0 ? cur - width : -1,
        r < height - 1 ? cur + width : -1,
        c > 0 ? cur - 1 : -1,
        c < width - 1 ? cur + 1 : -1,
      ];
      for (const ni of neighbors) {
        if (ni < 0 || labels[ni] !== 0 || !isRoof(data, ni, noDataValue)) {
          continue;
        }
        labels[ni] = label;
        stack.push(ni);
      }
    }

    sizes.push(size);
  }

  return { labels, sizes };
}

/**
 * Padded Moore–Neighborhood boundary (8-connected). `comp` is 0/1, same size as raster.
 * Returns vertex list in pixel coords (col, row) along the outer boundary.
 */
function mooreBoundaryRing(
  comp: Uint8Array,
  width: number,
  height: number,
): [number, number][] {
  const pw = width + 2;
  const ph = height + 2;
  const pad = new Uint8Array(pw * ph);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      pad[(r + 1) * pw + (c + 1)] = comp[r * width + c] ? 1 : 0;
    }
  }

  let sc = -1;
  let sr = -1;
  for (let r = 1; r < ph - 1 && sc < 0; r++) {
    for (let c = 1; c < pw - 1; c++) {
      const i = r * pw + c;
      if (pad[i] && !pad[i - pw]) {
        sc = c;
        sr = r;
        break;
      }
    }
  }
  if (sc < 0) return [];

  const dr = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dc = [0, 1, 1, 1, 0, -1, -1, -1];

  const path: [number, number][] = [];
  let r = sr;
  let c = sc;
  let dir = 7;

  const maxSteps = pw * ph * 8 + 20;
  for (let step = 0; step < maxSteps; step++) {
    path.push([c - 1, r - 1]);

    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + k) % 8;
      const nr = r + dr[d];
      const nc = c + dc[d];
      const ni = nr * pw + nc;
      if (pad[ni]) {
        r = nr;
        c = nc;
        dir = (d + 6) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;

    if (r === sr && c === sc && path.length > 2) break;
  }

  return path;
}

function douglasPeucker(
  pts: [number, number][],
  eps: number,
): [number, number][] {
  if (pts.length <= 2) return pts;
  let maxD = 0;
  let idx = 0;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointSegDist(pts[i][0], pts[i][1], sx, sy, ex, ey);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const a = douglasPeucker(pts.slice(0, idx + 1), eps);
    const b = douglasPeucker(pts.slice(idx), eps);
    return [...a.slice(0, -1), ...b];
  }
  return [pts[0], pts[pts.length - 1]];
}

function pointSegDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function ringToLatLng(
  ring: [number, number][],
  raster: GeoTiffRaster,
): LatLngRing {
  const out: LatLngRing = [];
  for (const [col, row] of ring) out.push(rasterLatLngOf(raster, col, row));
  return out;
}

/**
 * Every roof outline traced from the Solar roof mask, largest first — not
 * just the one connected blob nearest the pin.
 *
 * The Building Insights API does not expose roof vertices, only a raster
 * mask of which pixels are roof; on a simple house that mask is one solid
 * blob and tracing from the pin is enough. On a large commercial/industrial
 * roof it commonly comes back as *several* disconnected blobs — ridge
 * lines, rooftop plant, vents and skylights all break the mask — so a
 * single pin-seeded trace silently returns only whichever fragment happens
 * to be nearest the pin, which can be a small fraction of the real roof.
 * This labels every connected component in the whole raster, discards
 * specks too small to be a real roof section, and traces + simplifies each
 * of the rest, so auto-detection covers the whole building instead of one
 * fragment of it.
 */
export function extractRoofOutlinesFromMask(
  maskRaster: GeoTiffRaster,
  { simplifyPx = 1.0 }: { simplifyPx?: number } = {},
): RoofOutline[] {
  const { width, height } = maskRaster;
  const { labels, sizes } = labelConnectedComponents(maskRaster);
  const pxArea = pixelAreaM2(maskRaster);

  const candidates = sizes
    .map((size, label) => ({ label, size, areaM2: size * pxArea }))
    .slice(1) // drop the unused label-0 placeholder
    .filter((c) => c.areaM2 >= MIN_OUTLINE_AREA_M2)
    .sort((a, b) => b.areaM2 - a.areaM2)
    .slice(0, MAX_OUTLINES);

  const outlines: RoofOutline[] = [];
  for (const { label, areaM2 } of candidates) {
    const comp = new Uint8Array(width * height);
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === label) comp[i] = 1;
    }

    const ringPx = mooreBoundaryRing(comp, width, height);
    if (ringPx.length < 3) continue;

    const simplified = douglasPeucker(ringPx, simplifyPx);
    if (simplified.length < 3) continue;

    outlines.push({ ring: ringToLatLng(simplified, maskRaster), areaM2 });
  }

  return outlines;
}
