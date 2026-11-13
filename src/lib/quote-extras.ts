"use client";

import { useEffect, useState } from "react";

/** A price-book extra as the quote forms see it (customer price only). */
export type ExtraOption = {
  id: string;
  label: string;
  per: "job" | "panel";
  /** One unit (one job, or one panel), inc GST, in cents. */
  unitPriceCents: number;
};

/** Quantity of an extra on a quote: per-panel extras count every panel. */
export const extraQty = (x: Pick<ExtraOption, "per">, panels: number) => (x.per === "panel" ? Math.max(0, panels) : 1);

/** Extras from the EasyLink price book via GET /api/pricing/extras. */
export function useQuoteExtras() {
  const [extras, setExtras] = useState<ExtraOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/pricing/extras")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { data?: { extras?: ExtraOption[] }; message?: string } | null;
        if (!res.ok || !Array.isArray(body?.data?.extras)) throw new Error(body?.message || "Couldn't load the extras.");
        if (live) setExtras(body.data.extras);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't load the extras."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);
  return { extras, loading, error };
}
