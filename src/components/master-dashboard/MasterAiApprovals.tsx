"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ai,
  AGENT_NAMES,
  AiNotConnectedError,
  LABEL_NAMES,
  timeAgo,
  type AiInboxItem,
} from "@/lib/ai-platform/client";

/**
 * AI approvals: the human inbox (spec 8.6). Every proposal an agent could not
 * make on its own lands here with the agent's reasoning. Approving runs the
 * exact action through the same policy checks; editing first teaches the
 * agent (the edit is recorded); rejecting with a reason is a correction.
 */
const KIND_LABEL: Record<AiInboxItem["kind"], string> = {
  proposal: "Needs approval",
  question: "Question",
  review: "Check",
  exception: "Exception",
  alert: "Alert",
};

const RECORD_HREF: Record<string, (id: string) => string> = {
  lead: () => "/master/quotes-leads",
  customer: () => "/master/quotes-leads",
};

export function MasterAiApprovals() {
  const [items, setItems] = useState<AiInboxItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AiInboxItem["kind"]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    () =>
      ai
        .inbox("open")
        .then((list) => {
          setItems(list);
          setState("ready");
          setNow(Date.now());
        })
        .catch((e: unknown) => {
          if (e instanceof AiNotConnectedError) setState("offline");
          else {
            setState("error");
            setMessage(e instanceof Error ? e.message : "Could not load approvals");
          }
        }),
    [],
  );

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => void load(), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const shown = useMemo(() => items.filter((i) => filter === "all" || i.kind === filter), [items, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);
  const overdue = items.filter((i) => new Date(i.dueAt).getTime() < now).length;

  const run = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id);
    setMessage(null);
    try {
      const r = (await fn()) as { status?: string; message?: string } | undefined;
      if (r && typeof r === "object" && "status" in r && r.status && r.status !== "executed") {
        setMessage(`Not done: ${r.message ?? r.status}`);
      } else setMessage(done);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">AI approvals</span>
        </nav>
        <Link href="/master/ai-control" className="text-[13px] font-semibold text-[#0B4A7A] hover:underline">
          AI control centre
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-grow flex-col gap-1">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Waiting for a person</h1>
            <span className="text-[14px] text-[#475569]">
              {state === "ready"
                ? `${items.length} open${overdue ? ` · ${overdue} overdue` : ""}. Approve, edit, or reject with a reason; agents learn from every decision.`
                : "Proposals, questions and checks from the AI agents."}
            </span>
          </div>
          <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5">
            {(["all", "proposal", "question", "review"] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className="h-8 rounded-full border px-3 text-[12px] font-bold"
                style={{
                  background: filter === f ? "#0B4A7A" : "#FFFFFF",
                  color: filter === f ? "#FFFFFF" : "#0B2540",
                  borderColor: filter === f ? "#0B4A7A" : "#CBD5E1",
                }}
              >
                {f === "all" ? "All" : KIND_LABEL[f]} {counts[f] ? `(${counts[f]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div role="status" className="rounded-[12px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-[13px] text-[#1E3A8A]">
            {message}
          </div>
        )}

        {state === "loading" && <p className="text-[14px] text-[#475569]">Loading…</p>}
        {state === "offline" && (
          <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">
            <strong className="block text-[16px] text-[#0F172A]">AI platform not connected</strong>
            Set <code>AI_PLATFORM_URL</code> and <code>AI_EVENT_INGEST_KEY</code> on the web server to see live approvals here.
          </div>
        )}
        {state === "ready" && shown.length === 0 && (
          <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-8 text-center text-[14px] text-[#475569]">
            Nothing waiting. Agents are working within their limits.
          </div>
        )}

        {shown.map((item) => (
          <InboxCard
            key={item.id}
            item={item}
            now={now}
            busy={busy === item.id}
            onApprove={(input) => run(item.id, () => ai.approve(item.id, input), input ? "Approved with your edits." : "Approved and done.")}
            onReject={(reason) => run(item.id, () => ai.reject(item.id, reason), "Rejected. The agent will learn from your reason.")}
            onResolve={(body) => run(item.id, () => ai.resolve(item.id, body), "Thanks, recorded.")}
          />
        ))}
      </div>
    </div>
  );
}

function InboxCard({
  item,
  now,
  busy,
  onApprove,
  onReject,
  onResolve,
}: {
  item: AiInboxItem;
  now: number;
  busy: boolean;
  onApprove: (input?: Record<string, unknown>) => void;
  onReject: (reason: string) => void;
  onResolve: (body: { note?: string; label?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(item.input ?? {});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [answer, setAnswer] = useState("");
  const overdue = new Date(item.dueAt).getTime() < now;
  const subjectHref = item.subject && RECORD_HREF[item.subject.type]?.(item.subject.id);

  const fields = (draft.fields as Record<string, unknown> | undefined) ?? undefined;

  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]" aria-label={item.title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#9CCFF3] bg-[#EEF7FE] px-2 py-0.5 text-[12px] font-bold text-[#0B2540]">
          {KIND_LABEL[item.kind]}
        </span>
        {item.agentId && <span className="text-[12px] font-semibold text-[#475569]">{AGENT_NAMES[item.agentId] ?? item.agentId} agent</span>}
        <span className="flex-grow" />
        <span className="text-[12px] font-semibold" style={{ color: overdue ? "#991B1B" : "#475569" }}>
          {overdue ? `Overdue ${timeAgo(item.dueAt).replace(" ago", "")}` : `Due ${timeAgo(item.dueAt)}`} · raised {timeAgo(item.createdAt)}
        </span>
      </div>

      <h2 className="m-0 text-[17px] font-bold text-[#0F172A]">{item.title}</h2>
      {item.subject && (
        <span className="text-[13px] text-[#475569]">
          About {item.subject.type}{" "}
          {subjectHref ? (
            <Link href={subjectHref} className="font-semibold text-[#0B4A7A] hover:underline">
              {item.subject.id}
            </Link>
          ) : (
            <strong>{item.subject.id}</strong>
          )}
        </span>
      )}
      {item.reasoning && (
        <p className="m-0 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#334155]">
          <span className="font-semibold text-[#0F172A]">Why: </span>
          {item.reasoning}
        </p>
      )}

      {item.kind === "proposal" && item.action === "send_message" && <MessagePreview input={draft} editing={editing} onChange={setDraft} />}
      {item.kind === "proposal" && fields && (
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
          {Object.entries(fields).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-[#475569]">{k}</dt>
              <dd className="m-0 text-[#0F172A]">
                {editing ? (
                  <input
                    aria-label={k}
                    value={String(v ?? "")}
                    onChange={(e) => setDraft({ ...draft, fields: { ...fields, [k]: e.target.value } })}
                    className="h-8 w-full rounded-[8px] border border-[#CBD5E1] px-2"
                  />
                ) : (
                  String(v)
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {item.kind === "proposal" && item.action && item.action !== "send_message" && !fields && (
        <pre className="m-0 max-h-48 overflow-auto rounded-[10px] bg-[#F8FAFC] p-3 text-[12px] text-[#334155]">{JSON.stringify(item.input, null, 2)}</pre>
      )}

      {item.kind === "review" && Array.isArray(item.input?.labels) && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-[#334155]">Pick the right label. The AI uses your answer for this file and learns from it.</span>
          <div className="flex flex-wrap gap-1.5">
            {[...(item.input!.labels as { label: string; confidence: number }[]).map((l) => l.label), ...Object.keys(LABEL_NAMES)]
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, 10)
              .map((l) => {
                const c = (item.input!.labels as { label: string; confidence: number }[]).find((x) => x.label === l)?.confidence;
                return (
                  <button
                    key={l}
                    disabled={busy}
                    onClick={() => onResolve({ label: l })}
                    className="h-8 rounded-full border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A] hover:border-[#0B4A7A]"
                  >
                    {LABEL_NAMES[l] ?? l}
                    {c != null ? ` · ${Math.round(c * 100)}%` : ""}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {item.kind === "question" && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`ans-${item.id}`} className="text-[13px] font-semibold text-[#0F172A]">
            Your answer
          </label>
          <textarea
            id={`ans-${item.id}`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={2}
            className="rounded-[10px] border border-[#CBD5E1] p-2 text-[13px]"
          />
          <div>
            <button
              disabled={busy || answer.trim().length < 2}
              onClick={() => onResolve({ note: answer.trim() })}
              className="h-9 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white disabled:opacity-50"
            >
              Send answer
            </button>
          </div>
        </div>
      )}

      {item.kind === "proposal" && (
        <div className="flex flex-wrap items-center gap-2">
          {!rejecting && (
            <>
              <button
                disabled={busy}
                onClick={() => onApprove(editing ? draft : undefined)}
                className="h-9 rounded-[10px] bg-[#166534] px-4 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {editing ? "Approve with edits" : "Approve"}
              </button>
              <button
                disabled={busy}
                onClick={() => setEditing((e) => !e)}
                className="h-9 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-bold text-[#0F172A]"
              >
                {editing ? "Cancel edit" : "Edit"}
              </button>
              <button
                disabled={busy}
                onClick={() => setRejecting(true)}
                className="h-9 rounded-[10px] border border-[#991B1B] bg-white px-4 text-[13px] font-bold text-[#991B1B]"
              >
                Reject
              </button>
            </>
          )}
          {rejecting && (
            <form
              className="flex w-full flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim().length >= 2) onReject(reason.trim());
              }}
            >
              <label htmlFor={`rej-${item.id}`} className="sr-only">
                Reason
              </label>
              <input
                id={`rej-${item.id}`}
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why not? e.g. wrong customer, needs a call first"
                className="h-9 min-w-[260px] flex-grow rounded-[10px] border border-[#CBD5E1] px-3 text-[13px]"
              />
              <button type="submit" disabled={busy || reason.trim().length < 2} className="h-9 rounded-[10px] bg-[#991B1B] px-4 text-[13px] font-bold text-white disabled:opacity-50">
                Reject
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="h-9 px-2 text-[13px] font-semibold text-[#475569]">
                Cancel
              </button>
            </form>
          )}
        </div>
      )}
      {item.kind === "review" && !Array.isArray(item.input?.labels) && (
        <div>
          <button disabled={busy} onClick={() => onResolve({ note: "confirmed" })} className="h-9 rounded-[10px] bg-[#166534] px-4 text-[13px] font-bold text-white">
            Confirm
          </button>
        </div>
      )}
    </article>
  );
}

function MessagePreview({ input, editing, onChange }: { input: Record<string, unknown>; editing: boolean; onChange: (v: Record<string, unknown>) => void }) {
  const to = (input.to as { record?: { type: string; id: string } } | undefined)?.record;
  const channels = (input.channel as string[] | undefined) ?? [];
  const files = (input.files as { id: string }[] | undefined) ?? [];
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#E3E8EF] p-3 text-[13px]">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#475569]">
        <span>
          To <strong className="text-[#0F172A]">{to ? `${to.type} ${to.id}` : "—"}</strong> (contact details on file)
        </span>
        <span>
          By <strong className="text-[#0F172A]">{channels.join(" + ").toUpperCase()}</strong>
        </span>
        {files.length > 0 && (
          <span>
            <strong className="text-[#0F172A]">{files.length}</strong> file link{files.length > 1 ? "s" : ""} (expire in 7 days)
          </span>
        )}
      </div>
      {typeof input.subject === "string" &&
        (editing ? (
          <input
            aria-label="Subject"
            value={String(input.subject)}
            onChange={(e) => onChange({ ...input, subject: e.target.value })}
            className="h-9 rounded-[8px] border border-[#CBD5E1] px-2 font-semibold"
          />
        ) : (
          <strong className="text-[#0F172A]">{String(input.subject)}</strong>
        ))}
      {editing ? (
        <textarea
          aria-label="Message"
          value={String(input.body ?? "")}
          onChange={(e) => onChange({ ...input, body: e.target.value })}
          rows={4}
          className="rounded-[8px] border border-[#CBD5E1] p-2"
        />
      ) : (
        <p className="m-0 whitespace-pre-wrap text-[#0F172A]">{String(input.body ?? "")}</p>
      )}
    </div>
  );
}
