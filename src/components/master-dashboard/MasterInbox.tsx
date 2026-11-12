"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSmsStatus } from "@/hooks/useSmsStatus";
import { SmsStatusNote } from "@/components/sms/SmsStatusNote";

export type InboxRole = "operations" | "installer";

/**
 * "Inbox" from the Easylink Designer mock, in both roles that artboard
 * serves: DistInbox.dc.html is Operations — every channel for customers,
 * installers and partners — and InstInbox.dc.html is the installer's own
 * inbox, which carries only their customers and so filters by channel
 * rather than by who the other party is.
 *
 * The mock's interactive parts are ported as real state rather than frozen to
 * one frame: the who-filter, the conversation selection, and the per-channel
 * and per-speaker colouring that both depend on.
 *
 * The conversations themselves are the mock's sample data. There is a
 * Conversation/Message backend behind /master/calls, but nothing yet that
 * unifies SMS, WhatsApp, web chat, email and the portal into one thread per
 * contact, which is what this page is about — so the page says it is sample
 * and the compose controls are marked rather than pretending to send.
 *
 * Each role gets its own conversations: an installer sees their own
 * customers, never another installer's or a partner's.
 */

const NAVY = "#0B1A2E";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const BORDER_2 = "#CBD5E1";
const CREAM = "#FFF7E6";
const MIST = "#F1F5F9";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const AMBER = "#92400E";
const WHITE = "#FFFFFF";

const CARD = "rounded-[14px] bg-white";
const GHOST_BTN =
  "cursor-help rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold";

/** The channel a message arrived on, and the pill colours the mock gives it. */
const CHANNELS = {
  Portal: { bg: "#EDE4FF", fg: "#3B1F75" },
  SMS: { bg: "#DBEAFE", fg: "#1E40AF" },
  WhatsApp: { bg: "#DCFCE7", fg: "#166534" },
  "Web chat": { bg: "#FFE7C2", fg: "#3B1D00" },
  Email: { bg: "#E2E8F0", fg: "#334155" },
} as const;

type Channel = keyof typeof CHANNELS;

/**
 * Who the conversation is with, and where their record lives.
 *
 * Only two of the three have a page built, so the third is a plain label
 * instead of a link that goes nowhere.
 */
const KINDS = {
  Customer: { label: "Customer", href: "/master/quotes-leads", link: "Open in Quotes & Leads" },
  Installer: { label: "Installer", href: "/master/installers", link: "Open installer" },
  Partner: { label: "Partner", href: null, link: "Open in Admin · Partners" },
} as const;

type Kind = keyof typeof KINDS;

/** Who said it, which decides the bubble's side and colour. */
const SPEAKERS = {
  /** Us, replying. */
  me: { align: "self-end", bg: NAVY, fg: WHITE },
  /** The contact. */
  them: { align: "self-start", bg: MIST, fg: INK },
  /** An AI agent answering on our behalf. */
  bot: { align: "self-end", bg: "#FFE7C2", fg: SUN_INK },
} as const;

type Speaker = keyof typeof SPEAKERS;

interface Message {
  who: string;
  at: string;
  text: string;
  speaker: Speaker;
}

interface Conversation {
  id: string;
  name: string;
  kind: Kind;
  channel: Channel;
  at: string;
  unread: boolean;
  last: string;
  stage: string;
  about: string;
  next: string;
  owner: string;
  ai: string;
  thread: Message[];
}

