"use client";

import { useEffect, useState } from "react";
import { leadDesignHref } from "@/lib/designs/leadDesignLink";
import type { Portal } from "./api";

/**
 * Customer record → Design & equipment. The customer's saved design (size,
 * savings, price, equipment), their quote options, and what they've done
 * with them, drawn in the same dark glass look as the customer's own
 * proposal screen so staff see what the customer saw. Times are Sydney time.
 */

type Item = { brand: string; name: string; quantity: number; rating: string | null };
type Cat = "solarPanel" | "inverter" | "battery" | "evCharger" | "heatPump";
type Proposal = {
  leadId: string;
  customerName: string;
  hasRoofImage: boolean;
  design: {
    id: string;
    title: string;
    address: string | null;
    property: string | null;
    supplyPhase: 1 | 3 | null;
    status: string;
    savedBy: "customer" | "staff";
    createdAt: string;
    updatedAt: string;
    sentAt: string | null;
    chosenAt: string | null;
    customerNotes: string | null;
    summary: { systemSize: string | null; totalPanels: string | null; yearlySavings: string | null; payback: string | null };
    pricing: {
      totalSystemPrice: string | null;
      monthlySavings: string | null;
      currentBill: string | null;
      newBill: string | null;
      billPeriod: string | null;
      netSavings25y: string | null;
      note: string | null;
    };
    equipment: { items: Record<Cat, Item[]>; panelTier: string | null; co2Offset: string | null };
  } | null;
  quotes: {
    id: string;
    reference: string;
    status: string;
    systemKw: number | null;
    panelCount: number | null;
    batteryKwh: number | null;
    totalCents: number;
    depositCents: number;
    sentAt: string | null;
    viewedAt: string | null;
    acceptedAt: string | null;
    depositPaidAt: string | null;
  }[];
  activity: { at: string; who: "customer" | "staff"; text: string }[];
};

/* The proposal screen's glass and tints (DesignsProposalStepContent). */
export const GLASS =
  "relative overflow-hidden rounded-[16px] border backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]";
export const TINT = {
  steel: "border-[rgba(147,197,253,0.35)] bg-[linear-gradient(160deg,rgba(70,130,180,0.55)_0%,rgba(30,64,105,0.6)_100%)]",
  slate: "border-white/20 bg-[linear-gradient(160deg,rgba(120,135,155,0.38)_0%,rgba(55,65,82,0.5)_100%)]",
  navy: "border-[rgba(96,165,250,0.35)] bg-[linear-gradient(160deg,rgba(18,52,110,0.92)_0%,rgba(10,30,70,0.95)_100%)]",
  charcoal: "border-white/15 bg-[linear-gradient(160deg,rgba(52,56,64,0.85)_0%,rgba(30,33,39,0.92)_100%)]",
  brandGold:
    "border-[rgba(255,245,170,0.85)] bg-[linear-gradient(133deg,rgba(255,239,98,0.95)_0%,rgba(255,200,40,0.93)_45%,rgba(247,141,0,0.93)_100%)]",
} as const;
export const GOLD_TEXT = "bg-[linear-gradient(154.91deg,#FFEF62_0%,#F78D00_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.35))]";
export const GREEN_TEXT = "bg-[linear-gradient(154.98deg,#34D399_0%,#2DD4BF_100%)] bg-clip-text text-transparent [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.35))]";
export const LABEL = "font-source-sans text-[11px] font-semibold uppercase tracking-[0.8px] text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]";
export const TITLE = "font-source-sans text-[12px] font-bold uppercase tracking-[1px] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]";

export function Sheen() {
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_100%)]" />;
}

const TZ = "Australia/Sydney";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
const money = (cents: number) => "$" + Math.round(cents / 100).toLocaleString("en-AU");

