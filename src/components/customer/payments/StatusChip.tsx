import type { ReactNode } from "react";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import type { StatusTone } from "@/lib/customers/payment-view";

const TONES: Record<StatusTone, string> = {
  good: "bg-[#ECFDF3] text-[#15803D]",
  warn: "bg-[#FFF4D6] text-[#7A3E00]",
  bad: "bg-[#FEE2E2] text-[#991B1B]",
  muted: "bg-[#F1F5F9] text-[#475569]",
  info: "bg-[#EFF6FF] text-[#1D4ED8]",
};

/** Small status pill. The word carries the meaning; colour only backs it up. */
export function StatusChip({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-bold ${TONES[tone]}`}>
      {tone === "good" ? <PortalIcon name="check" size={13} /> : null}
      {children}
    </span>
  );
}
