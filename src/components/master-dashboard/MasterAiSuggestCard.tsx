"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Matches the Easylink Designer "AI suggestion card" mock (AISuggest.dc.html)
 * — the block an agent uses to say what it wants to do, what it read to
 * decide, and which policy made it ask.
 *
 * Ported with the mock's own state machine: approving, editing or rejecting
 * replaces the buttons with the outcome and an Undo, and `mode="done"` starts
 * already-done (an action that ran inside policy, which a person may still
 * undo). Changing `dec` resets the card, because that means it is now
 * describing a different decision.
 */

export type AiSuggestMode = "approve" | "done" | "info";

type Outcome = "ok" | "edit" | "no" | "auto" | "undone";

/** [label, background, foreground] */
const LEVEL: Record<AiSuggestMode, [string, string, string]> = {
  approve: ["Needs your OK", "#FEF3C7", "#92400E"],
  done: ["Done automatically", "#DCFCE7", "#166534"],
  info: ["Suggestion", "#E2E8F0", "#334155"],
};

const DONE: Record<Outcome, [string, string, string]> = {
  ok: ["Approved by you. The action ran and was logged.", "#DCFCE7", "#166534"],
  edit: [
    "Opened for editing. Your changes are logged as feedback to the agent.",
    "#F1F5F9",
    "#334155",
  ],
  no: ["Rejected. Nothing ran; the agent will not retry this.", "#FEE2E2", "#991B1B"],
  auto: ["Done automatically within policy. You can undo it.", "#DCFCE7", "#166534"],
  undone: ["Undone by you. The agent gets this as feedback.", "#F1F5F9", "#334155"],
};

const GHOST =
  "h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold";

export function MasterAiSuggestCard({
  agent,
  title,
  why,
  evidence = "",
  rule = "",
  primary = "Approve",
  mode = "approve",
  dec,
}: {
  agent: string;
  title: string;
  why: string;
  evidence?: string;
  rule?: string;
  primary?: string;
  mode?: AiSuggestMode;
  dec: string;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // A new decision id means this card is about a different action now, so the
  // previous one's outcome must not carry over to it.
  const [prevDec, setPrevDec] = useState(dec);
  if (prevDec !== dec) {
    setPrevDec(dec);
    setOutcome(null);
  }

  // An action that already ran shows its outcome from the start.
  const state: Outcome | null = outcome ?? (mode === "done" ? "auto" : null);
  const [levelText, levelBg, levelFg] = LEVEL[mode];

  return (
    <section
      aria-label="AI suggestion"
      className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-4 py-3.5 text-[#0F172A]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B4A7A] px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-white">
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
          {mode === "info" ? "AI insight" : "AI"}
        </span>
        <span className="text-[12px] font-semibold text-[#0B2540]">{agent} agent</span>
        <span className="flex-grow" />
        <span
          className="rounded-full px-[9px] py-0.5 text-[12px] font-bold"
          style={{ background: levelBg, color: levelFg }}
        >
          {levelText}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35]">{title}</strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">{why}</span>
      </div>

      {evidence || rule ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
          {evidence ? (
            <span>
              <strong className="text-[#0F172A]">Used:</strong> {evidence}
            </span>
          ) : null}
          {rule ? (
            <span>
              <strong className="text-[#0F172A]">Rule:</strong> {rule}
            </span>
          ) : null}
        </div>
      ) : null}

      {state ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: DONE[state][1], color: DONE[state][2] }}
        >
          <span className="flex-grow">{DONE[state][0]}</span>
          <button
            type="button"
            onClick={() => setOutcome(mode === "done" ? "undone" : null)}
            className="h-8 rounded-[8px] border border-current px-3 text-[12px] font-bold"
          >
            Undo
          </button>
          <Link
            href="/master/decision-records"
            className="text-[12px] font-semibold text-current"
          >
            Decision {dec}
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOutcome("ok")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            {primary}
          </button>
          {mode !== "info" ? (
            <button
              type="button"
              onClick={() => setOutcome("edit")}
              className={`${GHOST} text-[#0F172A]`}
            >
              Edit first
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOutcome("no")}
            className={`${GHOST} text-[#991B1B]`}
          >
            {mode === "info" ? "Dismiss" : "Reject"}
          </button>
          <Link
            href="/master/decision-records"
            className="ml-auto text-[13px] font-semibold text-[#1565C0]"
          >
            Why? {dec}
          </Link>
        </div>
      )}
    </section>
  );
}
