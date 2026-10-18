"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Distributor sales dashboard" mock exactly
 * (SalesBody.dc.html, role="distributor") — figures, names, structure.
 * None of this (forecast, STC claims, lead-source attribution, satisfaction
 * scores, cash flow) has a real backing data model in this app yet, so it's
 * sample data throughout, same convention as the Overview pages. The
 * revenue/profit/installs tab switch and chart/table toggle are real,
 * working client-side logic — just operating on the sample dataset.
 */

const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"] as const;

const HERO = [
  { l: "Active deals", v: "73", s: "8 proposals out · $142k" },
  { l: "Win rate", v: "31%", s: "Proposals this quarter" },
  { l: "Avg cycle", v: "41 days", s: "Lead to install" },
  { l: "Installers", v: "4 + 1", s: "Linked + own crew" },
] as const;

const STRIP = [
  { l: "Staff seats", v: "6 of 10" },
  { l: "STC jobs approved", v: "4" },
  { l: "Avg system", v: "9.1 kW" },
  { l: "Installs this week", v: "9" },
  { l: "Avg battery", v: "13.1 kWh" },
  { l: "Lead → paid", v: "7.1%" },
] as const;

const N = "#475569";
const G = "#166534";
const A = "#92400E";

const KPIS = [
  { l: "Pipeline value · weighted", v: "$214k", s: "$402k unweighted", c: N },
  { l: "Conversion rate", v: "7.1%", s: "6 of 84 leads in Oct", c: N },
  { l: "Average cycle", v: "41 days", s: "▼ 3 days vs last quarter", c: G },
  { l: "Average system size", v: "9.1 kW", s: "All installs", c: N },
  { l: "Average deal size", v: "$14,700", s: "Ex GST", c: N },
  { l: "Net profit · Oct", v: "$17.3k", s: "Margin + commission − installer costs", c: N },
  { l: "Installs this month", v: "6", s: "Month to date", c: N },
  { l: "Pending proposals", v: "8", s: "3 viewed today", c: A },
] as const;

const REV_A = [82, 104, 118, 131, 124, 96];
const REV_B = [0, 0, 0, 0, 0, 0];
const PROFIT = [14.1, 18.2, 21.0, 23.4, 21.9, 17.3];
const INSTALLS = [5, 7, 9, 10, 9, 6];

function fmt(n: number): string {
  return `$${Math.round(n * 10) / 10}k`;
}

const FUNNEL = [
  ["New lead", 84],
  ["Appointment", 38],
  ["Site assessment", 27],
  ["Designing", 22],
  ["Proposal sent", 19],
  ["Deposit paid", 9],
  ["Installing", 6],
  ["Payment completed", 6],
] as const;

const STC = [
  { n: "Created", v: "1", d: "Pack incomplete", c: "#94A3B8", href: null },
  { n: "Submitted", v: "2", d: "Ready to review", c: "#1976D2", href: null },
  { n: "Approved", v: "4", d: "Lodging", c: "#F68A0A", href: "/master/jobs" },
  { n: "Paid", v: "11", d: "This FY", c: G, href: "/master/jobs" },
] as const;

const TEAM = [
  { n: "Daniel Shaw", r: "Owner", a: "21", b: "38%", c: "$58.2k" },
  { n: "Amy Lee", r: "Sales agent", a: "17", b: "29%", c: "$31.9k" },
  { n: "Voxa Sales Qualifier", r: "AI agent", a: "41 booked", b: "—", c: "—" },
] as const;

const INSTALLER_PERF = [
  { n: "Install crew A", a: "5 installs", b: "91% right first time", c: "4.9 ★" },
  { n: "Solarman", a: "4 installs", b: "82% right first time", c: "4.7 ★" },
  { n: "[Electrical contractor]", a: "1 install", b: "88% right first time", c: "4.8 ★" },
] as const;

const ACTIVITY = [
  { tag: "Approval", t: "SO-48240 from Solarman waiting for approval", at: "9:30 am", bg: "#FFE7C2", fg: "#3B1D00" },
  { tag: "Offer", t: "JO-2207 viewed by Solarman · expires in 2 h", at: "9:10 am", bg: "#DBEAFE", fg: "#1E40AF" },
  { tag: "AI", t: "Voxa booked a site visit with Raj Malhotra", at: "9:58 am", bg: "#FFE7C2", fg: "#3B1D00" },
  { tag: "Deposit", t: "Karen Whitfield paid her deposit · ready to dispatch", at: "Yesterday", bg: "#DCFCE7", fg: G },
  { tag: "Shop", t: "Customer shop order SO-48251 · BLUETTI AC180", at: "Yesterday", bg: "#EDE4FF", fg: "#3B1F75" },
] as const;

const OUTREACH = [
  { n: "Greg Holt · Rooty Hill", d: "Uncontacted 2 days", cta: "Email follow-up" },
  { n: "Lucy Fraser · Kellyville", d: "Proposal not opened in 5 days", cta: "Email follow-up" },
  { n: "Tom Barker", d: "Callback today 3 pm", cta: "Open callback" },
] as const;

const SOURCES = [
  ["Website quote form", 142, "34%"],
  ["Voxa AI calls", 96, "22%"],
  ["EasyLink referrals", 61, "38%"],
  ["Web chat / WhatsApp", 48, "19%"],
  ["Installer referrals", 22, "45%"],
  ["Expos & events", 18, "11%"],
] as const;

