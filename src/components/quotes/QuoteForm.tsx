"use client";

import { useId, useState, type FormEvent } from "react";
import { QUOTE_BUTTON, QUOTE_FIELD, QUOTE_FOCUS, QUOTE_LABEL, QuoteNotice } from "@/components/quotes/QuoteParts";
import { QuoteExtrasPicker } from "@/components/quotes/QuoteExtrasPicker";
import { useQuoteExtras, type ExtraOption } from "@/lib/quote-extras";
import {
  DEFAULT_DEPOSIT_PERCENT,
  DEFAULT_VALID_DAYS,
  centsToDollarsInput,
  dateInputValue,
  dollarsToCents,
  endOfSydneyDayIso,
  formatCents,
  isFuture,
  previewDepositCents,
  type CreateQuoteInput,
  type DepositMode,
  type Quote,
  type UpdateQuoteInput,
} from "@/lib/quotes";

type Props =
  | {
      mode: "create";
      quote?: undefined;
      /** `extras`: price-book extras ticked on the form, added to the new draft once it's priced. */
      onSubmit: (input: Omit<CreateQuoteInput, "leadId" | "customerId" | "designId">, extras: ExtraOption[]) => Promise<void>;
      onCancel: () => void;
    }
  | { mode: "edit"; quote: Quote; onSubmit: (patch: UpdateQuoteInput) => Promise<void>; onCancel: () => void };

/**
 * Deposit (25% by default, or a fixed amount), how long the quote is valid,
 * a note to the customer and a note only staff see. A new version is priced
 * by the backend, so the form only previews the deposit when editing.
 */