const CAT_LABEL: Record<Cat, string> = {
  solarPanel: "Solar panels",
  inverter: "Inverter",
  battery: "Battery",
  evCharger: "EV charger",
  heatPump: "Heat pump",
};
const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-white/15 text-white" },
  SENT: { label: "Sent", cls: "bg-[#0B1E3F] text-[#7DD3FC] ring-1 ring-[#7DD3FC]/40" },
  VIEWED: { label: "Opened", cls: "bg-[#FFEF62] text-[#0B2A4A]" },
  ACCEPTED: { label: "Accepted", cls: "bg-[#34D399] text-[#052E1B]" },
  DECLINED: { label: "Declined", cls: "bg-[#FCA5A5] text-[#450A0A]" },
  EXPIRED: { label: "Expired", cls: "bg-white/15 text-white/80" },
  SUPERSEDED: { label: "Replaced", cls: "bg-white/10 text-white/70" },
};

const itemLine = (i: Item) => {
  const name = [i.brand, i.name && i.name !== i.brand ? i.name : ""].filter(Boolean).join(" ");
  return `${i.quantity > 1 ? `${i.quantity} × ` : ""}${name}${i.rating ? ` · ${i.rating}` : ""}`;
};

function Stat({ label, value, tint }: { label: string; value: string | null; tint: keyof typeof TINT }) {
  return (
    <div className={`${GLASS} ${TINT[tint]} flex min-w-0 flex-col items-center justify-center px-2 py-3 text-center`}>
      <Sheen />
      <p className={`relative m-0 ${LABEL}`}>{label}</p>
      <p className="relative m-0 font-source-sans text-[22px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">{value || "–"}</p>
    </div>
  );
}

