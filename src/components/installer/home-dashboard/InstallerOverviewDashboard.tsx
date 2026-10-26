"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/store/hooks";
import { ReadySitesBanner } from "@/components/market/ReadySitesBanner";

/**
 * Matches the Easylink Designer "Installer Account Overview" mock exactly
 * (figures, names, timings) — job offers, payouts, next-7-days jobs,
 * compliance and capacity aren't wired to real backend data yet, so this
 * page is illustrative by nature until that's built, same convention as
 * the admin Contact Centre page.
 */
const KPIS = [
  { label: "Open job offers", value: "3", sub: "Oldest expires in 2 h 14 m", subColor: "#92400E" },
  { label: "Jobs this month", value: "9", sub: "▲ 2 vs September", subColor: "#166534" },
  { label: "Next payout · Fri 17 Oct", value: "$14,860", sub: "RCTI-0412 · 4 jobs approved", subColor: "#475569" },
  { label: "Customer rating", value: "4.7 / 5", sub: "38 post-install surveys", subColor: "#475569" },
] as const;

const PAYOUT_MONTHS = [
  { month: "May", k: 18.2 },
  { month: "Jun", k: 21.4 },
  { month: "Jul", k: 24.9 },
  { month: "Aug", k: 22.1 },
  { month: "Sep", k: 27.6 },
  { month: "Oct", k: 14.9 },
].map((m) => ({
  ...m,
  label: `$${m.k}k`,
  h: Math.round(m.k * 5.2),
  color: m.month === "Oct" ? "#F68A0A" : "#1976D2",
}));

const RED = { bg: "#FEF2F2", dot: "#B91C1C" };
const AMBER = { bg: "#FFFBEB", dot: "#B45309" };
const BLUE = { bg: "#EFF6FF", dot: "#1D4ED8" };

const TASKS = [
  { title: "New lead · Daniel Moretti, Yagoona", desc: "Design over the 133% panel-to-inverter limit · fix before proposal", cta: "Open", ...AMBER },
  { title: "Offer JO-2207 expires in 2 h 14 m", desc: "Ryde · 6.6 kW + 10 kWh battery · suggested Tue 21 Oct", cta: "Respond", ...RED },
  { title: "Handover pack JOB-3112 incomplete", desc: "Missing CCEW and 4 required photos · payout on hold", cta: "Complete", ...RED },
  { title: "Battery SWMS induction due Thu 16 Oct", desc: "Required before your first battery job with EasyLink", cta: "Start", ...AMBER },
  { title: "Kit for JOB-3127 is in transit", desc: "SO-48177 · ETA Tue 14 Oct · delivered to site", cta: "Track", ...BLUE },
  { title: "Rates card updated from 1 Nov", desc: "Battery add-on rate changed · accept to keep receiving offers", cta: "Review", ...BLUE },
] as const;

const DELIVERED = { kBg: "#DCFCE7", kFg: "#166534" };
const TRANSIT = { kBg: "#DBEAFE", kFg: "#1E40AF" };
const PICKING = { kBg: "#E2E8F0", kFg: "#334155" };

const JOBS = [
  { when: "Wed 15 Oct · 7:30 am", id: "JOB-3127", where: "Kellyville", sys: "6.6 kW · 16 × 415 W · 5 kW inverter", kit: "In transit", crew: "Emmanuel + Tomas", conf: "Yes · Voxa call", ...TRANSIT },
  { when: "Thu 16 Oct · 8:00 am", id: "JOB-3133", where: "Ermington", sys: "13 kWh battery add-on", kit: "Delivered", crew: "Emmanuel", conf: "Yes · SMS", ...DELIVERED },
  { when: "Fri 17 Oct · 7:30 am", id: "JOB-3138", where: "Blacktown", sys: "10.56 kW · 24 × 440 W · 9.9 kW hybrid", kit: "Ordered · SO-48240", crew: "Tomas + Aaron", conf: "Reminder Wed", ...PICKING },
  { when: "Mon 20 Oct · 9:00 am", id: "JOB-3141", where: "Ryde", sys: "Inverter swap · 5 kW", kit: "Picking", crew: "Aaron", conf: "Reminder Sat", ...PICKING },
] as const;