const REGIONS = [
  { n: "Hills District", i: 14, s: "9.8 kW", v: "$148k" },
  { n: "Blacktown", i: 11, s: "8.9 kW", v: "$102k" },
  { n: "Parramatta", i: 9, s: "8.2 kW", v: "$84k" },
  { n: "Penrith", i: 6, s: "9.4 kW", v: "$61k" },
  { n: "Brisbane", i: 3, s: "7.6 kW", v: "$22k" },
] as const;

const FORECAST = {
  v: "$310k",
  s: "forecast · 86% of $360k target",
  won: 27,
  wt: 59,
  wonV: "$96.4k",
  wtV: "$214k",
  target: "$360k",
  cov: "0.81×",
  covC: A,
  acc: "±7%",
};

const SAT = [
  { l: "NPS", v: "64", s: "112 post-install surveys" },
  { l: "CSAT", v: "4.8 / 5", s: "Same surveys" },
  { l: "Google", v: "4.7", s: "210 reviews" },
] as const;

const EFF = [
  { l: "Avg install", v: "1.4 days" },
  { l: "Right first time", v: "88%" },
  { l: "Rework", v: "4%" },
  { l: "Crew utilisation", v: "74%" },
] as const;

const WEEKLY = [4, 5, 3, 6, 9];
const WEEK_LABELS = ["W38", "W39", "W40", "W41", "W42"];

const CASH: {
  l: string;
  v: string;
  s: string;
  c?: string;
  href: string | null;
}[] = [
  { l: "Customer invoices due", v: "$38,400", s: "14 invoices", href: "/master/invoices" },
  { l: "Owed to EasyLink", v: "$18,240", s: "$6,300 overdue", c: "#991B1B", href: "/master/invoices" },
  { l: "Installer payouts Fri", v: "$16,340", s: "2 installers", href: null },
  { l: "Commission pending", v: "$3,534", s: "+ $480 on hold", href: null },
  { l: "Deposit collection", v: "92%", s: "Days to pay 21", href: "/master/invoices" },
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

export function MasterSalesDashboard() {
  const [period, setPeriod] = useState("October 2026");
  const [metric, setMetric] = useState<0 | 1 | 2>(0);
  const [showTable, setShowTable] = useState(false);

  const chart = useMemo(() => {
    if (metric === 0) {
      const two = REV_B.some((x) => x > 0);
      const tot = REV_A.map((x, i) => x + REV_B[i]!);
      const max = Math.max(...tot);
      return {
        total: fmt(tot.reduce((s, x) => s + x, 0)),
        totalNote: "revenue May–Oct, ex GST",
        bars: MONTHS.map((m, i) => ({
          m,
          label: fmt(tot[i]!),
          av: fmt(REV_A[i]!),
          bv: two ? fmt(REV_B[i]!) : "—",
          ha: Math.round((REV_A[i]! / max) * 180),
        })),
      };
    }
    const arr = metric === 1 ? PROFIT : INSTALLS;
    const max = Math.max(...arr);
    const f = metric === 1 ? fmt : (x: number) => String(x);
    return {
      total: metric === 1 ? fmt(arr.reduce((s, x) => s + x, 0)) : String(arr.reduce((s, x) => s + x, 0)),
      totalNote: metric === 1 ? "net profit May–Oct" : "installs May–Oct",
      bars: MONTHS.map((m, i) => ({
        m,
        label: f(arr[i]!),
        av: f(arr[i]!),
        bv: "—",
        ha: Math.round((arr[i]! / max) * 180),
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
              [Distributor] Pty Ltd · your sales and your installer network · October 2026
            </p>
          </div>
          <select
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
          <span className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00]">
            New deal
          </span>
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
          {!showTable ? (
            <>
              <div className="flex h-[230px] items-end gap-4 border-b border-[#CBD5E1] px-2">
                {chart.bars.map((b) => (
                  <div key={b.m} title={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
                    <span className="text-[12px] font-semibold text-[#334155]">{b.label}</span>
                    <span
                      className="w-full max-w-[44px] rounded-t-[4px] bg-[#F68A0A]"
                      style={{ height: `${b.ha}px` }}
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
                  <th className="border-b border-[#E3E8EF] p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {chart.bars.map((b) => (
                  <tr key={b.m}>
                    <td className="border-b border-[#EEF2F6] p-2">{b.m}</td>
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
              <span className="text-[12px] font-bold text-[#166534]">7.1% lead → paid</span>
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
              Status comes from installers&apos; handover packs and your approvals in Handover review.
            </span>
          </Panel>
        </div>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <Panel>
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Team &amp; installer performance</h2>
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
            <h3 className="m-0 mt-2 text-[14px] font-bold text-[#0F172A]">Installer performance</h3>
            {INSTALLER_PERF.map((i) => (
              <div key={i.n} className="flex gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0">
                <strong className="flex-grow">{i.n}</strong>
                <span>{i.a}</span>
                <span className="text-[#475569]">{i.b}</span>
                <span className="font-semibold">{i.c}</span>
              </div>
            ))}
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
            <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-[#EEF2F6]">
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
            <div className="flex h-[90px] items-end gap-3 border-b border-[#CBD5E1]">
              {WEEKLY.map((v, i) => (
                <div key={WEEK_LABELS[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
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
