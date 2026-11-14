"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";

/**
 * Matches the Easylink Designer "VPP" mock (CustVPP.dc.html) — what the
 * battery has earned, the next trading event, monthly credits, the customer's
 * own limits, and the recent event log.
 *
 * Nothing behind this exists. There is no VPP enrolment, no event model, no
 * credit ledger, no retailer link and no battery telemetry, so every figure is
 * the mock's sample data. That matters more here than on most pages: these
 * numbers are money owed to the customer and a record of a third party
 * discharging their battery. Showing invented credits as though they were real
 * would be a billing claim.
 *
 * The two controls that would change how a trading system treats someone's
 * battery — the backup reserve and the monthly event cap — are real local
 * state so the mock's interaction is visible, but they save nothing and say
 * so. "Opt out of this event" and "Leave the VPP" are inert for the same
 * reason: a customer who believed they had opted out, when nothing recorded
 * it, would be worse off than one who was told the control isn't live.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const NAVY = "#0B1A2E";

/** Monthly credits; winter evenings pay most, so July is the peak. */
const MONTHS: { month: string; credit: number; faded?: boolean }[] = [
  { month: "May", credit: 18.4 },
  { month: "Jun", credit: 22.1 },
  { month: "Jul", credit: 26.8 },
  { month: "Aug", credit: 19.5 },
  { month: "Sep", credit: 14.2 },
  // The current month, still accruing.
  { month: "Oct", credit: 6.3, faded: true },
];

const EVENTS: {
  when: string;
  gave: string;
  lowest: string;
  credit: string;
  optedOut?: boolean;
}[] = [
  {
    when: "Mon 6 Oct, 6:05–6:45 pm",
    gave: "2.4 kWh",
    lowest: "34%",
    credit: "A$3.10",
  },
  {
    when: "Thu 2 Oct, 5:40–6:20 pm",
    gave: "2.1 kWh",
    lowest: "38%",
    credit: "A$2.60",
  },
  {
    when: "Tue 30 Sep, 7:10–7:30 pm",
    gave: "You opted out",
    lowest: "61%",
    credit: "A$0.00",
    optedOut: true,
  },
  {
    when: "Fri 26 Sep, grid frequency support",
    gave: "0.3 kWh",
    lowest: "70%",
    credit: "A$0.60",
  },
];

const EVENT_CAPS = [10, 15, 20, 25, 30];