const CONVERSATIONS: Conversation[] = [
  {
    id: "raj",
    name: "Raj Malhotra",
    kind: "Customer",
    channel: "Web chat",
    at: "9:52 am",
    unread: true,
    last: "Can I still get the battery rebate if I sign this month?",
    stage: "Proposal sent",
    about: "6.6 kW + 13 kWh · Seven Hills",
    next: "Callback 2:00 pm",
    owner: "Kerry",
    ai: "Yes, the Cheaper Home Batteries discount is applied when the battery is installed, not when you sign. Your proposal already shows it. Want me to book a call with our team?",
    thread: [
      {
        who: "Raj",
        at: "9:52 am",
        text: "Can I still get the battery rebate if I sign this month?",
        speaker: "them",
      },
    ],
  },
  {
    id: "solarman",
    name: "Solarman Electrical",
    kind: "Installer",
    channel: "Portal",
    at: "9:31 am",
    unread: true,
    last: "JOB-3138 kit is 2 rails short",
    stage: "Elite installer",
    about: "JOB-3138 Blacktown · SO-48240",
    next: "Install Fri 17 Oct",
    owner: "Mark Kelly",
    ai: "Thanks Emmanuel. Two rails are on a courier from the Sydney warehouse today and will be on site by 7 am Friday. No change to your payout.",
    thread: [
      {
        who: "Emmanuel",
        at: "9:31 am",
        text: "JOB-3138 kit is 2 rails short against the packing list. Install is Friday.",
        speaker: "them",
      },
    ],
  },
  {
    id: "priya",
    name: "Priya Raman",
    kind: "Customer",
    channel: "SMS",
    at: "8:40 am",
    unread: true,
    last: "When will the installer call me?",
    stage: "Ready Deal paid",
    about: "Solarman deal · Kellyville",
    next: "Installer to call by 5 pm",
    owner: "Kerry",
    ai: "Hi Priya, Solarman has your order and will call you today to book the install. Reply STOP to opt out.",
    thread: [
      { who: "Priya", at: "8:40 am", text: "When will the installer call me?", speaker: "them" },
    ],
  },
  {
    id: "sunrise",
    name: "Sunrise Electrical Pty Ltd",
    kind: "Installer",
    channel: "Email",
    at: "Yesterday",
    unread: false,
    last: "Attached our public liability certificate",
    stage: "Waiting for approval",
    about: "New installer application",
    next: "Review in Admin › Approvals",
    owner: "Daniel Shaw",
    ai: "Thanks, we’ve received it. We’ll finish checking your application within 2 business days.",
    thread: [
      {
        who: "Sunrise Electrical",
        at: "Yesterday",
        text: "Attached our public liability certificate as requested.",
        speaker: "them",
      },
    ],
  },
  {
    id: "supplier",
    name: "[Wholesale supplier]",
    kind: "Partner",
    channel: "Email",
    at: "Thu",
    unread: false,
    last: "Battery stock ETA moved to 24 Oct",
    stage: "Supplier",
    about: "Batteries and inverters",
    next: "Update Pricing & stock",
    owner: "Mark Kelly",
    ai: "Thanks for the heads-up. We’ll update incoming stock and let affected installers know.",
    thread: [
      { who: "Supplier", at: "Thu", text: "Battery stock ETA moved to 24 Oct.", speaker: "them" },
    ],
  },
  {
    id: "visitor",
    name: "Website visitor",
    kind: "Customer",
    channel: "Web chat",
    at: "Thu",
    unread: false,
    last: "AI captured lead: 10 kW, Penrith, ready to pay deposit",
    stage: "New lead",
    about: "10 kW · Penrith",
    next: "Make a Ready Site?",
    owner: "AI chat",
    ai: "Lead is confirmed and deposit-ready: a good fit for a Ready Site.",
    thread: [
      {
        who: "AI chat",
        at: "Thu",
        text: "Captured: 10 kW system, Penrith, wants install before Christmas, happy to pay a deposit.",
        speaker: "bot",
      },
    ],
  },
];

/** The who-filter, mapped onto the kind it keeps. */
const FILTERS: [string, Kind | null][] = [
  ["All", null],
  ["Customers", "Customer"],
  ["Installers", "Installer"],
  ["Partners", "Partner"],
];

/**
 * The installer's inbox, from InstInbox.dc.html. Everyone here is their own
 * customer or lead, so the filter is the channel the message arrived on.
 */
const CHANNEL_FILTERS: [string, Channel | null][] = [
  ["All", null],
  ["Portal", "Portal"],
  ["SMS", "SMS"],
  ["WhatsApp", "WhatsApp"],
  ["Web chat", "Web chat"],
  ["Email", "Email"],
];

