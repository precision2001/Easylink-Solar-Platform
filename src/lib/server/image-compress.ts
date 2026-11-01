import {
  IMAGE_MAX_DIMENSION,
  IMAGE_QUALITY_LADDER,
  IMAGE_SKIP_BELOW_BYTES,
  IMAGE_TARGET_BYTES,
  MAP_SNAPSHOT_MAX_DIMENSION,
  MAP_SNAPSHOT_TARGET_BYTES,
  isCompressibleImage,
  withExtension,
} from "@/lib/images/policy";

/**
 * Server-side half of the image policy (see lib/images/policy.ts): every
 * image a route stores or forwards goes through here.
 *
 * - Rotated upright from the camera's EXIF, then all metadata is dropped,
 *   which also removes the GPS position phones write into photos.
 * - Scaled so the longest side is at most 2048 px.
 * - Re-encoded as JPEG, stepping quality down until it fits the target.
 *   Images with transparency become WebP instead so the background survives.
 * - Never makes things worse: if the result isn't smaller, or sharp can't
 *   read the file, the original is kept.
 */

type Sharp = typeof import("sharp");
let sharpModule: Sharp | null | undefined;

async function loadSharp(): Promise<Sharp | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    sharpModule = (await import("sharp")).default as unknown as Sharp;
  } catch (error) {
    console.error("image-compress: sharp unavailable, images stored as uploaded", error);
    sharpModule = null;
  }
  return sharpModule;
}

export type CompressedImage = {
  buffer: Buffer;
  mime: string;
  /** Extension matching `mime`, with the dot. */
  ext: string;
  changed: boolean;
};

export type CompressOptions = {
  maxDimension?: number;
  targetBytes?: number;
};

export async function compressImageBuffer(
  input: Buffer,
  mime: string,
  { maxDimension = IMAGE_MAX_DIMENSION, targetBytes = IMAGE_TARGET_BYTES }: CompressOptions = {},
): Promise<CompressedImage> {
  const unchanged: CompressedImage = { buffer: input, mime, ext: extFor(mime), changed: false };
  if (!isCompressibleImage(mime) || input.length < IMAGE_SKIP_BELOW_BYTES) return unchanged;

  const sharp = await loadSharp();
  if (!sharp) return unchanged;

  try {
    const meta = await sharp(input, { failOn: "none" }).metadata();
    const transparent = Boolean(meta.hasAlpha) && mime !== "image/jpeg";
    const pipeline = () =>
      sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true });

    let best: Buffer | null = null;
    for (const quality of IMAGE_QUALITY_LADDER) {
      const q = Math.round(quality * 100);
      const out = transparent
        ? await pipeline().webp({ quality: q }).toBuffer()
        : await pipeline().flatten({ background: "#ffffff" }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
      best = out;
      if (out.length <= targetBytes) break;
    }

    if (!best || best.length >= input.length) return unchanged;
    const outMime = transparent ? "image/webp" : "image/jpeg";
    return { buffer: best, mime: outMime, ext: extFor(outMime), changed: true };
  } catch (error) {
    console.error("image-compress: could not compress, keeping original", error);
    return unchanged;
  }
}

/** Compresses an uploaded File; non-images and small images come back as-is. */
export async function compressImageFile(file: File, options?: CompressOptions): Promise<File> {
  if (!isCompressibleImage(file.type) || file.size < IMAGE_SKIP_BELOW_BYTES) return file;
  const result = await compressImageBuffer(Buffer.from(await file.arrayBuffer()), file.type, options);
  if (!result.changed) return file;
  return new File([new Uint8Array(result.buffer)], withExtension(file.name, result.ext), {
    type: result.mime,
    lastModified: file.lastModified,
  });
}

/** Same for an image carried inline as a `data:image/...;base64,` URL. */
export async function compressImageDataUrl(dataUrl: string, options?: CompressOptions): Promise<string> {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(dataUrl);
  if (!match) return dataUrl;
  const result = await compressImageBuffer(
    Buffer.from(dataUrl.slice(match[0].length), "base64"),
    match[1].toLowerCase(),
    options,
  );
  return result.changed ? `data:${result.mime};base64,${result.buffer.toString("base64")}` : dataUrl;
}

/**
 * Compresses the map snapshot inside a design's wizard state, if present.
 * Returns the body unchanged when there is nothing to do.
 */
export async function compressDesignBody<T>(body: T): Promise<T> {
  const solarDesign = findSolarDesign(body);
  const url = solarDesign?.mapScreenshotDataUrl;
  if (typeof url !== "string" || !url.startsWith("data:image/")) return body;
  solarDesign!.mapScreenshotDataUrl = await compressImageDataUrl(url, {
    maxDimension: MAP_SNAPSHOT_MAX_DIMENSION,
    targetBytes: MAP_SNAPSHOT_TARGET_BYTES,
  });
  return body;
}

/** The design body is either the wizard input itself or nested under `design`. */
function findSolarDesign(body: unknown): { mapScreenshotDataUrl?: unknown } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const wizard =
    (record.wizardData as Record<string, unknown> | undefined) ??
    ((record.design as Record<string, unknown> | undefined)?.wizardData as Record<string, unknown> | undefined);
  const solar = wizard?.solarDesign;
  return solar && typeof solar === "object" ? (solar as { mapScreenshotDataUrl?: unknown }) : null;
}

/**
 * Rebuilds a multipart upload with every image part compressed. Other parts
 * (text fields, PDFs, documents) are passed through untouched.
 */
export async function compressFormDataImages(form: FormData): Promise<FormData> {
  const out = new FormData();
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") out.append(key, value);
    else {
      const file = await compressImageFile(value);
      out.append(key, file, file.name);
    }
  }
  return out;
}

function extFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

/**
 * Reads a design save's JSON body as text with its map snapshot compressed.
 * Bodies that aren't JSON are returned unchanged for the backend to reject.
 */
export async function readDesignBodyText(request: Request): Promise<string> {
  const text = await request.text();
  if (!text.includes("data:image/")) return text;
  try {
    return JSON.stringify(await compressDesignBody(JSON.parse(text)));
  } catch {
    return text;
  }
}
