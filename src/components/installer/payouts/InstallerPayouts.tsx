"use client";

import { useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Payouts & RCTIs" mock (Payouts.dc.html) —
 * the installer's side of the payout run whose admin side is
 * MasterInstallerPayouts.
 *
 * This app has no payout model: the InstallerPayment type is a customer
 * Stripe payment, with no RCTI number, pay date, GST split, job list or
 * weekly run behind it. So the figures here are the mock's sample data,
 * deliberately kept reconciled with the admin page (RCTI-0412, $14,860,
 * JOB-3119/3121/3124/3126) and with the handover pack ($3,420 held on
 * JOB-3112), so the three screens tell one story.
 *
 * The money maths is the mock's own: GST is derived from the ex-GST figures
 * rather than hard-coded, so the columns always reconcile.
 *
 * Export, PDF links and the rates-card actions are previews — nothing is
 * generated or sent, and the page says so rather than implying a file.
 */

const money = (n: number) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Status = { s: string; bg: string; fg: string };

const PAID: Status = { s: "Paid", bg: "#DCFCE7", fg: "#166534" };
const SCHEDULED: Status = { s: "Scheduled", bg: "#DBEAFE", fg: "#1E40AF" };

/** [RCTI, pay date, jobs, ex GST, status] — exactly the mock's rows. */
const RAW: [string, string, string, number, Status][] = [
  ["RCTI-0412", "Fri 17 Oct", "JOB-3119, 3121, 3124, 3126", 14860, SCHEDULED],
  ["RCTI-0408", "Fri 10 Oct", "JOB-3104, 3109", 5480, PAID],
  ["RCTI-0403", "Fri 3 Oct", "JOB-3098, 3101, 3102", 7930, PAID],
  ["RCTI-0397", "Fri 26 Sep", "JOB-3090", 3420, PAID],
  ["RCTI-0391", "Fri 19 Sep", "JOB-3081, 3085", 6210, PAID],
];

const RCTIS = RAW.map(([id, date, jobs, ex, st]) => ({
  id,
  date,
  jobs,
  ex: money(ex),
  gst: money(ex * 0.1),
  tot: money(ex * 1.1),
  ...st,
}));

const KPIS = [
  {
    label: "Next payout · Fri 17 Oct",
    value: "$14,860",
    sub: "RCTI-0412 · 4 jobs",
    c: "#475569",
  },
  {
    label: "On hold",
    value: "$3,420",
    sub: "JOB-3112 handover incomplete",
    c: "#991B1B",
  },
  {
    label: "Under review",
    value: "$4,110",
    sub: "2 packs · decided by Tue",
    c: "#92400E",
  },
  {
    label: "Paid this FY (ex GST)",
    value: "$74,640",
    sub: "Since 1 Jul · + $14,860 on Fri",
    c: "#166534",
  },
];

const RATES = [
  {
    t: "Solar install up to 10 kW",
    r: "$[X] per kW",
    i: "Racking, cabling, inverter, commissioning",
  },
  {
    t: "Battery add-on",
    r: "$[X] per job",
    i: "Mounting, backup circuit, commissioning · changes 1 Nov",
  },
  { t: "Inverter swap", r: "$[X] per job", i: "Removal, install, disposal" },
  { t: "Site assessment", r: "$[X] per visit", i: "Photos, switchboard check, report" },
  {
    t: "Two-storey or steep roof",
    r: "+$[X] per job",
    i: "Applied automatically from the design",
  },
];

const ADJUSTMENTS = [
  {
    t: "Extra string run · JOB-3121",
    d: "Variation approved by EasyLink 8 Oct",
    v: "+$180.00",
    c: "#166534",
  },
  {
    t: "Return visit · JOB-3090",
    d: "Missing label rectified, no charge to customer",
    v: "−$0.00",
    c: "#475569",
  },
  {
    t: "Kit shortfall reimbursed · JOB-3104",
    d: "2 rail clamps bought locally, receipt attached",
    v: "+$42.50",
    c: "#166534",
  },
];

const TH =
  "border-b border-[#E3E8EF] p-2 text-left font-semibold text-[#475569]";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5";
const NUM = "text-right tabular-nums";

export function InstallerPayouts() {
  const [fy, setFy] = useState("FY 2026–27");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto">
          <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px] text-[#5B6B80]">
            <li>
              <Link
                href="/installers/dashboard/overview"
                prefetch={false}
                className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
              >
                Installer Account
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">Payouts &amp; RCTIs</li>
          </ol>
        </nav>
        <label htmlFor="fy" className="sr-only">
          Financial year
        </label>
        <select
          id="fy"
          value={fy}
          onChange={(e) => setFy(e.target.value)}
          className="h-9.5 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px] text-[#0F172A]"
        >
          <option>FY 2026–27</option>
          <option>FY 2025–26</option>
        </select>
      </header>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Payouts &amp; RCTIs
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
            EasyLink issues a recipient-created tax invoice for every weekly payout ·
            you don&apos;t need to invoice us
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Preview only — no file was generated. Exporting in the live portal downloads a Xero/MYOB-ready CSV of the RCTIs for the selected financial year.",
            )
          }
          className="h-11 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
        >
          Export for Xero / MYOB
        </button>
      </div>

      <InstallerAccountTabs active="payouts" />

      {notice ? (
        <div
          role="status"
          className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5]"
          style={{ background: "#E0F2FE", color: "#0B2540" }}
        >
          {notice}
        </div>
      ) : null}

      <section
        aria-label="Finance assistant"
        className="flex flex-col gap-2 rounded-[14px] p-4"
        style={{ background: "#EEF7FE", border: "1px solid #9CCFF3" }}
      >
        <span className="w-fit rounded-full bg-[#0B4A7A] px-2 py-0.5 text-[11px] font-bold text-white">
          AI · Finance
        </span>
        <strong className="text-[15px] text-[#0F172A]">
          RCTI-0914 is matched to 3 completed jobs and goes out Friday
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#0B2540]">
          Each line is checked against an approved handover pack. If something looks
          wrong, raise it here and a person in EasyLink finance replies within 1
          business day.{" "}
          <Link
            href="/installers/dashboard/ai-assistant"
            prefetch={false}
            className="font-semibold text-[#0B4A7A] underline"
          >
            Why this amount?
          </Link>
        </span>
      </section>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4"
          >
            <span className="text-[12px] font-semibold text-[#5B6B80]">{k.label}</span>
            <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">
              {k.value}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: k.c }}>
              {k.sub}
            </span>
          </div>
        ))}
      </div>

      <section
        aria-label="RCTIs"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <div className="flex items-center">
          <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
            Recipient-created tax invoices
          </h2>
          <span className="text-[12px] text-[#5B6B80]">Paid every Friday by EFT</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={TH}>RCTI</th>
                <th className={TH}>Pay date</th>
                <th className={TH}>Jobs</th>
                <th className={`${TH} text-right`}>Ex GST</th>
                <th className={`${TH} text-right`}>GST</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={TH}>Status</th>
                <th className={TH}>
                  <span className="sr-only">PDF</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {RCTIS.map((r) => (
                <tr key={r.id}>
                  <td className={`${TD} font-semibold text-[#0F172A]`}>{r.id}</td>
                  <td className={`${TD} text-[#475569]`}>{r.date}</td>
                  <td className={`${TD} text-[#475569]`}>{r.jobs}</td>
                  <td className={`${TD} ${NUM} text-[#475569]`}>{r.ex}</td>
                  <td className={`${TD} ${NUM} text-[#475569]`}>{r.gst}</td>
                  <td className={`${TD} ${NUM} font-semibold text-[#0F172A]`}>
                    {r.tot}
                  </td>
                  <td className={TD}>
                    <span
                      className="rounded-full px-2 py-0.5 text-[12px] font-bold whitespace-nowrap"
                      style={{ background: r.bg, color: r.fg }}
                    >
                      {r.s}
                    </span>
                  </td>
                  <td className={TD}>
                    <span
                      title="Not built yet — there is no RCTI document to open"
                      className="cursor-default font-semibold text-[#5B6B80]"
                    >
                      PDF
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section
          aria-label="Rates card"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center gap-2">
            <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
              Your rates card
            </h2>
            <span className="rounded-full bg-[#DBEAFE] px-2.5 py-0.75 text-[12px] font-bold whitespace-nowrap text-[#1E40AF]">
              New card from 1 Nov
            </span>
          </div>
          {RATES.map((r) => (
            <div
              key={r.t}
              className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2.5 last:border-0"
            >
              <span className="flex grow flex-col">
                <span className="text-[14px] font-semibold text-[#0F172A]">{r.t}</span>
                <span className="text-[12px] text-[#5B6B80]">{r.i}</span>
              </span>
              <span className="text-[14px] font-bold whitespace-nowrap text-[#0F172A]">
                {r.r}
              </span>
            </div>
          ))}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Preview only — nothing was accepted. Accepting in the live portal locks the new rates card in from 1 Nov and records who agreed to it.",
                )
              }
              className="h-11 rounded-[10px] bg-[#F68A0A] px-4.5 text-[14px] font-bold text-[#3B1D00]"
            >
              Review &amp; accept new card
            </button>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Preview only — no variation was raised. Raising one in the live portal opens a request to EasyLink finance against a specific job.",
                )
              }
              className="h-11 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
            >
              Raise a variation
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section
            aria-label="Payout account"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Payout account</h2>
            <div className="flex flex-wrap items-center gap-2.5 text-[14px]">
              <span className="grow text-[#0F172A]">
                Solarman Pty Ltd · BSB •••-••• · Acct ••••[last 4]
              </span>
              <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.75 text-[12px] font-bold text-[#166534]">
                Verified
              </span>
            </div>
            <span className="text-[13px] text-[#475569]">
              ABN [ABN] · registered for GST · RCTI agreement signed 2 Sep 2026
            </span>
            <span className="text-[12px] text-[#475569]">
              Changing bank details needs a phone check with EasyLink before the next
              run.
            </span>
          </section>

          <section
            aria-label="Adjustments"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
              Variations &amp; adjustments
            </h2>
            {ADJUSTMENTS.map((a) => (
              <div
                key={a.t}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0"
              >
                <span className="flex grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">{a.t}</span>
                  <span className="text-[12px] text-[#5B6B80]">{a.d}</span>
                </span>
                <span
                  className="text-[14px] font-bold whitespace-nowrap"
                  style={{ color: a.c }}
                >
                  {a.v}
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
