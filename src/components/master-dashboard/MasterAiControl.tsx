"use client";

import { useState } from "react";

/**
 * Matches the Easylink Designer "AI control centre" mock exactly
 * (AIControl.dc.html): the autonomy banner, KPI row, agent table with
 * per-agent pause switches, the action kill switches, alerts, and models.
 *
 * This app has no AI agent platform — no agents, autonomy levels, action
 * ledger, approvals queue or model spend — so everything here is the mock's
 * sample data and nothing it does reaches a real system. The behaviour is
 * the mock's own logic: the global switch really drops every agent to
 * recommend-only (pills, KPIs, banner and button all follow), and each agent
 * and action toggles independently.
 */

/** [label, background, foreground, border] for the three autonomy levels. */
const S: [string, string, string, string] = ["Shadow", "#E2E8F0", "#334155", "#E2E8F0"];
const R: [string, string, string, string] = ["Recommends", "#EEF7FE", "#0B2540", "#9CCFF3"];
const D: [string, string, string, string] = ["Decides", "#0B4A7A", "#FFFFFF", "#0B4A7A"];

type Act = { t: string; bg: string; fg: string; bd: string };
const act = (lv: [string, string, string, string], t: string): Act => ({
  t: `${t} · ${lv[0].toLowerCase()}`,
  bg: lv[1],
  fg: lv[2],
  bd: lv[3],
});

type Agent = {
  id: string;
  n: string;
  where: string;
  acts: Act[];
  n24: string;
  rate: string;
  /** null = the mock's "A$[x]" placeholder — no spend model exists. */
  cost: string | null;
  owner: string;
};

const AGENTS: Agent[] = [
  { id: "concierge", n: "Concierge", where: "Website chat, Voxa voice, Inbox", acts: [act(D, "Answers"), act(D, "Bookings")], n24: "412", rate: "98%", cost: null, owner: "Sales lead" },
  { id: "design", n: "Design", where: "Solar Designer, My design", acts: [act(D, "Sizing"), act(R, "Complex roofs")], n24: "186", rate: "97%", cost: null, owner: "Ops manager" },
  { id: "sales", n: "Sales", where: "Quotes & Leads, Pipeline, Campaigns", acts: [act(R, "Follow-ups"), act(R, "Discounts")], n24: "233", rate: "96%", cost: null, owner: "Sales lead" },
  { id: "matching", n: "Matching", where: "Dispatch, Ready Sites", acts: [act(D, "Shortlist"), act(R, "Send offer")], n24: "58", rate: "91%", cost: null, owner: "Ops manager" },
  { id: "delivery", n: "Delivery", where: "Jobs, Handover review, Project workflow", acts: [act(D, "Photo checks"), act(R, "DNSP + STC lodging")], n24: "144", rate: "95%", cost: null, owner: "Ops manager" },
  { id: "care", n: "Care", where: "Live fleet, Maintenance, Energy", acts: [act(D, "Diagnosis"), act(R, "Book service")], n24: "97", rate: "94%", cost: null, owner: "Service lead" },
  { id: "drone", n: "Drone ops", where: "Drone flights, inspection reports", acts: [act(R, "Flight plans"), act(R, "Reports")], n24: "12", rate: "100%", cost: null, owner: "Chief remote pilot" },
  { id: "vpp", n: "VPP", where: "VPP trading, customer VPP page", acts: [act(D, "Customer updates"), act(R, "Pause a site")], n24: "121", rate: "99%", cost: null, owner: "VPP operator" },
  { id: "finance", n: "Finance", where: "Payouts, Orders, VPP settlements", acts: [act(S, "Reconcile"), act(S, "Payouts")], n24: "0", rate: "n/a", cost: "A$0", owner: "Finance" },
  { id: "support", n: "Support", where: "Messages, Inbox, Contact Centre", acts: [act(D, "Simple tickets"), act(R, "Refunds")], n24: "21", rate: "93%", cost: null, owner: "Manager" },
];

const TOOLS: [string, string, string][] = [
  ["messages", "Outbound messages and calls", "Email, SMS, Voxa outbound calls"],
  ["quotes", "Quote changes and discounts", "Sales agent"],
  ["offers", "Job offers to installers", "Matching agent"],
  ["refunds", "Refunds and payouts", "Support and Finance agents"],
  ["lodging", "DNSP and STC submissions", "Delivery agent"],
  ["dispatch", "VPP battery dispatch", "Optimiser stays in its own safe mode"],
];

