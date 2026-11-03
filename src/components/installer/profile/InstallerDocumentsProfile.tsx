"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useAppSelector } from "@/lib/store/hooks";
import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Documents & profile" mock
 * (Compliance.dc.html) — the installer's compliance documents and the
 * company details EasyLink and customers see.
 *
 * Partly real. The signed-in installer carries email, name, phone and
 * address, so the four contact fields below are prefilled from the auth
 * store rather than invented — they are that person's own details, and
 * showing them is more useful and more honest than a placeholder.
 *
 * The rest has no model: no company record (legal name, ABN, trading name,
 * licence state), no compliance-document store (subcontract and RCTI
 * agreements, licence, SAA, insurances, SWMS induction), no expiry tracking
 * and no notification preferences. Those keep the mock's sample values, and
 * saving is explicit that nothing persists — this page gates whether job
 * offers keep arriving, so a Save that silently did nothing would mislead.
 */

type DocStatus = "ok" | "warn";

type ComplianceDoc = {
  name: string;
  meta: string;
  status: string;
  cta: string;
  kind: DocStatus;
};

const DOCS: ComplianceDoc[] = [
  {
    name: "Subcontract agreement",
    meta: "Signed 2 Sep 2026 · renews Sep 2027",
    status: "Signed",
    cta: "View",
    kind: "ok",
  },
  {
    name: "RCTI agreement",
    meta: "Signed 2 Sep 2026",
    status: "Signed",
    cta: "View",
    kind: "ok",
  },
  {
    name: "Electrical contractor licence (NSW)",
    meta: "Verified with NSW Fair Trading",
    status: "Current",
    cta: "View",
    kind: "ok",
  },
  {
    name: "SAA accreditation",
    meta: "2 accredited installers · checked nightly",
    status: "Current",
    cta: "View",
    kind: "ok",
  },
  {
    name: "Public liability insurance",
    meta: "$20m cover · to Mar 2027",
    status: "Current",
    cta: "Replace",
    kind: "ok",
  },
  {
    name: "Workers compensation",
    meta: "icare NSW · to Mar 2027",
    status: "Current",
    cta: "Replace",
    kind: "ok",
  },
  {
    name: "Battery SWMS induction",
    meta: "Online, ~40 minutes · due Thu 16 Oct",
    status: "Due soon",
    cta: "Start",
    kind: "warn",
  },
];

const DOC_BADGE: Record<DocStatus, { bg: string; fg: string }> = {
  ok: { bg: "#DCFCE7", fg: "#166534" },
  warn: { bg: "#FEF3C7", fg: "#92400E" },
};

const NOTIFICATIONS = [
  { key: "offers", t: "New job offers", c: "SMS + push" },
  { key: "handover", t: "Handover pack decisions", c: "Email + push" },
  { key: "payout", t: "Payout sent", c: "Email" },
];

/** Read-only fields come from ABN Lookup in the design, so they stay locked. */
const READONLY_BG = "#F8FAFC";

