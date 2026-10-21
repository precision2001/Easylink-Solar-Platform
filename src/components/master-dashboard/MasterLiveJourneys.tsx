"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Matches the Easylink Designer "Live journeys" mock (AIJourneys.dc.html):
 * the seven-stage strip, the stuck list, the journey detail with its AI
 * suggestion card and event log.
 *
 * As with the AI control centre, this app has no orchestrator, journey or
 * decision-record model, so the data is the mock's own sample. The behaviour
 * is the mock's logic: picking a stage, picking a journey, approving/editing/
 * rejecting the suggestion with Undo, and taking the journey over from the AI.
 */

/** [name, count, stuck, agent] */
const STAGES: [string, number, number, string][] = [
  ["Enquiry", 58, 1, "Concierge"],
  ["Designed", 74, 2, "Design"],
  ["Quoted", 96, 4, "Sales"],
  ["Matched", 31, 0, "Matching"],
  ["Ordered", 22, 1, "Delivery"],
  ["Installing", 39, 1, "Delivery"],
  ["Live", 92, 0, "Care · VPP"],
];

type Journey = {
  n: string;
  id: string;
  age: string;
  next: string;
  wake: string;
  inst: string;
  contact: string;
  flags: string;
  red: boolean;
};

const JOURNEYS: Journey[] = [
  { n: "S. Patel · Castle Hill", id: "JRN-41120", age: "9 days", next: "Sales: check-in waiting for approval", wake: "Now", inst: "Not chosen yet", contact: "Email · weekdays after 5 pm", flags: "Has a competitor quote", red: true },
  { n: "L. Nguyen · Merrylands", id: "JRN-41088", age: "7 days", next: "Sales: follow-up booked for Fri", wake: "Fri 17 Oct, 9:00 am", inst: "Not chosen yet", contact: "SMS", flags: "None", red: true },
  { n: "R. Costa · Blacktown", id: "JRN-41071", age: "6 days", next: "Waiting on customer bill upload", wake: "Sat 18 Oct", inst: "Not chosen yet", contact: "Email", flags: "None", red: false },
  { n: "K. Lee · Granville", id: "JRN-41010", age: "5 days", next: "Concierge answered finance question", wake: "Mon 20 Oct", inst: "Not chosen yet", contact: "WhatsApp", flags: "Asked for Humm options", red: false },
  { n: "M. Ahmed · Seven Hills", id: "JRN-40998", age: "2 days", next: "Quote viewed, no action needed yet", wake: "Sun 19 Oct", inst: "Not chosen yet", contact: "Email", flags: "None", red: false },
];

/** Event-author pill palettes: AI, person, customer. */
const AI: [string, string] = ["#EEF7FE", "#0B2540"];
const PERSON: [string, string] = ["#E2E8F0", "#334155"];
const CUST: [string, string] = ["#FFE7C2", "#3B1D00"];

const EVENTS: { t: string; who: string; d: string; k: [string, string] }[] = [
  { t: "Today 9:02", who: "Sales agent", d: "Proposed a check-in message. Waiting for a person: DEC-918455.", k: AI },
  { t: "7 Oct 09:06", who: "Sales agent", d: "Sent revised quote QTE-31944 at A$10,443 after the sales lead approved 6%.", k: AI },
  { t: "7 Oct 09:05", who: "Sales lead", d: "Approved discount, edited from 7% to 6%.", k: PERSON },
  { t: "7 Oct 08:31", who: "Customer", d: "Uploaded a competitor quote at A$10,300.", k: CUST },
  { t: "6 Oct 20:41", who: "Policy", d: "Blocked a 4th sales message in 7 days. Rescheduled.", k: PERSON },
  { t: "3 Oct 19:02", who: "Sales agent", d: "Issued quote QTE-31901 from design DES-20502.", k: AI },
];

/** The AISuggest artboard in approve mode, ported with its own state machine. */
function AiSuggestionCard({ dec }: { dec: string }) {
  const [s, setS] = useState<"ok" | "edit" | "no" | null>(null);

  const DONE: Record<"ok" | "edit" | "no", [string, string, string]> = {
    ok: ["Approved by you. The action ran and was logged.", "#DCFCE7", "#166534"],
    edit: ["Opened for editing. Your changes are logged as feedback to the agent.", "#F1F5F9", "#334155"],
    no: ["Rejected. Nothing ran; the agent will not retry this.", "#FEE2E2", "#991B1B"],
  };

  return (
    <section
      aria-label="AI suggestion"
      className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#0B4A7A] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          AI
        </span>
        <span className="text-[12px] font-semibold text-[#0B2540]">Sales agent</span>
        <span className="flex-grow" />
        <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">
          Needs your OK
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35] text-[#0F172A]">
          Send a 3-question check-in and offer a call with Solarman
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">
          Quote viewed 5 times in 3 days with no question back. Customers who stall here usually ask
          about battery size or payment options.
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
        <span>
          <strong className="text-[#0F172A]">Used:</strong> quote views, last 5 messages, journey
          history
        </span>
        <span>
          <strong className="text-[#0F172A]">Rule:</strong> POL-CONTACT-01 · 2 of 3 sales messages
          used this week
        </span>
      </div>
      {s === null ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setS("ok")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            Approve and send
          </button>
          <button
            type="button"
            onClick={() => setS("edit")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => setS("no")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#991B1B]"
          >
            Reject
          </button>
          <Link
            href="/master/decision-records"
            className="ml-auto text-[13px] font-semibold text-[#1565C0]"
          >
            Why? {dec}
          </Link>
        </div>
      ) : (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: DONE[s][1], color: DONE[s][2] }}
        >
          <span className="flex-grow">{DONE[s][0]}</span>
          <button
            type="button"
            onClick={() => setS(null)}
            className="h-8 rounded-lg border border-current px-3 text-[12px] font-bold"
          >
            Undo
          </button>
          <Link href="/master/decision-records" className="text-[12px] font-semibold underline">
            Decision {dec}
          </Link>
        </div>
      )}
    </section>
  );
}