const INSTALLER_CONVERSATIONS: Conversation[] = [
  {
    id: "daniel",
    name: "Daniel Moretti",
    kind: "Customer",
    channel: "Portal",
    at: "9:40 am",
    unread: true,
    last: "Is the Recommended option cheaper?",
    stage: "Designing",
    about: "14.52 kW → 12.76 kW suggested",
    next: "Walkthrough Thu 16 Oct 5:30 pm",
    owner: "Emmanuel",
    ai: "Yes — 4 fewer panels lowers the price, and it keeps your full rebate. I'll show both side by side on Thursday.",
    thread: [
      {
        who: "You",
        at: "11 Oct, 9:05 am",
        text: "Heads up: 33 panels is over the rebate limit for your inverter. I've added a Recommended option with 29 panels.",
        speaker: "me",
      },
      {
        who: "Daniel",
        at: "9:40 am",
        text: "Is the Recommended option cheaper?",
        speaker: "them",
      },
    ],
  },
  {
    id: "grace",
    name: "Grace Lim",
    kind: "Customer",
    channel: "SMS",
    at: "9:02 am",
    unread: true,
    last: "Week of 27 Oct works best for us",
    stage: "Deposit paid",
    about: "8 kW + 10 kWh",
    next: "Callback 4:30 pm",
    owner: "Emmanuel",
    ai: "Great, I'll lock in Tue 28 Oct and send a confirmation. Reply STOP to opt out.",
    thread: [
      { who: "Grace", at: "9:02 am", text: "Week of 27 Oct works best for us", speaker: "them" },
    ],
  },
  {
    id: "marco",
    name: "Marco · Ryde",
    kind: "Customer",
    channel: "WhatsApp",
    at: "8:15 am",
    unread: true,
    last: "Do you clean panels? Mine are filthy",
    stage: "New lead",
    about: "—",
    next: "Reply",
    owner: "Emmanuel",
    ai: "We do — we book EasyLink's drone team, who clean up to 40 panels with before and after photos. What's your address for a quote?",
    thread: [
      { who: "Marco", at: "8:15 am", text: "Do you clean panels? Mine are filthy", speaker: "them" },
      {
        who: "AI chat",
        at: "8:15 am",
        text: "Thanks Marco! A team member will reply shortly. What suburb are you in?",
        speaker: "bot",
      },
    ],
  },
  {
    id: "visitor",
    name: "Website visitor",
    kind: "Customer",
    channel: "Web chat",
    at: "Yesterday",
    unread: false,
    last: "AI captured lead: battery quote, Bass Hill",
    stage: "New lead",
    about: "Battery",
    next: "Lucas Nguyen visit Sat",
    owner: "Emmanuel",
    ai: "Merged with Lucas Nguyen — same phone number.",
    thread: [
      {
        who: "AI chat",
        at: "Yesterday",
        text: "Captured: battery for existing 6 kW system, Bass Hill. Booked Sat 18 Oct.",
        speaker: "bot",
      },
    ],
  },
  {
    id: "hannah",
    name: "Hannah Cole",
    kind: "Customer",
    channel: "Email",
    at: "Fri",
    unread: false,
    last: "Thanks for the handover pack!",
    stage: "Payment completed",
    about: "10 kW",
    next: "Review request sent",
    owner: "Emmanuel",
    ai: "Glad it's all running! If you have a minute, a Google review helps a small team like ours.",
    thread: [
      { who: "Hannah", at: "Fri", text: "Thanks for the handover pack!", speaker: "them" },
    ],
  },
];