const OK = { bg: "#DCFCE7", fg: "#166534" };
const WARN = { bg: "#FEF3C7", fg: "#92400E" };

const DOCS = [
  { name: "Electrical contractor licence (NSW)", meta: "Checked with NSW Fair Trading", status: "Current", ...OK },
  { name: "SAA accreditation", meta: "Install + battery · 2 accredited crew", status: "Current", ...OK },
  { name: "Public liability insurance", meta: "$20m cover · to Mar 2027", status: "Current", ...OK },
  { name: "Subcontract & RCTI agreement", meta: "Signed 2 Sep 2026", status: "Signed", ...OK },
  { name: "Battery SWMS induction", meta: "Due before Thu 16 Oct", status: "Due soon", ...WARN },
] as const;

const BOOKED = { bg: "#1976D2", fg: "#FFFFFF" };
const OPEN = { bg: "#F1F5F9", fg: "#334155" };
const OFF = { bg: "#E2E8F0", fg: "#5B6B80" };

const CAPACITY = [
  { d: "Mon", s: "Booked", ...BOOKED },
  { d: "Tue", s: "Open", ...OPEN },
  { d: "Wed", s: "Booked", ...BOOKED },
  { d: "Thu", s: "Booked", ...BOOKED },
  { d: "Fri", s: "Booked", ...BOOKED },
  { d: "Sat", s: "Off", ...OFF },
] as const;

function Badge({
  tone,
  children,
}: {
  tone: { bg: string; fg: string };
  children: React.ReactNode;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {children}
    </span>
  );
}

