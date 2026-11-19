"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Short technical status of a lead, as returned by POST /technical/status. */
export type TechnicalStatus = {
  jobType: string;
  jobTypeLabel: string;
  hasEquipment: boolean;
  readyPct: number;
  tbc: number;
  toCheck: number;
  warnings: number;
  checksDone: number;
  checksTotal: number;
  signedOff: boolean;
  reviewed: boolean;
};

/** Loads the technical status of the leads on screen in one request; refreshes when the list changes. */
export function useTechnicalStatus(leadIds: string[]) {
  const key = leadIds.join(",");
  const [map, setMap] = useState<Record<string, TechnicalStatus>>({});
  useEffect(() => {
    if (!key) return;
    let off = false;
    fetch("/api/admin/technical/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadIds: key.split(",").slice(0, 200) }), cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { data?: Record<string, TechnicalStatus> };
        if (!off && r.ok && j.data) setMap(j.data);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [key]);
  return map;
}

/**
 * Chip on a lead card: how ready the job's technical pack is (wiring, device
 * installation, circuit protection, CT routing, app). Opens the Technical
 * section of the customer record.
 */
export function TechnicalChip({ leadId, customerName, status }: { leadId: string; customerName: string; status: TechnicalStatus | undefined }) {
  if (!status) return null;
  const issues = status.tbc + status.warnings;
  const done = status.signedOff && status.reviewed;
  const tone = !status.hasEquipment
    ? { bg: "#F1F5F9", fg: "#334155", ring: "#CBD5E1" }
    : done
      ? { bg: "#DCFCE7", fg: "#166534", ring: "#86EFAC" }
      : issues
        ? { bg: "#FEF3C7", fg: "#92400E", ring: "#FCD34D" }
        : { bg: "#E0F2FE", fg: "#075985", ring: "#7DD3FC" };
  const parts = !status.hasEquipment
    ? ["No equipment yet"]
    : [
        done ? "Signed off" : `${status.readyPct}% ready`,
        status.tbc ? `${status.tbc} TBC` : null,
        status.warnings ? `${status.warnings} to check` : null,
      ].filter(Boolean);
  const text = `Technical · ${parts.join(" · ")}`;
  return (
    <Link
      href={`/master/customers/${leadId}#technical`}
      aria-label={`Technical section for ${customerName}: ${parts.join(", ")}${status.hasEquipment ? `, ${status.jobTypeLabel}` : ""}`}
      title={status.hasEquipment ? status.jobTypeLabel : undefined}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold no-underline ring-1 hover:underline"
      style={{ background: tone.bg, color: tone.fg, ["--tw-ring-color" as string]: tone.ring }}
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
      </svg>
      {text}
    </Link>
  );
}
