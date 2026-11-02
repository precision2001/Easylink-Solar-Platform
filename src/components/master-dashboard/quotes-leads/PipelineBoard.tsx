"use client";

import Link from "next/link";
import {
  TONE_COLOUR,
  aud,
  describeDue,
  initials,
  personName,
  suburbOf,
  type BoardColumn,
  type LeadStage,
  type PipelineLead,
} from "@/lib/admin/leads-pipeline";

const STAGE_DOT: Record<LeadStage, string> = {
  NEW_LEAD: "#94A3B8",
  APPOINTMENT: "#3B82F6",
  SITE_ASSESSMENT: "#6366F1",
  DESIGNING: "#8B5CF6",
  PROPOSAL_SENT: "#F59E0B",
  DEPOSIT_PAID: "#10B981",
  INSTALLING: "#0EA5E9",
  PAYMENT_COMPLETED: "#16A34A",
};

/** What the card says should happen next, in the colour of how urgent it is. */
function NextLine({ lead }: { lead: PipelineLead }) {
  if (lead.respondBy && lead.responseOverdue) {
    return <span style={{ color: TONE_COLOUR.late }}>First response overdue</span>;
  }
  if (!lead.nextAction) return <span style={{ color: TONE_COLOUR.late }}>No next action</span>;
  const due = describeDue(lead.nextAction.dueAt);
  return (
    <span style={{ color: TONE_COLOUR[due.tone] }}>
      {lead.nextAction.title} · {due.text}
    </span>
  );
}

function Card({ lead }: { lead: PipelineLead }) {
  const where = [suburbOf(lead.address), aud(lead.estimatedValue)].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/master/customers/${lead.id}`}
      className="flex flex-col gap-1 rounded-[10px] border border-[#E3E8EF] bg-white p-2.5 text-[#0F172A] no-underline hover:border-[#94A3B8]"
    >
      <span className="flex items-start gap-1.5">
        <strong className="flex-grow text-[13px] leading-[1.3]">{lead.customerName}</strong>
        {lead.owner ? (
          <span
            title={`Owner: ${personName(lead.owner)}`}
            className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#334155]"
          >
            {initials(lead.owner)}
          </span>
        ) : null}
      </span>
      {where ? <span className="text-[12px] text-[#5B6B80]">{where}</span> : null}
      <span className="text-[11.5px] font-semibold leading-[1.35]">
        <NextLine lead={lead} />
      </span>
    </Link>
  );
}

export function PipelineBoard({
  columns,
  error,
  selected,
  onSelect,
}: {
  columns: BoardColumn[] | null;
  error: string | null;
  selected: LeadStage | null;
  /** Clicking a column header filters the leads table to that stage (again to clear). */
  onSelect: (stage: LeadStage | null) => void;
}) {
  return (
    <section aria-label="Pipeline board" className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">Pipeline board</h2>
        <span className="text-[12px] text-[#5B6B80]">Open leads · most urgent first · click a stage to filter</span>
      </div>
      {error ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[1440px] gap-2.5"
          style={{ gridTemplateColumns: "repeat(8, minmax(170px, 1fr))" }}
        >
          {(columns ?? []).map((col) => {
            const active = selected === col.stage;
            return (
              <div
                key={col.stage}
                className={`flex min-h-[220px] flex-col gap-2 rounded-[12px] p-2.5 ${
                  active ? "bg-[#DBEAFE] ring-2 ring-[#3B82F6]" : "bg-[#EEF2F6]"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(active ? null : col.stage)}
                  className="flex items-center gap-1.5 text-left"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: STAGE_DOT[col.stage] }} />
                  <span className="flex-grow text-[12px] font-bold text-[#334155]">{col.label}</span>
                  <span className="text-[12px] text-[#475569]">{col.count}</span>
                </button>
                {col.cards.map((lead) => (
                  <Card key={lead.id} lead={lead} />
                ))}
                {col.count > col.cards.length ? (
                  <button
                    type="button"
                    onClick={() => onSelect(col.stage)}
                    className="text-left text-[12px] font-semibold text-[#1565C0]"
                  >
                    + {col.count - col.cards.length} more in the table
                  </button>
                ) : null}
                {col.count === 0 ? <span className="text-[12px] text-[#94A3B8]">Nothing here</span> : null}
              </div>
            );
          })}
          {columns === null && !error
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="min-h-[220px] animate-pulse rounded-[12px] bg-[#EEF2F6]" />
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
