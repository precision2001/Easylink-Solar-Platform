"use client";

import { QuoteOptionsChip } from "./QuoteOptionsChip";
import Image from "next/image";
import Link from "next/link";
import { leadDesignHref } from "@/lib/designs/leadDesignLink";
import { SendDesignDialog } from "@/components/designs/SendDesignDialog";
import { DesignShareBadge } from "@/components/designs/DesignShareBadge";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/master-dashboard/quotes-leads/icons";
import { RoofDesignCell, RoofDesignViewer, useAutoRoofDesigns } from "@/components/master-dashboard/quotes-leads/RoofDesign";
import { STAGE_DOT } from "@/components/master-dashboard/quotes-leads/PipelineBoard";
import { QuotesDrawer } from "@/components/master-dashboard/quotes-leads/QuotesDrawer";
import {
  TASK_KINDS,
  TONE_CHIP,
  TONE_RAIL,
  addNextAction,
  ago,
  completeAction,
  defaultDueLocal,
  describeDue,
  initials,
  leadUrgency,
  personName,
  sourceKind,
  suburbOf,
  updateLeadPipeline,
  type LeadStage,
  type PipelineLead,
  type PipelineMeta,
  type PipelineSummary,
  type TaskKind,
} from "@/lib/admin/leads-pipeline";

/**
 * The working list of leads. Every row answers the same four questions in
 * the same place: what stage, who owns it, what happens next and how urgent
 * it is. Changes save as they're made.
 */

type View = "working" | "overdue" | "today" | "uncontacted" | "mine" | "unassigned" | "lost" | "spam";

const VIEW_GROUPS: { key: View; label: string; count?: keyof PipelineSummary }[][] = [
  [
    { key: "working", label: "All open", count: "open" },
    { key: "overdue", label: "Overdue", count: "overdue" },
    { key: "today", label: "Due today", count: "dueToday" },
    { key: "uncontacted", label: "Not contacted", count: "notContacted" },
  ],
  [
    { key: "mine", label: "Mine", count: "mine" },
    { key: "unassigned", label: "Unassigned", count: "unassigned" },
  ],
  [
    { key: "lost", label: "Lost" },
    { key: "spam", label: "Spam", count: "spam" },
  ],
];

const PAGE_SIZE = 20;

const FIELD =
  "h-9 rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 text-[13px] text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]";
const LABEL = "flex flex-col gap-1 text-[12px] font-semibold text-[#475569]";
const QUIET_BUTTON =
  "h-9 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#334155] hover:border-[#64748B] disabled:opacity-50";

type Panel = { leadId: string; kind: "next" | "lost" } | null;

/* ---------- small parts ---------- */

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  strong,
  expanded,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** The one obvious thing to do on this row. */
  strong?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] border transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${
        strong
          ? "border-[#0B1A2E] bg-[#0B1A2E] text-white hover:bg-[#1E2E45]"
          : "border-[#D5DCE5] bg-white text-[#334155] hover:border-[#64748B] hover:text-[#0F172A]"
      }`}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

/** A native select dressed as a pill, with something (a dot, initials) at its start. */
function PillSelect({
  label,
  value,
  onChange,
  disabled,
  lead,
  dashed,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  lead: ReactNode;
  dashed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-[176px]">
      <span className="pointer-events-none absolute left-2 top-1/2 flex -translate-y-1/2 items-center">{lead}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full cursor-pointer appearance-none truncate rounded-full bg-white pl-[30px] pr-7 text-[12.5px] font-semibold text-[#0F172A] transition-colors hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-[#2563EB] disabled:cursor-default ${
          dashed ? "border border-dashed border-[#D97706] text-[#92400E]" : "border border-[#D5DCE5]"
        }`}
      >
        {children}
      </select>
      <Icon name="chevron" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
    </div>
  );
}

/**
 * Starts a manual design for this lead: the Designs flow opens on the roof
 * with the lead's details and address filled in. Where the lead came from
 * sits underneath.
 */
