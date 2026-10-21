"use client";

import { useState } from "react";

/**
 * Matches the Easylink Designer "Decision records" mock (AIDecisions.dc.html):
 * an append-only trail of every step an agent took on one customer journey,
 * and the full record behind whichever step you pick.
 *
 * Sample data — this app has no agent platform, so there are no real decision
 * records to read. The behaviour is the mock's own: selecting a step swaps the
 * detail panel, including the customer event and the blocked message, which are
 * deliberately part of the same trail.
 */

/** [background, foreground] per outcome. */
const AUTOMATIC: [string, string] = ["#DCFCE7", "#166534"];
const ESCALATED: [string, string] = ["#FEF3C7", "#92400E"];
const DENIED: [string, string] = ["#FEE2E2", "#991B1B"];
const EVENT: [string, string] = ["#E2E8F0", "#334155"];

type Step = {
  id: string;
  time: string;
  title: string;
  who: string;
  result: string;
  k: [string, string];
  model: string;
  prompt: string;
  read: string;
  call: string;
  why: string;
  policy: string;
  person: string;
  outcome: string;
  cost: string;
};

/** Shared defaults; each step overrides what differs, as the artboard does. */
const BASE = {
  model: "Large tier · claude-opus",
  prompt: "sales-agent v14",
  person: "None",
  cost: "2.1 s · A$0.02",
};

const STEPS: Step[] = [
  {
    ...BASE,
    id: "DEC-918455",
    time: "16 Oct 09:02",
    title: "Check-in message proposed",
    who: "Sales agent",
    result: "Waiting",
    k: ESCALATED,
    read: "Quote views (5), last 5 messages",
    call: "send_message(template: stalled_quote_checkin)",
    why: "Quote viewed repeatedly with no question back.",
    policy: "Escalated · POL-CONTACT-01 v1 (3rd message this week)",
    outcome: "In Approvals",
  },
  {
    ...BASE,
    id: "DEC-918251",
    time: "7 Oct 09:06",
    title: "Revised quote email sent",
    who: "Sales agent",
    result: "Automatic",
    k: AUTOMATIC,
    read: "QTE-31944",
    call: "send_message(template: quote_revised)",
    why: "An approved revision has to reach the customer.",
    policy: "Allowed · POL-CONTACT-01 v1",
    outcome: "Delivered",
    cost: "1.1 s · A$0.01",
  },
  {
    ...BASE,
    id: "DEC-918240",
    time: "7 Oct 08:31",
    title: "7% discount proposed",
    who: "Sales agent",
    result: "Escalated",
    k: ESCALATED,
    read: "Competitor quote PDF, design, margin floor, chat",
    call: "create_quote(design: DES-20502,\n  discount_pct: 7.0)",
    why: "Competitor at A$10,300 for a comparable system. 7% matches within A$32 and stays above the package margin floor.",
    policy: "Escalated · POL-DISC-02 v3, 5 to 10% needs sales lead",
    person: "Sales lead approved after editing to 6%, 7 Oct 09:05",
    outcome: "QTE-31944 issued at A$10,443",
    cost: "3.2 s · A$0.04",
  },
  {
    ...BASE,
    id: "EVT-78002",
    time: "7 Oct 08:30",
    title: "Competitor quote uploaded",
    who: "Customer",
    result: "Event",
    k: EVENT,
    model: "n/a",
    prompt: "n/a",
    read: "n/a",
    call: "file.uploaded",
    why: "Customer action. Woke the orchestrator.",
    policy: "n/a",
    outcome: "Orchestrator woken",
    cost: "n/a",
  },
  {
    ...BASE,
    id: "DEC-917990",
    time: "6 Oct 20:41",
    title: "Fourth sales message blocked",
    who: "Sales agent",
    result: "Denied",
    k: DENIED,
    read: "Contact log",
    call: "send_message(template: price_reminder)",
    why: "Price reminder before the quote expires.",
    policy: "Denied · POL-CONTACT-01 v1, max 3 sales messages in 7 days",
    outcome: "Not sent. Rescheduled for 9 Oct",
    cost: "0.9 s · A$0.01",
  },
  {
    ...BASE,
    id: "DEC-917655",
    time: "5 Oct 10:15",
    title: "Follow-up email sent",
    who: "Sales agent",
    result: "Automatic",
    k: AUTOMATIC,
    read: "Quote views (3), last 5 messages",
    call: "send_message(template: quote_questions)",
    why: "Quote viewed 3 times without a question; offers to explain battery sizing.",
    policy: "Allowed · 1 of 3 this week",
    outcome: "Delivered, opened",
    cost: "1.8 s · A$0.02",
  },
  {
    ...BASE,
    id: "DEC-917002",
    time: "3 Oct 19:02",
    title: "Quote issued from saved design",
    who: "Sales agent",
    result: "Automatic",
    k: AUTOMATIC,
    read: "Design DES-20502, catalogue prices, rebate rules",
    call: "create_quote(design: DES-20502)",
    why: "New saved design with no open quote.",
    policy: "Allowed · POL-QUOTE-01 v2",
    outcome: "QTE-31901 issued, A$11,110",
    cost: "1.4 s · A$0.01",
  },
];

