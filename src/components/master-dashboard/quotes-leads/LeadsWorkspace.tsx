"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  TASK_KINDS,
  TONE_COLOUR,
  addNextAction,
  completeAction,
  defaultDueLocal,
  describeDue,
  personName,
  updateLeadPipeline,
  type LeadStage,
  type PipelineLead,
  type PipelineMeta,
  type TaskKind,
} from "@/lib/admin/leads-pipeline";

/**
 * The working list of leads. Every row answers four questions: what stage
 * it's at, who owns it, what happens next and by when. Changes save as they
 * are made.
 */

type View = "working" | "overdue" | "mine" | "unassigned" | "lost" | "spam";

const VIEWS: { key: View; label: string }[] = [
  { key: "working", label: "Working" },
  { key: "overdue", label: "Overdue" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
  { key: "lost", label: "Lost" },
  { key: "spam", label: "Spam" },
];

const PAGE_SIZE = 20;

const BUTTON =
  "h-8 whitespace-nowrap rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] font-semibold text-[#334155] hover:border-[#0F172A] disabled:opacity-60";
const SELECT =
  "h-8 w-full min-w-[128px] rounded-[8px] border border-[#CBD5E1] bg-white px-1.5 text-[12.5px] text-[#0F172A]";
const CELL = "border-b border-[#EEF2F6] px-2 py-[10px] align-top";

type Panel = { leadId: string; kind: "next" | "lost" } | null;

function NextActionCell({ lead }: { lead: PipelineLead }) {
  return (
    <div className="flex flex-col gap-1">
      {lead.respondBy ? (
        <span
          className="w-fit rounded-full px-2 py-0.5 text-[11.5px] font-bold"
          style={
            lead.responseOverdue
              ? { background: "#FEE2E2", color: "#991B1B" }
              : { background: "#FEF3C7", color: "#92400E" }
          }
        >
          {lead.responseOverdue ? "First response overdue" : `Respond by ${describeDue(lead.respondBy).text.replace(/^Today /, "")}`}
        </span>
      ) : null}
      {lead.nextAction ? (
        <>
          <span className="text-[13px] text-[#0F172A]">{lead.nextAction.title}</span>
          <span className="text-[12px] font-semibold" style={{ color: TONE_COLOUR[describeDue(lead.nextAction.dueAt).tone] }}>
            {describeDue(lead.nextAction.dueAt).text}
          </span>
        </>
      ) : lead.status !== "LOST" ? (
        <span className="text-[12.5px] font-semibold text-[#B91C1C]">No next action</span>
      ) : null}
    </div>
  );
}

function NextActionForm({
  lead,
  meta,
  onDone,
  onCancel,
}: {
  lead: PipelineLead;
  meta: PipelineMeta;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<TaskKind>("CALLBACK");
  const [title, setTitle] = useState("Call back");
  const [due, setDue] = useState(defaultDueLocal());
  const [assignee, setAssignee] = useState(lead.owner?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await addNextAction({
        leadId: lead.id,
        kind,
        title: title.trim() || TASK_KINDS.find((k) => k.key === kind)!.label,
        dueAt: new Date(due),
        assigneeId: assignee || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        Type
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as TaskKind;
            setKind(k);
            setTitle(TASK_KINDS.find((t) => t.key === k)!.defaultTitle);
          }}
          className={SELECT}
        >
          {TASK_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        What needs doing
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={300}
          placeholder="e.g. Send revised quote with 10 kWh battery"
          className="h-8 rounded-[8px] border border-[#CBD5E1] px-2 text-[13px]"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        Due
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
          className="h-8 rounded-[8px] border border-[#CBD5E1] px-2 text-[13px]"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        Who
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={SELECT}>
          <option value="">Anyone</option>
          {meta.owners.map((o) => (
            <option key={o.id} value={o.id}>
              {personName(o)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={busy} className="h-8 rounded-[8px] bg-[#0B1A2E] px-3 text-[12.5px] font-bold text-white disabled:opacity-60">
        {busy ? "Saving…" : "Save next action"}
      </button>
      <button type="button" onClick={onCancel} className={BUTTON}>
        Cancel
      </button>
      {error ? <span className="basis-full text-[12.5px] font-semibold text-[#991B1B]">{error}</span> : null}
    </form>
  );
}

function LostForm({
  lead,
  meta,
  onDone,
  onCancel,
}: {
  lead: PipelineLead;
  meta: PipelineMeta;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateLeadPipeline(lead.id, { lost: { reason, ...(note.trim() ? { note: note.trim() } : {}) } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        Why was it lost?
        <select value={reason} onChange={(e) => setReason(e.target.value)} required className={`${SELECT} min-w-[220px]`}>
          <option value="" disabled>
            Choose a reason
          </option>
          {meta.lostReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[220px] flex-[1_1_260px] flex-col gap-1 text-[12px] font-semibold text-[#475569]">
        Note {reason === "Other" ? "" : "(optional)"}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required={reason === "Other"}
          maxLength={300}
          placeholder="e.g. Went with a $2k cheaper quote"
          className="h-8 rounded-[8px] border border-[#CBD5E1] px-2 text-[13px]"
        />
      </label>
      <button type="submit" disabled={busy || !reason} className="h-8 rounded-[8px] bg-[#991B1B] px-3 text-[12.5px] font-bold text-white disabled:opacity-60">
        {busy ? "Saving…" : "Mark lost"}
      </button>
      <button type="button" onClick={onCancel} className={BUTTON}>
        Cancel
      </button>
      <span className="basis-full text-[12px] text-[#5B6B80]">Its open tasks are cancelled. You can reopen it from the Lost view.</span>
      {error ? <span className="basis-full text-[12.5px] font-semibold text-[#991B1B]">{error}</span> : null}
    </form>
  );
}

export function LeadsWorkspace({
  meta,
  stage,
  onClearStage,
  reloadKey,
  onChanged,
}: {
  meta: PipelineMeta | null;
  stage: LeadStage | null;
  onClearStage: () => void;
  /** Bumped by the page when something outside the table changed. */
  reloadKey: number;
  /** Tells the page a lead changed, so the board refreshes too. */
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>("working");
  const [rows, setRows] = useState<PipelineLead[] | null>(null);
  const [total, setTotal] = useState(0);
  const [spamTotal, setSpamTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    setPage(1);
  }, [stage]);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set("search", query);
    if (stage) params.set("stage", stage);
    if (view === "overdue") params.set("due", "overdue");
    if (view === "mine") params.set("owner", "me");
    if (view === "unassigned") params.set("owner", "none");
    if (view === "lost") params.set("lost", "only");
    if (view === "spam") params.set("spam", "only");
    fetch(`/api/admin/leads?${params}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not load leads.");
        return json;
      })
      .then((json) => {
        if (!live) return;
        setError(null);
        setRows(json.data ?? []);
        setTotal(json.meta?.pagination?.total ?? 0);
        setSpamTotal(json.meta?.spamTotal ?? 0);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Could not load leads.");
      });
    return () => {
      live = false;
    };
  }, [page, query, view, stage, reloadKey]);

  async function act(lead: PipelineLead, run: () => Promise<unknown>) {
    setBusyId(lead.id);
    setError(null);
    try {
      await run();
      setPanel(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the lead.");
    } finally {
      setBusyId(null);
    }
  }

  async function setSpam(lead: PipelineLead, spam: boolean) {
    await act(lead, async () => {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/spam`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spam }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message ?? "Could not update the lead.");
    });
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stageLabel = (s: LeadStage) => meta?.stages.find((x) => x.key === s)?.label ?? s;
  const editable = view !== "spam" && view !== "lost";

  return (
    <section aria-label="Leads" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="m-0 text-[18px] font-bold text-[#0F172A]">Leads</h2>
        <div role="tablist" aria-label="Lead view" className="flex flex-grow flex-wrap gap-1.5">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => {
                setView(key);
                setPage(1);
                setPanel(null);
              }}
              className={`h-[30px] rounded-full px-3 text-[12.5px] font-semibold ${
                view === key ? "bg-[#0B1A2E] text-white" : "border border-[#CBD5E1] bg-white text-[#334155]"
              }`}
            >
              {key === "spam" && spamTotal ? `${label} (${spamTotal})` : label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
          className="flex gap-2"
        >
          <label htmlFor="lead-search" className="sr-only">
            Search leads by name, email or address
          </label>
          <input
            id="lead-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or address"
            className="h-[34px] w-[220px] rounded-[10px] border border-[#CBD5E1] px-3 text-[13px] placeholder:text-[#94A3B8]"
          />
          <button type="submit" className="h-[34px] rounded-[10px] bg-[#0B1A2E] px-3.5 text-[13px] font-bold text-white">
            Search
          </button>
        </form>
      </div>

      {stage ? (
        <div className="flex items-center gap-2 text-[13px] text-[#334155]">
          Stage: <strong>{stageLabel(stage)}</strong>
          <button type="button" onClick={onClearStage} className="text-[12.5px] font-semibold text-[#1565C0]">
            Show all stages
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {rows === null || !meta ? (
        <p className="m-0 py-4 text-[13px] text-[#5B6B80]">Loading leads…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 text-[13px] text-[#5B6B80]">
          {query
            ? `No leads match “${query}”.`
            : view === "overdue"
              ? "Nothing overdue."
              : view === "spam"
                ? "Nothing marked as spam."
                : view === "lost"
                  ? "No lost leads."
                  : "No leads here."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#475569]">
                {["Customer", "Stage", "Owner", "Next action", "Source", "Created", ""].map((h) => (
                  <th key={h} className="border-b border-[#E3E8EF] p-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const busy = busyId === l.id;
                const open = panel?.leadId === l.id ? panel.kind : null;
                return [
                  <tr key={l.id} className={busy ? "opacity-60" : undefined}>
                    <td className={CELL}>
                      <Link href={`/master/customers/${l.id}`} className="font-bold text-[#0F172A] no-underline hover:underline">
                        {l.customerName}
                      </Link>
                      <div className="text-[12px] text-[#5B6B80]">{l.customerEmail ?? "No email"}</div>
                      {l.customerPhone ? (
                        <a href={`tel:${l.customerPhone}`} className="text-[12px] tabular-nums text-[#1565C0] no-underline">
                          {l.customerPhone}
                        </a>
                      ) : null}
                    </td>
                    <td className={CELL}>
                      {editable ? (
                        <select
                          aria-label={`Stage for ${l.customerName}`}
                          value={l.stage}
                          disabled={busy}
                          onChange={(e) => void act(l, () => updateLeadPipeline(l.id, { stage: e.target.value as LeadStage }))}
                          className={SELECT}
                        >
                          {meta.stages.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[#334155]">{stageLabel(l.stage)}</span>
                      )}
                      {view === "lost" && l.lostReason ? (
                        <div className="mt-1 text-[12px] font-semibold text-[#991B1B]">Lost: {l.lostReason}</div>
                      ) : null}
                    </td>
                    <td className={CELL}>
                      {editable ? (
                        <select
                          aria-label={`Owner for ${l.customerName}`}
                          value={l.owner?.id ?? ""}
                          disabled={busy}
                          onChange={(e) => void act(l, () => updateLeadPipeline(l.id, { ownerId: e.target.value || null }))}
                          className={SELECT}
                          style={l.owner ? undefined : { color: "#B91C1C" }}
                        >
                          <option value="">Unassigned</option>
                          {meta.owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {personName(o)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[#334155]">{personName(l.owner) || "—"}</span>
                      )}
                    </td>
                    <td className={`${CELL} min-w-[220px]`}>
                      <NextActionCell lead={l} />
                      {editable ? (
                        <div className="mt-1.5 flex gap-1.5">
                          {l.nextAction ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void act(l, () => completeAction(l.nextAction!.id))}
                              className={BUTTON}
                            >
                              Done
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            aria-expanded={open === "next"}
                            onClick={() => setPanel(open === "next" ? null : { leadId: l.id, kind: "next" })}
                            className={BUTTON}
                          >
                            + Next
                          </button>
                        </div>
                      ) : null}
                    </td>
                    <td className={`${CELL} text-[#5B6B80]`}>
                      {l.source ?? "—"}
                      {view === "spam" && l.spamReason ? (
                        <div className="text-[12px] text-[#991B1B]">{l.spamReason}</div>
                      ) : l.spamSuggestion?.length ? (
                        <div
                          className="mt-1 inline-block rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11.5px] font-semibold text-[#92400E]"
                          title={`Spam check: ${l.spamSuggestion.join(", ")}`}
                        >
                          Looks like spam
                        </div>
                      ) : null}
                    </td>
                    <td className={`${CELL} whitespace-nowrap text-[#5B6B80]`}>
                      {new Date(l.createdAt).toLocaleDateString("en-AU", {
                        timeZone: "Australia/Sydney",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className={`${CELL} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        {view === "lost" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(l, () => updateLeadPipeline(l.id, { reopen: true }))}
                            className={BUTTON}
                          >
                            Reopen
                          </button>
                        ) : view === "spam" ? (
                          <button type="button" disabled={busy} onClick={() => void setSpam(l, false)} className={BUTTON}>
                            Not spam
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              aria-expanded={open === "lost"}
                              onClick={() => setPanel(open === "lost" ? null : { leadId: l.id, kind: "lost" })}
                              className={`${BUTTON} hover:border-[#991B1B] hover:text-[#991B1B]`}
                            >
                              Lost
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void setSpam(l, true)}
                              aria-label={`Mark as spam: ${l.customerName}`}
                              className={`${BUTTON} hover:border-[#991B1B] hover:text-[#991B1B]`}
                            >
                              Spam
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>,
                  open ? (
                    <tr key={`${l.id}-panel`}>
                      <td colSpan={7} className="border-b border-[#EEF2F6] bg-[#F8FAFC] px-3 py-3">
                        {open === "next" ? (
                          <NextActionForm lead={l} meta={meta} onDone={() => { setPanel(null); onChanged(); }} onCancel={() => setPanel(null)} />
                        ) : (
                          <LostForm lead={l} meta={meta} onDone={() => { setPanel(null); onChanged(); }} onCancel={() => setPanel(null)} />
                        )}
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-[#5B6B80]">
          <span className="flex-grow">
            {total} lead{total === 1 ? "" : "s"} · page {page} of {pages}
          </span>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={BUTTON}>
            Previous
          </button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={BUTTON}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
