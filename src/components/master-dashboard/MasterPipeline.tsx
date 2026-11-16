"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PipelineBoard, type BoardMoves } from "@/components/master-dashboard/quotes-leads/PipelineBoard";
import {
  LEAD_STAGE_LABEL,
  aiPlaceLead,
  fetchBoard,
  updateLeadPipeline,
  type BoardColumn,
  type LeadStage,
  type PipelineLead,
} from "@/lib/admin/leads-pipeline";

/** One line in the move log: who moved what, why, and how to undo it. */
type MoveNote = {
  key: number;
  leadId: string;
  name: string;
  from: LeadStage;
  to: LeadStage;
  by: "you" | "ai";
  reason?: string;
  undone?: boolean;
};

/** At most this many AI checks run at once when placing the whole board. */
const AI_PARALLEL = 3;

/**
 * Pipeline: open leads by stage, most urgent first. Cards move by hand (drag
 * to a stage, or the card's ⋯ menu) or by AI (one card, or the whole board).
 * Every move is listed with an Undo. A card opens the customer; a stage opens
 * Quotes & Leads filtered to that stage.
 */
export function MasterPipeline() {
  const router = useRouter();
  const [board, setBoard] = useState<BoardColumn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [log, setLog] = useState<MoveNote[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [aiRun, setAiRun] = useState<{ done: number; total: number; moved: number } | null>(null);

  useEffect(() => {
    let live = true;
    fetchBoard()
      .then(({ columns }) => {
        if (!live) return;
        setError(null);
        setBoard(columns);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : "Could not load the pipeline board.");
      });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);
  const mark = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const note = (n: Omit<MoveNote, "key">) => setLog((prev) => [{ ...n, key: Date.now() + Math.random() }, ...prev].slice(0, 30));

  /** Shows the card in its new column at once; the reload brings the server's order and totals. */
  const moveLocally = (lead: PipelineLead, to: LeadStage) =>
    setBoard((cols) =>
      cols?.map((c) =>
        c.stage === lead.stage
          ? { ...c, count: c.count - 1, cards: c.cards.filter((l) => l.id !== lead.id) }
          : c.stage === to
            ? { ...c, count: c.count + 1, cards: [{ ...lead, stage: to }, ...c.cards] }
            : c,
      ) ?? null,
    );

  const moves: BoardMoves = {
    busy,
    onMove: (lead, to) => {
      setProblem(null);
      mark(lead.id, true);
      moveLocally(lead, to);
      updateLeadPipeline(lead.id, { stage: to })
        .then(() => note({ leadId: lead.id, name: lead.customerName, from: lead.stage, to, by: "you" }))
        .catch((err: unknown) => setProblem(`${lead.customerName}: ${err instanceof Error ? err.message : "couldn't be moved."}`))
        .finally(() => {
          mark(lead.id, false);
          reload();
        });
    },
    onAiPlace: (lead) => {
      setProblem(null);
      mark(lead.id, true);
      aiPlaceLead(lead.id)
        .then((r) => {
          if (r.moved) note({ leadId: lead.id, name: lead.customerName, from: r.from, to: r.to, by: "ai", reason: r.reason });
          else setProblem(`AI kept ${lead.customerName} in ${LEAD_STAGE_LABEL[r.to]}: ${r.reason}`);
        })
        .catch((err: unknown) => setProblem(`${lead.customerName}: ${err instanceof Error ? err.message : "the AI couldn't place it."}`))
        .finally(() => {
          mark(lead.id, false);
          reload();
        });
    },
  };

  const allLeads = useMemo(() => (board ?? []).flatMap((c) => c.cards), [board]);

  const placeAll = async () => {
    const leads = allLeads;
    if (!leads.length) return;
    setProblem(null);
    setAiRun({ done: 0, total: leads.length, moved: 0 });
    let i = 0;
    let failed = 0;
    const worker = async () => {
      while (i < leads.length) {
        const lead = leads[i++];
        mark(lead.id, true);
        try {
          const r = await aiPlaceLead(lead.id);
          if (r.moved) {
            note({ leadId: lead.id, name: lead.customerName, from: r.from, to: r.to, by: "ai", reason: r.reason });
            setAiRun((a) => (a ? { ...a, moved: a.moved + 1 } : a));
          }
        } catch {
          failed++;
        } finally {
          mark(lead.id, false);
          setAiRun((a) => (a ? { ...a, done: a.done + 1 } : a));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(AI_PARALLEL, leads.length) }, worker));
    if (failed) setProblem(`The AI couldn't check ${failed} lead${failed === 1 ? "" : "s"}; try those again from their ⋯ menu.`);
    setAiRun((a) => (a ? { ...a, done: a.total } : a));
    reload();
  };

  const undo = (n: MoveNote) => {
    setProblem(null);
    mark(n.leadId, true);
    updateLeadPipeline(n.leadId, { stage: n.from })
      .then(() => setLog((prev) => prev.map((x) => (x.key === n.key ? { ...x, undone: true } : x))))
      .catch((err: unknown) => setProblem(`${n.name}: ${err instanceof Error ? err.message : "couldn't be moved back."}`))
      .finally(() => {
        mark(n.leadId, false);
        reload();
      });
  };

  const running = aiRun !== null && aiRun.done < aiRun.total;

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <span className="font-semibold text-[#0F172A]">Pipeline</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Pipeline</h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Drag a card to another stage, use its ⋯ menu, or let the AI place cards from each customer&apos;s record.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void placeAll()}
            disabled={running || !allLeads.length}
            className="flex h-11 items-center gap-2 rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] hover:bg-[#E57F06] disabled:opacity-60"
          >
            ✦ {running ? `AI checking ${aiRun.done} of ${aiRun.total}…` : "AI: place all cards"}
          </button>
          <Link
            href="/master/quotes-leads"
            className="flex h-11 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-[18px] text-[14px] font-bold text-[#0F172A] no-underline hover:bg-[#F8FAFC]"
          >
            Quotes &amp; Leads
          </Link>
        </div>

        {problem ? (
          <p role="alert" className="m-0 rounded-[10px] border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-[13px] text-[#92400E]">
            {problem}
          </p>
        ) : null}
        {aiRun && !running ? (
          <p role="status" className="m-0 text-[13px] text-[#334155]">
            AI checked {aiRun.total} card{aiRun.total === 1 ? "" : "s"} and moved {aiRun.moved}.
          </p>
        ) : null}

        <PipelineBoard
          columns={board}
          error={error}
          selected={null}
          moves={moves}
          onSelect={(stage) => router.push(stage ? `/master/quotes-leads?stage=${encodeURIComponent(stage)}` : "/master/quotes-leads")}
          hint="Open leads, most urgent first. Select a stage to see its leads in Quotes & Leads."
        />

        {log.length ? (
          <section aria-label="Recent moves" className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 mb-1 text-[16px] font-bold">Recent moves</h2>
            {log.map((n) => (
              <div key={n.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0">
                <span className="w-[54px] shrink-0 text-[11.5px] font-bold uppercase text-[#7A3E00]">{n.by === "ai" ? "✦ AI" : "You"}</span>
                <span className={`min-w-0 flex-[1_1_320px] ${n.undone ? "text-[#94A3B8] line-through" : ""}`}>
                  <strong>{n.name}</strong>: {LEAD_STAGE_LABEL[n.from]} → {LEAD_STAGE_LABEL[n.to]}
                  {n.reason ? <span className="text-[#5B6B80]"> · {n.reason}</span> : null}
                </span>
                {n.undone ? (
                  <span className="text-[12px] text-[#94A3B8]">Undone</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => undo(n)}
                    disabled={busy.has(n.leadId)}
                    className="text-[12.5px] font-semibold text-[#1D4ED8] hover:underline disabled:opacity-50"
                  >
                    Undo
                  </button>
                )}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}
