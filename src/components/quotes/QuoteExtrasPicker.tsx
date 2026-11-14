"use client";

import { formatCents } from "@/lib/quotes";
import { extraQty, type ExtraOption } from "@/lib/quote-extras";

/**
 * Price-book extras as a checklist (quote creation and the line editor).
 * Per-panel extras are priced for the quote's panel count when it's known.
 */
export function QuoteExtrasPicker({
  extras,
  loading,
  error,
  isChecked,
  onToggle,
  panels,
  hint,
}: {
  extras: ExtraOption[];
  loading: boolean;
  error: string | null;
  isChecked: (x: ExtraOption) => boolean;
  onToggle: (x: ExtraOption, checked: boolean) => void;
  /** Panels on the quote; null when not known yet (new quote). */
  panels: number | null;
  hint?: string;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <legend className="sr-only">Extras</legend>
      <p aria-hidden="true" className="m-0 mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-[#5B6B80]">
        Extras
      </p>
      {hint ? <p className="m-0 mb-1 text-[12.5px] leading-snug text-[#5B6B80]">{hint}</p> : null}
      {loading ? <p className="m-0 text-[13px] text-[#5B6B80]">Loading extras…</p> : null}
      {error ? <p className="m-0 text-[13px] text-[#B91C1C]">{error} You can still add extras as lines.</p> : null}
      {!loading && !error && extras.length === 0 ? <p className="m-0 text-[13px] text-[#5B6B80]">No extras in the price book.</p> : null}
      {extras.map((x) => {
        const checked = isChecked(x);
        const qty = panels === null ? null : extraQty(x, panels);
        const price =
          x.per === "panel"
            ? qty !== null
              ? `${qty} × ${formatCents(x.unitPriceCents)} = ${formatCents(qty * x.unitPriceCents)}`
              : `${formatCents(x.unitPriceCents)} per panel`
            : formatCents(x.unitPriceCents);
        return (
          <label key={x.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[8px] px-1 hover:bg-[#F8FAFC]">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(x, e.target.checked)}
              className="size-[22px] shrink-0 accent-[#F28C0F]"
            />
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-[15px] text-[#1E293B]">
                {x.label} <span className="text-[13.5px] text-[#64748B]">· per {x.per}</span>
              </span>
              <span className={`text-[13.5px] tabular-nums ${checked ? "font-semibold text-[#0F172A]" : "text-[#64748B]"}`}>{price}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