const ALERTS = [
  { t: "Matching escalations up 3× today", d: "Battery jobs in 2560 to 2570: only one installer holds a current battery endorsement. Looks like a coverage gap, not an agent fault.", cta: "See the escalations", bg: "#FFFBEB", fg: "#92400E" },
  { t: "Sales follow-ups ready to move to Decides", d: "312 recommendations in 4 weeks, 96.8% approved unedited, no complaints.", cta: "Review promotion", bg: "#DCFCE7", fg: "#166534" },
  { t: "Kill-switch drill due", d: "Last tested 14 Jul. The quarterly drill was due 14 Oct.", cta: "Schedule the drill", bg: "#FEE2E2", fg: "#991B1B" },
];

const MODELS = [
  { n: "Orchestrator and conversations", u: "Large model tier · Concierge, Sales, Support", v: "Claude Opus" },
  { n: "Classification and document checks", u: "Small model tier · bills, photos, routing", v: "Claude Haiku" },
  { n: "Fallback provider", u: "Used if the main provider is down", v: "Configured" },
  { n: "Data region", u: "Transcripts, decision records, traces", v: "Sydney" },
];

/** A figure the mock leaves as a placeholder and this app can't source. */
function Unbuilt() {
  return (
    <span title="Not built yet" className="cursor-help text-[#94A3B8]">
      —
    </span>
  );
}

