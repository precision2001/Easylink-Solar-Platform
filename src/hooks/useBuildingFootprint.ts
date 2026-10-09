"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface BuildingFootprintResult {
  ring: { lat: number; lng: number }[];
  distanceM: number;
  areaM2: number;
}

type BuildingFootprintState = {
  data: BuildingFootprintResult | null;
  loading: boolean;
  error: string | null;
};

interface ApiEnvelope {
  success?: boolean;
  data?: BuildingFootprintResult | null;
  message?: string;
}

/**
 * Free Microsoft building-footprint lookup — the roof-outline starting point
 * now used instead of Google Solar's mask trace (see the "Why Google Solar
 * API Falls Short in Australia" doc: Google's AU imagery is too dated/low-
 * quality to trust for precise roofs). One footprint per building, not a
 * true roof-plane trace, so a match here always needs the installer's
 * verification — see `roofNeedsVerification` in DesignsSolarPanelStepContent.
 */
function locationKey(
  location: { lat: number; lng: number } | null,
): string | null {
  return location ? `${location.lat},${location.lng}` : null;
}

export function useBuildingFootprint(
  location: { lat: number; lng: number } | null,
) {
  const [state, setState] = useState<BuildingFootprintState>(() => ({
    data: null,
    loading: Boolean(location),
    error: null,
  }));

  // Derived-state-during-render reset (same pattern as this file's caller,
  // DesignsSolarPanelStepContent's `prevSelectedLocation`): when `location`
  // changes, `state` must stop reflecting the *previous* address on this
  // same render — not one render later, once an effect gets around to it.
  // Without this, callers that gate a fallback on `loading`/`data` (see
  // DesignsSolarPanelStepContent's roof-init effect) briefly — or, given
  // that effect only ever runs once per address, permanently — read the
  // old address's footprint as if it were the new address's.
  const [prevKey, setPrevKey] = useState(locationKey(location));
  const key = locationKey(location);
  if (prevKey !== key) {
    setPrevKey(key);
    setState({ data: null, loading: Boolean(key), error: null });
  }

  const abortRef = useRef<AbortController | null>(null);

  const fetchFootprint = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ data: null, loading: true, error: null });

    try {
      const res = await fetch(
        `/api/building-footprint/lookup?lat=${lat}&lng=${lng}`,
        { signal: controller.signal },
      );
      const json = (await res.json().catch(() => ({}))) as ApiEnvelope;

      if (controller.signal.aborted) return;

      if (!res.ok) {
        setState({
          data: null,
          loading: false,
          error: json.message ?? "Unable to look up building footprint.",
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
            : "Unable to look up building footprint.",
      });
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    void fetchFootprint(location.lat, location.lng);

    return () => {
      abortRef.current?.abort();
    };
  }, [location, fetchFootprint]);

  return state;
}