export function CustomerProposal({
  portal,
  leadId,
  lead,
}: {
  portal: Portal;
  leadId: string;
  lead: { name: string; email: string | null; phone: string | null; address: string | null };
}) {
  const [p, setP] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bigRoof, setBigRoof] = useState(false);
  const base = portal === "admin" ? "/api/admin" : "/api/installers";

  useEffect(() => {
    let off = false;
    fetch(`${base}/lead-proposal/${encodeURIComponent(leadId)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { data?: Proposal; message?: string };
        if (off) return;
        if (r.ok && j.data) setP(j.data);
        else setError(j.message || "Couldn't load the design.");
      })
      .catch(() => !off && setError("Couldn't reach EasyLink."));
    return () => {
      off = true;
    };
  }, [base, leadId]);

  const designHref = leadDesignHref({ id: leadId, customerName: lead.name, customerEmail: lead.email, customerPhone: lead.phone, address: lead.address });
  const roofSrc = `/api/admin/leads/${encodeURIComponent(leadId)}/roof-design/large`;

  return (
    <section
      aria-labelledby="proposal-title"
      className="relative overflow-hidden rounded-[20px] bg-[radial-gradient(120%_80%_at_20%_0%,#3A4A63_0%,#1E2738_55%,#141A26_100%)] p-4 sm:p-5"
    >
      <div className="relative flex flex-wrap items-center gap-3 pb-3">
        <h2 id="proposal-title" className="m-0 flex-1 font-source-sans text-[18px] font-bold text-white">
          Design &amp; equipment
          <span className="ml-2 font-normal text-white/70">— what {lead.name.split(" ")[0] || "the customer"} sees in their proposal</span>
        </h2>
        {portal === "admin" ? (
          <a
            href={designHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[linear-gradient(159deg,#5474EB_16%,#FF3C3C_100%)] px-3.5 font-source-sans text-[13px] font-bold text-white no-underline shadow-md hover:brightness-110"
          >
            Open in Solar Design →
          </a>
        ) : null}
      </div>

      {error ? <p className="m-0 rounded-[10px] bg-[#7F1D1D]/60 p-3 text-[13px] text-white">{error}</p> : null}
      {!p && !error ? <p className="m-0 text-[13px] text-white/70">Loading the design…</p> : null}

      {p && !p.design ? (
        <div className={`${GLASS} ${TINT.slate} p-5 text-center`}>
          <Sheen />
          <p className="relative m-0 text-[14px] text-white">No saved design yet.</p>
          <p className="relative m-0 mt-1 text-[12px] text-white/70">Use Open in Solar Design to make one, or wait for the customer to save theirs on the website.</p>
        </div>
      ) : null}

      {p?.design ? (
        <div className="relative flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="System size" value={p.design.summary.systemSize} tint="steel" />
            <Stat label="Total panels" value={p.design.summary.totalPanels} tint="slate" />
            <Stat label="Yearly savings" value={p.design.summary.yearlySavings} tint="steel" />
            <Stat label="Payback" value={p.design.summary.payback} tint="slate" />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
            {/* Roof */}
            <div className={`${GLASS} ${TINT.slate} flex flex-col gap-2 p-3`}>
              <Sheen />
              <p className={`relative m-0 ${TITLE}`}>Roof design</p>
              {portal === "admin" ? (
                <button type="button" onClick={() => setBigRoof(true)} className="relative overflow-hidden rounded-[12px] ring-1 ring-white/20" aria-label="Show the roof design larger">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={roofSrc} alt={`Roof design for ${lead.name}`} className="block aspect-[4/3] w-full object-cover" loading="lazy" />
                </button>
              ) : null}
              <p className="relative m-0 text-[12px] text-white/75">
                {p.design.address ?? lead.address ?? "No address"}
                {p.design.property ? ` · ${p.design.property}` : ""}
                {p.design.supplyPhase ? ` · ${p.design.supplyPhase === 3 ? "three" : "single"} phase` : ""}
              </p>
            </div>

            {/* Equipment, in the proposal's gold card */}
            <div className={`${GLASS} ${TINT.brandGold} flex flex-col p-4`}>
              <Sheen />
              <p className="relative m-0 font-source-sans text-[12px] font-bold uppercase tracking-[1px] text-[#152238]">System details</p>
              <dl className="relative m-0 mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 font-source-sans text-[14px] text-[#152238]">
                {(Object.keys(CAT_LABEL) as Cat[]).map((c) =>
                  p.design!.equipment.items[c].length ? (
                    <div key={c} className="contents">
                      <dt className="font-bold">{CAT_LABEL[c]}:</dt>
                      <dd className="m-0">
                        {p.design!.equipment.items[c].map((i, n) => (
                          <span key={n} className="block">
                            {itemLine(i)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  ) : null,
                )}
                {p.design.summary.totalPanels ? (
                  <>
                    <dt className="font-bold">Number of panels:</dt>
                    <dd className="m-0">{p.design.summary.totalPanels}</dd>
                  </>
                ) : null}
                {p.design.equipment.panelTier ? (
                  <>
                    <dt className="font-bold">Panel tier:</dt>
                    <dd className="m-0 capitalize">{p.design.equipment.panelTier.replace(/[-_]/g, " ")}</dd>
                  </>
                ) : null}
                {p.design.equipment.co2Offset ? (
                  <>
                    <dt className="font-bold">CO₂ offset:</dt>
                    <dd className="m-0">{p.design.equipment.co2Offset}</dd>
                  </>
                ) : null}
              </dl>
              {p.design.customerNotes ? (
                <p className="relative m-0 mt-3 rounded-[10px] bg-white/45 p-2 text-[13px] text-[#152238]">
                  <strong>Customer&apos;s note:</strong> {p.design.customerNotes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Price */}
            <div className={`${GLASS} ${TINT.navy} flex flex-col gap-2 p-4 text-center`}>
              <Sheen />
              <p className={`relative m-0 ${LABEL}`}>Total system price</p>
              <p className="relative m-0 font-source-sans text-[36px] font-bold leading-[1.05]">
                <span className={GOLD_TEXT}>{p.design.pricing.totalSystemPrice || "–"}</span>
              </p>
              {p.design.pricing.note ? <p className="relative m-0 text-[11px] text-white/70">{p.design.pricing.note}</p> : null}
              <div className="relative grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["Monthly savings", p.design.pricing.monthlySavings, "text-white"],
                    ["Current bill", p.design.pricing.currentBill, "text-white"],
                    ["New bill", p.design.pricing.newBill, "text-[#FFEF62]"],
                  ] as const
                ).map(([k, v, cls]) => (
                  <div key={k} className="rounded-[10px] border border-white/10 bg-[#0B1A3A]/70 px-1 py-1.5">
                    <p className="m-0 text-[11px] text-white/75">{k}</p>
                    <p className={`m-0 font-source-sans text-[15px] font-bold ${cls}`}>{v || "–"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quote options */}
            <div className={`${GLASS} ${TINT.slate} flex flex-col gap-2 p-4`}>
              <Sheen />
              <p className={`relative m-0 ${TITLE}`}>
                Quote options <span className="font-normal normal-case tracking-normal text-white/70">· {p.quotes.length || "none yet"}</span>
              </p>
              <ul className="relative m-0 flex list-none flex-col gap-1.5 p-0">
                {p.quotes.slice(0, 5).map((q, n) => {
                  const st = QUOTE_STATUS[q.status] ?? { label: q.status, cls: "bg-white/15 text-white" };
                  return (
                    <li key={q.id} className="flex items-center gap-2 rounded-[12px] border border-[#7DD3FC]/40 bg-[#0B2A6A]/80 px-2.5 py-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2094F3] font-source-sans text-[12px] font-bold text-white">
                        {String.fromCharCode(65 + n)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-source-sans text-[13px] font-bold text-[#7DD3FC]">
                          {q.batteryKwh ? `${q.batteryKwh} kWh battery` : "Solar only"}
                          {q.systemKw ? ` · ${q.systemKw} kW` : ""}
                        </span>
                        <span className="block text-[11px] text-white/75">
                          {q.reference} · {money(q.totalCents)}
                          {q.depositPaidAt ? " · deposit paid" : ""}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
              {!p.quotes.length ? <p className="relative m-0 text-[12px] text-white/70">Create quotes from Quotes &amp; Leads.</p> : null}
            </div>

            {/* 25-year savings, or the design's status when the engine didn't store it */}
            <div className={`${GLASS} ${TINT.charcoal} flex flex-col items-center justify-center gap-1 p-4 text-center`}>
              <Sheen />
              {p.design.pricing.netSavings25y ? (
                <>
                  <p className={`relative m-0 ${LABEL}`}>25-year net savings</p>
                  <p className="relative m-0 font-source-sans text-[36px] font-bold leading-[1.1]">
                    <span className={GREEN_TEXT}>{p.design.pricing.netSavings25y}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className={`relative m-0 ${LABEL}`}>Design</p>
                  <p className="relative m-0 font-source-sans text-[20px] font-bold text-white">
                    {p.design.chosenAt ? "Chosen by the customer" : p.design.sentAt ? "Sent to the customer" : p.design.savedBy === "customer" ? "Saved by the customer" : "Made by EasyLink"}
                  </p>
                </>
              )}
              <p className="relative m-0 text-[11px] text-white/70">
                {p.design.sentAt ? `Sent ${when(p.design.sentAt)} · ` : ""}Last changed {when(p.design.updatedAt)}
              </p>
            </div>
          </div>

          {/* Engagement */}
          <div className={`${GLASS} ${TINT.charcoal} p-4`}>
            <Sheen />
            <p className={`relative m-0 ${TITLE}`}>Customer engagement</p>
            {p.activity.length ? (
              <ol className="relative m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {p.activity.map((a, n) => (
                  <li key={n} className="flex items-start gap-2.5 text-[13px]">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${a.who === "customer" ? "bg-[#34D399]" : "bg-[#7DD3FC]"}`}
                    />
                    <span className="flex-1 text-white">
                      {a.text}
                      <span className="sr-only">{a.who === "customer" ? " (customer)" : " (EasyLink)"}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-white/65">{when(a.at)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="relative m-0 mt-2 text-[12px] text-white/70">Nothing yet.</p>
            )}
            <p className="relative m-0 mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-2 rounded-full bg-[#34D399]" /> Customer did this
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="size-2 rounded-full bg-[#7DD3FC]" /> EasyLink did this
              </span>
              <span>Calls, texts and emails are in the timeline below.</span>
            </p>
          </div>
        </div>
      ) : null}

      {bigRoof ? (
        <div role="dialog" aria-modal="true" aria-label="Roof design" className="fixed inset-0 z-50 flex items-center justify-center bg-[#020817]/80 p-4" onClick={() => setBigRoof(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={roofSrc} alt={`Roof design for ${lead.name}`} className="max-h-[90vh] max-w-full rounded-[14px]" />
        </div>
      ) : null}
    </section>
  );
}
