"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GeoTiffOverlay,
  GeoTiffMaskOverlay,
  GeoTiffRaster,
  GeoTiffRgbOverlay,
} from "@/utils/geotiff";
import {
  fetchCombinedSolarData,
  type DataLayersResult,
} from "./solarCombinedFetch";

export type SolarLayerType = "rgb" | "mask" | "flux" | "dsm";

export interface SolarLayersState {
  rgb: GeoTiffRgbOverlay | null;
  mask: GeoTiffMaskOverlay | null;
  flux: GeoTiffOverlay | null;
  /** Surface heights — used to find each roof's faces and lines. */
  dsm: GeoTiffRaster | null;
  loading: boolean;
  error: string | null;
}

/**
 * Goes through the combined estimate+data-layers endpoint (see
 * solarCombinedFetch) so it shares one request with useSolarEstimate instead
 * of hitting solarLimiter on its own.
 */
async function fetchDataLayersMeta(
  lat: number,
  lng: number,
): Promise<DataLayersResult> {
  const { dataLayers } = await fetchCombinedSolarData(lat, lng);
  return dataLayers;
}

async function fetchAndParseLayer(
  tiffUrl: string,
  type: SolarLayerType,
  signal: AbortSignal,
): Promise<GeoTiffOverlay | GeoTiffMaskOverlay | GeoTiffRaster> {
  const proxyUrl = `/api/solar/geotiff-proxy?url=${encodeURIComponent(tiffUrl)}`;
  const res = await fetch(proxyUrl, { signal });

  if (!res.ok) {
    throw new Error(`GeoTIFF download failed (${type}): HTTP ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new Error(`GeoTIFF response is empty (${type})`);
  }

  const { parseGeoTiffRgb, parseGeoTiffMask, parseGeoTiffFlux, parseGeoTiffDsm } =
    await import("@/utils/geotiff");

  switch (type) {
    case "rgb":
      return parseGeoTiffRgb(buf);
    case "mask":
      return parseGeoTiffMask(buf);
    case "flux":
      return parseGeoTiffFlux(buf);
    case "dsm":
      return parseGeoTiffDsm(buf);
  }
}

export function useSolarLayers(
  location: { lat: number; lng: number } | null,
  layers: SolarLayerType[] = ["rgb", "mask"],
) {
  const [state, setState] = useState<SolarLayersState>({
    rgb: null,
    mask: null,
    flux: null,
    dsm: null,
    loading: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const prevUrlsRef = useRef<string[]>([]);

  const loadLayers = useCallback(
    async (lat: number, lng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const meta = await fetchDataLayersMeta(lat, lng);
        if (controller.signal.aborted) return;

        const urlMap: Partial<Record<SolarLayerType, string>> = {};
        if (layers.includes("rgb") && meta.rgbUrl) urlMap.rgb = meta.rgbUrl;
        if (layers.includes("mask") && meta.maskUrl) urlMap.mask = meta.maskUrl;
        if (layers.includes("flux") && meta.annualFluxUrl)
          urlMap.flux = meta.annualFluxUrl;
        if (layers.includes("dsm") && meta.dsmUrl) urlMap.dsm = meta.dsmUrl;

        if (Object.keys(urlMap).length === 0) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: "No imagery URLs returned for this location.",
          }));
          return;
        }

        const results: {
          rgb?: GeoTiffRgbOverlay;
          mask?: GeoTiffMaskOverlay;
          flux?: GeoTiffOverlay;
          dsm?: GeoTiffRaster;
        } = {};
        const errors: string[] = [];

        const settled = await Promise.allSettled(
          (Object.entries(urlMap) as [SolarLayerType, string][]).map(
            async ([type, url]) => {
              const overlay = await fetchAndParseLayer(
                url,
                type,
                controller.signal,
              );
              if (type === "mask") results.mask = overlay as GeoTiffMaskOverlay;
              else if (type === "rgb") results.rgb = overlay as GeoTiffRgbOverlay;
              else if (type === "flux") results.flux = overlay as GeoTiffOverlay;
              else if (type === "dsm") results.dsm = overlay as GeoTiffRaster;
            },
          ),
        );

        for (const r of settled) {
          if (r.status === "rejected") {
            const msg =
              r.reason instanceof Error ? r.reason.message : String(r.reason);
            if (
              r.reason instanceof DOMException &&
              r.reason.name === "AbortError"
            )
              return;
            console.error("Solar layer failed:", msg);
            errors.push(msg);
          }
        }

        if (controller.signal.aborted) return;

        setState({
          rgb: results.rgb ?? null,
          mask: results.mask ?? null,
          flux: results.flux ?? null,
          dsm: results.dsm ?? null,
          loading: false,
          error: errors.length > 0 ? errors.join("; ") : null,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "Failed to load solar layers.";
        console.error("Solar layers error:", msg, err);
        setState((prev) => ({ ...prev, loading: false, error: msg }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers.join(",")],
  );

  useEffect(() => {
    if (!location) return;
    void loadLayers(location.lat, location.lng);

    return () => {
      abortRef.current?.abort();
    };
  }, [location, loadLayers]);

  useEffect(() => {
    return () => {
      prevUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const urls: string[] = [];
    if (state.rgb) urls.push(state.rgb.imageUrl);
    if (state.mask) urls.push(state.mask.imageUrl);
    if (state.flux) urls.push(state.flux.imageUrl);

    const prev = prevUrlsRef.current;
    prev.forEach((url) => {
      if (!urls.includes(url)) URL.revokeObjectURL(url);
    });
    prevUrlsRef.current = urls;
  }, [state.rgb, state.mask, state.flux]);

  const retry = useCallback(() => {
    if (location) void loadLayers(location.lat, location.lng);
  }, [location, loadLayers]);

  return { ...state, retry };
}
