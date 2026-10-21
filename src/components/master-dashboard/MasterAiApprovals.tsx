"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Matches the Easylink Designer "AI approvals" mock (AIApprovals.dc.html):
 * the queue filters, the waiting list, and the approval card showing exactly
 * what an agent wants to run before a person lets it.
 *
 * Sample data — this app has no agent platform, approvals queue, policy
 * register or decision records, so nothing here approves or runs anything.
 * The behaviour is the mock's own: filtering by queue, picking an item, and
 * approving/rejecting (which removes it from the list and leaves the card
 * showing what happened).
 */

/** [background, foreground] for how close the due time is. */
const URGENT: [string, string] = ["#FEE2E2", "#991B1B"];
const SOON: [string, string] = ["#FEF3C7", "#92400E"];
const LATER: [string, string] = ["#E2E8F0", "#334155"];

type Approval = {
  id: string;
  q: string;
  agent: string;
  title: string;
  due: string;
  d: [string, string];
  journey: string;
  action: string;
  why: string;
  evidence: string;
  rule: string;
};

const ALL: Approval[] = [
  {
    id: "APR-2207",
    q: "sales",
    agent: "Sales",
    title: "6% discount for S. Patel, Castle Hill",
    due: "in 38 min",
    d: URGENT,
    journey: "JRN-41120",
    action:
      "create_quote(design: DES-20502, discount_pct: 6.0,\n  new_total: A$10,443 (was A$11,110), expires: 2026-11-07)\nsend_message(template: quote_revised, channel: email)",
    why: "Customer uploaded a competitor quote at A$10,300 for a comparable Sigenergy system. 6% keeps the package above its margin floor. Quote viewed 5 times in 3 days.",
    evidence: "Competitor quote PDF, chat transcript, margin check",
    rule: "POL-DISC-02 v3 · 5 to 10% needs sales lead",
  },
  {
    id: "APR-2206",
    q: "money",
    agent: "Support",
    title: "Refund A$650 deposit, BLUETTI order",
    due: "in 52 min",
    d: URGENT,
    journey: "JRN-40988",
    action:
      "issue_refund(payment: PAY-77812, amount: A$650.00,\n  reason: cancelled_before_dispatch)",
    why: "Customer cancelled 2 hours after ordering; the warehouse has not picked it. Amount is above the A$500 automatic limit.",
    evidence: "Order timeline, warehouse status, customer email",
    rule: "POL-REF-01 v2 · refunds over A$500",
  },
  {
    id: "APR-2204",
    q: "ops",
    agent: "Matching",
    title: "Battery job in 2563 has only one eligible installer",
    due: "in 3 h",
    d: SOON,
    journey: "JRN-41102",
    action: "dispatch_offer(job: JOB-5540, to: [Solarman], respond_within: 24h)",
    why: "No other linked installer covering 2563 holds a current battery endorsement. The customer gets one offer instead of three.",
    evidence: "Service areas, SAA register, capacity",
    rule: "POL-MATCH-03 v1 · fewer than 2 eligible installers",
  },
  {
    id: "APR-2203",
    q: "ops",
    agent: "Delivery",
    title: "Lodge network application with Endeavour Energy",
    due: "in 5 h",
    d: SOON,
    journey: "JRN-40871",
    action: "submit_dnsp_application(job: JOB-5530, dnsp: Endeavour, export_kw: 5.0)",
    why: "All documents are present and match the design. Lodging cannot be undone, and this action is still at Recommends.",
    evidence: "Single-line diagram, design, site photos",
    rule: "POL-DEL-01 v2 · irreversible submissions",
  },
  {
    id: "APR-2202",
    q: "care",
    agent: "Concierge",
    title: "Customer mentions life-support equipment at home",
    due: "today",
    d: LATER,
    journey: "JRN-41131",
    action:
      "flag_customer(vulnerable: true)\npause_automation(journey: JRN-41131)\nroute_to_person(queue: manager)",
    why: "Customer asked whether a battery keeps an oxygen concentrator running in a blackout. Medical equipment needs a person and a life-support check with their retailer.",
    evidence: "Chat transcript",
    rule: "POL-CARE-01 v1 · vulnerability signals",
  },
  {
    id: "APR-2201",
    q: "ops",
    agent: "Drone ops",
    title: "Flight plan 1.9 km from a hospital helipad",
    due: "before flight",
    d: LATER,
    journey: "JRN-39540",
    action: "schedule_flight(job: JOB-5412, drone: DR-01, window: 13 Nov 10:00–10:40)",
    why: "Airspace check shows uncontrolled airspace, but a helipad is within 2 km. The plan keeps the drone under 30 m over the roof.",
    evidence: "Airspace check, site map",
    rule: "POL-DRONE-04 v1 · helipad within 3 km",
  },
  {
    id: "APR-2200",
    q: "ops",
    agent: "VPP",
    title: "Pause VPP dispatch to SITE-2291 after 3 missed events",
    due: "today",
    d: LATER,
    journey: "JRN-35002",
    action: "update_vpp_enrolment(site: SITE-2291, status: paused, reason: control_check)",
    why: "The battery ignored the last three commands while its cloud link looked healthy, so a local setting may have changed.",
    evidence: "Dispatch log, telemetry, vendor cloud status",
    rule: "POL-VPP-05 v1 · pausing a site",
  },
];

