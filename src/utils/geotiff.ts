import { fromArrayBuffer } from "geotiff";

export interface GeoTiffBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoTiffRaster {
  data: Float32Array | Float64Array | Uint8Array;
  width: number;
  height: number;
  bounds: GeoTiffBounds;
  noDataValue: number | null;
}

export interface GeoTiffOverlay {
  imageUrl: string;
  bounds: GeoTiffBounds;
}

/** RGB overlay plus a luminance raster, used to check roof lines against the image. */
export interface GeoTiffRgbOverlay extends GeoTiffOverlay {
  luma: GeoTiffRaster;
}

/** Mask overlay plus raw single-band raster for geometry (roof perimeter tracing). */
export interface GeoTiffMaskOverlay extends GeoTiffOverlay {
  raster: GeoTiffRaster;
}

/**
 * Parse a GeoTIFF ArrayBuffer, render pixels to a canvas, and return
 * a blob URL + geographic bounds suitable for a Google Maps GroundOverlay.
 */
export async function parseGeoTiffRgb(
  arrayBuffer: ArrayBuffer,
): Promise<GeoTiffRgbOverlay> {
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();

  const bounds = computeBounds(originX, originY, width, height, resX, resY);

  const samplesPerPixel = image.getSamplesPerPixel();
  const rasters = await image.readRasters();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const luma = new Float32Array(width * height);

  if (samplesPerPixel >= 3) {
    const r = rasters[0] as Uint8Array;
    const g = rasters[1] as Uint8Array;
    const b = rasters[2] as Uint8Array;
    for (let i = 0; i < width * height; i++) {
      luma[i] = 0.299 * r[i] + 0.587 * g[i] + 0.114 * b[i];
      data[i * 4] = r[i];
      data[i * 4 + 1] = g[i];
      data[i * 4 + 2] = b[i];
      data[i * 4 + 3] = 255;
    }
  } else {
    const band = rasters[0] as Uint8Array;
    for (let i = 0; i < width * height; i++) {
      luma[i] = band[i];
      data[i * 4] = band[i];
      data[i * 4 + 1] = band[i];
      data[i * 4 + 2] = band[i];
      data[i * 4 + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const imageUrl = await canvasToBlobUrl(canvas);
  return {
    imageUrl,
    bounds,
    luma: { data: luma, width, height, bounds, noDataValue: null },
  };
}

/**
 * Parse a single-band GeoTIFF (e.g. building mask) and render it as a
 * semi-transparent color overlay. Pixels with value > 0 are colored;
 * pixels with value = 0 are fully transparent.
 */
export async function parseGeoTiffMask(
  arrayBuffer: ArrayBuffer,
  color: [number, number, number] = [33, 148, 243],
  opacity = 0.45,
): Promise<GeoTiffMaskOverlay> {
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();

  const bounds = computeBounds(originX, originY, width, height, resX, resY);

  const rasters = await image.readRasters();
  const band = rasters[0] as Uint8Array | Float32Array | Float64Array;
  const noData = image.getGDALNoData();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const alpha = Math.round(opacity * 255);

  for (let i = 0; i < width * height; i++) {
    if (band[i] > 0) {
      data[i * 4] = color[0];
      data[i * 4 + 1] = color[1];
      data[i * 4 + 2] = color[2];
      data[i * 4 + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const imageUrl = await canvasToBlobUrl(canvas);
  const raster: GeoTiffRaster = {
    data: band,
    width,
    height,
    bounds,
    noDataValue: noData ?? null,
  };
  return { imageUrl, bounds, raster };
}

/** Parse a DSM (surface height, metres) GeoTIFF into a raster for roof-face detection. */
export async function parseGeoTiffDsm(arrayBuffer: ArrayBuffer): Promise<GeoTiffRaster> {
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  const bounds = computeBounds(originX, originY, width, height, resX, resY);
  const rasters = await image.readRasters();
  const band = rasters[0] as Float32Array | Float64Array;
  const noData = image.getGDALNoData();
  return { data: band, width, height, bounds, noDataValue: noData ?? null };
}

/**
 * Parse an annual flux GeoTIFF and render it as a heat-map overlay.
 * Higher flux values -> warmer colors (yellow -> red).
 */
export async function parseGeoTiffFlux(
  arrayBuffer: ArrayBuffer,
  opacity = 0.6,
): Promise<GeoTiffOverlay> {
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();

  const bounds = computeBounds(originX, originY, width, height, resX, resY);

  const rasters = await image.readRasters();
  const band = rasters[0] as Float32Array | Float64Array;

  let maxVal = 0;
  for (let i = 0; i < band.length; i++) {
    if (band[i] > maxVal) maxVal = band[i];
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const alpha = Math.round(opacity * 255);

  for (let i = 0; i < width * height; i++) {
    const val = band[i];
    if (val <= 0 || maxVal === 0) continue;

    const t = val / maxVal;
    const [r, g, b] = fluxColor(t);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = alpha;
  }

  ctx.putImageData(imageData, 0, 0);

  const imageUrl = await canvasToBlobUrl(canvas);
  return { imageUrl, bounds };
}

/* ── helpers ─────────────────────────────────────────────────── */

function computeBounds(
  originX: number,
  originY: number,
  width: number,
  height: number,
  resX: number,
  resY: number,
) {
  return {
    west: originX,
    north: originY,
    east: originX + width * resX,
    south: originY + height * resY,
  };
}

function fluxColor(t: number): [number, number, number] {
  if (t < 0.25) return [0, Math.round(t * 4 * 255), 255];
  if (t < 0.5) return [0, 255, Math.round((1 - (t - 0.25) * 4) * 255)];
  if (t < 0.75) return [Math.round((t - 0.5) * 4 * 255), 255, 0];
  return [255, Math.round((1 - (t - 0.75) * 4) * 255), 0];
}

async function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("Canvas.toBlob returned null");
  return URL.createObjectURL(blob);
}

export function revokeOverlayUrl(overlay: GeoTiffOverlay): void {
  URL.revokeObjectURL(overlay.imageUrl);
}
