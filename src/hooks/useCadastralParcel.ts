"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CadastralParcelResult {
  ring: { lat: number; lng: number }[];
  areaM2: number;
  lotNumber: string | null;
  planLabel: string | null;
  state: "NSW" | "VIC" | "QLD" | "WA" | "TAS";
}

type CadastralParcelState = {
  data: CadastralParcelResult | null;
  loading: boolean;
  error: string | null;
};

interface ApiEnvelope {
  success?: boolean;
  data?: CadastralParcelResult | null;
  message?: string;
}

function locationKey(
  location: { lat: number; lng: number } | null,
): string | null {
  return location ? `${location.lat},${location.lng}` : null;
}

/**
 * Free NSW cadastral (land parcel) lookup — a more precise alternative to
 * Google's sparse per-premise `bounds` for clipping a merged building-
 * footprint match (e.g. a terrace row) down to one address's own parcel.
 * NSW-only: `data` is null outside NSW, same as "no match" — callers treat
 * both the same way (nothing to clip against).
 *
 * Mirrors useBuildingFootprint's render-time reset pattern exactly: without
 * it, `loading`/`data` would briefly (or, given the one-shot roof-init
 * effect in DesignsSolarPanelStepContent, permanently) reflect the
 * *previous* address on mount and on every address change.
 */
export function useCadastralParcel(
  location: { lat: number; lng: number } | null,
) {
  const [state, setState] = useState<CadastralParcelState>(() => ({
    data: null,
    loading: Boolean(location),
    error: null,
  }));

  const [prevKey, setPrevKey] = useState(locationKey(location));
  const key = locationKey(location);
  if (prevKey !== key) {
    setPrevKey(key);
    setState({ data: null, loading: Boolean(key), error: null });
  }

  const abortRef = useRef<AbortController | null>(null);

  const fetchParcel = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ data: null, loading: true, error: null });

    try {
      const res = await fetch(`/api/cadastre/lookup?lat=${lat}&lng=${lng}`, {
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as ApiEnvelope;

      if (controller.signal.aborted) return;

      if (!res.ok) {
        setState({
          data: null,
          loading: false,
          error: json.message ?? "Unable to look up cadastral parcel.",
        });
        return;
      }

      setState({ data: json.data ?? null, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState({
        data: null,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Unable to look up cadastral parcel.",
      });
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    void fetchParcel(location.lat, location.lng);

    return () => {
      abortRef.current?.abort();
    };
  }, [location, fetchParcel]);

  return state;
}
