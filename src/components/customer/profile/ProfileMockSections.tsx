"use client";

import { useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import {
  formatReferralCurrency,
  socialShareUrl,
  type ReferralOverview,
} from "@/lib/customers/referrals";

/**
 * The sections the Easylink Designer "Profile and referrals" mock
 * (CustProfile.dc.html) adds: the account card, the notification and data
 * preferences, and the referral pair.
 *
 * The referral half is entirely real — `fetchReferralOverview` already returns
 * the code, the reward and the three counts the mock shows, and the share
 * links are built by `socialShareUrl`. Nothing there is invented.
 *
 * Preferences are the opposite. There is no notification-preference model:
 * nothing stores whether a customer wants SMS alerts, and more seriously
 * nothing stores consent for sharing live inverter data or joining the VPP.
 * Toggles that looked saved would be the worst kind of placeholder on this
 * page — a customer could believe they had withdrawn consent for their
 * battery to be traded. So the switches move, and the panel says plainly that
 * the choice is not recorded yet and how to actually make the request.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const NAVY = "#0B1A2E";
const NAVY_2 = "#13263F";
const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const GOLD = "#FFB547";
const GREEN = "#166534";
const GREEN_SOFT = "#DCFCE7";

/**
 * The preference rows from the design. The last three carry real consequences
 * (who contacts you, whether your inverter is read, whether your battery is
 * traded), which is why none of them pretend to save.
 */
const PREFERENCES = [
  { label: "Email notifications", on: true },
  { label: "SMS alerts", on: true },
  { label: "Project updates", on: true },
  { label: "Marketing emails", on: false },
  { label: "Product alerts", on: false },
  { label: "AI assistant follow-ups about my quote", on: true },
  { label: "Share live inverter data for monitoring", on: true },
  { label: "Virtual power plant (VPP) trading", on: true },
];

export function ProfileAccountCard({
  created,
  installerName,
}: {
  created: string | null;
  installerName: string | null;
}) {
  return (
    <section
      aria-label="Account"
      className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <h2 className="m-0 text-[16px] font-bold">Account</h2>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px]">
        <dt style={{ color: MUTED }}>Created</dt>
        <dd className="m-0 font-semibold">{created ?? "—"}</dd>
        <dt style={{ color: MUTED }}>Status</dt>
        <dd className="m-0">
          <span
            className="rounded-full px-2 py-0.5 text-[12px] font-bold"
            style={{ background: GREEN_SOFT, color: GREEN }}
          >
            Active
          </span>
        </dd>
      </dl>

      <div
        className="flex items-center gap-2.5 pt-2.5"
        style={{ borderTop: `1px solid ${RULE}` }}
      >
        <span
          className="flex size-9 items-center justify-center rounded-full font-bold"
          style={{ background: SUN, color: SUN_INK }}
        >
          {installerName?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="flex flex-col">
          <strong className="text-[14px]">
            {installerName ?? "Your installer"}
            {installerName ? " · your installer" : ""}
          </strong>
          <span className="text-[12px]" style={{ color: MUTED }}>
            {installerName
              ? "Assigned to your project"
              : "Matched once your job is booked"}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 items-center justify-center rounded-full font-bold text-white"
          style={{ background: NAVY }}
        >
          E
        </span>
        <span className="flex flex-col">
          <strong className="text-[14px]">EasyLink Solar · platform</strong>
          <span className="text-[12px]" style={{ color: MUTED }}>
            Designs, rebates and support
          </span>
        </span>
      </div>
    </section>
  );
}

export function ProfilePreferences({ documentCount }: { documentCount: number }) {
  const [on, setOn] = useState<boolean[]>(PREFERENCES.map((p) => p.on));

  return (
    <section
      aria-label="Preferences"
      className="flex flex-col gap-1 rounded-[14px] bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <h2 className="m-0 grow text-[16px] font-bold">Preferences</h2>
        <span
          title="No preference or consent model exists in this app yet — these switches are not saved"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[11px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Not saved yet
        </span>
      </div>

      {PREFERENCES.map((p, i) => (
        <label
          key={p.label}
          className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px]"
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          <span className="grow">{p.label}</span>
          <input
            type="checkbox"
            role="switch"
            checked={on[i]}
            onChange={() => setOn((prev) => prev.map((v, j) => (j === i ? !v : v)))}
            className="size-5.5 accent-[#166534]"
          />
        </label>
      ))}

      <div
        className="mt-2.5 flex flex-col gap-2 rounded-[14px] px-3.5 py-3 text-[13px]"
        style={{ background: "#EEF7FE", border: "1px solid #9CCFF3" }}
      >
        <strong className="text-[14px]">AI and your data</strong>
        <span>
          Turning off AI follow-ups would mean only a person contacts you.
          Turning off data sharing would stop monitoring, drone alerts and the
          VPP.
        </span>
        <span style={{ color: SLATE }}>
          These switches aren&rsquo;t connected yet — nothing records the choice.
          To change how EasyLink contacts you or uses your data today, message
          the team and it is actioned by a person.
        </span>
        <span className="flex flex-wrap gap-3 font-semibold">
          <Link
            href="/customers/messages"
            prefetch={false}
            className="text-[#1565C0]"
          >
            Ask why something happened
          </Link>
          <Link
            href="/customers/messages"
            prefetch={false}
            className="text-[#1565C0]"
          >
            Change my preferences
          </Link>
        </span>
      </div>

      <h3
        className="mt-3 mb-1 text-[13px] font-bold"
        style={{ color: SLATE }}
      >
        Documents shared with you
      </h3>
      <Link
        href="/customers/project"
        prefetch={false}
        className="text-[13px] font-semibold text-[#1565C0]"
      >
        {documentCount} document{documentCount === 1 ? "" : "s"} · see My project
      </Link>
    </section>
  );
}

/**
 * The referral pair from the design, driven by the real referral overview.
 *
 * `shareUrl` is the link minted for the customer's own design; when there is
 * no design yet there is nothing to share, so the share card explains that
 * rather than offering a broken link.
 */
export function ProfileReferrals({
  overview,
  loading,
  shareUrl,
}: {
  overview: ReferralOverview | null;
  loading: boolean;
  shareUrl: string | null;
}) {
  const [copied, setCopied] = useState<"link" | "invite" | null>(null);

  const copy = async (text: string, which: "link" | "invite") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; the link is selectable in the field either way.
    }
  };

  const message = `I'm going solar with EasyLink — use my code for a head start.`;

  const stats = [
    { label: "Invites sent", value: overview ? String(overview.sent) : "—" },
    { label: "Went solar", value: overview ? String(overview.converted) : "—" },
    {
      label: "Earned",
      value: overview ? formatReferralCurrency(overview.earned) : "—",
    },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <section
        aria-label="Referral program"
        className="flex flex-col gap-3 rounded-[14px] p-[18px] text-white"
        style={{ background: NAVY }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 grow text-[16px] font-bold">Refer a friend</h2>
          {overview ? (
            <span className="text-[12px]" style={{ color: "#9FB0C8" }}>
              Your code{" "}
              <strong style={{ color: GOLD }}>{overview.referralCode}</strong>
            </span>
          ) : null}
        </div>

        <div
          className="rounded-xl p-4 text-center"
          style={{ background: NAVY_2 }}
        >
          <span
            className="font-source-sans text-[34px] font-bold"
            style={{ color: GOLD }}
          >
            {overview ? formatReferralCurrency(overview.rewardAmount) : "—"}
          </span>
          <br />
          <span className="text-[13px]" style={{ color: "#C3CFDF" }}>
            credit for every friend who goes solar
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-0.5 rounded-[10px] p-3 text-center"
              style={{ background: NAVY_2 }}
            >
              <strong className="text-[22px]">{loading ? "…" : s.value}</strong>
              <span
                className="text-[11px] tracking-[0.06em] uppercase"
                style={{ color: "#9FB0C8" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <span className="text-[12px]" style={{ color: "#C3CFDF" }}>
          Credit is applied once your friend pays their deposit. Friends are
          matched with an SAA-accredited installer near them.
        </span>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/customers/design#share"
            prefetch={false}
            className="flex h-11 flex-1 items-center justify-center rounded-[10px] text-[14px] font-bold no-underline"
            style={{ background: SUN, color: SUN_INK }}
          >
            Refer a friend
          </Link>
          {shareUrl ? (
            <button
              type="button"
              onClick={() => void copy(shareUrl, "invite")}
              className="h-11 rounded-[10px] px-3.5 text-[13px] font-semibold text-white"
              style={{ border: `1px solid #2A4466`, background: "transparent" }}
            >
              {copied === "invite" ? "Copied" : "Copy invite"}
            </button>
          ) : null}
        </div>
      </section>

      <section
        aria-label="Share your solar journey"
        className="flex flex-col gap-3 rounded-[14px] bg-white p-[18px]"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <h2 className="m-0 text-[16px] font-bold">Share your solar journey</h2>
        <span className="text-[13px]" style={{ color: SLATE }}>
          Tell friends and family about your upgrade. Your link carries your
          referral code.
        </span>

        {shareUrl ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["facebook", "Facebook"],
                  ["twitter", "X"],
                  ["linkedin", "LinkedIn"],
                  ["email", "Email"],
                ] as const
              ).map(([network, label]) => (
                <a
                  key={network}
                  href={socialShareUrl(network, shareUrl, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center justify-center rounded-[10px] bg-white text-[13px] font-semibold no-underline"
                  style={{ border: `1px solid #CBD5E1`, color: INK }}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <label htmlFor="share-link" className="sr-only">
                Your share link
              </label>
              <input
                id="share-link"
                readOnly
                value={shareUrl}
                className="h-11 min-w-0 flex-1 rounded-[10px] px-3 text-[13px]"
                style={{ border: `1px solid #CBD5E1`, background: "#F8FAFC" }}
              />
              <button
                type="button"
                onClick={() => void copy(shareUrl, "link")}
                className="h-11 rounded-[10px] px-3.5 text-[13px] font-semibold text-white"
                style={{ background: NAVY }}
              >
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
          </>
        ) : (
          <p
            className="m-0 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[13px]"
            style={{ background: "#F4F6FA", color: SLATE }}
          >
            <PortalIcon name="design" size={16} className="mt-0.5 shrink-0" />
            Your share link is created from your design, so it appears once
            you&rsquo;ve saved one.{" "}
            <Link href="/designs" prefetch={false} className="font-semibold text-[#1565C0]">
              Design my system
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
