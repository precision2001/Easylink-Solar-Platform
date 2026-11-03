"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Membership & plan" mock (InstPlan.dc.html) —
 * the three installer tiers, what each one unlocks, and this month's
 * Communication usage.
 *
 * This app has no subscription model: nothing stores which tier an installer
 * is on, there is no billing or renewal date, and no metering for call
 * minutes, SMS, agent minutes or seats. So the tiers, the usage bars and the
 * renewal line are the mock's sample data, and changing plan is not offered as
 * a button that would appear to charge money.
 *
 * The tier preview is the mock's own logic ported across: picking Starter,
 * Professional or Elite re-renders the Communication menu beside it as that
 * tier would see it, which is the whole point of the control.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const GOLD = "#FFB547";
const NAVY = "#0B1A2E";
const NAVY_2 = "#13263F";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const BORDER_2 = "#CBD5E1";
const GREY = "#94A3B8";

/** A feature line: included, or dimmed when the tier lacks it. */
type Feature = { text: string; included: boolean };

const yes = (text: string): Feature => ({ text, included: true });
const no = (text: string): Feature => ({ text, included: false });

type Tier = {
  name: string;
  blurb: string;
  features: Feature[];
  cta: string;
  current: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    blurb: "For installers taking EasyLink jobs",
    features: [
      yes("Job offers, My jobs, handover packs"),
      yes("Payouts, RCTIs, documents"),
      yes("Sales dashboard · EasyLink jobs"),
      no("Customers, pipeline, project workflow"),
      no("Equipment ordering, reports"),
      no("Communication module"),
    ],
    cta: "Downgrade",
    current: false,
  },
  {
    name: "Professional",
    blurb: "Run your own customers as well",
    features: [
      yes("Everything in Starter"),
      yes("Customers, pipeline, project workflow"),
      yes("Customer portal for your customers"),
      yes("Equipment ordering, reports"),
      yes("Full sales dashboard"),
      no("Communication module"),
    ],
    cta: "Downgrade",
    current: false,
  },
  {
    name: "Elite",
    blurb: "Top level · a full contact centre",
    features: [
      yes("Everything in Professional"),
      yes("Contact Centre and agent dialer"),
      yes("Inbox · SMS, WhatsApp, web chat, portal, calls"),
      yes("Campaigns and contact lists"),
      yes("AI receptionist and reminder agents"),
      yes("2 phone numbers · 3 agent seats"),
    ],
    cta: "Current plan",
    current: true,
  },
];

/** The Communication group, as each tier sees it. Only Elite unlocks it. */
const COMM_ITEMS: { label: string; href: string; icon: string }[] = [
  {
    label: "Contact Centre",
    href: "/installers/dashboard/contact-centre",
    icon: "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3ZM21 16v2a4 4 0 0 1-4 4h-5",
  },
  {
    label: "Inbox · all channels",
    href: "/installers/dashboard/inbox",
    icon: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
  },
  {
    label: "Campaigns & lists",
    href: "/installers/dashboard/campaigns",
    icon: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6",
  },
  {
    label: "AI agents & numbers",
    href: "/installers/dashboard/ai-agents",
    icon: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3",
  },
];

const LOCK =
  "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4";

/** Metered per month on Elite; nothing in this app measures it yet. */
const USAGE = [
  { label: "Call minutes (people)", value: "1,840 of 3,000", pct: 61 },
  { label: "AI agent minutes", value: "620 of 1,000", pct: 62 },
  { label: "SMS sent", value: "410 of 1,000", pct: 41 },
  { label: "Agent seats", value: "2 of 3", pct: 67 },
  { label: "Phone numbers", value: "2 of 2", pct: 100 },
];

