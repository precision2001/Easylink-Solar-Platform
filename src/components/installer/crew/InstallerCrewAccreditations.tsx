"use client";

import { useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Crew & accreditations" mock (Crew.dc.html) —
 * who can log in, who can go on site, and what each person is accredited for.
 *
 * The app has a real team-member list (AssignableUser: id, email, firstName,
 * lastName, role) behind /api/installers/users/assignable-for-leads, but
 * nothing else this page shows: no electrical licence, SAA accreditation,
 * white card, working-at-heights ticket, sign-off rights or portal-role model
 * (the real `role` is a free-form string, not the design's
 * Owner/Scheduler/Crew split), and no invite flow.
 *
 * Mixing real names into a compliance table whose other six columns would be
 * invented is the wrong trade here — this page decides who may legally sign
 * off an install, so a fabricated accreditation against a real person's name
 * is worse than an obviously sample row. The crew below is therefore the
 * mock's sample data in full, and the page says so.
 *
 * The permissions matrix is the design's own and describes intended
 * behaviour, so it is reproduced as written.
 */

type Badge = { bg: string; fg: string };

const OK: Badge = { bg: "#DCFCE7", fg: "#166534" };
const NA: Badge = { bg: "#E2E8F0", fg: "#334155" };
const PENDING: Badge = { bg: "#FEF3C7", fg: "#92400E" };

type Crew = {
  ini: string;
  name: string;
  job: string;
  role: string;
  lic: string;
  saa: string;
  wc: string;
  wah: string;
  sign: string;
  badge: Badge;
};

const CREW: Crew[] = [
  {
    ini: "E",
    name: "Emmanuel",
    job: "Director · licence holder",
    role: "Owner",
    lic: "NSW contractor [no.]",
    saa: "Install + battery",
    wc: "✓",
    wah: "✓",
    sign: "Yes",
    badge: OK,
  },
  {
    ini: "T",
    name: "Tomas",
    job: "A-grade electrician",
    role: "Scheduler",
    lic: "NSW qualified supervisor [no.]",
    saa: "Install",
    wc: "✓",
    wah: "✓",
    sign: "Solar only",
    badge: OK,
  },
  {
    ini: "A",
    name: "Aaron",
    job: "Trade assistant",
    role: "Crew (app)",
    lic: "—",
    saa: "Not required",
    wc: "✓",
    wah: "✓",
    sign: "No",
    badge: NA,
  },
  {
    ini: "J",
    name: "[New starter]",
    job: "Invited 10 Oct",
    role: "Crew (app)",
    lic: "Pending upload",
    saa: "Pending",
    wc: "Pending",
    wah: "Pending",
    sign: "No",
    badge: PENDING,
  },
];

/** Permission cell values, matching the design's colour coding. */
const Y = { t: "Yes", c: "#166534" };
const N = { t: "—", c: "#5B6B80" };
const V = { t: "View", c: "#1E40AF" };
const M = { t: "Own jobs", c: "#1E40AF" };

const PERMS: { t: string; v: { t: string; c: string }[] }[] = [
  { t: "Accept or decline job offers", v: [Y, Y, N] },
  { t: "Schedule and reassign jobs", v: [Y, Y, N] },
  { t: "See customer details", v: [Y, Y, M] },
  { t: "Complete handover packs", v: [Y, Y, M] },
  { t: "See payouts and RCTIs", v: [Y, V, N] },
  { t: "Change bank details and rates", v: [Y, N, N] },
  { t: "Upload company documents", v: [Y, Y, N] },
];

const ROLES = ["Owner", "Scheduler", "Crew (app)"];

const TH = "border-b border-[#E3E8EF] p-2 text-left font-semibold text-[#475569]";
const TD = "border-b border-[#EEF2F6] px-2 py-3 text-[#475569]";

export function InstallerCrewAccreditations() {
  const [notice, setNotice] = useState(false);

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
            <li className="font-semibold text-[#0F172A]">Crew &amp; accreditations</li>
          </ol>
        </nav>
      </header>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Crew &amp; accreditations
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
            Who can log in, who can go on site, and what each person is accredited
            for
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNotice(true)}
          className="h-11 rounded-[10px] bg-[#F68A0A] px-4.5 text-[14px] font-bold text-[#3B1D00]"
        >
          Invite crew member
        </button>
      </div>

      <InstallerAccountTabs active="crew" />

      {notice ? (
        <div
          role="status"
          className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5]"
          style={{ background: "#E0F2FE", color: "#0B2540" }}
        >
          <strong>Preview only — no invite was sent.</strong> Inviting in the live
          portal emails the person a login, sets their portal role, and asks them to
          upload their licence and tickets before their first job.
        </div>
      ) : null}

      <section
        aria-label="Crew"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={TH}>Person</th>
                <th className={TH}>Portal role</th>
                <th className={TH}>Electrical licence</th>
                <th className={TH}>SAA accreditation</th>
                <th className={TH}>White card</th>
                <th className={TH}>Heights</th>
                <th className={TH}>Can sign off</th>
              </tr>
            </thead>
            <tbody>
              {CREW.map((c) => (
                <tr key={c.name}>
                  <td className={`${TD} py-3`}>
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1B3557] text-[13px] font-bold text-white">
                        {c.ini}
                      </span>
                      <span className="flex flex-col">
                        <strong className="text-[#0F172A]">{c.name}</strong>
                        <span className="text-[12px] text-[#5B6B80]">{c.job}</span>
                      </span>
                    </span>
                  </td>
                  <td className={TD}>{c.role}</td>
                  <td className={TD}>{c.lic}</td>
                  <td className={TD}>
                    <span
                      className="rounded-full px-2 py-0.5 text-[12px] font-bold whitespace-nowrap"
                      style={{ background: c.badge.bg, color: c.badge.fg }}
                    >
                      {c.saa}
                    </span>
                  </td>
                  <td className={TD}>{c.wc}</td>
                  <td className={TD}>{c.wah}</td>
                  <td className={TD}>{c.sign}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="text-[12px] text-[#475569]">
          Accreditation numbers are checked against the SAA register each night. A
          lapsed accreditation removes that person from battery and solar sign-off
          straight away.
        </span>
      </section>

      <section
        aria-label="Roles"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
          What each portal role can do
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[700px] overflow-hidden rounded-[10px] border border-[#E3E8EF]">
            <div className="grid grid-cols-[260px_repeat(3,minmax(130px,1fr))]">
              <span className="bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#475569]">
                Permission
              </span>
              {ROLES.map((r) => (
                <span
                  key={r}
                  className="border-l border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-bold text-[#0F172A]"
                >
                  {r}
                </span>
              ))}
              {PERMS.map((p) => (
                <PermRow key={p.t} label={p.t} values={p.v} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** One permission row: the label plus its three role cells. */
function PermRow({
  label,
  values,
}: {
  label: string;
  values: { t: string; c: string }[];
}) {
  return (
    <>
      <span className="border-t border-[#EEF2F6] px-3 py-2.5 text-[13px] text-[#0F172A]">
        {label}
      </span>
      {values.map((v, i) => (
        <span
          key={ROLES[i]}
          className="border-t border-l border-[#EEF2F6] px-3 py-2.5 text-[13px] font-semibold"
          style={{ color: v.c }}
        >
          {v.t}
        </span>
      ))}
    </>
  );
}
