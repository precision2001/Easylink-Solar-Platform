import type { ReactNode } from "react";
import { QUOTE_TONE_CHIP, quoteStatusLabel, quoteStatusTone, type Quote } from "@/lib/quotes";

/** Small pieces shared by the quote screens in all three portals. */

export const QUOTE_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]";

const BTN = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] px-4 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${QUOTE_FOCUS}`;

export const QUOTE_BUTTON = {
  primary: `${BTN} bg-[#0B1A2E] text-white hover:bg-[#1E2E45]`,
  accent: `${BTN} bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F]`,
  quiet: `${BTN} border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]`,
  danger: `${BTN} border border-[#FECACA] bg-white text-[#B91C1C] hover:border-[#B91C1C]`,
  link: `inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] px-1 text-[14px] font-semibold text-[#1D4ED8] hover:underline ${QUOTE_FOCUS}`,
};

export const QUOTE_FIELD = `min-h-[44px] w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] ${QUOTE_FOCUS}`;
export const QUOTE_LABEL = "flex flex-col gap-1.5 text-[13px] font-semibold text-[#334155]";

export function QuoteStatusChip({ quote, now }: { quote: Pick<Quote, "status" | "validUntil" | "depositPaidAt">; now?: Date }) {
  const chip = QUOTE_TONE_CHIP[quoteStatusTone(quote, now)];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-bold"
      style={{ background: chip.bg, color: chip.fg }}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: chip.dot }} />
      {quoteStatusLabel(quote, now)}
    </span>
  );
}

export function QuoteNotice({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const style = {
    error: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
    success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
    info: "border-[#E3E8EF] bg-[#F8FAFC] text-[#334155]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[10px] border px-3.5 py-2.5 text-[13.5px] font-semibold leading-[1.45] ${style}`}>
      {children}
    </div>
  );
}