export function InstallerMembershipPlan() {
  /** Which tier the Communication preview is showing. Elite is the real one. */
  const [preview, setPreview] = useState(2);
  const elite = preview === 2;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA]" style={{ color: INK }}>
      <header
        className="flex flex-wrap items-center gap-3 bg-white px-7 py-3.5"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <nav aria-label="Breadcrumb" className="grow text-[13px]" style={{ color: MUTED }}>
          <Link
            href="/installers/dashboard/overview"
            prefetch={false}
            className="no-underline hover:text-[#0F172A]"
            style={{ color: MUTED }}
          >
            Installer Account
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold" style={{ color: INK }}>
            Membership &amp; plan
          </span>
        </nav>
        <span
          title="Plans, billing and usage on this page are sample data — this app has no subscription model yet"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-7 pt-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Membership &amp; plan
            </h1>
            <p className="mt-1 mb-0 text-[13px]" style={{ color: MUTED }}>
              Solarman is on <strong>Elite</strong> · renews 1 Nov 2026 · billed
              monthly, ex GST
            </p>
          </div>
          <div
            role="group"
            aria-label="Preview the Communication menu as"
            className="flex gap-1 rounded-[10px] bg-white p-1"
            style={{ border: `1px solid ${BORDER}` }}
          >
            {TIERS.map((t, i) => {
              const on = i === preview;
              return (
                <button
                  key={t.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPreview(i)}
                  className="h-9 rounded-lg px-3 text-[13px] font-semibold"
                  style={{
                    background: on ? NAVY : "transparent",
                    color: on ? "#FFFFFF" : SLATE,
                  }}
                >
                  Preview {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <section
              key={t.name}
              aria-label={t.name}
              className="flex flex-col gap-2.5 rounded-2xl bg-white p-[18px]"
              style={{ border: `2px solid ${t.current ? SUN : BORDER}` }}
            >
              <div className="flex items-center gap-2">
                <h2 className="m-0 grow font-source-sans text-[22px] font-bold">
                  {t.name}
                </h2>
                {t.current ? (
                  <span
                    className="rounded-full px-2 py-0.75 text-[11px] font-bold"
                    style={{ background: GOLD, color: SUN_INK }}
                  >
                    Your plan
                  </span>
                ) : null}
              </div>
              <span className="text-[13px]" style={{ color: SLATE }}>
                {t.blurb}
              </span>
              {/* No price list exists in this app, so the mock's placeholder stands. */}
              <strong className="text-[20px]">$[X] / month</strong>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
                {t.features.map((f) => (
                  <li
                    key={f.text}
                    className="flex gap-2"
                    style={{ color: f.included ? INK : GREY }}
                  >
                    <span aria-hidden className="font-bold">
                      {f.included ? "✓" : "–"}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              <span className="grow" />
              <span
                title={
                  t.current
                    ? "This is your current plan"
                    : "Changing plan isn't built yet — there is no billing behind this page"
                }
                className="flex h-11 cursor-help items-center justify-center rounded-[10px] text-[14px] font-bold"
                style={{
                  border: `1px solid ${BORDER_2}`,
                  background: t.current ? "#F1F5F9" : "#FFFFFF",
                  color: t.current ? SLATE : INK,
                }}
              >
                {t.cta}
              </span>
            </section>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <section
            aria-label="Communication menu preview"
            className="flex flex-col gap-2 rounded-[14px] p-[18px]"
            style={{ background: NAVY, color: "#E6EDF7" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="grow text-[11px] font-semibold tracking-[0.08em] uppercase"
                style={{ color: "#8FA1BA" }}
              >
                Communication · as {TIERS[preview]!.name} sees it
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em]"
                style={{
                  background: elite ? GOLD : "#2A4466",
                  color: elite ? SUN_INK : "#E6EDF7",
                }}
              >
                {elite ? "ELITE" : "UPGRADE"}
              </span>
            </div>

            {COMM_ITEMS.map((item) => {
              const row = (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ color: elite ? "#8FA1BA" : MUTED }}
                  >
                    <path d={elite ? item.icon : LOCK} />
                  </svg>
                  <span className="grow">{item.label}</span>
                </>
              );
              const cls =
                "flex min-h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] no-underline";

              /* On Elite the row is the live menu item; on the lower tiers it
                 is a locked preview, so it does not navigate. */
              return elite ? (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  className={cls}
                  style={{ color: "#C3CFDF" }}
                >
                  {row}
                </Link>
              ) : (
                <div
                  key={item.label}
                  aria-disabled="true"
                  className={cls}
                  style={{ color: "#8FA1BA" }}
                >
                  {row}
                </div>
              );
            })}

            {!elite ? (
              <p
                className="mt-1.5 mb-0 rounded-[10px] p-3 text-[13px]"
                style={{ background: NAVY_2, color: "#C3CFDF" }}
              >
                Locked items open this page. Upgrading to Elite turns them on
                straight away, with your existing customers, messages and numbers
                already in place.
              </p>
            ) : null}
          </section>

          <section
            aria-label="Communication usage"
            className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[18px]"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <h2 className="m-0 text-[16px] font-bold">Elite usage this month</h2>
            {USAGE.map((u) => (
              <div key={u.label} className="flex flex-col gap-1">
                <div className="flex text-[13px]">
                  <span className="grow">{u.label}</span>
                  <strong>{u.value}</strong>
                </div>
                <span className="block h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${u.pct}%`, background: "#1976D2" }}
                  />
                </span>
              </div>
            ))}
            <span className="text-[12px]" style={{ color: SLATE }}>
              Calls and SMS run on Voxa, the same platform as the EasyLink Operations
              contact centre. Extra use is billed at cost on your next invoice.
            </span>
            <span className="text-[12px]" style={{ color: SLATE }}>
              These figures are sample data — nothing meters your usage yet.
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
    </div>
  );
}
