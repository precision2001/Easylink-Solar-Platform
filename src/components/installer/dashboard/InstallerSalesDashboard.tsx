"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Installer sales dashboard" mock exactly
 * (SalesBody.dc.html, role="installer") — figures, names, structure.
 * None of this (forecast, STC claims, lead-source attribution, satisfaction
 * scores, cash flow) has a real backing data model in this app yet, so it's
 * sample data throughout, same convention as the master sales dashboard
 * (MasterSalesDashboard.tsx). The revenue/profit/installs tab switch and
 * chart/table toggle are real, working client-side logic — just operating
 * on the sample dataset.
 */

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"] as const;

const HERO = [
  { l: "Active deals", v: "4", s: "+ 2 EasyLink jobs installing" },
  { l: "Win rate", v: "60%", s: "3 of 5 proposals this quarter" },
  { l: "Avg cycle", v: "34 days", s: "Lead to install" },
  { l: "Installs this month", v: "6", s: "4 EasyLink · 2 own" },
] as const;

const STRIP = [
  { l: "Crew", v: "3 + 1 starting" },
  { l: "STC jobs approved", v: "4" },
  { l: "Avg system", v: "8.4 kW" },
  { l: "Installs this week", v: "4" },
  { l: "Avg battery", v: "14.2 kWh" },
  { l: "Lead → paid", v: "18%" },
] as const;

const N = "#475569";
const G = "#166534";
const A = "#92400E";

const KPIS = [
  { l: "Pipeline value · weighted", v: "$47.3k", s: "$92.8k unweighted", c: N },
  { l: "Conversion rate", v: "18%", s: "6 of 33 leads this FY", c: N },
  { l: "Average cycle", v: "34 days", s: "▼ 5 days vs last quarter", c: G },
  { l: "Average system size", v: "8.4 kW", s: "Own and EasyLink jobs", c: N },
  { l: "Average deal size", v: "$16,900", s: "Own sales, ex GST", c: N },
  { l: "Net profit · Oct", v: "$8.9k", s: "After kit, crew and fees", c: N },
  { l: "Installs this month", v: "6", s: "▼ 4 vs September (month to date)", c: A },
  { l: "Pending proposals", v: "1", s: "Priya Sharma · opened twice", c: A },
] as const;

const REV_A = [21.4, 18.9, 26.0, 31.2, 24.5, 11.8];
const REV_B = [18.2, 21.4, 24.9, 22.1, 27.6, 14.9];
const PROFIT = [11.2, 11.6, 14.8, 15.9, 15.3, 8.9];
const INSTALLS = [7, 7, 9, 9, 10, 6];

function fmt(n: number): string {
  return `$${Math.round(n * 10) / 10}k`;
}

const FUNNEL = [
  ["New lead", 33],
  ["Appointment", 21],
  ["Site assessment", 17],
  ["Designing", 14],
  ["Proposal sent", 11],
  ["Deposit paid", 7],
  ["Installing", 6],
  ["Payment completed", 6],
] as const;

const STC = [
  { n: "Created", v: "1", d: "Pack incomplete", c: "#94A3B8", href: null },
  { n: "Submitted", v: "2", d: "Under review", c: "#1976D2", href: null },
  { n: "Approved", v: "4", d: "On RCTI-0412", c: "#F68A0A", href: "/installers/dashboard/payouts" },
  { n: "Paid", v: "9", d: "This FY", c: G, href: "/installers/dashboard/payouts" },
] as const;

const TEAM = [
  { n: "Emmanuel", r: "Owner", a: "8", b: "50%", c: "$68.4k" },
  { n: "Tomas", r: "Scheduler", a: "5", b: "40%", c: "$25.1k" },
  { n: "AI receptionist", r: "Voxa · Elite", a: "12 booked", b: "—", c: "—" },
] as const;