export function MasterInbox({ role = "operations" }: { role?: InboxRole } = {}) {
  const ops = role === "operations";
  /** Operations filter by who the other party is; an installer by channel. */
  const conversations = ops ? CONVERSATIONS : INSTALLER_CONVERSATIONS;
  const filters: [string, string | null][] = ops ? FILTERS : CHANNEL_FILTERS;

  const [who, setWho] = useState("All");
  const [selectedId, setSelectedId] = useState(conversations[0]!.id);
  const [reply, setReply] = useState("");
  const sms = useSmsStatus(ops ? "admin" : "installer");

  const kept = useMemo(() => {
    const value = filters.find(([label]) => label === who)?.[1] ?? null;
    if (!value) return conversations;
    return ops
      ? conversations.filter(c => c.kind === value)
      : conversations.filter(c => c.channel === value);
  }, [who, ops, conversations, filters]);

  /**
   * The open conversation is found across every conversation, not just the
   * filtered ones: narrowing the list should not blank the reading pane on the
   * message someone is part-way through answering.
   */
  const current =
    conversations.find(c => c.id === selectedId) ?? conversations[0]!;
  const channel = CHANNELS[current.channel];
  const kind = KINDS[current.kind];

  return (
    <div className="flex min-h-full flex-col" style={{ color: INK }}>
      <header
        className="flex flex-wrap items-center gap-3 bg-white px-8 py-3.5"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px]" style={{ color: MUTED }}>
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold" style={{ color: INK }}>
            Inbox
          </span>
        </nav>
        {ops ? (
          <span className="text-[13px]" style={{ color: SLATE }}>
            Shared team inbox · Kerry and Mark on shift
          </span>
        ) : (
          <span
            className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
            style={{ background: "#FFB547", color: SUN_INK }}
          >
            Elite
          </span>
        )}
        <span
          title="The conversations on this page are sample data"
          className="cursor-help rounded-full px-2.5 py-[3px] text-[12px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-3.5 px-8 pt-5 pb-14">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Inbox</h1>
            <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
              {ops
                ? "Customers, installers and partners · every channel in one place"
                : "Your customers · portal, SMS, WhatsApp, web chat and email in one place"}
            </p>
          </div>
          <div role="group" aria-label={ops ? "Who" : "Channel"} className="flex flex-wrap gap-1.5">
            {filters.map(([label]) => {
              const on = who === label;
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWho(label)}
                  className="h-9 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                  style={{
                    border: `1px solid ${on ? NAVY : BORDER_2}`,
                    background: on ? NAVY : WHITE,
                    color: on ? WHITE : INK,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3.5">
          {/* ---------------- conversations ---------------- */}
          <section
            aria-label="Conversations"
            className={`${CARD} flex flex-[1_1_280px] flex-col gap-0.5 p-2`}
            style={{ border: `1px solid ${BORDER}` }}
          >
            {kept.map(c => {
              const on = c.id === selectedId;
              const pill = CHANNELS[c.channel];
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedId(c.id)}
                  className="flex cursor-pointer gap-2.5 rounded-[10px] border-0 p-2.5 text-left"
                  style={{ background: on ? CREAM : WHITE, color: "inherit" }}
                >
                  <span className="flex min-w-0 flex-grow flex-col gap-[3px]">
                    <span className="flex items-center gap-1.5">
                      <strong className="flex-grow text-[14px]">{c.name}</strong>
                      <span className="text-[11px]" style={{ color: MUTED }}>
                        {c.at}
                      </span>
                    </span>
                    <span
                      className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap"
                      style={{ color: SLATE }}
                    >
                      {c.last}
                    </span>
                    <span className="flex gap-1.5">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: pill.bg, color: pill.fg }}
                      >
                        {c.channel}
                      </span>
                      {c.unread ? (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: SUN, color: SUN_INK }}
                        >
                          New
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {kept.length === 0 ? (
              <span className="p-2.5 text-[13px]" style={{ color: MUTED }}>
                No conversations with {who.toLowerCase()}.
              </span>
            ) : null}
          </section>

          {/* ---------------- the conversation ---------------- */}
          <section
            aria-label="Conversation"
            className={`${CARD} flex min-w-0 flex-[2_1_420px] flex-col gap-2.5 p-4`}
            style={{ border: `1px solid ${BORDER}` }}
          >
            <div
              className="flex flex-wrap items-center gap-2 pb-2.5"
              style={{ borderBottom: `1px solid ${RULE}` }}
            >
              <strong className="flex-grow text-[16px]">{current.name}</strong>
              <span
                className="rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                style={{
                  background: "#EEF7FE",
                  color: "#0B2540",
                  border: "1px solid #9CCFF3",
                }}
              >
                AI replies on · drafts wait for you
              </span>
              <button type="button" title="Not built yet" className={`${GHOST_BTN} h-8`}>
                Take over
              </button>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ background: channel.bg, color: channel.fg }}
              >
                {current.channel}
              </span>
            </div>

            <div className="flex min-h-[260px] flex-col gap-2">
              {current.thread.map((m, i) => {
                const s = SPEAKERS[m.speaker];
                return (
                  <div
                    key={`${m.who}-${i}`}
                    className={`${s.align} flex max-w-[80%] flex-col gap-1 rounded-[12px] px-3 py-2.5`}
                    style={{ background: s.bg, color: s.fg }}
                  >
                    <span className="text-[11px] font-bold opacity-85">
                      {m.who} · {m.at}
                    </span>
                    <span className="text-[13px] leading-[1.45]">{m.text}</span>
                  </div>
                );
              })}
            </div>

            <div
              className="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5"
              style={{ background: CREAM }}
            >
              <span className="text-[12px] font-bold" style={{ color: AMBER }}>
                AI suggested reply
              </span>
              <span className="flex-[1_1_260px] text-[13px]" style={{ color: BODY }}>
                {current.ai}
              </span>
              {/* Fills the box rather than sending: the draft is still the
                  agent's to edit, which is what "drafts wait for you" means. */}
              <button
                type="button"
                onClick={() => setReply(current.ai)}
                className="h-[34px] cursor-pointer rounded-[9px] border px-3 text-[12px] font-semibold"
                style={{ borderColor: BORDER_2, background: WHITE }}
              >
                Use
              </button>
            </div>

            <label htmlFor="reply" className="absolute left-[-9999px]">
              Reply
            </label>
            <textarea
              id="reply"
              rows={2}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={`Reply on ${current.channel}…`}
              className="resize-y rounded-[10px] border px-3 py-2.5 text-[13px]"
              style={{ borderColor: BORDER_2 }}
            />
            {current.channel === "SMS" ? <SmsStatusNote status={sms} /> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" title="Not built yet" className={`${GHOST_BTN} h-10`}>
                Template
              </button>
              <button type="button" title="Not built yet" className={`${GHOST_BTN} h-10`}>
                Assign
              </button>
              <span className="flex-grow" />
              <span
                title="Sending isn't built yet — no channel is connected to this page"
                className="flex h-11 cursor-help items-center rounded-[10px] px-5 text-[14px] font-bold"
                style={{ background: SUN, color: SUN_INK }}
              >
                Send
              </span>
            </div>
          </section>

          {/* ---------------- the contact ---------------- */}
          <aside
            aria-label="Contact"
            className={`${CARD} flex flex-[1_1_240px] flex-col gap-2 p-4`}
            style={{ border: `1px solid ${BORDER}` }}
          >
            <span
              className="text-[11px] font-bold tracking-[0.06em] uppercase"
              style={{ color: SLATE }}
            >
              {kind.label}
            </span>
            <strong className="text-[15px]">{current.name}</strong>
            <dl
              className="m-0 grid gap-x-2.5 gap-y-1.5 text-[12px]"
              style={{ gridTemplateColumns: "auto 1fr" }}
            >
              <dt style={{ color: MUTED }}>Stage</dt>
              <dd className="m-0 font-semibold">{current.stage}</dd>
              <dt style={{ color: MUTED }}>About</dt>
              <dd className="m-0 font-semibold">{current.about}</dd>
              <dt style={{ color: MUTED }}>Next</dt>
              <dd className="m-0 font-semibold">{current.next}</dd>
            </dl>
            {!ops ? (
              <Link
                href="/installers/dashboard/customers"
                className="text-[13px] font-semibold text-[#1565C0]"
              >
                Open customer workspace
              </Link>
            ) : kind.href ? (
              <Link href={kind.href} className="text-[13px] font-semibold text-[#1565C0]">
                {kind.link}
              </Link>
            ) : (
              <span
                title="Admin · Partners isn't built yet"
                className="cursor-help text-[13px] font-semibold"
                style={{ color: MUTED }}
              >
                {kind.link}
              </span>
            )}
            <Link
              href={ops ? "/master/contact-centre" : "/installers/dashboard/contact-centre"}
              className="text-[13px] font-semibold text-[#1565C0]"
            >
              Call now
            </Link>
            <span className="text-[12px]" style={{ color: SLATE }}>
              Assigned to {current.owner}
            </span>
          </aside>
        </div>
      </div>
    </div>
  );
}
