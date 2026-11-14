"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  TONE_CHIP,
  TONE_RAIL,
  aud,
  compactAud,
  describeDue,
  initials,
  leadUrgency,
  personName,
  suburbOf,
  type BoardColumn,
  type LeadStage,
  type PipelineLead,
} from "@/lib/admin/leads-pipeline";

/** One colour per stage, used for the board header dot and the table's stage pill. */
export const STAGE_DOT: Record<LeadStage, string> = {
  NEW_LEAD: "#64748B",
  APPOINTMENT: "#2563EB",
  SITE_ASSESSMENT: "#4F46E5",
  DESIGNING: "#7C3AED",
  PROPOSAL_SENT: "#D97706",
  DEPOSIT_PAID: "#059669",
  INSTALLING: "#0284C7",
  PAYMENT_COMPLETED: "#16A34A",
};

/** Moving cards: by hand (drag, or the card's menu) and by AI. */
export type BoardMoves = {
  /** Staff moved the card to a stage. */
  onMove: (lead: PipelineLead, stage: LeadStage) => void;
  /** Staff asked the AI to place this card. */
  onAiPlace: (lead: PipelineLead) => void;
  /** Leads with a move or AI check in flight. */
  busy: ReadonlySet<string>;
};

const DRAG_TYPE = "application/x-easylink-lead";

