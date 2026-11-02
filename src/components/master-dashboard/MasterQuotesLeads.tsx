"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LeadsWorkspace } from "@/components/master-dashboard/quotes-leads/LeadsWorkspace";
import { PipelineBoard } from "@/components/master-dashboard/quotes-leads/PipelineBoard";
import {
  fetchBoard,
  fetchPipelineMeta,
  type BoardColumn,
  type LeadStage,
  type PipelineMeta,
  type PipelineSummary,
} from "@/lib/admin/leads-pipeline";

/**
 * Quotes & Leads: the live pipeline. The board shows open leads by stage,
 * most urgent first; the table is where each lead gets its stage, owner and
 * next action. Both read the same leads, so a change in one shows in the
 * other. (The AI suggestion card below is still sample data.)
 */

const RULES = [
  { s: "New lead", t: "Every new lead arrives with a first task: call them. It's due at the source's response target, counted in sales hours (Mon–Fri 8 am–6 pm, Sat 9 am–1 pm): design form 15 min, contact form 2 h, referral 4 h, anything else 1 day." },
  { s: "Next action", t: "Every open lead should always have one. Done completes it; + Next sets the following one. A lead with none, or with one past due, shows in red and in the Overdue view." },
  { s: "Owner", t: "The EasyLink staff member responsible for the sale. Separate from the installer, who is set at dispatch." },
  { s: "Stage", t: "Move it here as the sale progresses. Installers' journey milestones (site visit scheduled, installation started, system live…) move it forward automatically." },
  { s: "Deposit paid", t: "The job appears in Dispatch. From Installing it shows in the installer's pipeline." },
  { s: "Lost", t: "Needs a reason, and cancels the lead's open tasks. Lost leads leave the working list; reopen them from the Lost view." },
  { s: "Spam", t: "Kept but hidden from the lists, the dialler, the marketplace and reports." },
] as const;

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

function AiSuggestionCard() {
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
        <span className="text-[12px] font-semibold text-[#0B2540]">Sales agent</span>
        <span className="flex-grow" />
        <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">
          Needs your OK
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35]">
          6 quotes have gone quiet. Send a short check-in to each?
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">
          No reply for 5 or more days after opening the proposal. Each message is personalised from the
          quote and the questions they asked. None of these customers has opted out, and none has had
          more than 2 messages this week.
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
        <span>
          <strong className="text-[#0F172A]">Used:</strong> proposal views, message history, opt-outs
        </span>
        <span>
          <strong className="text-[#0F172A]">Rule:</strong> POL-CONTACT-01 · 3 a week, 8 am to 8 pm
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
          <span className="text-[12px] font-semibold">Decision DEC-918522</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setState("ok")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            Approve 6 messages
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
          <span className="ml-auto text-[13px] font-semibold text-[#1565C0]">Why? DEC-918522</span>
        </div>
      )}
    </section>
  );
}

export function MasterQuotesLeads() {
  const [territory, setTerritory] = useState("NSW & ACT");
  const [meta, setMeta] = useState<PipelineMeta | null>(null);
  const [board, setBoard] = useState<BoardColumn[] | null>(null);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [stage, setStage] = useState<LeadStage | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetchPipelineMeta()
      .then(setMeta)
      .catch((err: unknown) => setBoardError(err instanceof Error ? err.message : "Could not load the pipeline."));
  }, []);

  useEffect(() => {
    let live = true;
    fetchBoard()
      .then(({ columns, summary }) => {
        if (!live) return;
        setBoardError(null);
        setBoard(columns);
        setSummary(summary ?? null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setBoardError(err instanceof Error ? err.message : "Could not load the pipeline board.");
      });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((n) => n + 1), []);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <span className="font-semibold text-[#0F172A]">Quotes &amp; Leads</span>
        </nav>
        <label htmlFor="territory" className="sr-only">
          Territory
        </label>
        <select
          id="territory"
          value={territory}
          onChange={(e) => setTerritory(e.target.value)}
          className="h-[38px] rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
        >
          <option>NSW &amp; ACT</option>
        </select>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Quotes &amp; leads</h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Same eight stages installers use · jobs you dispatch show in the installer&apos;s pipeline
              from Installing
            </p>
          </div>
          <Link
            href="/designs"
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-extrabold tracking-[0.04em] text-[#3B1D00] no-underline"
          >
            SOLAR DESIGN
          </Link>
          <span className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00]">
            New lead
          </span>
        </div>

        <PipelineBoard columns={board} error={boardError} selected={stage} onSelect={setStage} />

        <LeadsWorkspace
          meta={meta}
          summary={summary}
          stage={stage}
          onClearStage={() => setStage(null)}
          reloadKey={reloadKey}
          onChanged={refresh}
        />

        <AiSuggestionCard />

        <section
          aria-label="How the pipeline works"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">How leads move</h2>
          {RULES.map((r) => (
            <div key={r.s} className="flex flex-wrap gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0">
              <strong className="flex-[0_0_170px]">{r.s}</strong>
              <span className="flex-[1_1_300px] text-[#334155]">{r.t}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
