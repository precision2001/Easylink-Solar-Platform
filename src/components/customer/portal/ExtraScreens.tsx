"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton, Stat } from "@/components/customer/portal/PortalParts";
import { jobs, type JobRow } from "@/lib/ai-platform/jobs";
import { breakdown, pickQuote, worksLines } from "@/lib/customers/price-breakdown";
import {
  balanceCents,
  depositLabel,
  fetchMyQuotes,
  formatCents,
  formatQuoteDate,
  quoteStatusLabel,
  quoteSystemSummary,
  type Quote,
} from "@/lib/quotes";

/**
 * Customer portal screens added with the AI redesign go-live (Nov 2026):
 * Price and rebates, Additional works, My installer, Talk to EasyLink AI,
 * My data and consent, and two "coming soon" screens. Every figure shown
 * comes from the customer's own quotes or job; nothing is estimated here.
 */

export const EASYLINK_PHONE = { display: "02 9070 1201", href: "tel:+61290701201" };
export const EASYLINK_EMAIL = "sales@easylinksolar.com.au";

function useMyQuote() {
  const [state, setState] = useState<{ quote: Quote | null; error: string | null; loading: boolean }>({ quote: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    fetchMyQuotes().then(
      (qs) => live && setState({ quote: pickQuote(qs), error: null, loading: false }),
      (e: unknown) => live && setState({ quote: null, error: e instanceof Error ? e.message : "Could not load your quote.", loading: false }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

function AskButton({ question, children }: { question: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => askEasylinkAi(question)}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-[#0B1A2E] px-4 text-[14px] font-bold text-white hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
    >
      <PortalIcon name="spark" size={16} className="text-[#FFE866]" />
      {children}
    </button>
  );
}

function ErrorNote({ text }: { text: string }) {
  return <p role="alert" className="m-0 rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#991B1B]">{text}</p>;
}

/* ---------------- Price and rebates ---------------- */

export function PriceRebatesView() {
  const { quote, error, loading } = useMyQuote();
  if (loading) return <Skeleton className="h-[420px]" />;
  if (error) return <ErrorNote text={error} />;
  if (!quote) {
    return (
      <EmptyNote icon="dollar" title="No quote yet">
        <p className="m-0">Your price, rebates and ways to pay appear here as soon as EasyLink or your installer sends your quote.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/customers/design">Go to my design</ButtonLink>
        </div>
      </EmptyNote>
    );
  }
  const { rows, savedCents } = breakdown(quote);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Your price, line by line" meta={`${quoteStatusLabel(quote)} · valid until ${formatQuoteDate(quote.validUntil)}`}>
        <p className="m-0 text-[14px] text-[#475569]">{quoteSystemSummary(quote)}</p>
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((r, i) => (
            <li
              key={`${r.label}-${i}`}
              className={`flex items-start justify-between gap-4 border-t border-[#EEF2F6] py-3 ${r.kind === "total" ? "border-t-2 border-[#0F172A] pt-4" : ""}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className={r.kind === "total" ? "text-[17px] font-bold" : "text-[15px] font-semibold"}>{r.label}</span>
                {r.detail ? <span className="text-[13px] text-[#5B6B80]">{r.detail}</span> : null}
              </span>
              <span
                className={`shrink-0 tabular-nums ${
                  r.kind === "total" ? "font-source-sans text-[28px] font-extrabold" : r.kind === "rebate" ? "font-bold text-[#15803D]" : "font-bold"
                }`}
              >
                {r.cents < 0 ? `−${formatCents(-r.cents)}` : formatCents(r.cents)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Rebates applied" value={formatCents(savedCents)} tone="good" />
          <Stat label={`Deposit (${depositLabel(quote)})`} value={formatCents(quote.depositCents)} hint={quote.depositPaidAt ? "Paid" : undefined} />
          <Stat label="Balance before install" value={formatCents(balanceCents(quote))} />
          <Stat label="Quote" value={`#${quote.number}`} hint={`Version ${quote.version}`} />
        </div>
        <Panel title="Ways to pay">
          <p className="m-0 text-[14px] leading-[1.55] text-[#334155]">
            Pay by card, or with Afterpay or Zip where your total is eligible. Prices paid with Afterpay or Zip are higher, and your payments page shows the exact amount before you pay.
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/customers/payments" icon="payments">Go to payments</ButtonLink>
            <ButtonLink href={`/customers/design?quote=${encodeURIComponent(quote.id)}#quotes`} variant="quiet">Open the full quote</ButtonLink>
          </div>
        </Panel>
        <Panel title="Questions about a line?">
          <p className="m-0 text-[14px] text-[#475569]">EasyLink AI can explain any line, rebate or payment option on your quote.</p>
          <div>
            <AskButton question="Can you explain each line and rebate on my quote?">Explain my quote</AskButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Additional works ---------------- */

const COMMON_WORKS: { icon: PortalIconName; title: string; body: string; question: string }[] = [
  { icon: "bolt", title: "Switchboard upgrade", body: "Older boards may need new breakers or more space before solar and a battery can connect.", question: "Will my switchboard need an upgrade for solar and a battery?" },
  { icon: "bolt", title: "Single to three-phase upgrade", body: "Unlocks a bigger inverter and the Maximum design. Your network has to approve it first.", question: "What does a single to three-phase upgrade involve, and would it help my home?" },
  { icon: "battery", title: "Backup circuits", body: "Keep chosen lights and power points running during a blackout.", question: "Can my battery keep some circuits running in a blackout?" },
  { icon: "sun", title: "EV charger", body: "Charge your car from your own solar. Most homes we install use a 22 kW charger.", question: "What EV charger would suit my home and car?" },
  { icon: "leaf", title: "Heat pump hot water", body: "Move off gas and heat water with your midday solar.", question: "Would heat pump hot water work with my solar design?" },
];

export function AdditionalWorksView() {
  const { quote, error, loading } = useMyQuote();
  const lines = worksLines(quote);
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Works in your quote" meta={quote ? `Quote #${quote.number}` : undefined}>
        {loading ? (
          <Skeleton className="h-[90px]" />
        ) : error ? (
          <ErrorNote text={error} />
        ) : lines.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {lines.map((l, i) => (
              <li key={`${l.name}-${i}`} className="flex justify-between gap-4 border-t border-[#EEF2F6] py-3 first:border-t-0">
                <span className="font-semibold">{l.quantity > 1 ? `${l.quantity} × ` : ""}{l.name}</span>
                <span className="font-bold tabular-nums">{formatCents(l.totalCents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[14.5px] text-[#475569]">
            {quote ? "Your quote has no extra works. If the site visit finds any, they'll be added here before you approve anything." : "Extra works appear here once your quote is ready."}
          </p>
        )}
      </Panel>

      <Panel title="Send a photo of your switchboard">
        <p className="m-0 text-[14.5px] leading-[1.55] text-[#334155]">
          A clear photo with the cover open helps your installer spot an upgrade early, so there are no surprises on install day. Send it in Messages.
        </p>
        <div>
          <ButtonLink href="/customers/messages" icon="messages">Send a photo</ButtonLink>
        </div>
      </Panel>

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[17px] font-bold">Works some homes need</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {COMMON_WORKS.map((w) => (
            <div key={w.title} className="flex flex-col gap-3 rounded-[20px] border border-[#E2E8F0] bg-white p-5">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-[#FFF4D6] text-[#7A3E00]">
                <PortalIcon name={w.icon} size={20} />
              </span>
              <h3 className="m-0 text-[16px] font-bold">{w.title}</h3>
              <p className="m-0 flex-1 text-[14px] leading-[1.5] text-[#475569]">{w.body}</p>
              <div>
                <AskButton question={w.question}>Ask about this</AskButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- My installer ---------------- */

export function MyInstallerView() {
  const [job, setJob] = useState<JobRow | null | undefined>(undefined);
  useEffect(() => {
    jobs.list("customer").then(
      (r) => setJob(r[0] ?? null),
      () => setJob(null),
    );
  }, []);
  if (job === undefined) return <Skeleton className="h-[260px]" />;
  const dates = job?.installDates;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Your installer">
        {job?.installerName ? (
          <>
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-[#0B1A2E] text-[22px] font-bold text-[#FFE866]">
                {job.installerName.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex flex-col">
                <span className="text-[20px] font-bold">{job.installerName}</span>
                <span className="text-[14px] text-[#475569]">Chosen by EasyLink for your job at {job.address}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="System" value={job.system || "—"} />
              <Stat label="Install dates" value={dates ? [dates.day1, dates.day2].filter(Boolean).join(" and ") : "Not booked yet"} />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[17px] font-bold">{job ? "We're matching your installer" : "Your installer is chosen once you go ahead"}</p>
            <p className="m-0 text-[14.5px] leading-[1.55] text-[#475569]">
              EasyLink picks the installer for every job. We match on location, availability and their record with us, and only use installers with current licences, accreditation and insurance. You&apos;ll see their name here, and get an email and SMS, as soon as they&apos;re confirmed.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/customers/messages" icon="messages">Message {job?.installerName ? "your installer" : "EasyLink"}</ButtonLink>
          <ButtonLink href="/customers/project" variant="quiet">See my project</ButtonLink>
        </div>
      </Panel>
      <Panel title="What your installer does">
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[14px] leading-[1.5] text-[#334155]">
          {["Checks your roof and switchboard at the site visit", "Handles network approval and installs your system", "Logs photos and certificates to your portal", "Shows you how it all works at switch-on"].map((t) => (
            <li key={t} className="flex gap-2.5">
              <PortalIcon name="check" size={18} className="mt-0.5 shrink-0 text-[#15803D]" />
              {t}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- Talk to EasyLink AI ---------------- */

export function VoiceConciergeView() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-[24px] bg-[#0B1A2E] p-6 text-white sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#F68A0A] text-[#3B1D00]">
          <PortalIcon name="spark" size={24} />
        </span>
        <h2 className="m-0 font-source-sans text-[28px] font-extrabold">Chat now</h2>
        <p className="m-0 text-[15px] leading-[1.55] text-[#D6E2F0]">
          Ask about your design, rebates, payments or install date, any time of day. EasyLink AI reads your portal, so you don&apos;t have to explain where you&apos;re up to.
        </p>
        <div>
          <button
            type="button"
            onClick={() => askEasylinkAi()}
            className="inline-flex min-h-[48px] items-center rounded-[14px] bg-[#F68A0A] px-5 text-[15px] font-bold text-[#3B1D00] hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE866]"
          >
            Start a conversation
          </button>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#E2E8F0] bg-white p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#FFF4D6] text-[#7A3E00]">
          <PortalIcon name="messages" size={24} />
        </span>
        <h2 className="m-0 font-source-sans text-[28px] font-extrabold">Call us</h2>
        <p className="m-0 text-[15px] leading-[1.55] text-[#475569]">
          Prefer to talk? EasyLink AI answers our phone line and can pass you to a person whenever you&apos;d like. Anything it does for you waits for your OK first.
        </p>
        <div>
          <a
            href={EASYLINK_PHONE.href}
            className="inline-flex min-h-[48px] items-center rounded-[14px] bg-[#0B1A2E] px-5 text-[15px] font-bold text-white no-underline hover:bg-[#16304F]"
          >
            Call {EASYLINK_PHONE.display}
          </a>
        </div>
        <p className="m-0 text-[13px] text-[#5B6B80]">Calls are recorded so we can follow up accurately.</p>
      </section>
    </div>
  );
}

/* ---------------- My data and consent ---------------- */

const DATA_HELD = [
  ["Your details", "Name, email, mobile and address, which you can change in My account"],
  ["Your home and energy", "Roof layout from aerial imagery, and any bill you upload"],
  ["Your designs and quotes", "Every option, price and version sent to you"],
  ["Your project", "Documents, photos, certificates and payments"],
  ["Conversations", "Messages, chats with EasyLink AI and recorded calls"],
] as const;

const REQUESTS = [
  ["Get a copy of my data", "Request a copy of my data"],
  ["Correct something", "Correct my data"],
  ["Change who can see my data", "Change who can see my data"],
  ["Delete my data", "Delete my data"],
] as const;

export function PrivacyConsentView({ email }: { email?: string | null }) {
  const mail = (subject: string) =>
    `mailto:${EASYLINK_EMAIL}?subject=${encodeURIComponent(`${subject} (customer portal)`)}&body=${encodeURIComponent(`Hi EasyLink,\n\n${subject}.\n\nMy account email: ${email ?? ""}\n\nThanks`)}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="What we hold about you">
        <ul className="m-0 flex list-none flex-col p-0">
          {DATA_HELD.map(([k, v]) => (
            <li key={k} className="flex flex-col gap-0.5 border-t border-[#EEF2F6] py-3 first:border-t-0 sm:flex-row sm:justify-between sm:gap-6">
              <span className="font-semibold">{k}</span>
              <span className="text-[14px] text-[#475569] sm:text-right">{v}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 rounded-[14px] bg-[#F4F6FA] px-4 py-3 text-[14px] leading-[1.55] text-[#334155]">
          You decide who sees your details. We share them with an installer only to quote or install your system, and never sell them. Read our{" "}
          <Link href="/privacy-policy" className="font-semibold text-[#1D4ED8] underline">
            privacy policy
          </Link>
          .
        </p>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title="Make a request">
          <p className="m-0 text-[14px] text-[#475569]">Each button starts an email to our team. We reply within 30 days, usually much sooner.</p>
          <div className="flex flex-col gap-2">
            {REQUESTS.map(([label, subject]) => (
              <a
                key={label}
                href={mail(subject)}
                className="flex min-h-[48px] items-center justify-between rounded-[12px] border border-[#CBD5E1] bg-white px-4 text-[14.5px] font-semibold text-[#0F172A] no-underline hover:border-[#64748B]"
              >
                {label}
                <PortalIcon name="arrow" size={18} className="text-[#5B6B80]" />
              </a>
            ))}
          </div>
        </Panel>
        <Panel title="Your contact details">
          <p className="m-0 text-[14px] text-[#475569]">Update your name, phone and address, and how we contact you.</p>
          <div>
            <ButtonLink href="/customers/profile" variant="quiet" icon="edit">Go to my account</ButtonLink>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Coming soon ---------------- */

export function ComingSoonView({ icon, title, body, points, now }: { icon: PortalIconName; title: string; body: string; points: string[]; now: { label: string; href: string } }) {
  return (
    <section className="flex flex-col gap-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#0B1A2E] text-[#FFE866]">
          <PortalIcon name={icon} size={24} />
        </span>
        <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[13px] font-bold text-[#7A3E00]">Coming soon</span>
      </div>
      <h2 className="m-0 font-source-sans text-[28px] font-extrabold">{title}</h2>
      <p className="m-0 max-w-[720px] text-[15px] leading-[1.6] text-[#475569]">{body}</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[14.5px] text-[#334155]">
            <PortalIcon name="check" size={18} className="mt-0.5 shrink-0 text-[#15803D]" />
            {p}
          </li>
        ))}
      </ul>
      <p className="m-0 text-[14px] text-[#5B6B80]">We&apos;ll let you know by email when it&apos;s ready. Until then:</p>
      <div>
        <Link
          href={now.href}
          className="inline-flex min-h-[48px] items-center rounded-[14px] bg-[#F68A0A] px-5 text-[15px] font-bold text-[#3B1D00] no-underline hover:bg-[#FF9A1F]"
        >
          {now.label}
        </Link>
      </div>
    </section>
  );
}
