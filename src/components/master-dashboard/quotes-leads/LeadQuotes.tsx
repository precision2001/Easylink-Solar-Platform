"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/master-dashboard/quotes-leads/icons";
import { QuoteStatusChip } from "@/components/quotes/QuoteParts";
import {
  formatCents,
  formatQuoteDate,
  lineCategoryLabel,
  listStaffQuotes,
  quoteSystemSummary,
  quoteVersionLabel,
  type Quote,
  type QuoteLine,
} from "@/lib/quotes";
import type { PipelineLead } from "@/lib/admin/leads-pipeline";

/**
 * Every quote made for a lead, in two places on the leads list:
 *  - the row's ⋯ menu ("Quotes ▸" lists them; one opens it in the quotes drawer);
 *  - a "Quotes" button beside the proposal badge, which shows them as a carousel.
 * Both read the same list as the quotes drawer: all versions, newest first.
 */

const cache = new Map<string, Quote[]>();

export function useLeadQuotes(leadId: string, enabled: boolean) {
  const [quotes, setQuotes] = useState<Quote[] | null>(() => cache.get(leadId) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    listStaffQuotes("admin", { leadId })
      .then((list) => {
        cache.set(leadId, list);
        if (live) {
          setQuotes(list);
          setError(null);
        }
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not load quotes."));
    return () => {
      live = false;
    };
  }, [leadId, enabled]);

  return { quotes, error };
}

/* ---------- ⋯ menu ---------- */

/** The list under "Quotes ▸" in a row's ⋯ menu. */
export function LeadQuotesMenuList({ leadId, onPick, onNew }: { leadId: string; onPick: (quoteId: string | null) => void; onNew: () => void }) {
  const { quotes, error } = useLeadQuotes(leadId, true);
  return (
    <div className="border-y border-[#EEF2F6] bg-[#F8FAFC] py-1" role="group" aria-label="Quotes for this lead">
      {error ? <p className="m-0 px-3 py-2 text-[12.5px] text-[#B91C1C]">{error}</p> : null}
      {!quotes && !error ? <p className="m-0 px-3 py-2 text-[12.5px] text-[#64748B]">Loading quotes…</p> : null}
      {quotes && !quotes.length ? <p className="m-0 px-3 py-2 text-[12.5px] text-[#64748B]">No quotes yet.</p> : null}
      {quotes?.map((q) => (
        <button
          key={q.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(q.id)}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#EEF2F6]"
        >
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-bold tabular-nums text-[#0F172A]">{quoteVersionLabel(q)}</span>
            <span className="block truncate text-[11.5px] text-[#64748B]">{quoteSystemSummary(q) || q.title}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-[12.5px] font-bold tabular-nums text-[#0F172A]">{formatCents(q.totalCents)}</span>
            <QuoteStatusChip quote={q} />
          </span>
        </button>
      ))}
      <div className="flex gap-3 px-3 pb-1 pt-1.5">
        {quotes?.length ? (
          <button type="button" role="menuitem" onClick={() => onPick(null)} className="text-[12.5px] font-semibold text-[#1560B8] hover:underline">
            Open all
          </button>
        ) : null}
        <button type="button" role="menuitem" onClick={onNew} className="text-[12.5px] font-semibold text-[#1560B8] hover:underline">
          + New quote
        </button>
      </div>
    </div>
  );
}

/* ---------- button + carousel ---------- */

/** Beside the proposal badge: how many quotes the lead has; opens the carousel. */
export function LeadQuotesButton({ lead, onOpenQuote }: { lead: PipelineLead; onOpenQuote: (quoteId: string | null) => void }) {
  const [shown, setShown] = useState(false);
  const open = lead.openQuotes?.count ?? 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setShown(true)}
        title={`See every quote for ${lead.customerName}`}
        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-[#CBD5E1] bg-white px-2 text-[11.5px] font-bold text-[#0F172A] hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
      >
        Quotes
        {open ? <span className="rounded-full bg-[#0B1A2E] px-1.5 text-[10.5px] leading-[16px] text-white tabular-nums">{open}</span> : null}
      </button>
      {shown ? (
        <LeadQuotesCarousel
          lead={lead}
          onClose={() => setShown(false)}
          onOpenQuote={(id) => {
            setShown(false);
            onOpenQuote(id);
          }}
        />
      ) : null}
    </>
  );
}

function linesOf(q: Quote): QuoteLine[] {
  const s = q.snapshot;
  return [...(s?.equipment ?? []), ...(s?.extras ?? [])].filter((l) => l && l.quantity > 0);
}

function QuoteSlide({ quote, index, count, onOpen }: { quote: Quote; index: number; count: number; onOpen: () => void }) {
  const lines = linesOf(quote);
  const shownLines = lines.slice(0, 7);
  const summary = quoteSystemSummary(quote);
  return (
    <article
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${quoteVersionLabel(quote)}`}
      className="flex h-full w-full shrink-0 snap-center flex-col rounded-[14px] border border-[#E3E8EF] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-bold tabular-nums text-[#5B6B80]">{quoteVersionLabel(quote)}</span>
        <QuoteStatusChip quote={quote} />
      </div>
      <h3 className="mb-0 mt-2 text-[18px] font-bold leading-[1.3] text-[#0F172A]">{quote.title}</h3>
      {summary ? <p className="m-0 mt-1 text-[13.5px] text-[#5B6B80]">{summary}</p> : null}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {shownLines.length ? (
          <ul className="m-0 list-none divide-y divide-[#EEF2F6] p-0">
            {shownLines.map((l, i) => (
              <li key={`${l.name}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]">{lineCategoryLabel(l.category)}</span>
                  <span className="block text-[#0F172A]">
                    {l.quantity > 1 ? `${l.quantity} × ` : ""}
                    {l.name}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-[#334155]">{formatCents(l.totalCents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[13px] text-[#64748B]">No line items on this quote.</p>
        )}
        {lines.length > shownLines.length ? (
          <p className="m-0 mt-1 text-[12px] text-[#64748B]">+ {lines.length - shownLines.length} more items</p>
        ) : null}
      </div>

      <dl className="m-0 mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[#EEF2F6] pt-3 text-[13px]">
        <dt className="text-[#5B6B80]">Subtotal</dt>
        <dd className="m-0 text-right tabular-nums">{formatCents(quote.subtotalCents)}</dd>
        {quote.stcDiscountCents ? (
          <>
            <dt className="text-[#5B6B80]">Solar STCs</dt>
            <dd className="m-0 text-right tabular-nums">−{formatCents(quote.stcDiscountCents)}</dd>
          </>
        ) : null}
        {quote.rebateCents ? (
          <>
            <dt className="text-[#5B6B80]">Battery STCs and rebates</dt>
            <dd className="m-0 text-right tabular-nums">−{formatCents(quote.rebateCents)}</dd>
          </>
        ) : null}
        <dt className="text-[15px] font-bold text-[#0F172A]">Total inc GST</dt>
        <dd className="m-0 text-right text-[17px] font-bold tabular-nums text-[#0F172A]">{formatCents(quote.totalCents)}</dd>
        <dt className="text-[#5B6B80]">Deposit</dt>
        <dd className="m-0 text-right tabular-nums">{formatCents(quote.depositCents)}</dd>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-[#64748B]">
          Made {formatQuoteDate(quote.createdAt)}
          {quote.sentAt ? ` · sent ${formatQuoteDate(quote.sentAt)}` : ""}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-10 items-center rounded-[10px] bg-[#0B1A2E] px-4 text-[13.5px] font-bold text-white hover:bg-[#1E293B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        >
          Open quote
        </button>
      </div>
    </article>
  );
}

/**
 * The quote cards with arrows and dots. Used inside the carousel window and in
 * the roof design window's big pane. `onPosition` reports "2 of 3".
 */
export function LeadQuotesTrack({
  lead,
  onOpenQuote,
  onPosition,
  tone = "light",
}: {
  lead: PipelineLead;
  onOpenQuote: (quoteId: string | null) => void;
  onPosition?: (index: number, count: number) => void;
  tone?: "light" | "dark";
}) {
  const { quotes, error } = useLeadQuotes(lead.id, true);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const count = quotes?.length ?? 0;
  const dark = tone === "dark";

  useEffect(() => {
    onPosition?.(index, count);
  }, [index, count, onPosition]);

  const go = useCallback(
    (i: number) => {
      const el = track.current;
      if (!el || !count) return;
      const next = Math.max(0, Math.min(count - 1, i));
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      setIndex(next);
    },
    [count],
  );

  const onArrows = (e: ReactKeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  // Keeps the dots right when the cards are swiped or scrolled by hand.
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const note = dark ? "text-[#C9D6EA]" : "text-[#64748B]";
  const arrow = dark
    ? "border-[#3A4D68] bg-[#13263F] text-white hover:border-[#64748B]"
    : "border-[#D5DCE5] bg-white text-[#334155] hover:border-[#64748B]";

  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={onArrows}>
      <div className="relative min-h-0 flex-1">
        {error ? <p className="m-0 rounded-lg border border-[#F3B8B4] bg-[#FDE8E7] px-3 py-2 text-[14px] text-[#B3261E]">{error}</p> : null}
        {!quotes && !error ? <p className={`m-0 text-[14px] ${note}`}>Loading quotes…</p> : null}
        {quotes && !quotes.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className={`m-0 text-[15px] ${dark ? "text-white" : "text-[#334155]"}`}>No quotes for {lead.customerName} yet.</p>
            <button type="button" onClick={() => onOpenQuote(null)} className={`text-[14px] font-semibold underline ${dark ? "text-[#9CC3FF]" : "text-[#1560B8]"}`}>
              Make a quote
            </button>
          </div>
        ) : null}
        {count ? (
          <div
            ref={track}
            onScroll={onScroll}
            tabIndex={0}
            aria-roledescription="carousel"
            aria-label="Quotes, use the arrow keys to move between them"
            className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
          >
            {quotes!.map((q, i) => (
              <div key={q.id} className="flex h-full w-full shrink-0 snap-center justify-center px-1">
                <div className="h-full w-full max-w-[620px]">
                  <QuoteSlide quote={q} index={i} count={count} onOpen={() => onOpenQuote(q.id)} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous quote" className={`inline-flex size-10 items-center justify-center rounded-[10px] border disabled:opacity-40 ${arrow}`}>
            <span aria-hidden="true">←</span>
          </button>
          <div className="flex flex-wrap justify-center gap-1.5">
            {quotes!.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${quoteVersionLabel(q)}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? (dark ? "w-6 bg-white" : "w-6 bg-[#0B1A2E]") : dark ? "w-2.5 bg-[#3A4D68] hover:bg-[#64748B]" : "w-2.5 bg-[#CBD5E1] hover:bg-[#94A3B8]"
                }`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next quote" className={`inline-flex size-10 items-center justify-center rounded-[10px] border disabled:opacity-40 ${arrow}`}>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** The carousel in its own window (from the Quotes button on a lead row). */
export function LeadQuotesCarousel({ lead, onClose, onOpenQuote }: { lead: PipelineLead; onClose: () => void; onOpenQuote: (quoteId: string | null) => void }) {
  const [pos, setPos] = useState<{ index: number; count: number }>({ index: 0, count: 0 });
  const onPosition = useCallback((index: number, count: number) => setPos({ index, count }), []);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      if (returnTo instanceof HTMLElement) returnTo.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lead-quotes-title">
      <button type="button" aria-label="Close quotes" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#0B1A2E]/60 backdrop-blur-[1px]" />
      <section className="relative flex h-full w-full flex-col bg-[#F8FAFC] shadow-[0_24px_64px_rgba(11,26,46,0.35)] sm:h-[min(720px,calc(100vh-48px))] sm:w-[min(640px,calc(100vw-48px))] sm:rounded-[16px]">
        <header className="flex items-start gap-3 border-b border-[#E3E8EF] bg-white px-5 py-4 sm:rounded-t-[16px]">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#F68A0A]">
              Quotes{pos.count ? ` · ${pos.index + 1} of ${pos.count}` : ""}
            </p>
            <h2 id="lead-quotes-title" className="m-0 truncate font-source-sans text-[20px] font-bold text-[#0F172A]">
              {lead.customerName}
            </h2>
            <p className="m-0 truncate text-[13px] text-[#5B6B80]">{lead.address ?? lead.customerEmail ?? "No address on the lead"}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#D5DCE5] bg-white text-[#334155] hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 px-4 py-4 sm:px-5">
          <LeadQuotesTrack lead={lead} onOpenQuote={onOpenQuote} onPosition={onPosition} />
        </div>
      </section>
    </div>,
    document.body,
  );
}