export function QuoteForm(props: Props) {
  const { mode, quote } = props;
  const uid = useId();
  const [depositMode, setDepositMode] = useState<DepositMode>(quote?.depositMode ?? "PERCENT");
  const [percent, setPercent] = useState(String(quote?.depositMode === "PERCENT" ? quote.depositPercent : DEFAULT_DEPOSIT_PERCENT));
  const [fixed, setFixed] = useState(quote?.depositMode === "FIXED" ? centsToDollarsInput(quote.depositCents) : "");
  const [validDays, setValidDays] = useState(String(DEFAULT_VALID_DAYS));
  const [validUntil, setValidUntil] = useState(dateInputValue(quote?.validUntil));
  const [title, setTitle] = useState(quote?.title ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [internalNotes, setInternalNotes] = useState(quote?.internalNotes ?? "");
  const [picked, setPicked] = useState<ExtraOption[]>([]);
  const extrasBook = useQuoteExtras();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Number(percent);
  const fixedCents = dollarsToCents(fixed);
  const preview = quote ? previewDepositCents(quote.totalCents, depositMode, pct, fixedCents) : null;

  function deposit(): { depositPercent: number } | { depositFixedCents: number } | string {
    if (depositMode === "PERCENT") {
      if (!percent.trim() || !Number.isFinite(pct) || pct < 0 || pct > 100) return "Enter a deposit between 0 and 100%.";
      return { depositPercent: Math.round(pct * 10) / 10 };
    }
    if (fixedCents === null || fixedCents <= 0) return "Enter the deposit in dollars, for example 3000.";
    if (quote && fixedCents > quote.totalCents) return `The deposit can't be more than the total of ${formatCents(quote.totalCents)}.`;
    return { depositFixedCents: fixedCents };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const dep = deposit();
    if (typeof dep === "string") return setError(dep);
    setBusy(true);
    setError(null);
    try {
      if (props.mode === "create") {
        const days = Number(validDays);
        if (!Number.isInteger(days) || days < 1 || days > 365) {
          setBusy(false);
          return setError("Valid for must be between 1 and 365 days.");
        }
        await props.onSubmit({
          ...dep,
          validDays: days,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {}),
        }, picked);
      } else {
        const until = endOfSydneyDayIso(validUntil);
        if (!until || !isFuture(until)) {
          setBusy(false);
          return setError("Choose a valid-until date from today on.");
        }
        await props.onSubmit({
          ...dep,
          validUntil: until,
          title: title.trim() || props.quote.title,
          notes: notes.trim() || null,
          internalNotes: internalNotes.trim() || null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the quote.");
      setBusy(false);
    }
  }

  const radio = (value: DepositMode, label: string) => (
    <label
      className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-[8px] px-3 text-[13.5px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#2563EB] ${
        depositMode === value ? "bg-[#0B1A2E] text-white" : "text-[#334155] hover:bg-[#F1F5F9]"
      }`}
    >
      <input type="radio" name={`${uid}-mode`} value={value} checked={depositMode === value} onChange={() => setDepositMode(value)} className="sr-only" />
      {label}
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-source-sans text-[18px] font-bold text-[#0F172A]">{mode === "create" ? "New quote version" : `Edit quote ${quote.version}`}</h3>
        <p className="m-0 text-[13.5px] leading-[1.5] text-[#5B6B80]">
          {mode === "create"
            ? "Copies the latest design for this customer and prices it with the EasyLink pricing engine. Earlier versions and the design stay as they are."
            : quote.status === "SENT"
              ? "This quote has been sent. The customer sees your changes the next time they open it."
              : "Changes the deposit, dates and notes. To add or remove extras or change items, use Edit items. To pick up new prices, use Reprice."}
        </p>
      </div>

      {mode === "edit" ? (
        <label className={QUOTE_LABEL}>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={QUOTE_FIELD} />
        </label>
      ) : null}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-[#334155]">Deposit</legend>
        <div className="flex gap-1 rounded-[10px] border border-[#E3E8EF] bg-[#F8FAFC] p-1">
          {radio("PERCENT", "Percentage")}
          {radio("FIXED", "Fixed amount")}
        </div>
        {depositMode === "PERCENT" ? (
          <label className={QUOTE_LABEL}>
            <span className="sr-only">Deposit percentage</span>
            <span className="relative">
              <input
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                aria-describedby={`${uid}-dep`}
                className={`${QUOTE_FIELD} pr-9`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#5B6B80]">%</span>
            </span>
          </label>
        ) : (
          <label className={QUOTE_LABEL}>
            <span className="sr-only">Deposit in dollars</span>
            <span className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#5B6B80]">$</span>
              <input
                inputMode="decimal"
                value={fixed}
                onChange={(e) => setFixed(e.target.value)}
                placeholder="3000"
                aria-describedby={`${uid}-dep`}
                className={`${QUOTE_FIELD} pl-7`}
              />
            </span>
          </label>
        )}
        <p id={`${uid}-dep`} className="m-0 text-[12.5px] text-[#5B6B80]">
          {preview !== null && quote
            ? `${formatCents(preview)} deposit, ${formatCents(Math.max(0, quote.totalCents - preview))} on completion (total ${formatCents(quote.totalCents)}).`
            : "Default is 25% of the quote total. The amount shows once the quote is priced."}
        </p>
      </fieldset>

      {mode === "create" ? (
        <QuoteExtrasPicker
          extras={extrasBook.extras}
          loading={extrasBook.loading}
          error={extrasBook.error}
          isChecked={(x) => picked.some((p) => p.id === x.id)}
          onToggle={(x, on) => setPicked((ps) => (on ? [...ps.filter((p) => p.id !== x.id), x] : ps.filter((p) => p.id !== x.id)))}
          panels={null}
          hint="Ticked extras are added to the new draft at price-book prices. Per-panel extras use the panel count on the design."
        />
      ) : null}

      {mode === "create" ? (
        <label className={QUOTE_LABEL}>
          Valid for (days)
          <input inputMode="numeric" value={validDays} onChange={(e) => setValidDays(e.target.value)} className={`${QUOTE_FIELD} max-w-[140px]`} />
        </label>
      ) : (
        <label className={QUOTE_LABEL}>
          Valid until
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={`${QUOTE_FIELD} max-w-[200px]`} />
        </label>
      )}

      <label className={QUOTE_LABEL}>
        <span>
          Notes to the customer <span className="font-normal text-[#5B6B80]">(optional, shown on the quote)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Includes a switchboard upgrade. Install usually 2–3 weeks after the deposit."
          className={`${QUOTE_FIELD} min-h-[88px] py-2.5`}
        />
      </label>
      <label className={QUOTE_LABEL}>
        <span>
          Internal notes <span className="font-normal text-[#5B6B80]">(optional, staff and installer only)</span>
        </span>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Matched a competitor quote; check the roof pitch on site."
          className={`${QUOTE_FIELD} min-h-[72px] py-2.5`}
        />
      </label>

      {error ? <QuoteNotice>{error}</QuoteNotice> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={QUOTE_BUTTON.primary}>
          {busy ? (mode === "create" ? "Pricing…" : "Saving…") : mode === "create" ? "Create draft quote" : "Save changes"}
        </button>
        <button type="button" onClick={props.onCancel} className={`${QUOTE_BUTTON.quiet} ${QUOTE_FOCUS}`}>
          Cancel
        </button>
      </div>
    </form>
  );
}
