"use client";

import Link from "next/link";

/**
 * Matches the Easylink Designer "Distributor Account Overview" mock exactly
 * (figures, names, timings) — sales/commission/credit, AI operations stats,
 * handover packs, installer payouts and stock orders aren't wired to real
 * backend data yet, so this page is illustrative by nature until that's
 * built, same convention as the installer Overview and admin Contact Centre
 * pages. Links point at real pages where one exists (Dispatch, Installers);
 * everything else is a static element, not a dead link.
 */
const KPIS = [
  { label: "Sales this month (ex GST)", value: "$96,420", sub: "80% of $120k target", c: "#92400E" },
  { label: "Commission earned", value: "$7,714", sub: "$480 on hold · JOB-3112 handover", c: "#475569" },
  { label: "Outstanding balance", value: "$18,240", sub: "$6,300 due in 7 days", c: "#991B1B" },
  { label: "Credit available", value: "$31,760", sub: "of $50,000 limit", c: "#166534" },
] as const;

const NETWORK_TILES = [
  { l: "Offers out", v: "3", s: "JO-2207 expires in 2 h 14 m", c: "#FFB547", href: "/master/dispatch" },
  { l: "Packs to review", v: "3", s: "1 incomplete · 2 ready", c: "#FFB547", href: null },
  { l: "Installer payouts Fri 17 Oct", v: "$16,340", s: "2 installers · ex GST", c: "#9FB0C8", href: null },
  { l: "Installer documents", v: "2", s: "Need attention within 30 days", c: "#FFB547", href: "/master/installers" },
] as const;

const RED = { bg: "#FEF2F2", dot: "#B91C1C" };
const AMBER = { bg: "#FFFBEB", dot: "#B45309" };
const BLUE = { bg: "#EFF6FF", dot: "#1D4ED8" };

const TASKS = [
  { title: "Invoice INV-20931 overdue", desc: "$6,300 · due 3 Oct · 7 days late", cta: "Pay now", href: "/master/invoices", ...RED },
  { title: "JOB-3112 handover incomplete", desc: "Solarman · missing CCEW and 4 photos · your $480 commission is on hold", cta: "Review", href: null, ...RED },
  { title: "Karen Whitfield accepted · needs an installer", desc: "Castle Hill · 10.56 kW + 13.5 kWh · deposit paid", cta: "Dispatch", href: "/master/dispatch", ...AMBER },
  { title: "Public liability expires 31 Oct", desc: "Upload the renewed certificate to keep ordering", cta: "Upload", href: null, ...AMBER },
  { title: "Installer rates card from 1 Nov", desc: "Battery add-on rate changed · 1 of 2 installers accepted", cta: "View", href: "/master/installers", ...BLUE },
] as const;

const OK = { bg: "#DCFCE7", fg: "#166534" };
const WARN = { bg: "#FEF3C7", fg: "#92400E" };

const DOCS = [
  { name: "Distributor agreement", meta: "Signed 14 Feb 2026 · renews Feb 2027", status: "Current", ...OK },
  { name: "Public liability insurance", meta: "$20m cover · expires 31 Oct 2026", status: "Expires soon", ...WARN },
  { name: "Installer accreditation (SAA)", meta: "Checked nightly for every installer in your network", status: "Current", ...OK },
  { name: "ABN & GST registration", meta: "Verified via ABN Lookup", status: "Verified", ...OK },
] as const;

const PICKING = { s: "Picking", bg: "#FEF3C7", fg: "#92400E" };
const TRANSIT = { s: "In transit", bg: "#DBEAFE", fg: "#1E40AF" };
const DELIVERED = { s: "Delivered", bg: "#DCFCE7", fg: "#166534" };
const NEEDS_APPROVAL = { s: "Needs approval", bg: "#FFE7C2", fg: "#3B1D00" };

const ORDERS = [
  { id: "SO-48211", job: "Castle Hill · 10 kW + 13 kWh", by: "You · Mark Kelly", total: "$18,940.00", ...PICKING },
  { id: "SO-48240", job: "JOB-3138 Blacktown · 10.56 kW", by: "Solarman (installer)", total: "$9,860.00", ...NEEDS_APPROVAL },
  { id: "SO-48177", job: "JOB-3127 Kellyville · 6.6 kW", by: "You · Mark Kelly", total: "$7,215.50", ...TRANSIT },
  { id: "SO-48102", job: "Stock order", by: "You · Mark Kelly", total: "$41,860.00", ...DELIVERED },
] as const;

const AI_STATS = [
  { v: "7", label: "approvals waiting" },
  { v: "41", label: "journeys stuck > 3 days" },
  { v: "5", label: "fleet alerts" },
  { v: "5:30 pm", label: "VPP event forecast" },
] as const;