function SolarDesignButton({ lead, onSend }: { lead: PipelineLead; onSend?: () => void }) {
  const kind = sourceKind(lead.source);
  return (
    <div className="flex flex-col items-start gap-1">
      <Link
        href={leadDesignHref(lead)}
        title={`Design a system for ${lead.customerName}${lead.address ? ` at ${lead.address}` : ""}`}
        className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-[8px] border border-[#CBD5E1] pl-1 pr-2.5 text-[12.5px] font-bold text-white no-underline shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
        style={{ backgroundImage: "linear-gradient(110deg, rgb(84, 116, 235) 10%, rgb(255, 60, 60) 100%)" }}
      >
        <Image alt="" src="/images/solarDesignLogo.png" width={24} height={24} className="shrink-0" />
        <span className="whitespace-nowrap">Solar Design</span>
        <span aria-hidden="true">→</span>
      </Link>
      <span className="truncate text-[11.5px] text-[#64748B]" title={lead.source ?? undefined}>
        {kind.label} · {ago(lead.createdAt)}
      </span>
      {lead.design ? <DesignShareBadge design={lead.design} onSend={onSend} size="sm" /> : null}
    </div>
  );
}


function RowMenu({ items }: { items: { label: string; danger?: boolean; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <IconButton icon="more" label="More actions" expanded={open} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[38px] z-20 min-w-[170px] overflow-hidden rounded-[10px] border border-[#E3E8EF] bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`block w-full px-3 py-2 text-left text-[13px] font-semibold hover:bg-[#F1F5F9] ${
                item.danger ? "text-[#B91C1C]" : "text-[#0F172A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- forms that open under a row ---------- */

function NextActionForm({ lead, meta, onDone, onCancel }: { lead: PipelineLead; meta: PipelineMeta; onDone: () => void; onCancel: () => void }) {
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
      setError(err instanceof Error ? err.message : "Could not save the next action.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="m-0 text-[13px] font-bold text-[#0F172A]">Next action for {lead.customerName}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className={LABEL}>
          Type
          <select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as TaskKind;
              setKind(k);
              setTitle(TASK_KINDS.find((t) => t.key === k)!.defaultTitle);
            }}
            className={`${FIELD} min-w-[130px]`}
          >
            {TASK_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} min-w-[240px] flex-[1_1_300px]`}>
          What needs doing
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={300}
            placeholder="Send the revised quote with a 10 kWh battery"
            className={FIELD}
          />
        </label>
        <label className={LABEL}>
          Due
          <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} required className={FIELD} />
        </label>
        <label className={LABEL}>
          Who
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${FIELD} min-w-[150px]`}>
            <option value="">Anyone</option>
            {meta.owners.map((o) => (
              <option key={o.id} value={o.id}>
                {personName(o)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="h-9 rounded-[8px] bg-[#0B1A2E] px-4 text-[13px] font-bold text-white hover:bg-[#1E2E45] disabled:opacity-60">
            {busy ? "Saving…" : "Save next action"}
          </button>
          <button type="button" onClick={onCancel} className={QUIET_BUTTON}>
            Cancel
          </button>
        </div>
      </div>
      {error ? <p className="m-0 text-[12.5px] font-semibold text-[#991B1B]">{error}</p> : null}
    </form>
  );
}

function LostForm({ lead, meta, onDone, onCancel }: { lead: PipelineLead; meta: PipelineMeta; onDone: () => void; onCancel: () => void }) {
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
      setError(err instanceof Error ? err.message : "Could not mark the lead lost.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="m-0 text-[13px] font-bold text-[#0F172A]">
        Mark {lead.customerName} as lost
        <span className="ml-2 font-normal text-[#5B6B80]">Its open tasks are cancelled. You can reopen it from Lost.</span>
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className={LABEL}>
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)} required className={`${FIELD} min-w-[230px]`}>
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
        <label className={`${LABEL} min-w-[240px] flex-[1_1_300px]`}>
          Note {reason === "Other" ? "" : "(optional)"}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required={reason === "Other"}
            maxLength={300}
            placeholder="Went with a quote $2k cheaper"
            className={FIELD}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !reason} className="h-9 rounded-[8px] bg-[#B91C1C] px-4 text-[13px] font-bold text-white hover:bg-[#991B1B] disabled:opacity-50">
            {busy ? "Saving…" : "Mark lost"}
          </button>
          <button type="button" onClick={onCancel} className={QUIET_BUTTON}>
            Cancel
          </button>
        </div>
      </div>
      {error ? <p className="m-0 text-[12.5px] font-semibold text-[#991B1B]">{error}</p> : null}
    </form>
  );
}

/* ---------- the table ---------- */

export function LeadsWorkspace({
  meta,
  summary,
  stage,
  onClearStage,
  reloadKey,
  onChanged,
}: {
  meta: PipelineMeta | null;
  summary: PipelineSummary | null;
  stage: LeadStage | null;
  onClearStage: () => void;
  /** Bumped by the page when something outside the table changed. */
  reloadKey: number;
  /** Tells the page a lead changed, so the board and counts refresh too. */
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>("working");
  const [rows, setRows] = useState<PipelineLead[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  // The lead whose quote versions are open in the side drawer.
  const [quotesFor, setQuotesFor] = useState<{ lead: PipelineLead; startWith: "list" | "create" } | null>(null);
  const [sendDesignFor, setSendDesignFor] = useState<PipelineLead | null>(null);

  // Every listed lead with an address gets a roof design from the platform
  // designer, on its own; results drop into the table as they finish.
  const { working: roofWorking, redesign: redesignRoof } = useAutoRoofDesigns(
    rows,
    (leadId, design) => setRows((rs) => rs?.map((r) => (r.id === leadId ? { ...r, roofDesign: design } : r)) ?? rs),
    view !== "spam",
  );

  useEffect(() => {
    setPage(1);
  }, [stage]);

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (query) params.set("search", query);
    if (stage) params.set("stage", stage);
    if (view === "overdue") params.set("due", "overdue");
    if (view === "today") params.set("due", "today");
    if (view === "uncontacted") params.set("contact", "none");
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

  const closeQuotes = useCallback(() => setQuotesFor(null), []);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stageLabel = (s: LeadStage) => meta?.stages.find((x) => x.key === s)?.label ?? s;
  const editable = view !== "spam" && view !== "lost";

  return (
    <section aria-labelledby="leads-title" className="flex flex-col overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#EEF2F6] px-5 pb-3 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="leads-title" className="m-0 flex-grow font-source-sans text-[19px] font-bold text-[#0F172A]">
            Leads
          </h2>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <label htmlFor="lead-search" className="sr-only">
              Search leads by name, email or address
            </label>
            <input
              id="lead-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or address"
              className={`${FIELD} min-w-0 flex-1 placeholder:text-[#94A3B8] sm:w-[240px] sm:flex-none`}
            />
            <button type="submit" className="h-9 rounded-[8px] bg-[#0B1A2E] px-3.5 text-[13px] font-bold text-white hover:bg-[#1E2E45]">
              Search
            </button>
          </form>
        </div>

        <div role="tablist" aria-label="Which leads" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {VIEW_GROUPS.map((group, gi) => (
            <div key={gi} className={`flex flex-wrap gap-1 ${gi > 0 ? "border-l border-[#E3E8EF] pl-3" : ""}`}>
              {group.map(({ key, label, count }) => {
                const n = count && summary ? summary[count] : null;
                const active = view === key;
                const alarm = (key === "overdue" || key === "uncontacted") && (n ?? 0) > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setView(key);
                      setPage(1);
                      setPanel(null);
                    }}
                    className={`flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
                      active ? "bg-[#0B1A2E] text-white" : "text-[#334155] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {label}
                    {n !== null ? (
                      <span
                        className={`min-w-[20px] rounded-full px-1.5 text-center text-[11.5px] font-bold tabular-nums ${
                          active ? "bg-white/20 text-white" : alarm ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-[#EEF2F6] text-[#475569]"
                        }`}
                      >
                        {n}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {stage ? (
          <div className="flex items-center gap-2 text-[13px] text-[#334155]">
            <span className="size-2 rounded-full" style={{ background: STAGE_DOT[stage] }} />
            Showing {stageLabel(stage)} only
            <button type="button" onClick={onClearStage} className="font-semibold text-[#1D4ED8] hover:underline">
              Show every stage
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="m-0 border-b border-[#FECACA] bg-[#FEF2F2] px-5 py-2.5 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {rows === null || !meta ? (
        <p className="m-0 px-5 py-8 text-[13px] text-[#5B6B80]">Loading leads…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 px-5 py-10 text-center text-[13.5px] text-[#5B6B80]">
          {query
            ? `No leads match “${query}”.`
            : view === "overdue"
              ? "Nothing is overdue."
              : view === "today"
                ? "Nothing else is due today."
                : view === "uncontacted"
                  ? "Every open lead has been contacted."
                  : view === "unassigned"
                    ? "Every open lead has an owner."
                    : view === "spam"
                      ? "Nothing is marked as spam."
                      : view === "lost"
                        ? "No lost leads."
                        : "No open leads."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-[13px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[136px]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[27%]" />
              <col className="w-[148px]" />
              <col className="w-[56px]" />
            </colgroup>
            <thead>
              <tr className="bg-[#F8FAFC] text-left text-[12px] text-[#5B6B80]">
                {["Customer", "Roof design", "Stage", "Sales owner", "Next action", "Source", ""].map((h, i) => (
                  <th key={i} scope="col" className={`border-b border-[#E3E8EF] py-2 font-semibold ${i === 0 ? "pl-5" : "px-2"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const busy = busyId === l.id;
                const open = panel?.leadId === l.id ? panel.kind : null;
                const tone = leadUrgency(l);
                const due = l.nextAction ? describeDue(l.nextAction.dueAt) : null;
                const chip = TONE_CHIP[due?.tone ?? "late"];
                const second = [l.customerPhone, suburbOf(l.address)].filter(Boolean).join(" · ");
                const menu =
                  view === "lost"
                    ? [{ label: "Reopen lead", onSelect: () => void act(l, () => updateLeadPipeline(l.id, { reopen: true })) }]
                    : view === "spam"
                      ? [{ label: "Not spam", onSelect: () => void setSpam(l, false) }]
                      : [
                          { label: "New quote", onSelect: () => setQuotesFor({ lead: l, startWith: "create" }) },
                          { label: "Quotes", onSelect: () => setQuotesFor({ lead: l, startWith: "list" }) },
                          ...(l.design ? [{ label: "Send design to customer", onSelect: () => setSendDesignFor(l) }] : []),
                          { label: "Mark as lost…", danger: true, onSelect: () => setPanel({ leadId: l.id, kind: "lost" }) },
                          { label: "Mark as spam", danger: true, onSelect: () => void setSpam(l, true) },
                        ];
                return [
                  <tr
                    key={l.id}
                    className={`group transition-colors hover:bg-[#F8FAFC] ${busy ? "opacity-50" : ""} ${open ? "bg-[#F8FAFC]" : ""}`}
                  >
                    <td className="relative border-b border-[#EEF2F6] py-3 pl-5 pr-2 align-middle">
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: TONE_RAIL[tone] }} />
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2F6] text-[12px] font-bold text-[#334155]">
                          {initials({ id: "", firstName: l.customerName.split(" ")[0] ?? "", lastName: l.customerName.split(" ").slice(-1)[0] ?? "" })}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/master/customers/${l.id}`}
                            className="block truncate text-[14px] font-bold text-[#0F172A] no-underline hover:underline"
                          >
                            {l.customerName}
                          </Link>
                          <div className="truncate text-[12.5px] text-[#5B6B80]" title={l.customerEmail ?? undefined}>
                            {second || l.customerEmail || "No contact details"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="border-b border-[#EEF2F6] px-2 py-3 align-middle">
                      <RoofDesignCell
                        lead={l}
                        working={roofWorking.has(l.id)}
                        onOpen={() => setViewing(l.id)}
                        onRetry={() => redesignRoof(l.id)}
                      />
                      <QuoteOptionsChip leadId={l.id} customerName={l.customerName} open={l.openQuotes} />
                    </td>

                    <td className="border-b border-[#EEF2F6] px-2 py-3 align-middle">
                      {editable ? (
                        <PillSelect
                          label={`Stage for ${l.customerName}`}
                          value={l.stage}
                          disabled={busy}
                          onChange={(v) => void act(l, () => updateLeadPipeline(l.id, { stage: v as LeadStage }))}
                          lead={<span className="ml-1 size-2 rounded-full" style={{ background: STAGE_DOT[l.stage] }} />}
                        >
                          {meta.stages.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </PillSelect>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 font-semibold text-[#334155]">
                            <span className="size-2 rounded-full" style={{ background: STAGE_DOT[l.stage] }} />
                            {stageLabel(l.stage)}
                          </span>
                          {view === "lost" && l.lostReason ? (
                            <span className="text-[12px] font-semibold text-[#B91C1C]">{l.lostReason}</span>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="border-b border-[#EEF2F6] px-2 py-3 align-middle">
                      {editable ? (
                        <PillSelect
                          label={`Sales owner for ${l.customerName}`}
                          value={l.owner?.id ?? ""}
                          disabled={busy}
                          dashed={!l.owner}
                          onChange={(v) => void act(l, () => updateLeadPipeline(l.id, { ownerId: v || null }))}
                          lead={
                            l.owner ? (
                              <span className="flex size-[18px] items-center justify-center rounded-full bg-[#0B1A2E] text-[9px] font-bold text-white">
                                {initials(l.owner)}
                              </span>
                            ) : (
                              <Icon name="users" size={14} className="ml-0.5 text-[#D97706]" />
                            )
                          }
                        >
                          <option value="">Assign sales owner</option>
                          {meta.owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {personName(o)}
                            </option>
                          ))}
                        </PillSelect>
                      ) : (
                        <span className="text-[#334155]">{personName(l.owner) || "—"}</span>
                      )}
                    </td>

                    <td className="border-b border-[#EEF2F6] px-2 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          {l.nextAction ? (
                            <>
                              <div className="truncate text-[13px] font-semibold text-[#0F172A]" title={l.nextAction.title}>
                                {l.nextAction.title}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-[2px] text-[11.5px] font-semibold" style={{ background: chip.bg, color: chip.fg }}>
                                  <Icon name="clock" size={12} />
                                  {due!.text}
                                </span>
                                {l.respondBy ? <span className="text-[11.5px] font-semibold text-[#B91C1C]">Not contacted yet</span> : null}
                              </div>
                            </>
                          ) : l.status === "LOST" ? (
                            <span className="text-[12.5px] text-[#94A3B8]">—</span>
                          ) : (
                            <>
                              <div className="text-[13px] font-semibold text-[#B91C1C]">No next action</div>
                              <div className="mt-0.5 text-[11.5px] text-[#64748B]">
                                {l.respondBy ? "Not contacted yet" : "Set one so this lead doesn't stall"}
                              </div>
                            </>
                          )}
                        </div>
                        {editable ? (
                          <div className="flex shrink-0 gap-1.5">
                            {l.nextAction ? (
                              <IconButton
                                icon="check"
                                label={`Mark “${l.nextAction.title}” done`}
                                disabled={busy}
                                onClick={() => void act(l, () => completeAction(l.nextAction!.id))}
                              />
                            ) : null}
                            <IconButton
                              icon="plus"
                              label="Set the next action"
                              disabled={busy}
                              strong={!l.nextAction}
                              expanded={open === "next"}
                              onClick={() => setPanel(open === "next" ? null : { leadId: l.id, kind: "next" })}
                            />
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="border-b border-[#EEF2F6] px-2 py-3 align-middle">
                      <SolarDesignButton lead={l} onSend={() => setSendDesignFor(l)} />
                      {view === "spam" && l.spamReason ? (
                        <div className="mt-1 text-[11.5px] text-[#B91C1C]">{l.spamReason}</div>
                      ) : l.spamSuggestion?.length ? (
                        <div
                          className="mt-1 w-fit rounded-[6px] bg-[#FEF3C7] px-1.5 py-[2px] text-[11.5px] font-semibold text-[#92400E]"
                          title={`Spam check: ${l.spamSuggestion.join(", ")}`}
                        >
                          Looks like spam
                        </div>
                      ) : null}
                    </td>

                    <td className="border-b border-[#EEF2F6] py-3 pl-1 pr-4 align-middle">
                      <div className="flex justify-end">
                        <RowMenu items={menu} />
                      </div>
                    </td>
                  </tr>,
                  open && meta ? (
                    <tr key={`${l.id}-panel`}>
                      <td colSpan={7} className="border-b border-[#E3E8EF] bg-[#F8FAFC] px-5 pb-4 pt-1">
                        <div className="rounded-[12px] border border-[#E3E8EF] bg-white p-4">
                          {open === "next" ? (
                            <NextActionForm lead={l} meta={meta} onDone={() => { setPanel(null); onChanged(); }} onCancel={() => setPanel(null)} />
                          ) : (
                            <LostForm lead={l} meta={meta} onDone={() => { setPanel(null); onChanged(); }} onCancel={() => setPanel(null)} />
                          )}
                        </div>
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
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 text-[12.5px] text-[#5B6B80]">
          <span className="flex-grow">
            {total} lead{total === 1 ? "" : "s"}
            {pages > 1 ? ` · page ${page} of ${pages}` : ""}
          </span>
          {pages > 1 ? (
            <>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={QUIET_BUTTON}>
                Previous
              </button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={QUIET_BUTTON}>
                Next
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {viewing && rows?.find((r) => r.id === viewing)?.roofDesign ? (
        <RoofDesignViewer
          lead={rows.find((r) => r.id === viewing)!}
          working={roofWorking.has(viewing)}
          onClose={() => setViewing(null)}
          onRedesign={() => redesignRoof(viewing)}
        />
      ) : null}
      {sendDesignFor?.design ? (
        <SendDesignDialog
          portal="admin"
          designId={sendDesignFor.design.id}
          customerName={sendDesignFor.customerName}
          phone={sendDesignFor.customerPhone}
          email={sendDesignFor.customerEmail}
          onClose={() => setSendDesignFor(null)}
          onSent={(r) => {
            if (!r.sharedAt) return;
            const id = sendDesignFor.id;
            setRows((rs) =>
              rs?.map((x) =>
                x.id === id && x.design
                  ? { ...x, design: { ...x.design, sharedAt: r.sharedAt, updatedAt: r.sharedAt!, sharedChannels: [r.email === "sent" ? "EMAIL" : null, r.sms === "sent" ? "SMS" : null].filter(Boolean).join(",") } }
                  : x,
              ) ?? rs,
            );
          }}
        />
      ) : null}
      {quotesFor ? (
        <QuotesDrawer
          key={quotesFor.lead.id}
          lead={quotesFor.lead}
          startWith={quotesFor.startWith}
          onClose={closeQuotes}
          onChanged={onChanged}
        />
      ) : null}
    </section>
  );
}