export function InstallerOverviewDashboard() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const firstName = user?.firstName?.trim() || "there";

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-[18px] px-4 py-6 md:px-5 lg:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-source-sans text-[24px] font-bold text-[#0F172A]">
          Overview
        </h1>
        <Badge tone={{ bg: "#DBEAFE", fg: "#1E40AF" }}>Sample data</Badge>
      </div>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="flex flex-grow flex-col gap-1.5">
          <h2 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Good morning, {firstName}
          </h2>
          <div className="flex flex-wrap gap-1.5 text-[12px]">
            <Badge tone={{ bg: "#DCFCE7", fg: "#166534" }}>Approved installer</Badge>
            <Badge tone={{ bg: "#E2E8F0", fg: "#334155" }}>SAA · install + battery</Badge>
            <Badge tone={{ bg: "#E2E8F0", fg: "#334155" }}>Western Sydney · Ryde</Badge>
            <Badge tone={{ bg: "#FEF3C7", fg: "#92400E" }}>SWMS induction due Thu</Badge>
          </div>
        </div>
        <Link
          href="/installers/dashboard/home"
          className="flex h-11 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A] no-underline"
        >
          Register new customer
        </Link>
        <span className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00]">
          Review 3 job offers
        </span>
      </div>

      <ReadySitesBanner />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <span className="text-[12px] font-semibold text-[#5B6B80]">{k.label}</span>
            <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">{k.value}</span>
            <span className="text-[12px] font-semibold" style={{ color: k.subColor }}>
              {k.sub}
            </span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <section
          aria-label="AI assistant"
          className="flex flex-col gap-2 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-[18px] py-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-fit rounded-full bg-[#0B4A7A] px-2 py-0.5 text-[11px] font-bold text-white">
              AI assistant
            </span>
            <strong className="flex-grow text-[15px] text-[#0F172A]">
              3 things need your OK. 27 were done for you this week.
            </strong>
            <span className="text-[13px] font-semibold text-[#1565C0]">Review now</span>
          </div>
          <span className="text-[13px] text-[#334155]">
            CoC sign-off for Karen Whitfield · job offer JO-2207 expires in 2 h · welcome-pack
            reminder ready to send
          </span>
        </section>

        <section
          aria-label="Needs your attention"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              Needs your attention
            </h2>
            <span className="text-[12px] text-[#5B6B80]">6 items</span>
          </div>
          {TASKS.map((t) => (
            <div
              key={t.title}
              className="flex items-center gap-3 rounded-[12px] p-3"
              style={{ background: t.bg }}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.dot }} />
              <span className="flex flex-grow flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#0F172A]">{t.title}</span>
                <span className="text-[12px] text-[#475569]">{t.desc}</span>
              </span>
              <span className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-[9px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]">
                {t.cta}
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="Earnings"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              Payouts by month (ex GST)
            </h2>
            <Link href="/installers/dashboard/home" className="text-[13px] font-semibold text-[#1565C0]">
              All RCTIs
            </Link>
          </div>
          <div
            role="img"
            aria-label="Payouts May to October: 18.2k, 21.4k, 24.9k, 22.1k, 27.6k, 14.9k so far"
            className="flex h-[190px] items-end gap-3.5 border-b border-[#E3E8EF] px-1"
          >
            {PAYOUT_MONTHS.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#334155]">{m.label}</span>
                <span
                  className="w-full max-w-[48px] rounded-t-[6px]"
                  style={{ height: `${m.h}px`, background: m.color }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3.5">
            {PAYOUT_MONTHS.map((m) => (
              <span key={m.month} className="flex-1 text-center text-[12px] text-[#5B6B80]">
                {m.month}
              </span>
            ))}
          </div>
          <span className="text-[12px] text-[#475569]">
            October to date. Approved handover packs are paid on the next Friday run.
          </span>
        </section>
      </div>

      <section
        aria-label="Upcoming jobs"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <div className="flex items-center">
          <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Next 7 days</h2>
          <Link href="/installers/dashboard/schedule" className="text-[13px] font-semibold text-[#1565C0]">
            Open schedule
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#475569]">
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">When</th>
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">Job</th>
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">System</th>
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">Kit</th>
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">Crew</th>
                <th className="border-b border-[#E3E8EF] p-2 font-semibold">Customer confirmed</th>
              </tr>
            </thead>
            <tbody>
              {JOBS.map((j) => (
                <tr key={j.id}>
                  <td className="border-b border-[#EEF2F6] p-2.5 font-semibold">{j.when}</td>
                  <td className="border-b border-[#EEF2F6] p-2.5">
                    <span className="font-semibold text-[#1565C0]">{j.id}</span> · {j.where}
                  </td>
                  <td className="border-b border-[#EEF2F6] p-2.5">{j.sys}</td>
                  <td className="border-b border-[#EEF2F6] p-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                      style={{ background: j.kBg, color: j.kFg }}
                    >
                      {j.kit}
                    </span>
                  </td>
                  <td className="border-b border-[#EEF2F6] p-2.5">{j.crew}</td>
                  <td className="border-b border-[#EEF2F6] p-2.5">{j.conf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <section
          aria-label="Compliance"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              Compliance status
            </h2>
            <Link href="/installers/dashboard/home" className="text-[13px] font-semibold text-[#1565C0]">
              Documents
            </Link>
          </div>
          {DOCS.map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0"
            >
              <span className="flex flex-grow flex-col">
                <span className="text-[14px] font-semibold text-[#0F172A]">{d.name}</span>
                <span className="text-[12px] text-[#5B6B80]">{d.meta}</span>
              </span>
              <Badge tone={{ bg: d.bg, fg: d.fg }}>{d.status}</Badge>
            </div>
          ))}
          <span className="text-[12px] text-[#475569]">
            New offers pause automatically if a required document lapses.
          </span>
        </section>

        <section
          aria-label="Capacity"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              Capacity this week
            </h2>
            <span className="text-[12px] text-[#5B6B80]">4 of 5 working days booked</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {CAPACITY.map((c) => (
              <div
                key={c.d}
                className="flex flex-col items-center gap-1.5 rounded-[10px] px-1 py-2.5"
                style={{ background: c.bg, color: c.fg }}
              >
                <span className="text-[12px] font-bold">{c.d}</span>
                <span className="text-[12px]">{c.s}</span>
              </div>
            ))}
          </div>
          <span className="text-[12px] text-[#475569]">
            Open days are what EasyLink offers new jobs into. Block days off in Service areas.
          </span>
        </section>
      </div>
    </main>
  );
}