export function MasterDecisionRecords() {
  const [selectedId, setSelectedId] = useState("DEC-918240");
  const [query, setQuery] = useState("JRN-41120");

  const sel = STEPS.find((s) => s.id === selectedId) ?? STEPS[2]!;

  /** `mono` marks the machine-written values — ids, calls, timings. */
  const fields: { k: string; v: string; mono?: boolean }[] = [
    { k: "Agent", v: sel.who },
    { k: "Model", v: sel.model, mono: true },
    { k: "Instructions", v: sel.prompt, mono: true },
    { k: "Read", v: sel.read },
    { k: "Proposed", v: sel.call, mono: true },
    { k: "Reasoning", v: sel.why },
    { k: "Policy", v: sel.policy },
    { k: "Person", v: sel.person },
    { k: "Outcome", v: sel.outcome },
    { k: "Time and cost", v: sel.cost, mono: true },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Decision records</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <label htmlFor="dq" className="sr-only">
          Search decisions
        </label>
        <input
          id="dq"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-[38px] w-[260px] max-w-full rounded-[10px] border border-[#CBD5E1] px-3 text-[13px] text-[#0F172A]"
        />
        <span
          title="Not built yet"
          className="flex h-[38px] cursor-default items-center rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#94A3B8]"
        >
          Export record
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Every step the AI took for S. Patel, and why
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            Journey JRN-41120 · Castle Hill · Quoted. Records are append-only and kept 5 years with
            the transaction.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Timeline"
            className="min-w-0 flex-[2_1_520px] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            <ol className="m-0 list-none p-0">
              {STEPS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={s.id === sel.id ? "true" : undefined}
                    className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-1.5 border-b border-[#EEF2F6] px-[18px] py-3.5 text-left"
                    style={{ background: s.id === sel.id ? "#FFF7E6" : "#FFFFFF" }}
                  >
                    <span className="w-24 font-mono text-[12px] text-[#5B6B80]">{s.time}</span>
                    <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
                      <strong className="text-[14px] text-[#0F172A]">{s.title}</strong>
                      <span className="text-[12px] text-[#5B6B80]">{s.who}</span>
                    </span>
                    <span
                      className="flex-[0_0_auto] rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                      style={{ background: s.k[0], color: s.k[1] }}
                    >
                      {s.result}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <aside
            aria-label="Decision detail"
            className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <span className="font-mono text-[12px] text-[#5B6B80]">{sel.id}</span>
            <h2 className="m-0 text-[20px] font-bold text-[#0F172A]">{sel.title}</h2>
            <dl className="m-0 flex flex-col">
              {fields.map((f) => (
                <div
                  key={f.k}
                  className="grid gap-2.5 border-t border-[#EEF2F6] py-2.5 text-[13px]"
                  style={{ gridTemplateColumns: "120px minmax(0, 1fr)" }}
                >
                  <dt className="text-[#5B6B80]">{f.k}</dt>
                  <dd
                    className={`m-0 whitespace-pre-wrap break-words text-[#0F172A] ${
                      f.mono ? "font-mono" : ""
                    }`}
                  >
                    {f.v}
                  </dd>
                </div>
              ))}
            </dl>
            <span
              title="Not built yet"
              className="flex h-11 cursor-default items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-center text-[14px] font-semibold text-[#94A3B8]"
            >
              Draft a plain-English explanation for the customer
            </span>
            <span className="text-[12px] text-[#475569]">
              Customers can ask why a decision was made about them. This record is what we answer
              from.
            </span>
          </aside>
        </div>
      </div>
    </div>
  );
}
