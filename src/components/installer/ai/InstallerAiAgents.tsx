"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "AI agents & numbers" mock
 * (InstAIAgents.dc.html) — the installer's four Voxa agents, what each one
 * knows and may do, the limits EasyLink sets for every installer, and how
 * their two phone numbers route.
 *
 * Nothing here is wired to a backend: this app has no agent, telephony or
 * policy model, so there is no endpoint that lists agents, turns one on,
 * places a test call or reads the POL-* rules. The figures, agents and
 * numbers are the mock's sample data.
 *
 * Two deliberate choices follow from that:
 *
 * - The live/off switches and the agent picker are real local state, because
 *   the mock's point is that picking an agent changes the settings pane. They
 *   say they are a preview rather than implying a call would start answering.
 * - "Test call" does not place a call. There is no dialler behind it, and a
 *   button that looked like it rang a number would be worse than one that
 *   says plainly it isn't connected.
 *
 * The phone numbers keep the mock's "02 [XXXX XXXX]" placeholders — inventing
 * a plausible Australian number for a page about who gets called is exactly
 * the kind of detail someone would later read as real.
 */

const SUN_INK = "#3B1D00";
const GOLD = "#FFB547";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const RULE = "#EEF2F6";
const CREAM = "#FFF7E6";
const GREEN = "#166534";
const AI = "#0B4A7A";

type Agent = {
  name: string;
  kind: string;
  greeting: string;
  tools: string[];
};

const AGENTS: Agent[] = [
  {
    name: "Receptionist",
    kind: "Voice · inbound overflow and after hours",
    greeting:
      "Hi, you've reached Solarman. I'm an AI assistant — Emmanuel is on a job. How can I help?",
    tools: [
      "Book a site visit in your calendar",
      "Take a message as a callback task",
      "Transfer urgent faults to Emmanuel's mobile",
      "Send a confirmation SMS",
    ],
  },
  {
    name: "Reminder",
    kind: "Voice · confirms visits and installs 48 hours ahead",
    greeting:
      "Hi, it's an AI assistant calling for Solarman about your appointment on {date}.",
    tools: [
      "Confirm or move the appointment",
      "Update My jobs",
      "SMS the new time",
    ],
  },
  {
    name: "Proposal follow-up",
    kind: "Voice · outbound, 3 days after a proposal is opened",
    greeting:
      "Hi {first}, it's an AI assistant calling for Solarman about the proposal in your EasyLink portal.",
    tools: [
      "Answer questions about the proposal",
      "Book a deposit call with Emmanuel",
      "Log the outcome in Pipeline",
    ],
  },
  {
    name: "Web & WhatsApp chat",
    kind: "Chat · website widget and WhatsApp",
    greeting:
      "Hi! I'm Solarman's AI assistant. Are you after solar, a battery or a service?",
    tools: [
      "Capture a lead into Customers",
      "Book a site visit",
      "Hand the chat to the Inbox",
    ],
  },
];

/** The mock's starting state: the three voice agents live, chat off. */
const INITIAL_ON = [true, true, true, false];

const KNOWS: { topic: string; source: string }[] = [
  { topic: "Your service areas and job types", source: "Synced" },
  { topic: "Your trade prices and kits", source: "Synced" },
  { topic: "Rebates FAQ (STCs, batteries)", source: "EasyLink" },
  { topic: "Your open days from My jobs", source: "Live" },
];

/** Set platform-wide; an installer cannot change these, hence no controls. */
const LIMITS: { what: string; limit: string; policy: string }[] = [
  {
    what: "Calls and SMS to customers",
    limit: "8 am to 8 pm local time, 3 a week per customer",
    policy: "POL-CONTACT-01",
  },
  {
    what: "Discounts the agent can offer",
    limit: "None. Price changes go to you",
    policy: "POL-DISC-02",
  },
  {
    what: "Says it's an AI",
    limit: "At the start of every chat and call",
    policy: "POL-AI-01",
  },
  {
    what: "Hardship, complaints, safety",
    limit: "Hands to a person straight away",
    policy: "POL-CARE-01",
  },
  {
    what: "Accepting job offers, signing CoCs",
    limit: "Never. Always you",
    policy: "POL-SIGN-01",
  },
];