const QUEUES: [string, string][] = [
  ["all", "All"],
  ["sales", "Sales"],
  ["money", "Refunds & payouts"],
  ["ops", "Operations & safety"],
  ["care", "Vulnerable & complaints"],
];

const LABEL =
  "text-[12px] font-bold uppercase tracking-[0.06em] text-[#475569]";

export function MasterAiApprovals() {
  const [queue, setQueue] = useState("all");
  const [selectedId, setSelectedId] = useState("APR-2207");
  /** id → 'ok' | 'no'; a resolved item leaves the queue but stays on the card. */
  const [resolved, setResolved] = useState<Record<string, "ok" | "no">>({});

  const open = ALL.filter((i) => !resolved[i.id]);
  const shown = open.filter((i) => queue === "all" || i.q === queue);
  const sel = ALL.find((i) => i.id === selectedId) ?? ALL[0]!;
  const outcome = resolved[sel.id];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Approvals</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span className="text-[12px] text-[#5B6B80]">Also sent to Slack and the mobile app</span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              {open.length} AI actions need a person
            </h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Nothing here runs until someone approves it. If the due time passes, nothing runs and
              the customer is told a person will follow up.
            </p>
          </div>
          <div role="tablist" aria-label="Queue" className="flex flex-wrap gap-1.5">
            {QUEUES.map(([id, name]) => {
              const on = queue === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setQueue(id)}
                  className="h-9 rounded-full border px-3 text-[13px] font-semibold"
                  style={{
                    background: on ? "#0B1A2E" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "#0F172A",
                    borderColor: on ? "#0B1A2E" : "#CBD5E1",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Queue"
            className="flex min-w-0 flex-[1_1_340px] flex-col overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            {shown.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSelectedId(i.id)}
                className="flex flex-col gap-1 border-b border-[#EEF2F6] px-4 py-3.5 text-left"
                style={{ background: i.id === sel.id ? "#FFF7E6" : "#FFFFFF" }}
              >
                <span className="flex items-center gap-2">
                  <span className="flex-grow text-[12px] font-semibold text-[#475569]">
                    {i.agent} agent · {i.q}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                    style={{ background: i.d[0], color: i.d[1] }}
                  >
                    {i.due}
                  </span>
                </span>
                <strong className="text-[14px] text-[#0F172A]">{i.title}</strong>
              </button>
            ))}
            {!shown.length ? (
              <p className="m-0 p-[18px] text-[14px] text-[#5B6B80]">
                Nothing waiting in this queue.
              </p>
            ) : null}
          </section>

          <section
            aria-label="Approval card"
            className="flex min-w-0 flex-[2_1_520px] flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-5"
          >
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex flex-grow flex-col gap-1">
                <span className="font-mono text-[12px] text-[#5B6B80]">
                  {sel.id} · {sel.agent} agent · {sel.journey}
                </span>
                <h2 className="m-0 text-[22px] font-bold text-[#0F172A]">{sel.title}</h2>
              </div>
              <span
                className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
                style={{ background: sel.d[0], color: sel.d[1] }}
              >
                Due {sel.due}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Exactly what will run</span>
              <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-[12px] bg-[#0B1A2E] px-4 py-3.5 font-mono text-[13px] leading-[1.5] text-[#E6EDF6]">
                {sel.action}
              </pre>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>Why the agent proposes it</span>
              <p className="m-0 text-[15px] leading-[1.55] text-[#0F172A]">{sel.why}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-[14px]">
              <div className="flex flex-[1_1_220px] flex-col gap-1">
                <span className={LABEL}>Evidence</span>
                <span className="text-[#0F172A]">{sel.evidence}</span>
                <Link href="/master/decision-records" className="font-semibold text-[#1565C0]">
                  Open decision record
                </Link>
              </div>
              <div className="flex flex-[1_1_220px] flex-col gap-1">
                <span className={LABEL}>Escalated by</span>
                <span className="font-mono text-[13px] text-[#0F172A]">{sel.rule}</span>
                <Link href="/master/policies" className="font-semibold text-[#5B6B80]">
                  View policy
                </Link>
              </div>
            </div>

            {outcome ? (
              <p
                role="status"
                className="m-0 rounded-[10px] px-3.5 py-3 text-[14px] font-semibold"
                style={
                  outcome === "ok"
                    ? { background: "#DCFCE7", color: "#166534" }
                    : { background: "#FEE2E2", color: "#991B1B" }
                }
              >
                {outcome === "ok"
                  ? "Approved. It ran and was logged against your name."
                  : "Rejected. Nothing ran; your reason goes to the agent owner's weekly review."}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 border-t border-[#EEF2F6] pt-4">
                <button
                  type="button"
                  onClick={() => setResolved((r) => ({ ...r, [sel.id]: "ok" }))}
                  className="h-[46px] rounded-[10px] bg-[#F68A0A] px-5 text-[14px] font-bold text-[#3B1D00]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setResolved((r) => ({ ...r, [sel.id]: "ok" }))}
                  className="h-[46px] rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
                >
                  Edit, then approve
                </button>
                <button
                  type="button"
                  onClick={() => setResolved((r) => ({ ...r, [sel.id]: "no" }))}
                  className="h-[46px] rounded-[10px] border border-[#991B1B] bg-white px-4 text-[14px] font-semibold text-[#991B1B]"
                >
                  Reject with reason
                </button>
                <Link
                  href="/master/live-journeys"
                  className="inline-flex h-[46px] items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#0F172A]"
                >
                  Take over the journey
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
