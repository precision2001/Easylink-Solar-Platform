"use client";

import { useEffect, useState } from "react";
import { fetchLeadSignals, intentLabel, markLeadSignalsSeen, type LeadSignals, type SignalSummary } from "@/lib/admin/leads-pipeline";

/**
 * Signals on a lead card (owner's design, 15 Nov 2026).
 *
 * The chip shows the lead's Intent and how many signals are new to the person
 * looking; it glows until they open it. Opening shows, inside the same card,
 * what has happened (newest first) and the next best step. Everything shown
 * comes from the lead's real records: the server reads them, nothing is
 * made up here. The next step is chosen by plain rules, so it is not labelled
 * as EasyLink AI.
 */

const TZ = "Australia/Sydney";

/** "Today 9:12 am", "Yesterday", "3 days ago", "12 Oct". */
export function signalWhen(iso: string, now = new Date()) {
  const at = new Date(iso);
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const days = Math.round((new Date(day(now)).getTime() - new Date(day(at)).getTime()) / 86_400_000);
  if (days <= 0) return `Today ${at.toLocaleTimeString("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return at.toLocaleDateString("en-AU", { timeZone: TZ, day: "numeric", month: "short", ...(days > 300 ? { year: "numeric" } : {}) });
}

export function SignalsChip({
  customerName,
  signals,
  open,
  onToggle,
}: {
  customerName: string;
  signals: SignalSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const warm = signals.trend === "cooling";
  const fresh = signals.newCount > 0;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`Signals for ${customerName}: ${intentLabel(signals)}${fresh ? `, ${signals.newCount} new` : ""}`}
      onClick={onToggle}
      className={`mt-auto flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
        warm ? "border-[#B45309] bg-[#FFF7ED] text-[#7A3E00] hover:bg-[#FFEDD5]" : "border-[#1976D2] bg-[#EFF6FF] text-[#0D47A1] hover:bg-[#DBEAFE]"
      } ${fresh ? (warm ? "lead-signal-glow-warm" : "lead-signal-glow") : ""}`}
    >
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${warm ? "bg-[#B45309]" : "bg-[#1976D2]"}`} />
      <span className="truncate">
        Signals · {intentLabel(signals)}
        {fresh ? ` · ${signals.newCount} new` : ""}
      </span>
    </button>
  );
}

export function SignalsPanel({ leadId, onSeen }: { leadId: string; onSeen: () => void }) {
  const [data, setData] = useState<LeadSignals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchLeadSignals(leadId)
      .then((d) => {
        if (!live) return;
        setData(d);
        // Opening is what clears "new": tell the server, then the card.
        markLeadSignalsSeen(leadId)
          .then(() => live && onSeen())
          .catch(() => {});
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Could not load this lead's signals."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per opened lead
  }, [leadId]);

  if (error) {
    return (
      <p role="alert" className="m-0 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14.5px] text-[#991B1B]">
        {error}
      </p>
    );
  }
  if (!data) return <p className="m-0 px-1 text-[14.5px] text-[#475569]">Loading signals…</p>;

  const shown = showAll ? data.signals : data.signals.slice(0, 5);
  return (
    <div className="grid gap-x-7 gap-y-4 border-t border-[#E7E3DB] pt-4 @min-[900px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section aria-label="Latest signals" className="flex min-w-0 flex-col gap-2">
        <h3 className="m-0 text-[15px] font-bold text-[#0D47A1]">Latest signals</h3>
        {shown.length ? (
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {shown.map((s) => (
              <li key={s.id} className="flex items-baseline gap-2.5">
                <span className="w-[112px] shrink-0 text-[14px] font-semibold text-[#1E293B]">{signalWhen(s.at)}</span>
                <span className="min-w-0 text-[15.5px] text-[#0F172A] [overflow-wrap:anywhere]">
                  {s.text}
                  {s.isNew ? <span className="ml-2 rounded-full bg-[#DBEAFE] px-1.5 py-[1px] text-[11.5px] font-bold text-[#0D47A1]">New</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-[14.5px] text-[#475569]">Nothing recorded on this lead yet.</p>
        )}
        {data.signals.length > 5 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-fit rounded-[8px] px-1 py-1.5 text-[14px] font-semibold text-[#1976D2] hover:underline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            {showAll ? "Show fewer" : `Show all ${data.signals.length}${data.total > data.signals.length ? ` of ${data.total}` : ""}`}
          </button>
        ) : null}
      </section>

      <section aria-label="Next best step" className="flex min-w-0 flex-col gap-2">
        <h3 className="m-0 text-[15px] font-bold text-[#0D47A1]">Next best step</h3>
        {data.nextStep ? (
          <>
            <div className="font-source-sans text-[20px] font-bold leading-tight text-[#0F172A]">{data.nextStep.title}</div>
            <div className="text-[15px] text-[#1E293B]">{data.nextStep.why}</div>
          </>
        ) : (
          <div className="text-[15px] text-[#475569]">Nothing to suggest for this lead.</div>
        )}
        <button
          type="button"
          aria-expanded={showWhy}
          onClick={() => setShowWhy((v) => !v)}
          className="w-fit rounded-[8px] px-1 py-1.5 text-[14px] font-semibold text-[#1976D2] hover:underline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        >
          {showWhy ? "Hide" : "Why"} Intent is {data.intent.score}
        </button>
        {showWhy ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {data.intent.reasons.map((r) => (
              <li key={r.text} className="flex items-baseline justify-between gap-3 text-[14.5px] text-[#1E293B]">
                <span>{r.text}</span>
                <span className="shrink-0 font-semibold tabular-nums">{r.points > 0 ? `+${r.points}` : r.points}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
