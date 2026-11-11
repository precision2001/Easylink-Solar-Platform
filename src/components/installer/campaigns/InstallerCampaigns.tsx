"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Campaigns & lists" mock
 * (InstCampaigns.dc.html) — the installer's own call and SMS campaigns, the
 * lists that feed them, and their SMS templates.
 *
 * Nothing here is wired to a backend: this app has no campaign, list or SMS
 * template model, and the Operations contact-lists API is admin-only, so an
 * installer session cannot read it. The campaigns, counts and templates below
 * are the mock's sample data.
 *
 * Start/Pause is real local state because the mock's point is that the status
 * pill and the button follow each other, but it says it is a preview: a
 * button that appeared to start dialling real customers would be worse than
 * one that is honest about not being connected. "New campaign", "Upload CSV"
 * and "New template" are inert for the same reason — and because the Do Not
 * Call Register wash that makes an uploaded list legal to dial lives on the
 * server, not here.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const GOLD = "#FFB547";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const RULE = "#EEF2F6";
const GREEN = "#166534";
const GREEN_SOFT = "#DCFCE7";
const GREY_SOFT = "#E2E8F0";

type Campaign = {
  name: string;
  detail: string;
  channel: string;
  audience: string;
  reached: string;
  outcome: string;
};

const CAMPAIGNS: Campaign[] = [
  {
    name: "Proposal follow-ups",
    detail: "AI calls 3 days after a proposal is opened but not accepted",
    channel: "AI call + SMS",
    audience: "Auto · 2 this week",
    reached: "11",
    outcome: "3 deposits",
  },
  {
    name: "Google review requests",
    detail: "SMS 7 days after handover",
    channel: "SMS",
    audience: "Auto · completed jobs",
    reached: "18",
    outcome: "9 reviews",
  },
  {
    name: "Battery upgrade · past solar customers",
    detail: "Existing customers without a battery",
    channel: "Calls by you",
    audience: "Past customers · 64",
    reached: "0",
    outcome: "—",
  },
  {
    name: "Annual inspection reminders",
    detail: "Customers with a maintenance plan",
    channel: "SMS + AI call",
    audience: "Auto · plan holders",
    reached: "6",
    outcome: "5 booked",
  },
];

/** The mock's starting state: the third campaign paused, the rest running. */
const INITIAL_RUNNING = [true, true, false, true];

const LISTS: { name: string; detail: string; count: string }[] = [
  { name: "Open proposals", detail: "Auto · from your Pipeline", count: "2" },
  {
    name: "Past customers",
    detail: "Auto · installed in the last 5 years",
    count: "64",
  },
  {
    name: "Maintenance plan holders",
    detail: "Auto · from customer portal sign-ups",
    count: "6",
  },
  {
    name: "Home show leads · Sep 2026",
    detail: "Uploaded CSV · 212 rows · 37 removed by DNC wash",
    count: "175",
  },
];

const TEMPLATES: { name: string; text: string }[] = [
  {
    name: "Site visit confirmation",
    text: "Hi {first}, it's {installer}. Confirming your site visit on {date} at {time}. Reply C to confirm. Opt out: reply STOP",
  },
  {
    name: "Proposal nudge",
    text: "Hi {first}, your solar proposal is in your EasyLink portal. Happy to answer questions — just reply. Opt out: reply STOP",
  },
  {
    name: "On my way",
    text: "{installer} is on the way and should arrive by {eta}.",
  },
  {
    name: "Review request",
    text: "Thanks for choosing {installer}! Would you leave us a quick Google review? {link} Opt out: reply STOP",
  },
];

