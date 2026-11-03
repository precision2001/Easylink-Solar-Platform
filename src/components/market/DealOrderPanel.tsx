"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/jobs/ui";
import type { AiPortal } from "@/lib/ai-platform/client";
import { aud, market, type DealOrder } from "@/lib/ai-platform/market";
import { ORDER_STEPS } from "./InstallerReadyDeals";

/** Customer portal: the Ready Deal behind this job, its two payments and the refund policy. */
export function DealOrderPanel({ portal, jobId }: { portal: AiPortal; jobId: string }) {
  const [o, setO] = useState<DealOrder | null>(null);
  useEffect(() => {
    market.orderForJob(portal, jobId).then(setO).catch(() => setO(null));
  }, [portal, jobId]);
  if (!o) return null;
  const at = ORDER_STEPS.indexOf(o.stage);
  const half = Math.round(o.price * 50) / 100;
  return (
    <Card title={`Your Ready Deal · order ${o.ref}`} aside={o.status === "cancelled" || o.status === "refunded" ? <Pill tone="bad">{o.status === "refunded" ? "Refunded" : "Cancelled"}</Pill> : <Pill tone="info">{o.stage}</Pill>}>
      <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
        {ORDER_STEPS.slice(1).map((s, i) => (
          <li key={s} className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${i + 1 < at ? "bg-[#DCFCE7] text-[#166534]" : i + 1 === at ? "bg-[#0B4A7A] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
            {s === "Call the customer" ? "Installer calls you" : s}
          </li>
        ))}
      </ol>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13.5px]">
        <dt className="text-[#475569]">Price after STCs</dt>
        <dd className="m-0 text-right font-semibold">{aud(o.price)}</dd>
        <dt className="text-[#475569]">When you bought (50%)</dt>
        <dd className="m-0 text-right">{aud(half)}{at >= 1 ? " · paid" : " · due now"}</dd>
        <dt className="text-[#475569]">Before installation (50%)</dt>
        <dd className="m-0 text-right">{aud(o.price - half)}</dd>
      </dl>
      {o.cancel && <p className="m-0 text-[13px] text-[#991B1B]">Cancelled: {o.cancel.reason}{o.cancel.refund ? `. Refund of ${aud(o.cancel.refund)} on its way.` : ""}</p>}
      {o.refundPolicy && (
        <details className="text-[13px] text-[#334155]">
          <summary className="cursor-pointer font-semibold text-[#0F172A]">Refund policy</summary>
          <ul className="mb-0 mt-1 pl-5">
            {o.refundPolicy.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
