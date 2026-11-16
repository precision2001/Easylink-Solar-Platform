"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PipelineLead, RoofDesignSummary } from "@/lib/admin/leads-pipeline";
import { LeadProposalPdf } from "@/components/master-dashboard/quotes-leads/LeadProposalPdf";
import { LeadQuotesTrack } from "@/components/master-dashboard/quotes-leads/LeadQuotes";

/**
 * Automatic roof design in Quotes & Leads: a thumbnail per lead (the
 * platform designer runs on its own for every lead with an address) that
 * opens large when clicked.
 */

/**
 * Automatic designs start with leads created on 5 Nov 2026 (Sydney) and run
 * for every lead after that. Older leads get a "Design roof" button instead.
 */
export const AUTO_DESIGN_FROM = new Date("2026-11-05T00:00:00+11:00");

/** Designs made before this came from an earlier server copy of the steps; they are redone. */
export const PLATFORM_PIPELINE_FROM = new Date("2026-11-05T19:30:00+11:00");
/** Opus traces every roof first from here (9 Nov 2026): lead designs made before it are redone. */
export const OPUS_TRACE_FROM = new Date("2026-11-09T15:40:00+11:00");

export function autoDesignEligible(lead: Pick<PipelineLead, "createdAt">): boolean {
  const t = new Date(lead.createdAt).getTime();
  return Number.isFinite(t) && t >= AUTO_DESIGN_FROM.getTime();
}

export function roofDesignNeeded(lead: Pick<PipelineLead, "address" | "roofDesign">): boolean {
  const address = lead.address?.trim();
  if (!address) return false;
  const d = lead.roofDesign;
  // Not designed yet, the address has changed since, or designed before the
  // designer followed the Design Platform's steps exactly (5 Nov, evening).
  return !d || d.address.trim() !== address || new Date(d.updatedAt).getTime() < Math.max(PLATFORM_PIPELINE_FROM.getTime(), OPUS_TRACE_FROM.getTime());
}

export /** Designs saved before 13 Nov 2026 named the model in their message: shown as EasyLink AI. */
function aiName(m: string | null | undefined) {
  return m ? m.replace(/\bOpus\b/g, "EasyLink AI") : m;
}

class StillTracing extends Error {}