function CardMenu({ lead, moves }: { lead: PipelineLead; moves: BoardMoves }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const item =
    "block w-full rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[#F1F5F9] disabled:cursor-default disabled:text-[#94A3B8] disabled:hover:bg-transparent";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Move ${lead.customerName}`}
        disabled={moves.busy.has(lead.id)}
        onClick={() => setOpen((o) => !o)}
        className="flex size-[24px] items-center justify-center rounded-[6px] text-[15px] font-bold leading-none text-[#5B6B80] hover:bg-[#F1F5F9] disabled:opacity-40"
      >
        ⋯
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[26px] z-20 w-[196px] rounded-[10px] border border-[#E3E8EF] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.16)]"
        >
          <button
            type="button"
            role="menuitem"
            className={`${item} font-semibold text-[#7A3E00]`}
            onClick={() => {
              setOpen(false);
              moves.onAiPlace(lead);
            }}
          >
            ✦ Let AI place it
          </button>
          <div className="my-1 border-t border-[#EEF2F6]" />
          <span className="block px-2.5 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
            Move to
          </span>
          {LEAD_STAGES.map((st) => (
            <button
              key={st}
              type="button"
              role="menuitem"
              disabled={st === lead.stage}
              className={`${item} flex items-center gap-2 text-[#0F172A]`}
              onClick={() => {
                setOpen(false);
                moves.onMove(lead, st);
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: STAGE_DOT[st] }}
              />
              {LEAD_STAGE_LABEL[st]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Card({ lead, moves }: { lead: PipelineLead; moves?: BoardMoves }) {
  const tone = leadUrgency(lead);
  const chip = TONE_CHIP[tone];
  const where = [suburbOf(lead.address), aud(lead.estimatedValue)]
    .filter(Boolean)
    .join(" · ");
  const next = lead.nextAction;
  const busy = moves?.busy.has(lead.id) ?? false;
  return (
    <div
      draggable={Boolean(moves) && !busy}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`relative ${moves && !busy ? "cursor-grab active:cursor-grabbing" : ""} ${busy ? "opacity-60" : ""}`}
    >
      <Link
        href={`/master/customers/${lead.id}`}
        draggable={false}
        className="group relative flex flex-col gap-1.5 overflow-hidden rounded-[10px] border border-[#E3E8EF] bg-white py-2.5 pl-3 pr-2.5 text-[#0F172A] no-underline shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: TONE_RAIL[tone] }}
        />
        <span className="flex items-start gap-2">
          <strong className="min-w-0 flex-grow truncate text-[13px] leading-[1.35]">
            {lead.customerName}
          </strong>
          {lead.owner ? (
            <span
              title={`Owner: ${personName(lead.owner)}`}
              className="flex size-[20px] shrink-0 items-center justify-center rounded-full bg-[#0B1A2E] text-[9.5px] font-bold text-white"
            >
              {initials(lead.owner)}
            </span>
          ) : (
            <span
              title="No owner yet"
              className="size-[20px] shrink-0 rounded-full border border-dashed border-[#CBD5E1]"
            />
          )}
        </span>
        {where ? (
          <span className="truncate text-[12px] text-[#5B6B80]">{where}</span>
        ) : null}
        {next ? (
          <span className="flex min-w-0 flex-col gap-1">
            <span
              className="truncate text-[12px] text-[#334155]"
              title={next.title}
            >
              {next.title}
            </span>
            <span
              className="w-fit rounded-[6px] px-1.5 py-[2px] text-[11.5px] font-semibold"
              style={{ background: chip.bg, color: chip.fg }}
            >
              {describeDue(next.dueAt).text}
            </span>
          </span>
        ) : (
          <span
            className="w-fit rounded-[6px] px-1.5 py-[2px] text-[11.5px] font-semibold"
            style={{ background: chip.bg, color: chip.fg }}
          >
            No next action
          </span>
        )}
        {busy ? (
          <span className="text-[11.5px] font-semibold text-[#7A3E00]">
            Moving…
          </span>
        ) : null}
      </Link>
      {moves ? (
        <div className="absolute bottom-1.5 right-1.5">
          <CardMenu lead={lead} moves={moves} />
        </div>
      ) : null}
    </div>
  );
}

export function PipelineBoard({
  columns,
  error,
  selected,
  onSelect,
  hint = "Open leads, most urgent first. Select a stage to see all of its leads below.",
  moves,
}: {
  columns: BoardColumn[] | null;
  /** The line beside the title. */
  hint?: string;
  /** When given, cards can be dragged between stages, moved from their menu, or placed by AI. */
  moves?: BoardMoves;
  error: string | null;
  selected: LeadStage | null;
  /** Clicking a column header filters the leads table to that stage (again to clear). */
  onSelect: (stage: LeadStage | null) => void;
}) {
  const [dropOn, setDropOn] = useState<LeadStage | null>(null);
  return (
    <section aria-labelledby="board-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="board-title"
          className="m-0 font-source-sans text-[19px] font-bold text-[#0F172A]"
        >
          Pipeline
        </h2>
        <p className="m-0 text-[12.5px] text-[#5B6B80]">{hint}</p>
      </div>
      {error ? (
        <p
          role="alert"
          className="m-0 rounded-[10px] bg-[#FEE2E2] px-3 py-2 text-[13px] font-semibold text-[#991B1B]"
        >
          {error}
        </p>
      ) : null}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="grid min-w-[1440px] gap-2.5"
          style={{ gridTemplateColumns: "repeat(8, minmax(168px, 1fr))" }}
        >
          {(columns ?? []).map((col) => {
            const active = selected === col.stage;
            const empty = col.count === 0;
            return (
              <div
                key={col.stage}
                onDragOver={
                  moves
                    ? (e) => {
                        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dropOn !== col.stage) setDropOn(col.stage);
                      }
                    : undefined
                }
                onDragLeave={
                  moves
                    ? (e) =>
                        !e.currentTarget.contains(e.relatedTarget as Node) &&
                        setDropOn(null)
                    : undefined
                }
                onDrop={
                  moves
                    ? (e) => {
                        e.preventDefault();
                        setDropOn(null);
                        const id = e.dataTransfer.getData(DRAG_TYPE);
                        const lead = (columns ?? [])
                          .flatMap((c) => c.cards)
                          .find((l) => l.id === id);
                        if (lead && lead.stage !== col.stage)
                          moves.onMove(lead, col.stage);
                      }
                    : undefined
                }
                className={`flex min-h-[200px] flex-col gap-2 rounded-[12px] p-2 transition-colors ${
                  dropOn === col.stage
                    ? "bg-[#FFF3DF] ring-2 ring-[#F68A0A]"
                    : active
                      ? "bg-[#E0EAFF] ring-2 ring-[#2563EB]"
                      : "bg-[#EDF1F6]"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : col.stage)}
                  className="flex flex-col gap-0.5 rounded-[8px] px-1.5 py-1 text-left hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: STAGE_DOT[col.stage] }}
                    />
                    <span className="flex-grow text-[12.5px] font-bold text-[#1E293B]">
                      {col.label}
                    </span>
                    <span className="rounded-full bg-white px-1.5 text-[11.5px] font-bold tabular-nums text-[#334155]">
                      {col.count}
                    </span>
                  </span>
                  <span className="h-[15px] pl-3.5 text-[11.5px] tabular-nums text-[#5B6B80]">
                    {compactAud(col.value)}
                  </span>
                </button>
                {col.cards.map((lead) => (
                  <Card key={lead.id} lead={lead} moves={moves} />
                ))}
                {col.count > col.cards.length ? (
                  <button
                    type="button"
                    onClick={() => onSelect(col.stage)}
                    className="rounded-[8px] px-1.5 py-1 text-left text-[12px] font-semibold text-[#1D4ED8] hover:bg-white/60"
                  >
                    See all {col.count}
                  </button>
                ) : null}
                {empty ? (
                  <span className="px-1.5 text-[12px] text-[#94A3B8]">
                    No leads
                  </span>
                ) : null}
              </div>
            );
          })}
          {columns === null && !error
            ? Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="min-h-[200px] animate-pulse rounded-[12px] bg-[#EDF1F6]"
                />
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
