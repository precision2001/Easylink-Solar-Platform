"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";
import { MasterAiSuggestCard } from "@/components/master-dashboard/MasterAiSuggestCard";

/**
 * Matches the Easylink Designer "Handover pack" mock (Handover.dc.html) —
 * the installer's side of the pack whose reviewer side is
 * MasterHandoverReview.
 *
 * This app has no handover-pack model: no install photos, CCEW/CoC uploads,
 * commissioning test results, serial scanning or RCTI payout runs. So the
 * pack here is the mock's sample data, deliberately kept reconciled with the
 * admin page — same JOB-3112 Parramatta, same $3,420 payout, same blockers
 * (CCEW missing, photos incomplete) — so the two screens tell one story.
 *
 * The photo tiles are the mock's own logic ported rather than faked: tapping
 * a tile toggles it, and the counts, the progress bar and the submit button's
 * blocked state all recompute from it. Submitting is a preview — nothing is
 * uploaded or sent for review, and the panel says so.
 */

type PhotoState = Record<number, boolean>;

const PHOTO_NAMES = [
  "Roof before install",
  "Array — full view",
  "Array — racking & fixings",
  "Roof isolator / DC cabling",
  "Inverter installed",
  "Battery & clearances",
  "Switchboard — open",
  "Switchboard — labelled",
  "Meter",
  "Signage & shutdown procedure",
  "Inverter display — generating",
  "Customer app — online",
];

/** The mock starts these four missing; the rest are uploaded. */
const INITIALLY_MISSING = [7, 9, 10, 11];

type Cert = {
  t: string;
  d: string;
  s: string;
  cta: string;
  bg: string;
  fg: string;
};

const OK = { bg: "#DCFCE7", fg: "#166534" };
const MISS = { bg: "#FEE2E2", fg: "#991B1B" };
const PEND = { bg: "#FEF3C7", fg: "#92400E" };

const CERTS: Cert[] = [
  {
    t: "Certificate of Compliance – Electrical Work (CCEW)",
    d: "NSW Fair Trading · upload the lodged copy",
    s: "Missing",
    cta: "Upload",
    ...MISS,
  },
  {
    t: "STC assignment form",
    d: "Customer e-signed in their portal 9 Oct · solar and battery STCs",
    s: "Signed",
    cta: "View",
    ...OK,
  },
  {
    t: "SAA installer declaration",
    d: "Signed by accredited installer on site",
    s: "Signed",
    cta: "View",
    ...OK,
  },
  {
    t: "Network notice of completion",
    d: "Endeavour Energy · submitted by EasyLink after approval",
    s: "After review",
    cta: "Details",
    ...PEND,
  },
  {
    t: "Customer handover sign-off",
    d: "Walkthrough, warranties and manuals emailed",
    s: "Signed",
    cta: "View",
    ...OK,
  },
];

const SERIALS = [
  { t: "Panels", n: "20 of 20 scanned" },
  { t: "Inverter", n: "1 of 1 · [serial]" },
  { t: "Battery", n: "1 of 1 · [serial]" },
];

const TESTS = [
  { id: "t1", l: "Insulation resistance (MΩ)", v: "[value]" },
  { id: "t2", l: "Earth continuity (Ω)", v: "[value]" },
  { id: "t3", l: "String 1 Voc (V)", v: "[value]" },
  { id: "t4", l: "String 2 Voc (V)", v: "[value]" },
  { id: "t5", l: "Polarity checked", v: "Yes" },
  { id: "t6", l: "Export limit set (kW)", v: "[per DNSP]" },
  { id: "t7", l: "Backup changeover tested", v: "Yes" },
  { id: "t8", l: "Anti-islanding confirmed", v: "Yes" },
];