const NUMBERS: { name: string; hours: string; flow: string[] }[] = [
  {
    name: "Sales & enquiries · 02 [XXXX XXXX]",
    hours: "Mon–Fri 7 am–6 pm · Sat 8 am–1 pm",
    flow: [
      "Recording notice",
      "Emmanuel · 20 s",
      "Tomas · 20 s",
      "AI Receptionist",
      "Voicemail → callback",
    ],
  },
  {
    name: "Service & warranty · 02 [XXXX XXXX]",
    hours: "Every day · AI after hours",
    flow: [
      "Recording notice",
      "AI Receptionist triage",
      "Urgent → Emmanuel mobile",
      "Else → booked service visit",
    ],
  },
];

export function InstallerAiAgents() {
  const [selected, setSelected] = useState(0);
  const [on, setOn] = useState<boolean[]>(INITIAL_ON);

  const current = AGENTS[selected]!;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <header
        className="flex flex-wrap items-center gap-3 bg-white px-7 py-3.5"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <nav aria-label="Breadcrumb" className="grow text-[13px]" style={{ color: MUTED }}>
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold" style={{ color: INK }}>
            AI agents &amp; numbers
          </span>
        </nav>
        <span
          className="rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: GOLD, color: SUN_INK }}
        >
          Elite
        </span>
        <span
          title="Agents, numbers and limits on this page are sample data — no agent platform is connected"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-7 pt-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold">
            AI agents &amp; numbers
          </h1>
          <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
            The same Voxa agents EasyLink Operations use, set up for a small
            installer team
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Agents"
            className="flex min-w-75 grow basis-75 flex-col gap-1.5 rounded-[14px] bg-white p-3"
            style={{ border: `1px solid ${BORDER}` }}
          >
            {AGENTS.map((a, i) => {
              const live = on[i]!;
              return (
                <div
                  key={a.name}
                  className="flex items-center gap-2.5 rounded-[10px] p-2.5"
                  style={{ background: i === selected ? CREAM : "#FFFFFF" }}
                >
                  <button
                    type="button"
                    aria-pressed={i === selected}
                    onClick={() => setSelected(i)}
                    className="flex grow flex-col gap-0.5 text-left"
                  >
                    <strong className="text-[14px]">{a.name}</strong>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {a.kind}
                    </span>
                  </button>
                  <label
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: SLATE }}
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      checked={live}
                      onChange={() =>
                        setOn((prev) => prev.map((v, j) => (j === i ? !v : v)))
                      }
                      className="size-5 accent-[#166534]"
                    />
                    <span className="sr-only">
                      {a.name} is {live ? "live" : "off"}
                    </span>
                    <span aria-hidden>{live ? "Live" : "Off"}</span>
                  </label>
                </div>
              );
            })}
            <span className="px-2.5 pt-1 text-[12px]" style={{ color: SLATE }}>
              Switching an agent here is a preview — nothing starts or stops
              answering, because no agent platform is connected yet.
            </span>
          </section>

          <section
            aria-label="Agent settings"
            className="flex min-w-0 grow-[2] basis-120 flex-col gap-3.5 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 grow text-[18px] font-bold">{current.name}</h2>
              <span
                title="No dialler behind this page yet — a test call can't be placed"
                className="flex h-9.5 cursor-help items-center rounded-[10px] bg-white px-3.5 text-[13px] font-semibold"
                style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
              >
                Test call
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="greeting"
                className="text-[12px] font-semibold"
                style={{ color: SLATE }}
              >
                Opening line
              </label>
              {/* Read-only: there is nowhere to save an opening line yet. */}
              <textarea
                id="greeting"
                rows={2}
                readOnly
                value={current.greeting}
                className="resize-y rounded-[10px] bg-[#F8FAFC] px-3 py-2.5 text-[13px]"
                style={{ border: `1px solid ${BORDER_2}` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[14px] font-bold">Knows about</h3>
                {KNOWS.map((k) => (
                  <div key={k.topic} className="flex gap-2 text-[13px]">
                    <span className="grow">{k.topic}</span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{ color: GREEN }}
                    >
                      {k.source}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[14px] font-bold">Can do</h3>
                {current.tools.map((t) => (
                  <div key={t} className="text-[13px]">
                    • {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-[10px] bg-[#F8FAFC] p-3 text-[13px]">
              <strong>Always</strong>
              <span>
                Says it&rsquo;s an AI at the start · never takes card or bank
                details · hands complaints to a person · stays inside calling
                hours · plays the recording notice
              </span>
            </div>
          </section>
        </div>

        <section
          aria-label="Limits set by EasyLink"
          className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 grow text-[16px] font-bold">Limits set by EasyLink</h2>
            <span
              className="w-fit rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ background: AI }}
            >
              Autonomy: Recommends
            </span>
          </div>
          <span className="text-[13px]" style={{ color: SLATE }}>
            These apply to every installer&rsquo;s agents and can&rsquo;t be changed
            here. Your agents suggest; anything that commits you waits in{" "}
            {/* The AI assistant approvals screen isn't built yet. */}
            <span title="Not built yet" className="cursor-help underline">
              AI assistant
            </span>
            .
          </span>
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 border-collapse text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: SLATE }}>
                  <th
                    className="p-2 font-semibold"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    What
                  </th>
                  <th
                    className="p-2 font-semibold"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    Limit
                  </th>
                  <th
                    className="p-2 font-semibold"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    Policy
                  </th>
                  <th className="p-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <span className="sr-only">Who sets it</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {LIMITS.map((l) => (
                  <tr key={l.policy}>
                    <td
                      className="px-2 py-2.25 font-semibold"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {l.what}
                    </td>
                    <td
                      className="px-2 py-2.25"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {l.limit}
                    </td>
                    <td
                      className="px-2 py-2.25 font-mono text-[12px]"
                      style={{ borderBottom: `1px solid ${RULE}` }}
                    >
                      {l.policy}
                    </td>
                    <td
                      className="px-2 py-2.25 whitespace-nowrap"
                      style={{ borderBottom: `1px solid ${RULE}`, color: MUTED }}
                    >
                      <span aria-hidden>🔒</span> Set by EasyLink
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-label="Numbers and routing"
          className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 grow text-[16px] font-bold">Numbers &amp; routing</h2>
            <span className="text-[12px]" style={{ color: MUTED }}>
              2 of 2 numbers on Elite
            </span>
          </div>
          {NUMBERS.map((n) => (
            <div
              key={n.name}
              className="flex flex-col gap-2 rounded-xl p-3"
              style={{ border: `1px solid ${RULE}` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <strong className="grow text-[14px]">{n.name}</strong>
                <span className="text-[12px]" style={{ color: SLATE }}>
                  {n.hours}
                </span>
              </div>
              <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
                {n.flow.map((f) => (
                  <li
                    key={f}
                    className="rounded-lg bg-[#F1F5F9] px-2.5 py-1.5 text-[12px] font-semibold"
                    style={{ color: BODY }}
                  >
                    {f}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <span className="text-[12px]" style={{ color: SLATE }}>
            Recordings are kept 90 days, then deleted. Voicemails become callback
            tasks in the Contact Centre.
          </span>
          <Link
            href="/installers/dashboard/contact-centre"
            prefetch={false}
            className="text-[13px] font-semibold text-[#1565C0]"
          >
            Open Contact Centre
          </Link>
        </section>
      </div>
    </div>
  );
}
