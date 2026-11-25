"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchProposalPricing,
  priceBatteryPicks,
  type ChosenProducts,
  type ProposalPricingResponse,
} from "@/lib/proposal/proposalPricing";

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
  products?: ChosenProducts,
  phase?: 1 | 3,
) {
  const [data, setData] = useState<ProposalPricingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const optionsKey = batteryOptionsKwh.join(",");
  const tiersKey = tiers.join(",");
  const productsKey = products ? JSON.stringify(products) : "";
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
          ...(productsKey ? { products: JSON.parse(productsKey) as ChosenProducts } : {}),
          ...(phase ? { phase } : {}),
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
  }, [panelCount, panelTierId, batteryKwh, optionsKey, tiersKey, productsKey, phase]);
  return { data, loading, error };
}

/**
 * Each picked-battery option priced as that exact battery (one engine call
 * each), so option cards quote the battery the customer picked, not the
 * cheapest battery near its size. Debounced like `useProposalPricing`.
 */
export function usePickPrices(
  panelCount: number,
  panelTierId: string,
  picks: { id: string; kwh: number; products: ChosenProducts }[],
  phase?: 1 | 3,
) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const picksKey = JSON.stringify(picks);
  useEffect(() => {
    const list = JSON.parse(picksKey) as typeof picks;
    if (panelCount <= 0 || list.length === 0) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      priceBatteryPicks({ panelCount, panelTierId, ...(phase ? { phase } : {}) }, list, ctrl.signal).then((p) => {
        if (!ctrl.signal.aborted) setPrices(p);
      });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [panelCount, panelTierId, picksKey, phase]);
  // Only the picks still on the design (a removed pick's old price is dropped).
  return useMemo(() => {
    const ids = new Set(picks.map((p) => p.id));
    return Object.fromEntries(Object.entries(prices).filter(([id]) => ids.has(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- picksKey stands for picks
  }, [prices, picksKey]);
}
