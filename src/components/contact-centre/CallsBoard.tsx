"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn, Pill } from "@/components/jobs/ui";
import { cc, dur, OUTCOMES, outcomeLabel, phoneFmt, when, type CallRow, type FollowUp } from "./api";
import { CallDetailModal } from "./CallDetail";

type Tab = "all" | "unmatched" | "ai" | "followups";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All calls" },
  { key: "unmatched", label: "Unmatched" },
  { key: "ai", label: "Answered by EasyLink AI" },
  { key: "followups", label: "Follow-ups" },
];
const KIND = { CALLBACK: "Call back", SITE_VISIT: "Site visit", TASK: "Task" } as const;
const selectCls = "rounded-[8px] border border-[#CBD5E1] bg-white px-2 py-1.5 text-[13px] text-[#0F172A]";

/** Every call, searchable; unmatched calls to attach; and the follow-ups list. */
export function CallsBoard() {
  const api = cc("admin");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const [from, setFrom] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CallRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [tasks, setTasks] = useState<FollowUp[] | null>(null);
  const [due, setDue] = useState<"" | "overdue" | "today" | "week">("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    if (tab === "followups") {
      cc("admin")
        .followUps({ status: "OPEN", due: due || undefined, pageSize: 100 })
        .then((r) => !cancelled && (setTasks(r.tasks), setError(null)))
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load follow-ups"));
    } else {
      cc("admin")
        .calls({
          page,
          pageSize: 30,
          q: term || undefined,
          direction: direction || undefined,
          outcome: outcome || undefined,
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          unmatched: tab === "unmatched" || undefined,
          handledBy: tab === "ai" ? "AI" : undefined,
        })
        .then((r) => {
          if (cancelled) return;
          setRows(r.data.calls);
          setTotal(r.data.total);
          setError(null);
        })
        .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load calls"));
    }
    return () => {
      cancelled = true;
    };
  }, [tab, term, direction, outcome, from, page, due, reload]);

  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Calls">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
              setRows(null);
              setTasks(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${tab === t.key ? "bg-[#0F172A] text-white" : "bg-white text-[#334155] ring-1 ring-[#E3E8EF]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "followups" ? (
        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] font-semibold text-[#334155]" htmlFor="calls-search">
              Search
              <input
                id="calls-search"
                className={`${selectCls} w-full`}
                placeholder="Name, number, or words said on the call"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]" htmlFor="calls-direction">
              Direction
              <select id="calls-direction" className={selectCls} value={direction} onChange={(e) => (setDirection(e.target.value), setPage(1))}>
                <option value="">In and out</option>
                <option value="INBOUND">Calls in</option>
                <option value="OUTBOUND">Calls out</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]" htmlFor="calls-outcome">
              Outcome
              <select id="calls-outcome" className={selectCls} value={outcome} onChange={(e) => (setOutcome(e.target.value), setPage(1))}>
                <option value="">Any</option>
                <option value="NONE">Not written up</option>
                {OUTCOMES.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]" htmlFor="calls-from">
              Since
              <input id="calls-from" type="date" className={selectCls} value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
            </label>
          </div>
          {tab === "unmatched" && (
            <p className="m-0 rounded-[8px] bg-[#FFFBEB] px-3 py-2 text-[13px] text-[#92400E]">
              Calls whose number isn&apos;t on any customer record. They&apos;re matched automatically when a record with that number appears; open one to make a new record from it.
            </p>
          )}
          {error && <p className="m-0 rounded-[8px] bg-[#FEF2F2] p-2 text-[13px] text-[#991B1B]">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  {["When", "Who", "Direction", "Handled by", "Length", "Outcome", "Summary"].map((h) => (
                    <th key={h} className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows === null && !error && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-[#64748B]">
                      Loading…
                    </td>
                  </tr>
                )}
                {rows?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-[#64748B]">
                      {tab === "unmatched" ? "Every call is on a customer record." : "No calls match."}
                    </td>
                  </tr>
                )}
                {(rows ?? []).map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-[#F8FAFC]" onClick={() => setOpen(c.id)}>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 whitespace-nowrap tabular-nums">{when(c.startedAt)}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      <span className="flex flex-col">
                        <button type="button" className="text-left font-semibold text-[#0F172A]" onClick={() => setOpen(c.id)}>
                          {c.customer?.name ?? "Unknown caller"}
                        </button>
                        <span className="text-[12px] text-[#64748B]">{phoneFmt(c.counterpartyNumber)}</span>
                      </span>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">{c.direction === "INBOUND" ? "In" : "Out"}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">{c.handledBy === "AI" ? <Pill tone="info">EasyLink AI</Pill> : (c.agent?.name ?? "Staff")}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 tabular-nums">{dur(c.durationSec)}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      {c.outcome ? (
                        outcomeLabel(c.outcome)
                      ) : c.suggestedOutcome ? (
                        <span className="text-[#64748B]">{outcomeLabel(c.suggestedOutcome)} (AI)</span>
                      ) : (
                        <span className="text-[#94A3B8]">Not written up</span>
                      )}
                      {c.openFollowUps > 0 && (
                        <span className="ml-1.5">
                          <Pill tone="warn">{c.openFollowUps} to do</Pill>
                        </span>
                      )}
                    </td>
                    <td className="max-w-[340px] border-b border-[#EEF2F6] px-2 py-2.5 text-[#475569]">
                      <span className="line-clamp-2">{c.aiSummary ?? c.notes ?? "–"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 30 && (
            <div className="flex items-center justify-end gap-2 text-[13px] text-[#475569]">
              <Btn small kind="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Newer
              </Btn>
              <span>
                Page {page} of {pages}
              </span>
              <Btn small kind="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Older
              </Btn>
            </div>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["", "All open"],
                ["overdue", "Overdue"],
                ["today", "Due today"],
                ["week", "Next 7 days"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setDue(k)}
                className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${due === k ? "bg-[#0B4A7A] text-white" : "bg-[#F1F5F9] text-[#334155]"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {error && <p className="m-0 rounded-[8px] bg-[#FEF2F2] p-2 text-[13px] text-[#991B1B]">{error}</p>}
          <div className="flex flex-col divide-y divide-[#EEF2F6]">
            {tasks === null && !error && <p className="m-0 py-3 text-[13px] text-[#64748B]">Loading…</p>}
            {tasks?.length === 0 && <p className="m-0 py-3 text-[13px] text-[#64748B]">Nothing to do.</p>}
            {(tasks ?? []).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-[#0F172A]">
                    {KIND[t.kind]}: {t.title}
                  </span>
                  <span className="text-[12.5px] text-[#64748B]">
                    {t.customer ? (
                      <Link href={`/master/customers/${t.customer.id}`} className="font-semibold text-[#0B4A7A] no-underline hover:underline">
                        {t.customer.name}
                      </Link>
                    ) : (
                      "No customer record"
                    )}{" "}
                    · {phoneFmt(t.customer?.phone ?? t.phone)} · {t.assignee ?? "Anyone"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Pill tone={t.overdue ? "bad" : "warn"}>{t.overdue ? `Overdue · ${when(t.dueAt)}` : `Due ${when(t.dueAt)}`}</Pill>
                  {t.callId && (
                    <Btn small kind="ghost" onClick={() => setOpen(t.callId!)}>
                      The call
                    </Btn>
                  )}
                  <Btn
                    small
                    kind="secondary"
                    onClick={() => void api.setFollowUp(t.id, { status: "DONE" }).then(() => setReload((n) => n + 1))}
                  >
                    Done
                  </Btn>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {open && <CallDetailModal portal="admin" callId={open} onClose={() => setOpen(null)} onChanged={() => setReload((n) => n + 1)} />}
    </div>
  );
}
