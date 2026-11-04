"use client";

import { useEffect, useState } from "react";
import { fetchAfterpayConfig, fetchZipConfig, type AfterpayConfig } from "@/lib/public/afterpayConfig";

/**
 * Afterpay and Zip as our merchant accounts actually offer them right now
 * (configured flag and order limits come from the providers via the backend).
 * Null while loading; an unreachable provider reads as not offered.
 */
export function usePayLaterOptions(): { afterpay: AfterpayConfig | null; zip: AfterpayConfig | null } {
  const [afterpay, setAfterpay] = useState<AfterpayConfig | null>(null);
  const [zip, setZip] = useState<AfterpayConfig | null>(null);
  useEffect(() => {
    let live = true;
    void fetchAfterpayConfig().then((c) => live && setAfterpay(c));
    void fetchZipConfig().then((c) => live && setZip(c));
    return () => {
      live = false;
    };
  }, []);
  return { afterpay, zip };
}

/** "Card, Afterpay or Zip" from whichever are switched on. Card (Stripe) is always there. */
export function waysToPayLabel(afterpay: AfterpayConfig | null, zip: AfterpayConfig | null): string {
  const extra = [afterpay?.configured ? "Afterpay" : null, zip?.configured ? "Zip" : null].filter(Boolean) as string[];
  if (extra.length === 0) return "Card";
  if (extra.length === 1) return `Card or ${extra[0]}`;
  return `Card, ${extra[0]} or ${extra[1]}`;
}
