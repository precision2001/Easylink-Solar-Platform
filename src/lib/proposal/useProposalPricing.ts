"use client";

import { useEffect, useState } from "react";

import { fetchProposalPricing, type ProposalPricingResponse } from "@/lib/proposal/proposalPricing";

/**
 * Customer prices for a design from the backend pricing engine v2
 * (POST /api/pricing/proposal). Debounced; the last good result stays on
 * screen while a new one loads. Used by the website Designs page and the
 * Solar Designer in the Master and Installer portals.
 */
export function useProposalPricing(
  panelCount: number,
  panelTierId: string,
  batteryKwh: number,
  batteryOptionsKwh: number[] = [],
  tiers: string[] = [],
) {
  const [data, setData] = useState<ProposalPricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const optionsKey = batteryOptionsKwh.join(",");
  const tiersKey = tiers.join(",");
  useEffect(() => {
    if (panelCount <= 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetchProposalPricing(
        {
          panelCount,
          panelTierId,
          batteryKwh,
          tiers: tiersKey ? tiersKey.split(",") : undefined,
          batteryOptionsKwh: optionsKey ? optionsKey.split(",").map(Number) : [],
        },
        ctrl.signal,
      )
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setError(e instanceof Error ? e.message : "Pricing is unavailable");
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [panelCount, panelTierId, batteryKwh, optionsKey, tiersKey]);
  return { data, loading, error };
}