export function InstallerCampaigns() {
  const [running, setRunning] = useState<boolean[]>(INITIAL_RUNNING);

  const toggle = (i: number) =>
    setRunning((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <header
        className="flex flex-wrap items-center gap-3 bg-white px-4 py-3.5 sm:px-7"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <nav aria-label="Breadcrumb" className="grow text-[13px]" style={{ color: MUTED }}>
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold" style={{ color: INK }}>
            Campaigns &amp; lists
          </span>
        </nav>
        <span
          className="rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: GOLD, color: SUN_INK }}
        >
          Elite
        </span>
        <span
          title="Campaigns, lists and templates on this page are sample data — nothing is sent"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-4 pt-6 pb-14 sm:px-7">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Campaigns &amp; lists
            </h1>
            <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
              Call and SMS campaigns to your own customers · EasyLink-job customers
              belong to the job owner and aren&rsquo;t listed here
            </p>
          </div>
          <span
            title="Creating a campaign isn't built yet — there is no campaign store or sender behind this page"
            className="flex h-11 cursor-help items-center rounded-[10px] px-4.5 text-[14px] font-bold"
            style={{ background: SUN, color: SUN_INK }}
          >
            New campaign
          </span>
        </div>

        <section
          aria-label="Campaigns"
          className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[18px]"
          style={{ border: `1px solid ${BORDER}` }}
        >
          <h2 className="m-0 text-[16px] font-bold">Campaigns</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 border-collapse text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: SLATE }}>
                  {["Campaign", "Channel", "Audience"].map((h) => (
                    <th
                      key={h}
                      className="p-2 font-semibold"
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      {h}
                    </th>
                  ))}
                  {["Reached", "Outcome"].map((h) => (
                    <th
                      key={h}
                      className="p-2 text-right font-semibold"
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      {h}
                    </th>
                  ))}
                  <th
                    className="p-2 font-semibold"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    Status
                  </th>
                  <th className="p-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map((c, i) => {
                  const on = running[i]!;
                  const cell = { borderBottom: `1px solid ${RULE}` };
                  return (
                    <tr key={c.name}>
                      <td className="px-2 py-3" style={cell}>
                        <strong>{c.name}</strong>
                        <br />
                        <span className="text-[12px]" style={{ color: MUTED }}>
                          {c.detail}
                        </span>
                      </td>
                      <td className="px-2 py-3" style={cell}>
                        {c.channel}
                      </td>
                      <td className="px-2 py-3" style={cell}>
                        {c.audience}
                      </td>
                      <td className="px-2 py-3 text-right" style={cell}>
                        {c.reached}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold" style={cell}>
                        {c.outcome}
                      </td>
                      <td className="px-2 py-3" style={cell}>
                        <span
                          className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                          style={{
                            background: on ? GREEN_SOFT : GREY_SOFT,
                            color: on ? GREEN : BODY,
                          }}
                        >
                          {on ? "Running" : "Paused"}
                        </span>
                      </td>
                      <td className="px-2 py-3" style={cell}>
                        <button
                          type="button"
                          onClick={() => toggle(i)}
                          className="h-8.5 rounded-[9px] bg-white px-3 text-[12px] font-semibold"
                          style={{ border: `1px solid ${BORDER_2}` }}
                        >
                          {on ? "Pause" : "Start"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <span className="text-[12px]" style={{ color: SLATE }}>
            Start and Pause are a preview — no campaign runner is connected, so
            nothing is dialled or sent either way.
          </span>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <section
            aria-label="Contact lists"
            className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 grow text-[16px] font-bold">Contact lists</h2>
              <span
                title="Uploading isn't built yet — the Do Not Call Register wash that makes a list legal to dial runs on the server"
                className="flex h-9 cursor-help items-center rounded-[9px] bg-white px-3 text-[12px] font-semibold"
                style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
              >
                Upload CSV
              </span>
            </div>
            {LISTS.map((l) => (
              <div
                key={l.name}
                className="flex items-center gap-2.5 py-2.5"
                style={{ borderBottom: `1px solid ${RULE}` }}
              >
                <span className="flex grow flex-col">
                  <span className="text-[14px] font-semibold">{l.name}</span>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    {l.detail}
                  </span>
                </span>
                <strong className="text-[14px]">{l.count}</strong>
              </div>
            ))}
            <span className="text-[12px]" style={{ color: SLATE }}>
              Uploaded lists are washed against the Do Not Call Register before any
              call. Removed numbers are shown, never dialled.
            </span>
            <Link
              href="/installers/dashboard/contact-lists"
              prefetch={false}
              className="text-[13px] font-semibold text-[#1565C0]"
            >
              Open Contact lists
            </Link>
          </section>

          <section
            aria-label="SMS templates"
            className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 grow text-[16px] font-bold">SMS templates</h2>
              <span
                title="Saving a template isn't built yet — there is no template store behind this page"
                className="flex h-9 cursor-help items-center rounded-[9px] bg-white px-3 text-[12px] font-semibold"
                style={{ border: `1px solid ${BORDER_2}`, color: SLATE }}
              >
                New template
              </span>
            </div>
            {TEMPLATES.map((t) => (
              <div
                key={t.name}
                className="flex flex-col gap-1 rounded-[10px] bg-[#F8FAFC] px-3 py-2.5"
              >
                <strong className="text-[13px]">{t.name}</strong>
                <span className="text-[13px]" style={{ color: BODY }}>
                  {t.text}
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
