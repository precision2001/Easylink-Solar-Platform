"use client";

import { useEffect, useState } from "react";
import type { GeoTiffRaster } from "@/utils/geotiff";
import {
  analyseRoofSnapshot,
  ROOF_SNAPSHOT,
  type RoofSnapshotAnalysis,
  type SnapshotGeo,
} from "@/lib/designer/roofSnapshot";

type LatLng = { lat: number; lng: number };

export type RoofSnapshotState = {
  analysis: RoofSnapshotAnalysis | null;
  /** True until the snapshot has been fetched and analysed (or has failed). */
  loading: boolean;
  error: string | null;
};

async function loadPixels(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Roof snapshot failed: HTTP ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Zoom-in roof analysis: fetches the zoomed Google satellite image around
 * the pin and finds the roof in it (see roofSnapshot.ts). Waits for Google's
 * coarse roof mask, when one is coming, so it can keep the roof near it.
 */
export function useRoofSnapshot(
  pin: LatLng | null,
  hint: GeoTiffRaster | null,
  hintPending: boolean,
  /** Google's height model: keeps tile-coloured paving and decks out of the roof. */
  dsm: GeoTiffRaster | null = null,
): RoofSnapshotState {
  const lat = pin?.lat;
  const lng = pin?.lng;
  const key = lat === undefined || lng === undefined ? null : `${lat},${lng}`;
  const [result, setResult] = useState<{ key: string; hint: GeoTiffRaster | null; dsm: GeoTiffRaster | null; analysis: RoofSnapshotAnalysis | null; error: string | null } | null>(null);

  useEffect(() => {
    if (key === null || lat === undefined || lng === undefined || hintPending) return;
    const controller = new AbortController();
    (async () => {
      try {
        // Zoom 21 first (~3 cm pixels); a roof too big for that frame is retried at 20.
        for (const zoom of [ROOF_SNAPSHOT.zoom, ROOF_SNAPSHOT.zoom - 1]) {
          const img = await loadPixels(`/api/solar/roof-snapshot?lat=${lat}&lng=${lng}&zoom=${zoom}`, controller.signal);
          const geo: SnapshotGeo = {
            centerLat: lat,
            centerLng: lng,
            zoom,
            scale: ROOF_SNAPSHOT.scale,
            widthPx: img.width,
            heightPx: img.height,
          };
          // Let the page paint before the analysis (a few hundred ms).
          await new Promise((r) => setTimeout(r, 0));
          if (controller.signal.aborted) return;
          const analysis = analyseRoofSnapshot(img.data, geo, { pin: { lat, lng }, hint, dsm });
          if (controller.signal.aborted) return;
          if (analysis) {
            setResult({ key, hint, dsm, analysis, error: null });
            return;
          }
        }
        setResult({ key, hint, dsm, analysis: null, error: "No roof found in the zoomed image" });
      } catch (e) {
        if (controller.signal.aborted) return;
        setResult({ key, hint, dsm, analysis: null, error: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => controller.abort();
  }, [key, lat, lng, hint, hintPending, dsm]);

  if (key === null) return { analysis: null, loading: false, error: null };
  const current = result && result.key === key && result.hint === hint && result.dsm === dsm ? result : null;
  if (!current) return { analysis: null, loading: true, error: null };
  return { analysis: current.analysis, loading: false, error: current.error };
}
