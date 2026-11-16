"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

/** A lead's open quotes, as the leads list gets them: how many, and the lowest total. */
export type OpenQuotes = { count: number; fromCents: number | null };

type QuoteItem = {
  id: string;
  reference: string;
  version: number;
  status: string;
  batteryKwh: number | null;
  totalCents: number;
  validUntil: string;
};

const aud = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
const OPEN = new Set(["DRAFT", "SENT", "VIEWED"]);
const STATUS: Record<string, string> = { DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed" };

/** The chip's words: "3 options · from $24,900", or one quote's total. */
export function quoteChipLabel(q: OpenQuotes): string {
  const from = q.fromCents != null ? aud(q.fromCents) : null;
  if (q.count > 1) return `${q.count} options${from ? ` · from ${from}` : ""}`;
  return from ? `Quote · ${from}` : "1 quote";
}

/**
 * Under a lead's roof picture: the quotes still open on the lead (one per
 * battery option the customer compared). Opens a short list of them, smallest
 * battery first, each with its total, status and a Send button for drafts.
 */
export function QuoteOptionsChip({
  leadId,
  customerName,
  open: openQuotes,
  asRow,
}: {
  leadId: string;
  customerName: string;
  open: OpenQuotes | null | undefined;
  /** A full-width row button (lead card) instead of the small chip. */
  asRow?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [items, setItems] = useState<QuoteItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shown) return;
    const off = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setShown(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setShown(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [shown]);

  async function load() {
    try {
      const res = await fetch(`/api/admin/quotes?leadId=${encodeURIComponent(leadId)}`);
      const json = (await res.json().catch(() => null)) as { data?: QuoteItem[] } | null;
      const list = (json?.data ?? []).filter((q) => OPEN.has(q.status));
      setItems(list.sort((a, b) => (a.batteryKwh ?? 0) - (b.batteryKwh ?? 0) || a.version - b.version));
    } catch {
      setItems([]);
    }
  }

  async function send(q: QuoteItem) {
    setBusy(q.id);
    try {
      const res = await fetch(`/api/admin/quotes/${encodeURIComponent(q.id)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email" }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(json?.message ?? "Couldn't send the quote.");
      toast.success(`${q.reference} sent to ${customerName}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send the quote.");
    } finally {
      setBusy(null);
    }
  }

  if (!openQuotes || openQuotes.count < 1) return null;
  return (
    <div ref={box} className={asRow ? "relative w-full" : "relative mt-1.5"}>
      <button
        type="button"
        aria-expanded={shown}
        onClick={() => {
          const next = !shown;
          setShown(next);
          if (next) void load();
        }}
        className={
          asRow
            ? "flex h-[50px] w-full items-center gap-2.5 rounded-[14px] border border-[#CBD5E1] bg-white pl-3.5 pr-3 text-left transition-colors hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            : "inline-flex max-w-[180px] items-center gap-1 truncate rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2.5 py-[3px] text-[11.5px] font-bold text-[#3730A3] hover:bg-[#E0E7FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
        }
      >
        {asRow ? (
          <>
            <span aria-hidden="true" className="flex w-[22px] shrink-0 justify-center">
              <span className="size-2.5 rounded-[3px] bg-[#4338CA]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-[11.5px] font-semibold text-[#334155]">Quotes</span>
              <span className="truncate text-[13.5px] font-bold text-[#3730A3]">{quoteChipLabel(openQuotes)}</span>
            </span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-[#64748B]">
              <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : (
          quoteChipLabel(openQuotes)
        )}
      </button>
      {shown ? (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-[300px] rounded-[12px] border border-[#E2E8F0] bg-white p-2 shadow-xl" role="dialog" aria-label={`Quotes for ${customerName}`}>
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.6px] text-[#64748B]">Open quotes · the customer accepts one</p>
          {items == null ? (
            <p className="px-2 py-3 text-[12.5px] text-[#64748B]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-3 text-[12.5px] text-[#64748B]">No open quotes.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((q, i) => (
                <li key={q.id} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-[#F8FAFC]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0B2A4A] text-[11px] font-bold text-[#FDE047]">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-[#0F172A]">
                      {q.batteryKwh && q.batteryKwh > 0 ? `${+q.batteryKwh.toFixed(1)} kWh battery` : "Solar only"} · {aud(q.totalCents)}
                    </div>
                    <div className="text-[11.5px] text-[#64748B]">
                      {q.reference} · {STATUS[q.status] ?? q.status}
                    </div>
                  </div>
                  {q.status === "DRAFT" ? (
                    <button
                      type="button"
                      disabled={busy != null}
                      onClick={() => void send(q)}
                      className="rounded-[7px] bg-[#2563EB] px-2.5 py-1 text-[12px] font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
                    >
                      {busy === q.id ? "Sending…" : "Send"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
