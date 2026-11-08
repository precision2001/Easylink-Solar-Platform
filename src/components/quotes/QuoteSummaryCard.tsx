import type { ReactNode } from "react";
import { QUOTE_FOCUS, QuoteStatusChip } from "@/components/quotes/QuoteParts";
import { expiresInText, formatCents, isOpen, quoteSystemSummary, quoteVersionLabel, type Quote } from "@/lib/quotes";

/**
 * One version in a list: which quote, what it's for, what it costs and where
 * it stands. The whole card opens it; `aside` holds anything else (a compare
 * tick box) outside that button.
 */
export function QuoteSummaryCard({
  quote,
  selected,
  onOpen,
  aside,
  now,
}: {
  quote: Quote;
  selected?: boolean;
  onOpen: () => void;
  aside?: ReactNode;
  now?: Date;
}) {
  const summary = quoteSystemSummary(quote);
  const open = isOpen(quote, now);
  return (
    <div
      className={`flex items-stretch gap-2 rounded-[12px] border bg-white transition-colors ${
        selected ? "border-[#0B1A2E] shadow-[0_0_0_1px_#0B1A2E]" : "border-[#E3E8EF] hover:border-[#94A3B8]"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={selected}
        className={`flex min-h-[44px] min-w-0 flex-1 flex-col gap-1.5 rounded-[12px] p-3.5 text-left ${QUOTE_FOCUS}`}
      >
        <span className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] font-bold tabular-nums text-[#5B6B80]">{quoteVersionLabel(quote)}</span>
          <QuoteStatusChip quote={quote} now={now} />
        </span>
        <span className="text-[15px] font-bold leading-[1.3] text-[#0F172A]">{quote.title}</span>
        {summary ? <span className="text-[13px] text-[#5B6B80]">{summary}</span> : null}
        <span className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[17px] font-bold tabular-nums text-[#0F172A]">
            {formatCents(quote.totalCents)} <span className="text-[12px] font-semibold text-[#5B6B80]">inc GST</span>
          </span>
          <span className="text-[12.5px] text-[#5B6B80]">
            Deposit {formatCents(quote.depositCents)}
            {quote.status === "DRAFT" || open ? ` · ${expiresInText(quote.validUntil, now)}` : ""}
          </span>
        </span>
      </button>
      {aside ? <div className="flex shrink-0 items-start pr-2 pt-2">{aside}</div> : null}
    </div>
  );
}
