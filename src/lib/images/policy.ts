/**
 * One compression policy for every image that enters the platform: photos,
 * bills, chat images, documents and the design map snapshot.
 *
 * Applied twice on purpose. The browser shrinks an image before uploading it
 * (so a 5 MB phone photo isn't refused by the web server or slow on mobile
 * data), and the server applies the same rules again as a backstop for
 * anything that arrives large: an old open tab, a direct API call.
 *
 * Shared by `lib/images/compress-browser.ts` and
 * `lib/server/image-compress.ts`; this file stays free of browser and Node
 * APIs so both can import it.
 */

/** Longest side, in pixels. Enough to read a meter, serial plate or bill. */
export const IMAGE_MAX_DIMENSION = 2048;

/** What a compressed image should come in under. */
export const IMAGE_TARGET_BYTES = 700 * 1024;

/** JPEG quality steps, tried in order until the image fits the target. */
export const IMAGE_QUALITY_LADDER = [0.82, 0.72, 0.62, 0.5] as const;

/**
 * The design map snapshot is shown at card size and in the proposal, so it
 * gets a smaller budget: it travels inside every design save.
 */
export const MAP_SNAPSHOT_MAX_DIMENSION = 1600;
export const MAP_SNAPSHOT_TARGET_BYTES = 250 * 1024;

/** Images already small enough are left exactly as they are. */
export const IMAGE_SKIP_BELOW_BYTES = 200 * 1024;

/**
 * Formats that are re-encoded. GIF (may be animated) and SVG (vector) are
 * passed through untouched; HEIC is decoded where the platform can.
 */
export function isCompressibleImage(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m === "image/jpeg" ||
    m === "image/jpg" ||
    m === "image/png" ||
    m === "image/webp" ||
    m === "image/heic" ||
    m === "image/heif" ||
    m === "image/bmp" ||
    m === "image/tiff"
  );
}

/** Width and height scaled so the longest side is at most `max`. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max || longest <= 0) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** "photo.png" -> "photo.jpg" once it has been re-encoded as JPEG. */
export function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, "");
  return `${base || "image"}${ext}`;
}

/** Bytes a base64 data URL decodes to (close enough for size checks). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.length - comma - 1 : dataUrl.length;
  return Math.floor((b64 * 3) / 4);
}