export function InstallerDocumentsProfile() {
  const user = useAppSelector((s) => s.installerAuth.user);

  /**
   * Contact fields start from the signed-in installer where the app knows
   * them, and fall back to the design's placeholders where it doesn't.
   */
  const initialFields = useMemo(() => {
    const contact = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      trading: "Solarman",
      contact: contact || "Emmanuel",
      mobile: user?.phone ?? "04xx xxx xxx",
      rctiEmail: user?.email ?? "[accounts email]",
      address: user?.address ?? "[address], NSW",
    };
  }, [user]);

  const [fields, setFields] = useState(initialFields);
  const [notes, setNotes] = useState<Record<string, boolean>>({
    offers: true,
    handover: true,
    payout: true,
  });
  const [notice, setNotice] = useState<string | null>(null);

  const currentCount = DOCS.filter((d) => d.kind === "ok").length;

  const set = (k: keyof typeof fields, v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    setNotice(null);
  };

  const toggleNote = (k: string) => {
    setNotes((n) => ({ ...n, [k]: !n[k] }));
    setNotice(null);
  };

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto">
          <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px] text-[#5B6B80]">
            <li>
              <Link
                href="/installers/dashboard/overview"
                prefetch={false}
                className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
              >
                Installer Account
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">Documents &amp; profile</li>
          </ol>
        </nav>
      </header>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Documents &amp; profile
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
            Same document checks EasyLink runs on distributors · one place to keep
            them current
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Preview only — no file was uploaded. This app has no compliance-document store yet, so uploading in the live portal would file the document, read its expiry date and start the reminder schedule.",
            )
          }
          className="h-11 rounded-[10px] bg-[#F68A0A] px-4.5 text-[14px] font-bold text-[#3B1D00]"
        >
          Upload document
        </button>
      </div>

      <InstallerAccountTabs active="docs" />

      {notice ? (
        <div
          role="status"
          className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5]"
          style={{ background: "#E0F2FE", color: "#0B2540" }}
        >
          {notice}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section
          aria-label="Required documents"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center gap-2">
            <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
              Required documents
            </h2>
            <span className="text-[12px] text-[#5B6B80]">
              {currentCount} of {DOCS.length} current
            </span>
          </div>
          {DOCS.map((d) => {
            const badge = DOC_BADGE[d.kind];
            return (
              <div
                key={d.name}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2.5 last:border-0"
              >
                <span className="flex grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">
                    {d.name}
                  </span>
                  <span className="text-[12px] text-[#5B6B80]">{d.meta}</span>
                </span>
                <span
                  className="rounded-full px-2.5 py-0.75 text-[12px] font-bold whitespace-nowrap"
                  style={{ background: badge.bg, color: badge.fg }}
                >
                  {d.status}
                </span>
                <span
                  title="Not built yet — there is no document store behind this"
                  className="inline-flex h-9 cursor-default items-center rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
                >
                  {d.cta}
                </span>
              </div>
            );
          })}
          <span className="text-[12px] text-[#475569]">
            We remind you 30, 14 and 3 days before anything expires. If a required
            document lapses, new offers pause until it is renewed; jobs already booked
            continue.
          </span>
        </section>

        <section
          aria-label="Company profile"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Company profile</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="f1" label="Legal name" value="Solarman Pty Ltd" readOnly />
            <Field id="f2" label="ABN" value="[ABN]" readOnly />
            <Field
              id="f3"
              label="Trading name on customer emails"
              value={fields.trading}
              onChange={(v) => set("trading", v)}
            />
            <Field
              id="f4"
              label="Main contact"
              value={fields.contact}
              onChange={(v) => set("contact", v)}
            />
            <Field
              id="f5"
              label="Mobile for job offers"
              value={fields.mobile}
              onChange={(v) => set("mobile", v)}
            />
            <Field
              id="f6"
              label="Email for RCTIs"
              value={fields.rctiEmail}
              onChange={(v) => set("rctiEmail", v)}
            />
            <Field
              id="f7"
              label="Business address"
              value={fields.address}
              onChange={(v) => set("address", v)}
            />
            <Field id="f8" label="Licence state" value="NSW" readOnly />
          </div>
          <span className="text-[12px] text-[#475569]">
            ABN and legal name come from ABN Lookup and can&apos;t be edited here. Your
            public profile (name, areas, rating) is what customers see on their install
            confirmation.
          </span>

          <h3 className="m-0 mt-1 text-[14px] font-bold text-[#0F172A]">
            Notifications
          </h3>
          {NOTIFICATIONS.map((n) => (
            <label
              key={n.key}
              className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[#EEF2F6] text-[14px] last:border-0"
            >
              <input
                type="checkbox"
                checked={notes[n.key] ?? false}
                onChange={() => toggleNote(n.key)}
                className="size-5 accent-[#F68A0A]"
              />
              <span className="grow text-[#0F172A]">{n.t}</span>
              <span className="text-[12px] text-[#5B6B80]">{n.c}</span>
            </label>
          ))}

          <button
            type="button"
            onClick={() =>
              setNotice(
                "Preview only — these details were not saved. The contact fields start from your signed-in account, but this app has no company-profile or notification-preference storage yet, so edits live in this page for the session.",
              )
            }
            className="mt-1 h-11 self-start rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
          >
            Save profile
          </button>
        </section>
      </div>
    </div>
  );
}

/** One labelled profile input; read-only fields take the design's grey fill. */
function Field({
  id,
  label,
  value,
  readOnly,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  readOnly?: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#475569]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        title={readOnly ? "Comes from ABN Lookup — not editable here" : undefined}
        className="h-11 rounded-[10px] border border-[#CBD5E1] px-3 text-[14px] text-[#0F172A]"
        style={readOnly ? { background: READONLY_BG } : undefined}
      />
    </div>
  );
}
