"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Installer payouts" mock exactly
 * (InstallerPayouts.dc.html + its AISuggest card in approve mode).
 *
 * This app has no payout model yet — no RCTI runs, weekly lock windows,
 * installer statements or commission ledger — so the run table, KPIs and
 * history are the mock's sample data. The money maths below is the mock's
 * own: GST is derived from the ex-GST figures rather than hard-coded.
 */

const money = (n: number) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** [installer, RCTI, approved jobs, ex GST] — exactly the mock's rows. */
const RAW: [string, string, string, number][] = [
  ["Solarman", "RCTI-0412", "JOB-3119, 3121, 3124, 3126", 14860],
  ["[Electrical contractor]", "RCTI-0413", "JOB-3122", 1480],
];

const RUN = RAW.map(([n, id, jobs, ex]) => ({
  n,
  id,
  jobs,
  ex: money(ex),
  gst: money(ex * 0.1),
  tot: money(ex * 1.1),
}));

const SUM = RAW.reduce((a, r) => a + r[3], 0);

const HELD = [
  { t: "JOB-3112 · Solarman", d: "Missing CCEW and 4 photos", v: "$3,420" },
  { t: "JOB-3128 · Solarman", d: "Ready to review", v: "$2,180" },
  { t: "JOB-3130 · Solarman", d: "Ready to review · 1 recheck", v: "$1,930" },
];

const PAST = [
  { d: "Fri 10 Oct", what: "Solarman RCTI-0408", v: "$5,480.00" },
  { d: "Fri 3 Oct", what: "Solarman RCTI-0403", v: "$7,930.00" },
  { d: "Fri 26 Sep", what: "Solarman RCTI-0397", v: "$3,420.00" },
];

/** A figure this app doesn't model yet (the mock leaves it as "$[total]"). */
function Unbuilt() {
  return (
    <span title="Not built yet" className="cursor-help text-[#94A3B8]">
      —
    </span>
  );
}

type AiState = null | "ok" | "edit" | "no";

const AI_DONE: Record<Exclude<AiState, null>, { text: string; bg: string; fg: string }> = {
  ok: { text: "Approved by you. The action ran and was logged.", bg: "#DCFCE7", fg: "#166534" },
  edit: {
    text: "Opened for editing. Your changes are logged as feedback to the agent.",
    bg: "#F1F5F9",
    fg: "#334155",
  },
  no: { text: "Rejected. Nothing ran; the agent will not retry this.", bg: "#FEE2E2", fg: "#991B1B" },
};

function AiRctiCard() {
  const [state, setState] = useState<AiState>(null);
  const done = state ? AI_DONE[state] : null;

  return (
    <section
      aria-label="AI suggestion"
      className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-4 py-3.5 text-[#0F172A]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B4A7A] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3" />
          </svg>
          AI
        </span>
        <span className="text-[12px] font-semibold text-[#0B2540]">Finance agent</span>
        <span className="flex-grow" />
        <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">
          Needs your OK
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35]">
          Friday&apos;s RCTIs are reconciled. 1 adjustment needs approval
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">
          All 5 jobs have approved handover packs and matching orders. JOB-3127 has an extra A$180
          for a second switchboard trip, logged by Ops on 14 Oct. Payouts over policy or with
          adjustments always need a person.
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
        <span>
          <strong className="text-[#0F172A]">Used:</strong> handover approvals, sales orders, job
          notes
        </span>
        <span>
          <strong className="text-[#0F172A]">Rule:</strong> POL-SPEND-01 · adjustments need approval
        </span>
      </div>

      {done ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: done.bg, color: done.fg }}
        >
          <span className="flex-grow">{done.text}</span>
          <button
            type="button"
            onClick={() => setState(null)}
            className="h-8 rounded-[8px] border border-current px-3 text-[12px] font-bold"
          >
            Undo
          </button>
          <span className="text-[12px] font-semibold">Decision DEC-918530</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setState("ok")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            Approve RCTIs
          </button>
          <button
            type="button"
            onClick={() => setState("edit")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => setState("no")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#991B1B]"
          >
            Reject
          </button>
          <span className="ml-auto text-[13px] font-semibold text-[#1565C0]">Why? DEC-918530</span>
        </div>
      )}
    </section>
  );
}

export function MasterInstallerPayouts() {
  const kpis = [
    {
      l: "This Friday (ex GST)",
      v: money(SUM).replace(".00", ""),
      s: "2 installers · 5 jobs",
      c: "#475569",
    },
    { l: "On hold", v: "$3,420", s: "JOB-3112 · pack incomplete", c: "#991B1B" },
    { l: "Under review", v: "$4,110", s: "2 Solarman packs", c: "#92400E" },
    { l: "Paid this FY", v: null, s: "All linked installers", c: "#166534" },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Installer payouts</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Installer payouts
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            EasyLink pays linked installers every Friday by RCTI and adds the total to your account
            statement
          </p>
        </div>

        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
        >
          {kpis.map((k) => (
            <div
              key={k.l}
              className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
              <span className="font-source-sans text-[28px] font-bold text-[#0F172A]">
                {k.v === null ? <Unbuilt /> : k.v}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: k.c }}>
                {k.s}
              </span>
            </div>
          ))}
        </div>

        <AiRctiCard />

        <section
          aria-label="This Friday"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-center">
            <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
              Run · Fri 17 Oct 2026
            </h2>
            <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
              Locks Thu 5 pm
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Installer</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">RCTI</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Approved jobs</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Ex GST</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">GST</th>
                  <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {RUN.map((r) => (
                  <tr key={r.id}>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 font-semibold text-[#0F172A]">
                      {r.n}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#0F172A]">{r.id}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#0F172A]">
                      {r.jobs}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums text-[#0F172A]">
                      {r.ex}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums text-[#0F172A]">
                      {r.gst}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right font-bold tabular-nums text-[#0F172A]">
                      {r.tot}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-2 py-2.5 font-bold text-[#0F172A]" colSpan={3}>
                    Added to your statement
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold tabular-nums text-[#0F172A]">
                    {money(SUM)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold tabular-nums text-[#0F172A]">
                    {money(SUM * 0.1)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-bold tabular-nums text-[#0F172A]">
                    {money(SUM * 1.1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}
        >
          <section
            aria-label="Held and pending"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Not in this run</h2>
            {HELD.map((h) => (
              <div
                key={h.t}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0"
              >
                <span className="flex flex-grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">{h.t}</span>
                  <span className="text-[12px] text-[#5B6B80]">{h.d}</span>
                </span>
                <strong className="text-[14px] text-[#0F172A]">{h.v}</strong>
                <Link href="/master/handover-review" className="text-[13px] font-semibold text-[#1565C0]">
                  Review
                </Link>
              </div>
            ))}
          </section>

          <section
            aria-label="Past runs"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Past runs</h2>
            {PAST.map((p) => (
              <div
                key={p.what}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0"
              >
                <span className="flex-grow text-[#0F172A]">
                  <strong>{p.d}</strong> · {p.what}
                </span>
                <span className="font-bold tabular-nums text-[#0F172A]">{p.v}</span>
                <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[12px] font-bold text-[#166534]">
                  Paid
                </span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