const ACTIVITY = [
  { tag: "Deposit", t: "Grace Lim paid her deposit", at: "9:02 am", bg: "#DCFCE7", fg: G },
  { tag: "AI", t: "AI receptionist booked Lucas Nguyen for Sat 18 Oct", at: "9:14 am", bg: "#FFE7C2", fg: "#3B1D00" },
  { tag: "Portal", t: "Daniel Moretti viewed his design options", at: "9:38 am", bg: "#EDE4FF", fg: "#3B1F75" },
  { tag: "Handover", t: "JOB-3112 sent back: CCEW and 4 photos missing", at: "Yesterday", bg: "#FEE2E2", fg: "#991B1B" },
  { tag: "Payout", t: "RCTI-0412 scheduled for Fri 17 Oct · $14,860", at: "Yesterday", bg: "#DBEAFE", fg: "#1E40AF" },
] as const;

const OUTREACH = [
  { n: "Priya Sharma", d: "Proposal opened twice, not accepted", cta: "Email follow-up" },
  { n: "Marco · Ryde", d: "WhatsApp enquiry · panel cleaning", cta: "Reply in Inbox" },
  { n: "Home show list · 175", d: "Not contacted yet", cta: "Start campaign" },
] as const;

const SOURCES = [
  ["EasyLink job offers", 20, "70%"],
  ["Website", 12, "33%"],
  ["AI web chat", 6, "17%"],
  ["Referrals", 5, "60%"],
  ["Home show", 4, "25%"],
  ["Customer portal referrals", 2, "—"],
] as const;

const REGIONS = [
  { n: "Parramatta", i: 7, s: "7.9 kW", v: "$41.2k" },
  { n: "Hills District", i: 6, s: "9.6 kW", v: "$38.7k" },
  { n: "Blacktown", i: 5, s: "8.8 kW", v: "$27.5k" },
  { n: "Ryde", i: 4, s: "6.9 kW", v: "$19.8k" },
  { n: "Bankstown & Liverpool", i: 3, s: "8.1 kW", v: "$16.3k" },
] as const;

const FORECAST = {
  v: "$59.1k",
  s: "forecast · 66% of $90k target",
  won: 13,
  wt: 53,
  wonV: "$11.8k",
  wtV: "$47.3k",
  target: "$90k",
  cov: "0.6×",
  covC: "#991B1B",
  acc: "±9%",
};

const SAT = [
  { l: "NPS", v: "61", s: "38 post-install surveys" },
  { l: "CSAT", v: "4.7 / 5", s: "Same surveys" },
  { l: "Google", v: "4.8", s: "27 reviews" },
] as const;

const EFF = [
  { l: "Avg install", v: "1.2 days" },
  { l: "Right first time", v: "82%" },
  { l: "Rework", v: "6%" },
  { l: "Crew utilisation", v: "80%" },
] as const;

const WEEKLY = [2, 3, 2, 3, 4];
const WEEK_LABELS = ["W38", "W39", "W40", "W41", "W42"];

const CASH: {
  l: string;
  v: string;
  s: string;
  c?: string;
  href: string | null;
}[] = [
  { l: "Customer invoices due", v: "$4,180", s: "2 invoices", href: "/installers/dashboard/reports" },
  { l: "Overdue", v: "$0", s: "None", c: G, href: "/installers/dashboard/reports" },
  { l: "EasyLink payout Fri", v: "$14,860", s: "RCTI-0412", href: "/installers/dashboard/payouts" },
  { l: "On hold", v: "$3,420", s: "JOB-3112", c: "#991B1B", href: "/installers/dashboard/handover" },
  { l: "Deposit collection", v: "86%", s: "Days to pay 9", href: "/installers/dashboard/reports" },
];

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
      {children}
    </section>
  );
}

function StatTile({ l, v, s }: { l: string; v: string; s?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-2.5">
      <span className="text-[12px] text-[#475569]">{l}</span>
      <strong className="font-source-sans text-[22px] text-[#0F172A]">{v}</strong>
      {s ? <span className="text-[11px] text-[#5B6B80]">{s}</span> : null}
    </div>
  );
}