export async function requestRoofDesign(leadId: string): Promise<RoofDesignSummary> {
  const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/roof-design`, { method: "POST" });
  const json = await res.json().catch(() => null);
  if (res.status === 202 && json?.retry) throw new StillTracing(json.message ?? "EasyLink AI is still tracing this roof.");
  if (!res.ok || !json?.success) throw new Error(json?.message ?? "Couldn't design this roof.");
  return json.data as RoofDesignSummary;
}

/**
 * Designs every listed lead that needs one, two at a time, and reports each
 * result as it lands. Each lead is tried once per page visit (Redesign
 * retries by hand).
 */
export function useAutoRoofDesigns(
  rows: PipelineLead[] | null,
  onDesigned: (leadId: string, design: RoofDesignSummary) => void,
  enabled: boolean,
) {
  const [working, setWorking] = useState<Set<string>>(new Set());
  const tried = useRef(new Set<string>());
  const retries = useRef(new Map<string, number>());
  const queue = useRef<string[]>([]);
  const active = useRef(0);
  const cb = useRef(onDesigned);
  useEffect(() => {
    cb.current = onDesigned;
  }, [onDesigned]);
  const pumpRef = useRef<() => void>(() => undefined);

  const pump = useCallback(() => {
    while (active.current < 2 && queue.current.length) {
      const id = queue.current.shift()!;
      active.current++;
      setWorking((w) => new Set(w).add(id));
      requestRoofDesign(id)
        .then((d) => cb.current(id, d))
        .catch((err: unknown) => {
          // Opus is still tracing: the lead keeps its design; ask again in 20 s (up to 5 minutes).
          if (err instanceof StillTracing) {
            const n = (retries.current.get(id) ?? 0) + 1;
            retries.current.set(id, n);
            if (n <= 15)
              window.setTimeout(() => {
                if (!queue.current.includes(id)) queue.current.push(id);
                pumpRef.current();
              }, 20_000);
            return;
          }
          cb.current(id, {
            status: "FAILED",
            address: "",
            message: err instanceof Error ? err.message : "Couldn't design this roof.",
            panelCount: null,
            panelWatts: null,
            systemKw: null,
            orientation: null,
            faceCount: null,
            roofAreaM2: null,
            updatedAt: new Date().toISOString(),
          });
        })
        .finally(() => {
          active.current--;
          setWorking((w) => {
            const n = new Set(w);
            n.delete(id);
            return n;
          });
          pumpRef.current();
        });
    }
  }, []);
  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const redesign = useCallback(
    (id: string) => {
      if (!queue.current.includes(id)) queue.current.unshift(id);
      pump();
    },
    [pump],
  );

  useEffect(() => {
    if (!enabled || !rows) return;
    for (const r of rows) {
      if (autoDesignEligible(r) && roofDesignNeeded(r) && !tried.current.has(r.id)) {
        tried.current.add(r.id);
        queue.current.push(r.id);
      }
    }
    pump();
  }, [rows, enabled, pump]);

  return { working, redesign };
}

const BOX_ROW = "relative flex h-[76px] w-[112px] shrink-0 overflow-hidden rounded-[12px]";
const BOX_TILE = "relative flex h-[100px] w-[150px] shrink-0 overflow-hidden rounded-[12px]";

function SunSpinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="animate-spin text-[#F68A0A] [animation-duration:2.4s] motion-reduce:animate-none">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={Math.round((12 + Math.cos(a) * 7) * 10) / 10} y1={Math.round((12 + Math.sin(a) * 7) * 10) / 10} x2={Math.round((12 + Math.cos(a) * 10) * 10) / 10} y2={Math.round((12 + Math.sin(a) * 10) * 10) / 10} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />;
      })}
    </svg>
  );
}

export function RoofDesignCell({
  lead,
  working,
  onOpen,
  onRetry,
  tile,
}: {
  lead: PipelineLead;
  working: boolean;
  onOpen: () => void;
  onRetry: () => void;
  /** Larger picture with no caption on it: the lead card frames it and writes the size underneath. */
  tile?: boolean;
}) {
  const BOX = tile ? BOX_TILE : BOX_ROW;
  const d = lead.roofDesign;
  const hasAddress = Boolean(lead.address?.trim());

  if (!hasAddress) {
    return (
      <div className={`${BOX} items-center justify-center border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-2 text-center text-[11.5px] text-[#64748B]`}>
        No address yet
      </div>
    );
  }

  // Older leads aren't designed automatically; one click designs them.
  if (!working && roofDesignNeeded(lead) && !autoDesignEligible(lead)) {
    return (
      <button
        type="button"
        onClick={onRetry}
        aria-label={`Design the roof for ${lead.customerName}`}
        className={`${BOX} flex-col items-center justify-center gap-1 border border-dashed border-[#F5C26B] bg-[#FFFBF3] text-[#92400E] hover:bg-[#FFF4DF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11l9-7 9 7" />
          <path d="M6 10v9h12v-9" />
          <path d="M9 14h6" />
        </svg>
        <span className="text-[11.5px] font-bold">Design roof</span>
      </button>
    );
  }

  if (working || roofDesignNeeded(lead)) {
    return (
      <div className={`${BOX} flex-col items-center justify-center gap-1.5 border border-[#FCD9A8] bg-[#FFF8EC]`} role="status" aria-label={`Designing the roof for ${lead.customerName}`}>
        <SunSpinner />
        <span className="text-[11px] font-semibold text-[#92400E]">Designing roof…</span>
      </div>
    );
  }

  if (d?.status === "READY") {
    const label = `${d.panelCount ?? 0} panels${d.systemKw ? ` · ${d.systemKw.toFixed(1)} kW` : ""}`;
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Roof design for ${lead.customerName}: ${label}. Open large`}
        className={`${BOX} group/roof border border-[#F5C26B] bg-[#0B1A2E] p-0 shadow-[0_1px_0_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_0_0_3px_rgba(246,138,10,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-proxied image */}
        <img
          src={`/api/admin/leads/${encodeURIComponent(lead.id)}/roof-design/thumb?v=${encodeURIComponent(d.updatedAt)}`}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover/roof:scale-[1.04] motion-reduce:transition-none"
        />
        {tile ? null : (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1 pt-3 text-left text-[10.5px] font-bold leading-tight text-white">
            {label}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`${BOX} flex-col items-center justify-center gap-1 border border-[#E3E8EF] bg-[#F8FAFC] px-2 text-center`}>
      <span className="text-[11px] leading-tight text-[#5B6B80]" title={aiName(d?.message) ?? undefined}>
        {d?.status === "NO_ADDRESS" ? "Address not found" : d?.status === "NO_ROOF" ? "No roof found" : "Design failed"}
      </span>
      <button type="button" onClick={onRetry} className="text-[11.5px] font-bold text-[#1D4ED8] hover:underline">
        Try again
      </button>
    </div>
  );
}

export function RoofDesignViewer({
  lead,
  onClose,
  onRedesign,
  working,
  initialView = "roof",
  onOpenQuote,
}: {
  lead: PipelineLead;
  onClose: () => void;
  onRedesign: () => void;
  working: boolean;
  /** "proposal" opens straight on the proposal (the leads row menu). */
  initialView?: "roof" | "proposal" | "quotes";
  /** Opens a quote (or a new one, with null) in the quotes drawer. */
  onOpenQuote?: (quoteId: string | null) => void;
}) {
  const d = lead.roofDesign;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [chosenView, setView] = useState<"roof" | "proposal" | "quotes">(initialView);
  // A lead with no roof design yet can still show its proposal and quotes.
  const view = d || chosenView === "quotes" ? chosenView : "proposal";
  const [pos, setPos] = useState({ index: 0, count: 0 });
  const onPosition = useCallback((index: number, count: number) => setPos({ index, count }), []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const facts: [string, string][] = !d ? [] : [
    ["Panels", d.panelCount != null ? `${d.panelCount} × ${d.panelWatts ?? 440} W` : "—"],
    ["System size", d.systemKw != null ? `${d.systemKw.toFixed(2)} kW` : "—"],
    ["Orientation", d.orientation ? (d.orientation === "LANDSCAPE" ? "Landscape" : "Portrait") : "—"],
    ["Roof faces", d.faceCount != null ? String(d.faceCount) : "—"],
    ["Roof area", d.roofAreaM2 != null ? `${Math.round(d.roofAreaM2)} m²` : "—"],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="roof-viewer-title">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#0B1A2E]/70 backdrop-blur-[2px]" />
      <div className="relative flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.35)] lg:flex-row">
        <div className={`relative min-h-0 flex-1 bg-[#0B1A2E] ${view === "roof" ? "flex items-center justify-center" : ""}`}>
          {view === "quotes" ? (
            <div className="flex h-full flex-col p-4 sm:p-6">
              <p className="m-0 mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-[#F6B04A]">
                Quotes{pos.count ? ` · ${pos.index + 1} of ${pos.count}` : ""}
              </p>
              <div className="min-h-0 flex-1">
                <LeadQuotesTrack lead={lead} tone="dark" onPosition={onPosition} onOpenQuote={(id) => onOpenQuote?.(id)} />
              </div>
            </div>
          ) : view === "proposal" ? (
            <LeadProposalPdf designId={lead.design?.id ?? null} customerName={lead.customerName} />
          ) : d?.status === "READY" ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-proxied image
            <img
              src={`/api/admin/leads/${encodeURIComponent(lead.id)}/roof-design/large?v=${encodeURIComponent(d.updatedAt)}`}
              alt={`Automatic roof design for ${lead.address ?? lead.customerName}: ${d.panelCount ?? 0} panels on ${d.faceCount ?? 0} roof faces`}
              className="block h-full max-h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center px-6 text-center text-[14px] text-[#C9D6EA]">{aiName(d?.message) ?? "No design yet."}</div>
          )}
        </div>
        <aside className="flex max-h-[50%] w-full shrink-0 flex-col gap-4 overflow-y-auto p-5 lg:max-h-none lg:w-[320px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="roof-viewer-title" className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">
                {lead.customerName}
              </h2>
              <p className="m-0 mt-0.5 text-[13px] leading-snug text-[#5B6B80]">{lead.address}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#D5DCE5] text-[#334155] hover:border-[#64748B]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {d ? (
            <>
          <dl className="m-0 grid grid-cols-2 gap-2">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-[10px] bg-[#F4F6FA] px-3 py-2">
                <dt className="text-[11.5px] text-[#5B6B80]">{k}</dt>
                <dd className="m-0 text-[15px] font-bold tabular-nums text-[#0F172A]">{v}</dd>
              </div>
            ))}
          </dl>

          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12.5px] text-[#334155]">
            <li className="flex items-center gap-2"><span className="h-0.5 w-5 rounded bg-[#FFC21A]" aria-hidden="true" />Roof face borders</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-[2px] border border-[#9CC3FF] bg-[#13284A]" aria-hidden="true" />Panels, 100 mm clear of every line</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-[2px] border border-[#F68A0A] bg-[#F68A0A]/35" aria-hidden="true" />Vents, fans and other obstructions</li>
          </ul>

          <p className="m-0 rounded-[10px] bg-[#FFF8EC] px-3 py-2.5 text-[12.5px] leading-[1.5] text-[#7A3E00]">
            Designed automatically by the platform designer from Google&apos;s satellite image. It shows how much the roof holds; size the system to the customer&apos;s use, and confirm lines and obstructions at the site visit.
          </p>
          {d.message && d.status === "READY" ? <p className="m-0 text-[12.5px] text-[#5B6B80]">{aiName(d.message)}</p> : null}
            </>
          ) : (
            <p className="m-0 rounded-[10px] bg-[#F4F6FA] px-3 py-2.5 text-[12.5px] leading-[1.5] text-[#334155]">
              No roof design yet for this lead. Use Redesign to have the platform designer draw one.
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2">
            {d && view !== "roof" ? (
              <button
                type="button"
                onClick={() => setView("roof")}
                className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A] hover:border-[#64748B]"
              >
                Roof design
              </button>
            ) : null}
            {view !== "proposal" ? (
              <button
                type="button"
                onClick={() => setView("proposal")}
                className="h-10 rounded-[10px] border border-[#F68A0A] bg-[#FFF8EC] px-4 text-[13px] font-semibold text-[#7A3E00] hover:bg-[#FFEFD6]"
              >
                Proposal
              </button>
            ) : null}
            {view !== "quotes" ? (
              <button
                type="button"
                onClick={() => setView("quotes")}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#1560B8] bg-[#EEF5FF] px-4 text-[13px] font-semibold text-[#0B3B7A] hover:bg-[#E0ECFF]"
              >
                Quotes
                {lead.openQuotes?.count ? (
                  <span className="rounded-full bg-[#0B3B7A] px-1.5 text-[11px] leading-[17px] text-white tabular-nums">{lead.openQuotes.count}</span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRedesign}
              disabled={working}
              className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A] hover:border-[#64748B] disabled:opacity-60"
            >
              {working ? "Designing…" : d ? "Redesign" : "Design roof"}
            </button>
            {d?.status === "READY" ? (
              <a
                href={`/api/admin/leads/${encodeURIComponent(lead.id)}/roof-design/large?v=${encodeURIComponent(d.updatedAt)}`}
                download={`roof-design-${lead.customerName.replace(/\s+/g, "-").toLowerCase()}.jpg`}
                className="flex h-10 items-center rounded-[10px] bg-[#0B1A2E] px-4 text-[13px] font-bold text-white no-underline hover:bg-[#1E2E45]"
              >
                Download image
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
