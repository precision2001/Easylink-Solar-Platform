"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Signals (Operations portal): what is bringing leads to EasyLink and what
 * those leads went on to do. An influencer is anything that generates
 * activity (owner's definition): a referral code, a partner, a campaign, an
 * ad click, the design platform itself, a phone call.
 *
 * Every number is counted by the server from real leads and quotes. Leads
 * with no recorded source are shown as "Unknown source" so gaps in tracking
 * are visible rather than hidden. Not shown, because the platform does not
 * record it yet: visits and designs that never became a lead.
 */

type Row = {
  key: string;
  name: string;
  type: string;
  leads: number;
  designs: number;
  contacted: number;
  quotesSent: number;
  accepted: number;
  depositsPaid: number;
  lost: number;
  revenueCents: number;
};
type Data = { days: number; since: string; rows: Row[]; totals: Row };

const PERIODS = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-AU")}`;
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—");

async function load(days: number): Promise<Data> {
  const res = await fetch(`/api/admin/leads/pipeline/influencers?days=${days}`, { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.message ?? "Could not load signals.");
  return body.data as Data;
}

export function MasterSignals() {
  const [days, setDays] = useState(30);
  /** The last answer, kept with the period it was for, so a period change shows as loading without resetting state in the effect. */
  const [result, setResult] = useState<{ days: number; data?: Data; error?: string } | null>(null);

  useEffect(() => {
    let live = true;
    load(days)
      .then((d) => live && setResult({ days, data: d }))
      .catch((e: unknown) => live && setResult({ days, error: e instanceof Error ? e.message : "Could not load signals." }));
    return () => {
      live = false;
    };
  }, [days]);

  const current = result?.days === days ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;

  const t = data?.totals;
  const steps = t
    ? [
        { label: "Leads", value: t.leads },
        { label: "With a saved design", value: t.designs },
        { label: "Contacted", value: t.contacted },
        { label: "Quote sent", value: t.quotesSent },
        { label: "Quote accepted", value: t.accepted },
        { label: "Deposit paid", value: t.depositsPaid },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-8 py-7 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Signals</h1>
          <p className="m-0 text-[14.5px] text-[#475569]">What is bringing leads to EasyLink, and what those leads went on to do.</p>
        </div>
        <div role="group" aria-label="Period" className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={days === p.days}
              onClick={() => setDays(p.days)}
              className={`h-10 rounded-full border px-4 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${
                days === p.days ? "border-[#0B1A2E] bg-[#0B1A2E] text-white" : "border-[#CBD5E1] bg-white text-[#334155] hover:border-[#64748B]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="m-0 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[14.5px] text-[#991B1B]">
          {error}
        </p>
      ) : !data || !t ? (
        <p className="m-0 text-[14.5px] text-[#475569]">Loading signals…</p>
      ) : (
        <>
          <section aria-label="Where leads stop" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
            <h2 className="m-0 text-[17px] font-bold text-[#0F172A]">Where leads stop</h2>
            {t.leads === 0 ? (
              <p className="m-0 text-[14.5px] text-[#475569]">No leads were created in this period.</p>
            ) : (
              <div className="grid grid-cols-[170px_minmax(0,1fr)_110px] items-center gap-x-4 gap-y-2 text-[14.5px]">
                {steps.map((s) => (
                  <FunnelRow key={s.label} label={s.label} value={s.value} of={t.leads} />
                ))}
              </div>
            )}
            <p className="m-0 text-[13px] text-[#475569]">
              Counts leads created in the last {PERIODS.find((p) => p.days === days)?.label}. Visits and designs that never became a lead are not counted here: the platform does not record them yet.
            </p>
          </section>

          <section aria-label="Influencers" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 text-[17px] font-bold text-[#0F172A]">Influencers</h2>
              <span className="text-[13px] text-[#475569]">Ranked by quotes accepted, then revenue, then leads</span>
            </div>
            {data.rows.length === 0 ? (
              <p className="m-0 text-[14.5px] text-[#475569]">Nothing to rank yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-[14.5px]">
                  <thead>
                    <tr className="text-[12.5px] font-semibold text-[#475569]">
                      {["#", "Influencer", "Type", "Leads", "Designs", "Contacted", "Quotes sent", "Accepted", "Deposits", "Revenue", "Lead to sale"].map((h) => (
                        <th key={h} scope="col" className="whitespace-nowrap border-b border-[#E2E8F0] px-2.5 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={r.key} className="border-b border-[#EEF2F6]">
                        <td className="px-2.5 py-2.5 tabular-nums text-[#475569]">{i + 1}</td>
                        <th scope="row" className="px-2.5 py-2.5 font-semibold text-[#0F172A]">
                          {r.name}
                          {r.type === "Untracked" ? <span className="ml-2 rounded-full bg-[#FEF3C7] px-2 py-[1px] text-[12px] font-bold text-[#92400E]">Fix tracking</span> : null}
                        </th>
                        <td className="whitespace-nowrap px-2.5 py-2.5 text-[#334155]">{r.type}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{r.leads}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{r.designs}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{r.contacted}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{r.quotesSent}</td>
                        <td className="px-2.5 py-2.5 font-semibold tabular-nums">{r.accepted}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{r.depositsPaid}</td>
                        <td className="whitespace-nowrap px-2.5 py-2.5 tabular-nums">{money(r.revenueCents)}</td>
                        <td className="px-2.5 py-2.5 tabular-nums">{pct(r.accepted, r.leads)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="m-0 text-[13px] text-[#475569]">
              Revenue is the total of accepted quotes. Each lead counts once, under the most specific source recorded for it. Open a lead&apos;s own signals from{" "}
              <Link href="/master/quotes-leads" className="font-semibold text-[#1976D2]">
                Quotes &amp; Leads
              </Link>
              .
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function FunnelRow({ label, value, of }: { label: string; value: number; of: number }) {
  const width = of > 0 ? Math.max(value > 0 ? 1.5 : 0, (value / of) * 100) : 0;
  return (
    <>
      <span className="text-[#0F172A]">{label}</span>
      <div className="h-[22px] rounded-[6px] bg-[#EEF2F6]">
        <div className="h-full rounded-[6px] bg-[#1976D2]" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-semibold tabular-nums text-[#0F172A]">
        {value.toLocaleString("en-AU")} <span className="font-normal text-[#475569]">({pct(value, of)})</span>
      </span>
    </>
  );
}