export function InstallerSalesDashboard() {
  const [period, setPeriod] = useState("October 2026");
  const [metric, setMetric] = useState<0 | 1 | 2>(0);
  const [showTable, setShowTable] = useState(false);

  const chart = useMemo(() => {
    if (metric === 0) {
      const two = REV_B.some((x) => x > 0);
      const tot = REV_A.map((x, i) => x + REV_B[i]!);
      const max = Math.max(...tot);
      return {
        two,
        total: fmt(tot.reduce((s, x) => s + x, 0)),
        totalNote: "revenue May–Oct, ex GST",
        aria: `Revenue by month: ${MONTHS.map((mm, i) => `${mm} ${fmt(tot[i]!)}`).join(", ")}`,
        bars: MONTHS.map((m, i) => {
          const ha = Math.round((REV_A[i]! / max) * 180);
          const hb = Math.round((REV_B[i]! / max) * 180);
          return {
            m,
            label: fmt(tot[i]!),
            av: fmt(REV_A[i]!),
            bv: fmt(REV_B[i]!),
            ha,
            hb: Math.max(hb - 2, 0),
            tip: `${m}: Own sales ${fmt(REV_A[i]!)}, EasyLink jobs ${fmt(REV_B[i]!)}`,
          };
        }),
      };
    }
    const arr = metric === 1 ? PROFIT : INSTALLS;
    const max = Math.max(...arr);
    const f = metric === 1 ? fmt : (x: number) => String(x);
    return {
      two: false,
      total: metric === 1 ? fmt(arr.reduce((s, x) => s + x, 0)) : String(arr.reduce((s, x) => s + x, 0)),
      totalNote: metric === 1 ? "net profit May–Oct" : "installs May–Oct",
      aria: `${metric === 1 ? "Net profit" : "Installs"} by month: ${MONTHS.map(
        (mm, i) => `${mm} ${f(arr[i]!)}`,
      ).join(", ")}`,
      bars: MONTHS.map((m, i) => ({
        m,
        label: f(arr[i]!),
        av: f(arr[i]!),
        bv: "—",
        ha: Math.round((arr[i]! / max) * 180),
        hb: 0,
        tip: `${m}: ${f(arr[i]!)}`,
      })),
    };
  }, [metric]);

  const fmax = FUNNEL[0]![1];
  const smax = Math.max(...SOURCES.map((s) => s[1] as number));
  const wmax = Math.max(...WEEKLY);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <span className="font-semibold text-[#0F172A]">Sales dashboard</span>
        </nav>
        <span className="text-[12px] text-[#475569]">Updated 2 minutes ago</span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Sales dashboard</h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Solarman · your own sales and EasyLink jobs together · October 2026
            </p>
          </div>
          <label htmlFor="period" className="sr-only">
            Period
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
          >
            <option>October 2026</option>
            <option>This quarter</option>
            <option>FY 2026–27</option>
          </select>
          <button type="button" className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A]">
            CSV
          </button>
          <button type="button" className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A]">
            PDF
          </button>
          <Link
            href="/installers/dashboard/customers"
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] no-underline"
          >
            New deal
          </Link>
        </div>

        <section
          aria-label="Pipeline overview"
          className="flex flex-col gap-3.5 rounded-[16px] p-[18px_20px] text-[#3B1D00]"
          style={{ background: "linear-gradient(90deg, #FFE866, #F68A0A)" }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {HERO.map((h) => (
              <div key={h.l} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em]">{h.l}</span>
                <strong className="font-source-sans text-[30px]">{h.v}</strong>
                <span className="text-[12px]">{h.s}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STRIP.map((s) => (
              <div key={s.l} className="flex flex-col gap-0.5 rounded-[10px] bg-white/55 p-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em]">{s.l}</span>
                <strong className="text-[15px]">{s.v}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.l} className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white p-3.5">
              <span className="text-[12px] font-semibold text-[#475569]">{k.l}</span>
              <strong className="font-source-sans text-[26px] text-[#0F172A]">{k.v}</strong>
              <span className="text-[12px] font-semibold" style={{ color: k.c }}>
                {k.s}
              </span>
            </div>
          ))}
        </div>

        <Panel>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Monthly performance</h2>
            <div role="group" aria-label="Measure" className="flex gap-1 rounded-[10px] bg-[#F1F5F9] p-1">
              {(["Revenue", "Profit", "Installs"] as const).map((l, i) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={metric === i}
                  onClick={() => setMetric(i as 0 | 1 | 2)}
                  className="h-[34px] rounded-[8px] px-3 text-[13px] font-semibold"
                  style={{
                    background: metric === i ? "#0B1A2E" : "transparent",
                    color: metric === i ? "#FFFFFF" : "#475569",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowTable((t) => !t)}
              className="h-[34px] rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
            >
              {showTable ? "Show chart" : "Show table"}
            </button>
          </div>
          <div className="flex items-baseline gap-2.5">
            <strong className="font-source-sans text-[28px] text-[#0F172A]">{chart.total}</strong>
            <span className="text-[13px] text-[#475569]">{chart.totalNote}</span>
          </div>
          {chart.two ? (
            <div className="flex gap-4 text-[12px] text-[#334155]">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[#1976D2]" />
                Own sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[#F68A0A]" />
                EasyLink jobs
              </span>
            </div>
          ) : null}
          {!showTable ? (
            <>
              <div
                role="img"
                aria-label={chart.aria}
                className="flex h-[230px] items-end gap-4 border-b border-[#CBD5E1] px-2"
                style={{
                  background:
                    "repeating-linear-gradient(to top, transparent 0, transparent 56px, #EEF2F6 56px, #EEF2F6 57px)",
                }}
              >
                {chart.bars.map((b) => (
                  <div
                    key={b.m}
                    title={b.tip}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-0.5"
                  >
                    <span className="text-[12px] font-semibold text-[#334155]">{b.label}</span>
                    <span
                      className="w-full max-w-[44px] rounded-t-[4px] bg-[#F68A0A]"
                      style={{ height: `${b.hb}px` }}
                    />
                    <span
                      className="w-full max-w-[44px] bg-[#1976D2]"
                      style={{ height: `${b.ha}px`, borderRadius: chart.two ? "0" : "4px 4px 0 0" }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-4 px-2">
                {chart.bars.map((b) => (
                  <span key={b.m} className="flex-1 text-center text-[12px] text-[#5B6B80]">
                    {b.m}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2">Month</th>
                  {chart.two ? (
                    <>
                      <th className="border-b border-[#E3E8EF] p-2 text-right">Own sales</th>
                      <th className="border-b border-[#E3E8EF] p-2 text-right">EasyLink jobs</th>
                    </>
                  ) : null}
                  <th className="border-b border-[#E3E8EF] p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {chart.bars.map((b) => (
                  <tr key={b.m}>
                    <td className="border-b border-[#EEF2F6] p-2">{b.m}</td>
                    {chart.two ? (
                      <>
                        <td className="border-b border-[#EEF2F6] p-2 text-right">{b.av}</td>
                        <td className="border-b border-[#EEF2F6] p-2 text-right">{b.bv}</td>
                      </>
                    ) : null}
                    <td className="border-b border-[#EEF2F6] p-2 text-right font-semibold">{b.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Sales funnel · shared 8 stages</h2>
              <span className="text-[12px] font-bold text-[#166534]">18% lead → paid</span>
            </div>
            {FUNNEL.map(([name, count]) => (
              <div key={name} title={`${name}: ${count}`} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-[130px] text-[#475569]">{name}</span>
                <span className="h-5 flex-grow rounded-[4px] bg-[#F1F5F9]">
                  <span
                    className="block h-full rounded-[4px] bg-[#1976D2]"
                    style={{ width: `${Math.max(2, Math.round(((count as number) / fmax) * 100))}%` }}
                  />
                </span>
                <strong className="w-9 text-right">{count}</strong>
              </div>
            ))}
          </Panel>

          <Panel>
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">STC claim pipeline</h2>
              <span className="text-[12px] text-[#5B6B80]">Jobs by claim status</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STC.map((s) =>
                s.href ? (
                  <Link
                    key={s.n}
                    href={s.href}
                    className="flex flex-col gap-0.5 rounded-[12px] bg-[#F8FAFC] p-3 no-underline"
                    style={{ borderTop: `4px solid ${s.c}` }}
                  >
                    <span className="text-[12px] text-[#475569]">{s.n}</span>
                    <strong className="font-source-sans text-[26px] text-[#0F172A]">{s.v}</strong>
                    <span className="text-[11px] text-[#5B6B80]">{s.d}</span>
                  </Link>
                ) : (
                  <div
                    key={s.n}
                    className="flex flex-col gap-0.5 rounded-[12px] bg-[#F8FAFC] p-3"
                    style={{ borderTop: `4px solid ${s.c}` }}
                  >
                    <span className="text-[12px] text-[#475569]">{s.n}</span>
                    <strong className="font-source-sans text-[26px] text-[#0F172A]">{s.v}</strong>
                    <span className="text-[11px] text-[#5B6B80]">{s.d}</span>
                  </div>
                ),
              )}
            </div>
            <span className="text-[12px] text-[#475569]">
              EasyLink lodges STCs for EasyLink jobs; for your own customers they&apos;re lodged from the project workflow.
            </span>
          </Panel>
        </div>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Team performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#475569]">
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Name</th>
                    <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Deals</th>
                    <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Win rate</th>
                    <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {TEAM.map((t) => (
                    <tr key={t.n}>
                      <td className="border-b border-[#EEF2F6] p-2.5">
                        <strong>{t.n}</strong>
                        <br />
                        <span className="text-[12px] text-[#5B6B80]">{t.r}</span>
                      </td>
                      <td className="border-b border-[#EEF2F6] p-2.5 text-right">{t.a}</td>
                      <td className="border-b border-[#EEF2F6] p-2.5 text-right">{t.b}</td>
                      <td className="border-b border-[#EEF2F6] p-2.5 text-right font-semibold">{t.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Recent activity</h2>
            {ACTIVITY.map((a) => (
              <div key={a.t} className="flex gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0">
                <span
                  className="h-fit shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: a.bg, color: a.fg }}
                >
                  {a.tag}
                </span>
                <span className="flex-grow text-[13px]">{a.t}</span>
                <span className="shrink-0 whitespace-nowrap text-[12px] text-[#5B6B80]">{a.at}</span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Lead follow-ups due</h2>
            {OUTREACH.map((o) => (
              <div key={o.n} className="flex flex-wrap items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0">
                <span className="flex flex-[1_1_200px] flex-col">
                  <strong className="text-[14px]">{o.n}</strong>
                  <span className="text-[12px] text-[#5B6B80]">{o.d}</span>
                </span>
                <button type="button" className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]">
                  {o.cta}
                </button>
              </div>
            ))}
          </Panel>

          <Panel>
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Lead source performance</h2>
              <span className="text-[12px] text-[#5B6B80]">Leads · win rate</span>
            </div>
            {SOURCES.map(([l, n, win]) => (
              <div key={l} title={`${l}: ${n} leads, ${win} won`} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-[150px]">{l}</span>
                <span className="h-3 flex-grow rounded-[4px] bg-[#F1F5F9]">
                  <span
                    className="block h-full rounded-[4px] bg-[#1976D2]"
                    style={{ width: `${Math.round(((n as number) / smax) * 100)}%` }}
                  />
                </span>
                <span className="w-8 text-right">{n}</span>
                <strong className="w-10 text-right">{win}</strong>
              </div>
            ))}
          </Panel>
        </div>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Regional breakdown</h2>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2">Region</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right">Installs</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right">Avg size</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {REGIONS.map((r) => (
                  <tr key={r.n}>
                    <td className="border-b border-[#EEF2F6] p-2">{r.n}</td>
                    <td className="border-b border-[#EEF2F6] p-2 text-right">{r.i}</td>
                    <td className="border-b border-[#EEF2F6] p-2 text-right">{r.s}</td>
                    <td className="border-b border-[#EEF2F6] p-2 text-right font-semibold">{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Quarter forecast</h2>
            <div className="flex items-baseline gap-2">
              <strong className="font-source-sans text-[28px] text-[#0F172A]">{FORECAST.v}</strong>
              <span className="text-[13px] text-[#475569]">{FORECAST.s}</span>
            </div>
            <div
              role="img"
              aria-label="Forecast: won 11.8k plus weighted pipeline 47.3k against a 90k target"
              className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#EEF2F6]"
            >
              <span style={{ width: `${FORECAST.won}%`, background: "#166534" }} />
              <span style={{ width: `${FORECAST.wt}%`, background: "#1976D2" }} />
            </div>
            <div className="flex flex-wrap gap-3.5 text-[12px] text-[#334155]">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[#166534]" />
                Won {FORECAST.wonV}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-[#1976D2]" />
                Weighted pipeline {FORECAST.wtV}
              </span>
              <span>Target {FORECAST.target}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatTile l="Pipeline coverage" v={FORECAST.cov} />
              <StatTile l="Last quarter's forecast vs actual" v={FORECAST.acc} />
            </div>
          </Panel>
        </div>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Customer satisfaction</h2>
            <div className="grid grid-cols-3 gap-2">
              {SAT.map((s) => (
                <StatTile key={s.l} l={s.l} v={s.v} s={s.s} />
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Installation efficiency</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EFF.map((e) => (
                <div key={e.l} className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-2.5">
                  <span className="text-[11px] text-[#475569]">{e.l}</span>
                  <strong className="text-[18px] text-[#0F172A]">{e.v}</strong>
                </div>
              ))}
            </div>
            <span className="text-[12px] text-[#475569]">Installs per week</span>
            <div
              role="img"
              aria-label={`Installs per week: ${WEEKLY.join(", ")} · last bar is this week (scheduled)`}
              className="flex h-[90px] items-end gap-3 border-b border-[#CBD5E1]"
            >
              {WEEKLY.map((v, i) => (
                <div
                  key={WEEK_LABELS[i]}
                  title={`${WEEK_LABELS[i]}: ${v} installs`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-0.5"
                >
                  <span className="text-[11px] font-semibold">{v}</span>
                  <span
                    className="w-full max-w-[36px] rounded-t-[4px]"
                    style={{
                      height: `${Math.round((v / wmax) * 70)}px`,
                      background: i === WEEKLY.length - 1 ? "#F68A0A" : "#1976D2",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {WEEK_LABELS.map((w) => (
                <span key={w} className="flex-1 text-center text-[11px] text-[#5B6B80]">
                  {w}
                </span>
              ))}
            </div>
          </Panel>
        </div>

        <Panel>
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Cash flow</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {CASH.map((c) =>
              c.href ? (
                <Link key={c.l} href={c.href} className="flex flex-col gap-0.5 rounded-[12px] bg-[#F8FAFC] p-3 no-underline">
                  <span className="text-[12px] text-[#475569]">{c.l}</span>
                  <strong className="font-source-sans text-[22px]" style={{ color: c.c ?? "#0F172A" }}>
                    {c.v}
                  </strong>
                  <span className="text-[11px] text-[#5B6B80]">{c.s}</span>
                </Link>
              ) : (
                <div key={c.l} className="flex flex-col gap-0.5 rounded-[12px] bg-[#F8FAFC] p-3">
                  <span className="text-[12px] text-[#475569]">{c.l}</span>
                  <strong className="font-source-sans text-[22px]" style={{ color: c.c ?? "#0F172A" }}>
                    {c.v}
                  </strong>
                  <span className="text-[11px] text-[#5B6B80]">{c.s}</span>
                </div>
              ),
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