export function MasterAiControl() {
  const [global, setGlobal] = useState(false);
  const [paused, setPaused] = useState<Record<string, boolean>>({ finance: true });
  const [off, setOff] = useState<Record<string, boolean>>({ refunds: false });

  const g = global;

  const kpis = [
    { l: "Actions, last 24 h", v: "1,284", s: "across 412 customer journeys" },
    { l: "Done automatically", v: g ? "0%" : "91%", s: "within policy limits" },
    { l: "Waiting for a person", v: g ? "118" : "7", s: "2 due within the hour" },
    { l: "Approved unedited", v: "96%", s: "last 7 days" },
    { l: "AI spend today", v: null, s: "daily budget not set" },
  ];

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">AI control centre</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span title="Not built yet" className="cursor-default text-[13px] font-semibold text-[#5B6B80]">
          7 approvals waiting
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <section
          aria-label="Autonomy status"
          className="flex flex-wrap items-center gap-4 rounded-[16px] border px-[22px] py-5"
          style={{
            background: g ? "#FEE2E2" : "#0B1A2E",
            color: g ? "#991B1B" : "#FFFFFF",
            borderColor: g ? "#991B1B" : "#0B1A2E",
          }}
        >
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-85">
              Autonomy · all journeys
            </span>
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              {g ? "All agents are recommend-only" : "Agents are running normally"}
            </h1>
            <span className="text-[14px] opacity-90">
              {g
                ? "Every action now waits in Approvals. Switched by Daniel Shaw just now; logged."
                : "9 of 10 agents on. Finance agent is in shadow mode until Phase 4."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setGlobal(!g)}
            className="h-[46px] rounded-[10px] px-4.5 text-[14px] font-bold text-white"
            style={{ background: g ? "#0B1A2E" : "#B91C1C" }}
          >
            {g ? "Restore normal autonomy" : "Set all agents to recommend-only"}
          </button>
        </section>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          {kpis.map((k) => (
            <div
              key={k.l}
              className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white px-4 py-3.5"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
              <span className="font-source-sans text-[28px] font-bold tabular-nums text-[#0F172A]">
                {k.v === null ? <Unbuilt /> : k.v}
              </span>
              <span className="text-[12px] text-[#475569]">{k.s}</span>
            </div>
          ))}
        </div>

        <section
          aria-label="Agents"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">Agents</h2>
            <span className="rounded-full bg-[#E2E8F0] px-2.5 py-[3px] text-[12px] font-bold text-[#334155]">
              Shadow
            </span>
            <span className="rounded-full border border-[#9CCFF3] bg-[#EEF7FE] px-2.5 py-[3px] text-[12px] font-bold text-[#0B2540]">
              Recommends
            </span>
            <span className="rounded-full bg-[#0B4A7A] px-2.5 py-[3px] text-[12px] font-bold text-white">
              Decides
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Agent</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Works in</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Autonomy by action</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">
                    Actions 24 h
                  </th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">
                    Approved unedited
                  </th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">
                    Cost today
                  </th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Owner</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Running</th>
                </tr>
              </thead>
              <tbody>
                {AGENTS.map((a) => {
                  const isOff = !!paused[a.id];
                  // Global recommend-only re-levels every action pill.
                  const acts = g ? a.acts.map((x) => act(R, x.t.split(" · ")[0]!)) : a.acts;
                  return (
                    <tr key={a.id}>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#0F172A]">
                        <strong>{a.n}</strong>
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#475569]">
                        {a.where}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                        <span className="flex flex-wrap gap-1">
                          {acts.map((x) => (
                            <span
                              key={x.t}
                              className="rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                              style={{ background: x.bg, color: x.fg, borderColor: x.bd }}
                            >
                              {x.t}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums text-[#0F172A]">
                        {a.n24}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums text-[#0F172A]">
                        {a.rate}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums text-[#0F172A]">
                        {a.cost === null ? <Unbuilt /> : a.cost}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#0F172A]">
                        {a.owner}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                        <button
                          type="button"
                          aria-pressed={!isOff}
                          onClick={() => setPaused((p) => ({ ...p, [a.id]: !p[a.id] }))}
                          className="h-8 min-w-[76px] rounded-full border text-[12px] font-bold"
                          style={{
                            background: isOff ? "#FFFFFF" : "#DCFCE7",
                            color: isOff ? "#991B1B" : "#166534",
                            borderColor: isOff ? "#991B1B" : "#166534",
                          }}
                        >
                          {isOff ? "Paused" : "On"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <span className="text-[12px] text-[#475569]">
            A paused agent stops acting. Anything it would have done lands in Approvals for a
            person.
          </span>
        </section>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Action switches"
            className="flex flex-[1_1_380px] flex-col gap-1.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="mb-1 mt-0 text-[16px] font-bold text-[#0F172A]">
              Switch off one action everywhere
            </h2>
            {TOOLS.map(([id, n, d]) => {
              const isOff = !!off[id];
              return (
                <label
                  key={id}
                  className="flex min-h-[46px] cursor-pointer items-center gap-3 border-b border-[#EEF2F6]"
                >
                  <span className="flex flex-grow flex-col">
                    <span className="text-[14px] font-semibold text-[#0F172A]">{n}</span>
                    <span className="text-[12px] text-[#5B6B80]">{d}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={!isOff}
                    onChange={() => setOff((s) => ({ ...s, [id]: !s[id] }))}
                    className="size-[22px] accent-[#166534]"
                  />
                  <span
                    className="w-[34px] text-[12px] font-bold"
                    style={{ color: isOff ? "#991B1B" : "#166534" }}
                  >
                    {isOff ? "Off" : "On"}
                  </span>
                </label>
              );
            })}
          </section>

          <section
            aria-label="Alerts"
            className="flex flex-[1_1_380px] flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Alerts</h2>
            {ALERTS.map((a) => (
              <div
                key={a.t}
                className="flex flex-col gap-1 rounded-[12px] p-3"
                style={{ background: a.bg }}
              >
                <strong className="text-[14px]" style={{ color: a.fg }}>
                  {a.t}
                </strong>
                <span className="text-[13px] text-[#334155]">{a.d}</span>
                <span
                  title="Not built yet"
                  className="cursor-default text-[13px] font-semibold text-[#5B6B80]"
                >
                  {a.cta}
                </span>
              </div>
            ))}
          </section>

          <section
            aria-label="Models and spend"
            className="flex flex-[1_1_380px] flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Models and spend</h2>
            {MODELS.map((m) => (
              <div
                key={m.n}
                className="flex gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0"
              >
                <span className="flex flex-grow flex-col">
                  <strong className="text-[#0F172A]">{m.n}</strong>
                  <span className="text-[12px] text-[#5B6B80]">{m.u}</span>
                </span>
                <span className="whitespace-nowrap font-semibold text-[#0F172A]">{m.v}</span>
              </div>
            ))}
            <span className="text-[12px] text-[#475569]">
              Prices, sizing, rebates and VPP bids are worked out by code the agents call, never by
              a model.
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