export function InstallerHandoverPack() {
  const [got, setGot] = useState<PhotoState>(() =>
    Object.fromEntries(INITIALLY_MISSING.map((i) => [i, false])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const photos = useMemo(
    () =>
      PHOTO_NAMES.map((t, i) => ({
        i,
        t,
        missing: got[i] === false,
      })),
    [got],
  );

  const missingPhotos = photos.filter((p) => p.missing).length;
  /** Certificates count toward the pack total; the CCEW is the one missing. */
  const total = photos.length + CERTS.length;
  const doneCount = total - missingPhotos - 1;
  const pct = Math.round((doneCount / total) * 100);
  const blocked = missingPhotos > 0;

  const toggle = (i: number) =>
    setGot((s) => ({ ...s, [i]: !(s[i] !== false) }));

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
            <li>Handover packs</li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">JOB-3112</li>
          </ol>
        </nav>
        <span className="text-[13px] text-[#475569]">
          Works offline on site · syncs when back in signal
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Handover pack · JOB-3112 Parramatta
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
            8 kW + 10 kWh · installed Thu 9 Oct · payout $3,420 ex GST on hold until
            approved
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1.5 text-[13px] font-bold"
          style={
            blocked
              ? { background: "#FEE2E2", color: "#991B1B" }
              : { background: "#DCFCE7", color: "#166534" }
          }
        >
          {doneCount} of {total} items complete
        </span>
      </div>

      <InstallerAccountTabs active="handover" />

      <div
        role="progressbar"
        aria-label="Pack completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]"
      >
        <span className="block h-full bg-[#F68A0A]" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <MasterAiSuggestCard
          agent="Delivery"
          mode="approve"
          title="2 photos need a retake before you submit"
          why="The switchboard photo is blurred so the RCD rating can't be read, and the battery label photo doesn't show the serial. Everything else matches the design. Fixing these now avoids a rejected pack and a late payout."
          evidence="your uploaded photos, design DES-20417"
          rule="Checks only: you decide what to submit"
          primary="Show me which"
          dec="DEC-918528"
          decisionsHref="/installers/dashboard/ai-assistant"
        />

        <section
          aria-label="Required photos"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
              Required photos
            </h2>
            <span className="text-[12px] text-[#5B6B80]">
              Geotagged and time-stamped
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {photos.map((p) => (
              <button
                key={p.t}
                type="button"
                onClick={() => toggle(p.i)}
                aria-pressed={!p.missing}
                className="flex min-h-23 flex-col gap-1.5 rounded-[10px] p-2.5 text-left"
                style={
                  p.missing
                    ? {
                        background: "#FFFBEB",
                        border: "1px dashed #B45309",
                      }
                    : {
                        background: "#F0FDF4",
                        border: "1px solid #86EFAC",
                      }
                }
              >
                <span
                  className="text-[12px] font-bold"
                  style={{ color: p.missing ? "#92400E" : "#166534" }}
                >
                  {p.missing ? "Missing" : "Uploaded ✓"}
                </span>
                <span className="text-[13px] font-semibold text-[#0F172A]">{p.t}</span>
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[#475569]">
            Tap a missing tile to take or upload the photo. Tiles here are the CER and
            SAA minimum set plus EasyLink&apos;s own.
          </span>
        </section>

        <div className="flex flex-col gap-4">
          <section
            aria-label="Certificates"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
              Certificates &amp; forms
            </h2>
            {CERTS.map((c) => (
              <div
                key={c.t}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2.5 last:border-0"
              >
                <span className="flex grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">{c.t}</span>
                  <span className="text-[12px] text-[#5B6B80]">{c.d}</span>
                </span>
                <span
                  className="rounded-full px-2.5 py-0.75 text-[12px] font-bold whitespace-nowrap"
                  style={{ background: c.bg, color: c.fg }}
                >
                  {c.s}
                </span>
                <span
                  title="Not built yet"
                  className="inline-flex h-9 cursor-default items-center rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
                >
                  {c.cta}
                </span>
              </div>
            ))}
          </section>

          <section
            aria-label="Serial numbers"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Serial numbers</h2>
            {SERIALS.map((s) => (
              <div
                key={s.t}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0"
              >
                <span className="grow font-semibold text-[#0F172A]">{s.t}</span>
                <span className="text-[#475569]">{s.n}</span>
                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[12px] font-bold whitespace-nowrap text-[#166534]">
                  Matched to order
                </span>
              </div>
            ))}
            <span className="text-[12px] text-[#475569]">
              Scanned in the app and checked against SO-48102 and the CEC approved
              product list.
            </span>
          </section>
        </div>
      </div>

      <section
        aria-label="Testing and commissioning"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
          Testing &amp; commissioning
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TESTS.map((t) => (
            <div key={t.id} className="flex flex-col gap-1">
              <label
                htmlFor={t.id}
                className="text-[12px] font-semibold text-[#475569]"
              >
                {t.l}
              </label>
              <input
                id={t.id}
                defaultValue={t.v}
                className="h-10 rounded-[10px] border border-[#CBD5E1] px-2.5 text-[13px] text-[#0F172A]"
              />
            </div>
          ))}
        </div>
      </section>

      {submitted || saved ? (
        <div
          role="status"
          className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5]"
          style={{ background: "#E0F2FE", color: "#0B2540" }}
        >
          {saved ? (
            <>
              <strong>Preview only — nothing was saved.</strong> This app has no
              handover-pack storage yet, so the tiles and test values you changed live
              in this page for the session.
            </>
          ) : (
            <>
              <strong>Preview only — the pack was not submitted.</strong> Submitting in
              the live portal sends JOB-3112 to EasyLink for review, and the $3,420
              payout joins the next Friday RCTI once approved.
            </>
          )}
        </div>
      ) : null}

      <section
        aria-label="Submit"
        className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <span className="min-w-65 grow text-[13px] text-[#334155]">
          EasyLink reviews packs within 1 business day. Approved packs are added to the
          next Friday RCTI and the STCs are lodged for you.
        </span>
        <button
          type="button"
          onClick={() => {
            setSaved(true);
            setSubmitted(false);
          }}
          className="h-11 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
        >
          Save draft
        </button>
        <button
          type="button"
          aria-disabled={blocked}
          onClick={() => {
            if (blocked) return;
            setSubmitted(true);
            setSaved(false);
          }}
          className="h-11 rounded-[10px] px-5 text-[14px] font-bold"
          style={
            blocked
              ? { background: "#E2E8F0", color: "#475569" }
              : { background: "#F68A0A", color: "#3B1D00" }
          }
        >
          {blocked
            ? `Submit · ${missingPhotos} photos + CCEW missing`
            : "Submit pack (CCEW to follow)"}
        </button>
      </section>
    </div>
  );
}