export function CustomerVpp() {
  const [reserve, setReserve] = useState(30);
  const [cap, setCap] = useState(20);

  const peak = Math.max(...MONTHS.map((m) => m.credit));

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <CustomerTopNav active="vpp" />

      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold" style={{ color: MUTED }}>
              EasyLink VPP · with [Retailer partner] · NSW
            </span>
            <span
              title="No VPP enrolment, event record or credit ledger exists in this app yet — these figures are from the design mock"
              className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
              style={{ background: "#DBEAFE", color: "#1E40AF" }}
            >
              Sample data
            </span>
          </div>
          <h1 className="mt-1 mb-0 font-source-sans text-[28px] font-bold">
            Your battery has earned A$[107] since May
          </h1>
        </div>

        <section
          aria-label="Next event"
          className="flex flex-wrap items-center gap-3.5 rounded-[14px] px-[18px] py-4"
          style={{ background: NAVY, color: "#FFFFFF" }}
        >
          <span
            className="rounded-full px-2.5 py-1 text-[12px] font-bold"
            style={{ background: SUN, color: SUN_INK }}
          >
            Event likely today
          </span>
          <div className="min-w-60 grow">
            <strong className="text-[16px]">
              5:30 pm to 7:00 pm · up to 4 kW from your battery
            </strong>
            <p className="mt-0.5 mb-0 text-[13px]" style={{ color: "#C3CFDF" }}>
              Price spike forecast in NSW. Estimated credit A$[4]. Your battery
              won&rsquo;t go below {reserve}%.
            </p>
          </div>
          {/* Inert: a customer who believed they had opted out, with nothing
              recording it, would have their battery discharged anyway. */}
          <span
            title="Not built yet — no VPP system is connected, so this cannot opt you out of anything"
            className="flex h-11 cursor-help items-center rounded-[10px] bg-white px-4 text-[14px] font-semibold"
            style={{ color: INK }}
          >
            Opt out of this event
          </span>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section
            aria-label="Credits by month"
            className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <h2 className="m-0 text-[16px] font-bold">
              Credits by month, winter evenings pay most
            </h2>
            <div
              className="flex h-45 items-end gap-3"
              role="img"
              aria-label="Monthly VPP credits from May to October"
            >
              {MONTHS.map((m) => (
                <div
                  key={m.month}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-[12px] font-semibold">
                    A${m.credit.toFixed(2)}
                  </span>
                  <span
                    className="w-full rounded-t-md"
                    style={{
                      height: `${(m.credit / peak) * 100}%`,
                      background: m.faded
                        ? "#BBF7D0"
                        : m.credit === peak
                          ? "#15803D"
                          : "#22C55E",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex text-[12px]" style={{ color: MUTED }}>
              {MONTHS.map((m) => (
                <span key={m.month} className="flex-1 text-center">
                  {m.month}
                </span>
              ))}
            </div>
            <span className="text-[12px]" style={{ color: SLATE }}>
              Credits would appear on your [Retailer partner] bill each month.
            </span>
          </section>

          <div className="flex flex-col gap-4">
            <section
              aria-label="Your limits"
              className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px]"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <h2 className="m-0 text-[16px] font-bold">Your limits</h2>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="reserve"
                    className="grow text-[14px] font-semibold"
                  >
                    Backup reserve
                  </label>
                  <strong className="font-source-sans text-[20px] font-bold">
                    {reserve}%
                  </strong>
                </div>
                <input
                  id="reserve"
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={reserve}
                  onChange={(e) => setReserve(Number(e.target.value))}
                  className="w-full accent-[#0B1A2E]"
                />
                <span className="text-[12px]" style={{ color: SLATE }}>
                  The VPP never takes your battery below this. About 8 hours of
                  evening use in a blackout.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cap" className="text-[14px] font-semibold">
                  Most events a month
                </label>
                <select
                  id="cap"
                  value={cap}
                  onChange={(e) => setCap(Number(e.target.value))}
                  className="h-11 rounded-[10px] bg-white px-3 text-[14px]"
                  style={{ border: `1px solid #CBD5E1` }}
                >
                  {EVENT_CAPS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[12px]" style={{ color: SLATE }}>
                These limits are a preview — nothing stores them, and no trading
                system reads them. In the design they are hard rules agreed with
                the VPP terms.{" "}
                <span title="Not built yet" className="cursor-help underline">
                  Leave the VPP
                </span>
              </span>
            </section>

            <section
              aria-label="How decisions are made"
              className="flex flex-col gap-2 rounded-[14px] p-[18px]"
              style={{ background: "#EEF7FE", border: "1px solid #9CCFF3" }}
            >
              <h2 className="m-0 text-[15px] font-bold">How decisions are made</h2>
              <p className="m-0 text-[13px] leading-[1.5]" style={{ color: BODY }}>
                The trading system would bid your battery into the market when
                prices spike, inside your limits. An AI assistant sends event
                notices and answers questions; a person on the VPP team checks
                anything unusual.
              </p>
              <Link
                href="/customers/messages"
                prefetch={false}
                className="text-[13px] font-semibold text-[#1565C0]"
              >
                Ask about how we use AI
              </Link>
            </section>
          </div>
        </div>

        <section
          aria-label="Recent events"
          className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <h2 className="m-0 text-[16px] font-bold">Recent events</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: SLATE }}>
                  {["When", "Your battery gave", "Lowest charge"].map((h) => (
                    <th
                      key={h}
                      className="p-2 font-semibold"
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className="p-2 text-right font-semibold"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((e) => (
                  <tr key={e.when}>
                    <td
                      className="px-2 py-2.5"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {e.when}
                    </td>
                    <td
                      className="px-2 py-2.5"
                      style={{
                        borderBottom: `1px solid ${RULE}`,
                        color: e.optedOut ? MUTED : INK,
                      }}
                    >
                      {e.gave}
                    </td>
                    <td
                      className="px-2 py-2.5"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {e.lowest}
                    </td>
                    <td
                      className="px-2 py-2.5 text-right font-semibold"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {e.credit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
