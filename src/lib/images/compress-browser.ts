import {
  IMAGE_MAX_DIMENSION,
  IMAGE_QUALITY_LADDER,
  IMAGE_SKIP_BELOW_BYTES,
  IMAGE_TARGET_BYTES,
  MAP_SNAPSHOT_MAX_DIMENSION,
  MAP_SNAPSHOT_TARGET_BYTES,
  dataUrlBytes,
  fitWithin,
  isCompressibleImage,
  withExtension,
} from "@/lib/images/policy";

/**
 * Browser half of the image policy (see lib/images/policy.ts): shrink an
 * image before it is uploaded. The server compresses again as a backstop,
 * so anything that can't be handled here (an unsupported format, an old
 * browser) is simply sent as it is.
 */

/** Draws `source` scaled to fit `max`; null when the browser can't. */
function drawScaled(
  source: CanvasImageSource,
  width: number,
  height: number,
  max: number,
): HTMLCanvasElement | null {
  const size = fitWithin(width, height, max);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG has no transparency; paint white so transparent areas don't go black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Compresses a photo or scan picked by the user. Returns the original file
 * for non-images, small images, or whenever the result wouldn't be smaller.
 */
export async function compressImageForUpload(
  file: File,
  { maxDimension = IMAGE_MAX_DIMENSION, targetBytes = IMAGE_TARGET_BYTES } = {},
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!isCompressibleImage(file.type) || file.size < IMAGE_SKIP_BELOW_BYTES) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // `from-image` applies the camera's EXIF rotation so photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, maxDimension);
    if (!canvas) return file;

    let best: Blob | null = null;
    for (const quality of IMAGE_QUALITY_LADDER) {
      const blob = await toBlob(canvas, quality);
      if (!blob) break;
      best = blob;
      if (blob.size <= targetBytes) break;
    }
    if (!best || best.size >= file.size) return file;
    return new File([best], withExtension(file.name, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // HEIC on browsers that can't decode it, a corrupt file, etc.
    return file;
  } finally {
    bitmap?.close();
  }
}

/**
 * Encodes the design map snapshot (an html2canvas capture) as a JPEG data
 * URL within the snapshot budget. A PNG of satellite imagery runs ~1 MB;
 * this comes out around 150–250 KB and looks the same at card size.
 */
export function compressCanvasSnapshot(
  canvas: HTMLCanvasElement,
  { maxDimension = MAP_SNAPSHOT_MAX_DIMENSION, targetBytes = MAP_SNAPSHOT_TARGET_BYTES } = {},
): string {
  const scaled = drawScaled(canvas, canvas.width, canvas.height, maxDimension) ?? canvas;
  let best = "";
  for (const quality of IMAGE_QUALITY_LADDER) {
    best = scaled.toDataURL("image/jpeg", quality);
    if (dataUrlBytes(best) <= targetBytes) break;
  }
  return best || canvas.toDataURL("image/jpeg", 0.7);
}