function Badge({ tone, children }: { tone: { bg: string; fg: string }; children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {children}
    </span>
  );
}

function ActionLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={`${className} no-underline`}>
        {children}
      </Link>
    );
  }
  return (
    <span title="Not built yet" className={`${className} cursor-not-allowed opacity-80`}>
      {children}
    </span>
  );
}

export function MasterDistOverview() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Distributor Account <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Overview</span>
        </nav>
        <Badge tone={{ bg: "#DBEAFE", fg: "#1E40AF" }}>Sample data</Badge>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Good morning, Daniel
            </h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Gold partner · NSW &amp; ACT · 4 installers in your network
            </p>
          </div>
          <ActionLink
            href="/master/dispatch"
            className="flex h-11 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
          >
            Dispatch 2 jobs
          </ActionLink>
          <Link
            href="/master/place-order"
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] no-underline"
          >
            Place order
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.label}</span>
              <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">{k.value}</span>
              <span className="text-[12px] font-semibold" style={{ color: k.c }}>
                {k.sub}
              </span>
            </div>
          ))}
        </div>

        <section
          aria-label="Installer network"
          className="flex flex-col gap-3 rounded-[14px] bg-[#0B1A2E] p-[18px] text-white"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-white">Installer network</h2>
            <Link href="/master/installers" className="text-[13px] font-semibold text-[#FFB547] no-underline">
              All installers
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {NETWORK_TILES.map((n) => (
              <ActionLink
                key={n.l}
                href={n.href}
                className="flex flex-col gap-1 rounded-[12px] bg-[#13263F] p-3.5"
              >
                <span className="text-[12px] font-semibold text-[#9FB0C8]">{n.l}</span>
                <span className="font-source-sans text-[26px] font-bold text-white">{n.v}</span>
                <span className="text-[12px]" style={{ color: n.c }}>
                  {n.s}
                </span>
              </ActionLink>
            ))}
          </div>
        </section>

        <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
          <section
            aria-label="AI operations today"
            className="flex flex-col gap-2 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-[18px] py-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-fit rounded-full bg-[#0B4A7A] px-2 py-0.5 text-[11px] font-bold text-white">
                AI operations
              </span>
              <strong className="flex-grow text-[15px] text-[#0F172A]">
                Agents handled 318 actions overnight. 7 need a person.
              </strong>
              <span className="text-[13px] font-semibold text-[#1565C0]">Agent controls</span>
            </div>
            <div className="grid gap-2 text-[13px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              {AI_STATS.map((s) => (
                <div key={s.label} className="rounded-[10px] bg-white p-2.5">
                  <strong className="block text-[20px] text-[#0F172A]">{s.v}</strong>
                  {s.label}
                </div>
              ))}
            </div>
          </section>

          <section
            aria-label="Needs your attention"
            className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Needs your attention</h2>
            {TASKS.map((t) => (
              <div key={t.title} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: t.bg }}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.dot }} />
                <span className="flex flex-grow flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-[#0F172A]">{t.title}</span>
                  <span className="text-[12px] text-[#475569]">{t.desc}</span>
                </span>
                <ActionLink
                  href={t.href}
                  className="flex h-9 shrink-0 items-center whitespace-nowrap rounded-[9px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]"
                >
                  {t.cta}
                </ActionLink>
              </div>
            ))}
          </section>

          <section
            aria-label="Documents"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Your documents</h2>
            {DOCS.map((d) => (
              <div key={d.name} className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0">
                <span className="flex flex-grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">{d.name}</span>
                  <span className="text-[12px] text-[#5B6B80]">{d.meta}</span>
                </span>
                <Badge tone={{ bg: d.bg, fg: d.fg }}>{d.status}</Badge>
              </div>
            ))}
            <span className="text-[12px] text-[#475569]">
              Same document checker and reminders as installer accounts.
            </span>
          </section>
        </div>

        <section
          aria-label="Recent orders"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Recent orders</h2>
            <Link href="/master/place-order" className="text-[13px] font-semibold text-[#1565C0] no-underline">
              All orders
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Order</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Job</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Ordered by</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Total</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {ORDERS.map((o) => (
                  <tr key={o.id}>
                    <td className="border-b border-[#EEF2F6] p-2.5 font-semibold text-[#0F172A]">{o.id}</td>
                    <td className="border-b border-[#EEF2F6] p-2.5 text-[#0F172A]">{o.job}</td>
                    <td className="border-b border-[#EEF2F6] p-2.5 text-[#0F172A]">{o.by}</td>
                    <td className="border-b border-[#EEF2F6] p-2.5 text-right text-[#0F172A] tabular-nums">
                      {o.total}
                    </td>
                    <td className="border-b border-[#EEF2F6] p-2.5">
                      <Badge tone={{ bg: o.bg, fg: o.fg }}>{o.s}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
