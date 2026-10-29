"use client";

import { useState } from "react";
import Link from "next/link";
import { MasterAiSuggestCard } from "@/components/master-dashboard/MasterAiSuggestCard";

/**
 * Matches the Easylink Designer "Installer · AI assistant" mock exactly
 * (InstApprovals.dc.html) — figures, names, copy and structure. The agent
 * run log, the approval queue and the per-installer AI permissions have no
 * backing data model in this app yet, so this is sample data throughout,
 * same convention as the installer sales dashboard. The suggestion cards'
 * approve/edit/reject flow and the unlocked permission switches are real
 * client-side state, just operating on that sample data.
 *
 * The suggestion card itself is shared with the admin portal
 * (MasterAiSuggestCard, a port of AISuggest.dc.html); only the decision-log
 * link differs per portal.
 */

const DECISIONS_HREF = "/installers/dashboard/ai-assistant";

const KPIS = [
  { l: "Waiting for you", v: "3", s: "1 expires in 2 h" },
  { l: "Done for you", v: "27", s: "this week" },
  { l: "Paperwork time saved", v: "≈ 6 h", s: "STC and network forms" },
  { l: "Handover packs passing first time", v: "92%", s: "up from 71%" },
] as const;

const SUGGESTIONS = [
  {
    agent: "Delivery",
    title: "Sign the Certificate of Compliance for Karen Whitfield, Castle Hill",
    why: "All 31 photos and 24 panel serials match the design, and the STC claim is drafted. Only a licensed electrician can sign the CoC: Emmanuel or Tomas.",
    evidence: "handover photos, serial scan, design DES-20417",
    rule: "POL-SIGN-01 · licensed sign-off stays human",
    primary: "Open the CoC to sign",
    dec: "DEC-918501",
  },
  {
    agent: "Matching",
    title: "Accept job offer JO-2207 · Ryde · 6.6 kW + 10 kWh",
    why: "It's in your Hills District area, Tuesday is open on your calendar and your crew holds the battery endorsement. The offer expires in 2 h 14 m.",
    evidence: "your service areas, calendar, crew accreditations",
    rule: "Installer decides: offers are never accepted for you",
    primary: "Accept the job",
    dec: "DEC-918503",
  },
  {
    agent: "Sales",
    title: "Send Karen a welcome-pack reminder before install day",
    why: "She signed on Tuesday and hasn't opened the welcome pack, which explains roof access and the switchboard check. A short reminder with the install date cuts day-of delays.",
    evidence: "proposal status, messages",
    rule: "Your Ready Deals contact limits",
    primary: "Send reminder",
    dec: "DEC-918505",
  },
] as const;

const DONE = [
  { t: "Today 8:10", a: "Delivery", d: "Checked 31 photos and 24 serials for Karen Whitfield against the design. All match." },
  { t: "Today 7:45", a: "Delivery", d: "Drafted the solar and battery STC claims for JOB-5521." },
  { t: "Yesterday", a: "Concierge", d: "Confirmed Tuesday's install with Michael Ross by SMS and moved it to 8 am at his request." },
  { t: "Yesterday", a: "Delivery", d: "Lodged the Endeavour Energy pre-approval for JOB-5530 after Ops approved it." },
  { t: "14 Oct", a: "Care", d: "Found an isolation fault at Kellyville and opened a warranty claim with the fault log." },
  { t: "13 Oct", a: "Finance", d: "Matched RCTI-0912 to three completed jobs. Payout on Friday." },
] as const;

const PREFS = [
  { t: "Confirm and reschedule installs with customers", d: "By SMS, inside calling hours", on: true, locked: false },
  { t: "Check handover photos and serials", d: "Flags anything missing before you submit", on: true, locked: false },
  { t: "Draft STC claims and network applications", d: "You or EasyLink Ops approves before lodging", on: true, locked: false },
  { t: "Accept job offers for me", d: "Always your decision", on: false, locked: true },
  { t: "Sign compliance certificates", d: "Only a licensed electrician can sign", on: false, locked: true },
] as const;

export function InstallerAiAssistant() {
  const [prefs, setPrefs] = useState<boolean[]>(() => PREFS.map((p) => p.on));

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <Link href="/installers/dashboard/home" className="text-[#5B6B80]">
            Home
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">AI assistant</span>
        </nav>
        <span
          title="Not built yet"
          className="cursor-default text-[13px] font-semibold text-[#1565C0]"
        >
          Your Voxa agents
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            3 things need your OK; 27 were done for you this week
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            EasyLink&apos;s AI prepares paperwork, checks photos and keeps your customers updated.
            Anything that commits you, or needs a licence holder, waits for you here.
          </p>
        </div>

        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          {KPIS.map((k) => (
            <div
              key={k.l}
              className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white px-4 py-3.5"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
              <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">{k.v}</span>
              <span className="text-[12px] text-[#475569]">{k.s}</span>
            </div>
          ))}
        </div>

        <section aria-label="Needs your OK" className="flex flex-col gap-3">
          <h2 className="m-0 text-[18px] font-bold text-[#0F172A]">Needs your OK</h2>
          {SUGGESTIONS.map((s) => (
            <MasterAiSuggestCard
              key={s.dec}
              agent={s.agent}
              title={s.title}
              why={s.why}
              evidence={s.evidence}
              rule={s.rule}
              primary={s.primary}
              dec={s.dec}
              decisionsHref={DECISIONS_HREF}
            />
          ))}
        </section>

        <section
          aria-label="Done for you"
          className="flex flex-col gap-1.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 mb-1 text-[16px] font-bold text-[#0F172A]">Done for you this week</h2>
          {DONE.map((d) => (
            <div
              key={d.d}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#EEF2F6] py-2.5 text-[13px] last:border-0"
            >
              <span className="w-[92px] text-[#5B6B80]">{d.t}</span>
              <span className="rounded-full border border-[#9CCFF3] bg-[#EEF7FE] px-2 py-0.5 text-[11px] font-bold text-[#0B2540]">
                {d.a}
              </span>
              <span className="flex-[1_1_320px]">{d.d}</span>
              <span
                title="Not built yet"
                className="cursor-default text-[12px] font-semibold text-[#1565C0]"
              >
                Why?
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="Your settings"
          className="flex flex-col gap-1.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 mb-1 text-[16px] font-bold text-[#0F172A]">
            What the AI may do on your jobs
          </h2>
          {PREFS.map((p, i) => (
            <label
              key={p.t}
              className={`flex min-h-12 items-center gap-3 border-b border-[#EEF2F6] last:border-0 ${
                p.locked ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span className="flex flex-grow flex-col">
                <span className="text-[14px] font-semibold text-[#0F172A]">{p.t}</span>
                <span className="text-[12px] text-[#5B6B80]">{p.d}</span>
              </span>
              <input
                type="checkbox"
                checked={prefs[i]}
                disabled={p.locked}
                onChange={(e) =>
                  setPrefs((cur) => cur.map((v, j) => (j === i ? e.target.checked : v)))
                }
                className="size-[22px] accent-[#166534]"
              />
            </label>
          ))}
          <span className="text-[12px] text-[#475569]">
            Greyed-out items are set by EasyLink for every installer: calling hours, licensed
            sign-off and offer acceptance can&apos;t be handed to the AI.
          </span>
        </section>
      </div>
    </div>
  );
}