export function MasterLiveJourneys() {
  const [st, setSt] = useState(2);
  const [j, setJ] = useState(0);
  const [took, setTook] = useState(false);

  const sel = JOURNEYS[j]!;
  const stageName = STAGES[st]![0];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Live journeys</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <label htmlFor="jq" className="sr-only">
          Find a customer
        </label>
        <input
          id="jq"
          type="search"
          placeholder="Find a customer or suburb"
          className="h-[38px] w-[260px] max-w-full rounded-[10px] border border-[#CBD5E1] px-3 text-[13px]"
        />
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            412 customer journeys, 9 stuck
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            The orchestrator owns each journey: it wakes on an event, decides the next step and
            hands it to an agent. Stages and allowed moves are fixed in code.
          </p>
        </div>

        <section
          aria-label="Journeys by stage"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="overflow-x-auto">
            <ol
              className="m-0 grid min-w-[900px] list-none gap-2 p-0"
              style={{ gridTemplateColumns: "repeat(7, minmax(120px, 1fr))" }}
            >
              {STAGES.map(([n, c, stuck, agent], i) => (
                <li key={n}>
                  <button
                    type="button"
                    aria-pressed={i === st}
                    onClick={() => {
                      setSt(i);
                      setJ(0);
                      setTook(false);
                    }}
                    className="flex w-full flex-col gap-1 rounded-[12px] border-2 p-3 text-left"
                    style={{
                      borderColor: i === st ? "#F68A0A" : "#E3E8EF",
                      background: i === st ? "#FFF7E6" : "#FFFFFF",
                    }}
                  >
                    <span className="text-[12px] font-semibold text-[#475569]">{n}</span>
                    <span className="font-source-sans text-[26px] font-bold tabular-nums text-[#0F172A]">
                      {c}
                    </span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: stuck ? "#991B1B" : "#166534" }}
                    >
                      {stuck ? `${stuck} stuck` : "none stuck"}
                    </span>
                    <span className="text-[11px] text-[#5B6B80]">{agent}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Journeys in stage"
            className="flex min-w-0 flex-[1_1_380px] flex-col rounded-[14px] border border-[#E3E8EF] bg-white p-2"
          >
            <h2 className="mx-2.5 mb-1.5 mt-2.5 text-[16px] font-bold text-[#0F172A]">
              {stageName} · sorted by most stuck
            </h2>
            {JOURNEYS.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setJ(i);
                  setTook(false);
                }}
                className="flex flex-col gap-[3px] border-t border-[#EEF2F6] px-2.5 py-3 text-left"
                style={{ background: i === j ? "#FFF7E6" : "#FFFFFF" }}
              >
                <span className="flex items-center gap-2">
                  <strong className="flex-grow text-[14px] text-[#0F172A]">{r.n}</strong>
                  <span
                    className="text-[12px] font-bold"
                    style={{ color: r.red ? "#991B1B" : "#475569" }}
                  >
                    {r.age}
                  </span>
                </span>
                <span className="text-[12px] text-[#475569]">{r.next}</span>
              </button>
            ))}
          </section>

          <section
            aria-label="Journey detail"
            className="flex min-w-0 flex-[2_1_520px] flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">{sel.n}</h2>
              <span className="rounded-full bg-[#FFE7C2] px-2.5 py-[3px] text-[12px] font-bold text-[#3B1D00]">
                {stageName}
              </span>
              <span
                className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
                style={{
                  background: took ? "#E2E8F0" : "#EEF7FE",
                  color: took ? "#334155" : "#0B2540",
                }}
              >
                {took ? "A person has this journey" : "AI running · recommends"}
              </span>
            </div>

            <dl
              className="m-0 grid gap-x-[18px] gap-y-2.5 text-[13px]"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
            >
              {(
                [
                  ["Journey", sel.id],
                  ["Next step", sel.next],
                  ["Next wake-up", sel.wake],
                  ["Installer", sel.inst],
                  ["Contact", sel.contact],
                  ["Flags", sel.flags],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[#5B6B80]">{k}</dt>
                  <dd className="m-0 font-semibold text-[#0F172A]">{v}</dd>
                </div>
              ))}
            </dl>

            <AiSuggestionCard dec="DEC-918455" />

            <h3 className="mb-0 mt-1 text-[14px] font-bold text-[#0F172A]">
              What happened, newest first
            </h3>
            <ol className="m-0 flex list-none flex-col p-0">
              {EVENTS.map((e) => (
                <li
                  key={e.t}
                  className="flex gap-3 border-t border-[#EEF2F6] py-2.5 text-[13px] text-[#0F172A]"
                >
                  <span className="w-[92px] flex-[0_0_92px] tabular-nums text-[#5B6B80]">
                    {e.t}
                  </span>
                  <span
                    className="h-fit flex-[0_0_auto] rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: e.k[0], color: e.k[1] }}
                  >
                    {e.who}
                  </span>
                  <span className="flex-grow">{e.d}</span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setTook(!took)}
                className="h-11 rounded-[10px] bg-[#0B1A2E] px-4.5 text-[14px] font-bold text-white"
              >
                {took ? "Hand back to AI" : "Take over this journey"}
              </button>
              <Link
                href="/master/decision-records"
                className="inline-flex h-11 items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#0F172A]"
              >
                Full decision record
              </Link>
              <Link
                href="/master/quotes-leads"
                className="inline-flex h-11 items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#0F172A]"
              >
                Open in Quotes &amp; Leads
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
