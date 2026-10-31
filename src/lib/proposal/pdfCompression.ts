/**
 * Shrinks a rasterised PDF to fit under a size limit (for email).
 *
 * The proposal's pages are images, so the file size is set by how they are
 * encoded. This tries each step of the ladder — lower JPEG quality first,
 * then fewer pixels — and keeps the first result under the limit. Text
 * stays readable to the last step (about 115 dpi at 0.55 quality).
 */
export type CompressionStep = {
  /** JPEG quality, 0–1. */
  quality: number;
  /** Fraction of the captured pixels kept, 0–1. */
  resolution: number;
};

export const EMAIL_COMPRESSION_LADDER: CompressionStep[] = [
  { quality: 0.82, resolution: 1 },
  { quality: 0.72, resolution: 1 },
  { quality: 0.65, resolution: 0.85 },
  { quality: 0.6, resolution: 0.72 },
  { quality: 0.55, resolution: 0.62 },
];

/** Email providers and the site's request limits are comfortable well under this. */
export const EMAIL_PDF_MAX_BYTES = 1.5 * 1024 * 1024;

export type CompressionResult = {
  blob: Blob;
  step: CompressionStep;
  /** False when even the smallest step stayed over the limit (the smallest is returned). */
  fits: boolean;
};

/**
 * Builds with each step until one fits under `maxBytes`. `build` makes the
 * PDF for a step; it is called at most once per step, in order.
 */
export async function compressToLimit(
  build: (step: CompressionStep) => Promise<Blob>,
  maxBytes: number = EMAIL_PDF_MAX_BYTES,
  ladder: CompressionStep[] = EMAIL_COMPRESSION_LADDER,
): Promise<CompressionResult> {
  let last: CompressionResult | null = null;
  for (const step of ladder) {
    const blob = await build(step);
    last = { blob, step, fits: blob.size <= maxBytes };
    if (last.fits) return last;
  }
  if (!last) throw new Error("compressToLimit needs at least one step");
  return last;
}

export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
