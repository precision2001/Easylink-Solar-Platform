"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ai,
  AGENT_NAMES,
  AiNotConnectedError,
  LABEL_NAMES,
  ROLE_NAMES,
  timeAgo,
  type AiPortal,
  type AiRecordPanel as Panel,
  type RecordRef,
} from "@/lib/ai-platform/client";

/**
 * The AI side of any lead or customer record, for the existing record screens
 * (installer customer profile, master quotes & leads). Shows the AI summary,
 * confirmed facts, photos grouped by the AI's labels, and — for staff — what
 * the agents did and what is waiting. Renders nothing when the AI platform is
 * not connected, so existing pages are unchanged.
 */
export function AiRecordPanel({ record, portal, compact = false }: { record: RecordRef; portal: AiPortal; compact?: boolean }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");
  const [sending, setSending] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    ai.panel(portal, record)
      .then((p) => {
        // A record the AI platform doesn't know yet comes back without lists; treat that as empty.
        const list = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
        setPanel(p ? { ...p, files: list(p.files), facts: list(p.facts), inbox: list(p.inbox), decisions: list(p.decisions), summary: p.summary ? { ...p.summary, openItems: list(p.summary.openItems) } : p.summary } : null);
        setState(p ? "ready" : "hidden");
      })
      .catch((e) => setState(e instanceof AiNotConnectedError ? "hidden" : "hidden"));
  }, [portal, record]);

  useEffect(() => {
    load();
  }, [load]);

  if (state !== "ready" || !panel) return null;

  const groups = new Map<string, Panel["files"]>();
  for (const f of panel.files) {
    const top = f.labels[0];
    const key = f.reviewState === "pending" ? "pending" : top && top.confidence >= 0.7 ? top.label : "unsure";
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }

  const requestPhotos = async (slots: string[]) => {
    setSending("photos");
    setNote(null);
    try {
      const r = await ai.action(portal, "start_workflow", { template: "request_missing_photos", inputs: { to: record, slots } });
      setNote(r.status === "executed" ? "Request sent to the customer." : r.status === "proposed" ? "Request is waiting for approval." : `Not sent: ${r.message ?? r.policy?.reasons?.join("; ") ?? r.status}`);
      load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not send the request");
    } finally {
      setSending(null);
    }
  };

  const have = new Set([...groups.keys()]);
  const ready = panel.files.filter((f) => (f.routes?.length ?? 0) > 0 && !(f.deliveredTo?.length));
  const missing = ["meter", "switchboard", "roof"].filter((s) => !have.has(s));

  return (
    <section aria-label="AI on this record" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[#0B4A7A] text-[11px] font-bold text-white">
          AI
        </span>
        <h3 className="m-0 flex-grow text-[15px] font-bold text-[#0F172A]">{panel.summary?.headline ?? "AI summary"}</h3>
        {panel.summary && <span className="text-[11px] text-[#5B6B80]">updated {timeAgo(panel.summary.updatedAt)}</span>}
      </div>
      {panel.summary?.text && <p className="m-0 text-[13px] text-[#334155]">{panel.summary.text}</p>}
      {!!panel.summary?.openItems.length && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-[#0F172A]">
          {panel.summary.openItems.map((o) => (
            <li key={o} className="flex gap-2">
              <span aria-hidden="true" className="text-[#0B4A7A]">○</span>
              {o}
            </li>
          ))}
        </ul>
      )}

      {panel.facts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">Good to know</span>
          {panel.facts.map((f) => (
            <span key={f.id} className="text-[13px] text-[#0F172A]">
              {f.statement}
              {!f.confirmed && <span className="ml-1 text-[11px] font-semibold text-[#92400E]">(unconfirmed)</span>}
            </span>
          ))}
        </div>
      )}

      {panel.files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">Photos and documents, labelled by AI</span>
          <div className="flex flex-wrap gap-1.5">
            {[...groups.entries()].map(([label, files]) => (
              <span
                key={label}
                title={files.map((f) => f.name).join(", ")}
                className="rounded-full border px-2.5 py-1 text-[12px] font-semibold"
                style={
                  label === "unsure"
                    ? { background: "#FFFBEB", color: "#92400E", borderColor: "#FCD34D" }
                    : label === "pending"
                      ? { background: "#F1F5F9", color: "#475569", borderColor: "#E2E8F0" }
                      : { background: "#EEF7FE", color: "#0B2540", borderColor: "#9CCFF3" }
                }
              >
                {label === "unsure" ? "Needs a check" : label === "pending" ? "Labelling…" : LABEL_NAMES[label] ?? label} · {files.length}
              </span>
            ))}
          </div>
        </div>
      )}

      {ready.length > 0 && !compact && (
        <ReadyToSend
          files={ready}
          record={record}
          portal={portal}
          onDone={(msg) => {
            setNote(msg);
            load();
          }}
        />
      )}

      {(record.type === "customer" || record.type === "lead") && missing.length > 0 && !compact && (
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-[#475569]">No {missing.map((m) => LABEL_NAMES[m]?.toLowerCase() ?? m).join(", ")} photo yet.</span>
          <button
            type="button"
            disabled={sending === "photos"}
            onClick={() => void requestPhotos(missing)}
            className="h-8 rounded-[8px] border border-[#0B4A7A] px-3 text-[12px] font-bold text-[#0B4A7A] disabled:opacity-50"
          >
            Ask the customer for them
          </button>
        </div>
      )}
      {note && <span role="status" className="text-[12px] text-[#1E3A8A]">{note}</span>}

      {portal === "admin" && panel.inbox.length > 0 && (
        <div className="rounded-[10px] bg-[#EEF7FE] px-3 py-2 text-[13px] text-[#0B2540]">
          <strong>{panel.inbox.length} waiting for a person:</strong> {panel.inbox.map((i) => i.title).join(" · ")}{" "}
          <a href="/master/ai-approvals" className="font-semibold underline">
            Review
          </a>
        </div>
      )}
      {portal === "admin" && panel.decisions.length > 0 && !compact && (
        <details className="text-[13px]">
          <summary className="cursor-pointer font-semibold text-[#0F172A]">What the AI did here ({panel.decisions.length})</summary>
          <ul className="mt-1 flex list-none flex-col gap-1 p-0">
            {panel.decisions.slice(0, 10).map((d) => (
              <li key={d.id} className="text-[#334155]">
                <strong>{AGENT_NAMES[d.agentId] ?? d.agentId}</strong> · {d.outcome.replace("_", " ")} · {timeAgo(d.createdAt)}
                {d.reasoningSummary ? ` — ${d.reasoningSummary}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/**
 * AI labels for the files on a record, keyed by document id, for existing file
 * lists. Polls briefly after an upload because labelling runs a few seconds
 * behind the upload. Empty when the AI platform is not connected.
 */
export function useAiFileLabels(portal: AiPortal, record: RecordRef | null, refreshKey: unknown) {
  const [labels, setLabels] = useState<Map<string, { label: string; confidence: number; reviewState: string }>>(new Map());
  const type = record?.type;
  const id = record?.id;
  useEffect(() => {
    if (!type || !id) return;
    let alive = true;
    let tries = 0;
    const tick = async () => {
      try {
        const p = await ai.panel(portal, { type, id });
        if (!alive) return;
        const m = new Map<string, { label: string; confidence: number; reviewState: string }>();
        const files = Array.isArray(p?.files) ? p.files : [];
        for (const f of files) if (f.labels?.[0]) m.set(f.id, { ...f.labels[0], reviewState: f.reviewState });
        setLabels(m);
        if (files.some((f) => f.reviewState === "pending") && tries++ < 5) setTimeout(() => void tick(), 4000);
      } catch {
        /* not connected: no labels */
      }
    };
    void tick();
    return () => {
      alive = false;
    };
  }, [portal, type, id, refreshKey]);
  return labels;
}

export function AiLabelChip({ label }: { label?: { label: string; confidence: number; reviewState: string } }) {
  if (!label) return null;
  const unsure = label.reviewState === "needs_review" || label.confidence < 0.7;
  return (
    <span
      title={`Labelled by AI · ${Math.round(label.confidence * 100)}%${unsure ? " · needs a check" : ""}`}
      className="ml-2 inline-flex items-center rounded-full border px-1.5 py-px align-middle text-[10.5px] font-semibold"
      style={unsure ? { background: "#FFFBEB", color: "#92400E", borderColor: "#FCD34D" } : { background: "#EEF7FE", color: "#0B2540", borderColor: "#9CCFF3" }}
    >
      {LABEL_NAMES[label.label] ?? label.label}
      {unsure ? "?" : ""}
    </span>
  );
}

/**
 * Documents the AI has read and linked that normally go to someone (a Proof of
 * Completion → customer + retailer). One tap sends them; the retailer's address
 * is found by the AI if it isn't on file, and a newly found address waits for
 * one EasyLink staff OK. Recipients can be removed, or anyone added by name.
 */
function ReadyToSend({ files, record, portal, onDone }: { files: Panel["files"]; record: RecordRef; portal: AiPortal; onDone: (msg: string) => void }) {
  const [recipients, setRecipients] = useState<string[]>(() => Array.from(new Set(files.flatMap((f) => f.routes ?? []))));
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const issues = files.flatMap((f) => (f.issues ?? []).map((i) => `${f.name}: ${i}`));

  const send = async () => {
    setBusy(true);
    try {
      const to = [...recipients, ...extra.map((organisation) => ({ organisation, kind: "other" }))];
      const r = await ai.action(portal, "start_workflow", {
        template: "deliver_documents",
        inputs: { about: record, documents: files.map((f) => ({ type: "document", id: f.id })), to },
      });
      const steps = ((r.result as { results?: { step: string; status: string; message?: string }[] } | undefined)?.results ?? []).filter((s) => s.step.startsWith("send-") || s.step.startsWith("missing-"));
      const sent = steps.filter((s) => s.status === "executed" && s.step.startsWith("send-")).length;
      const waiting = steps.filter((s) => s.status === "proposed").length;
      const blocked = steps.filter((s) => s.status === "denied");
      const asked = steps.filter((s) => s.step.startsWith("missing-")).length;
      onDone(
        r.status !== "executed" && r.status !== "proposed"
          ? `Not sent: ${r.message ?? r.policy?.reasons?.join("; ") ?? r.status}`
          : [
              sent ? `Sent to ${sent} recipient${sent > 1 ? "s" : ""}.` : "",
              waiting ? `${waiting} waiting for an EasyLink OK (new contact found by AI).` : "",
              asked ? "EasyLink has been asked who should receive the rest." : "",
              blocked.length ? `Blocked: ${blocked.map((b) => b.message).join("; ")}` : "",
            ]
              .filter(Boolean)
              .join(" ") || "Done.",
      );
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-[#9CCFF3] bg-[#F5FAFE] p-3" aria-label="Documents ready to send">
      <span className="text-[13px] font-bold text-[#0B2540]">
        {files.length} document{files.length > 1 ? "s" : ""} ready to send
      </span>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-[12.5px] text-[#0F172A]">
        {files.map((f) => (
          <li key={f.id}>
            {LABEL_NAMES[f.labels[0]?.label ?? ""] ?? f.name} <span className="text-[#5B6B80]">· {f.name}</span>
          </li>
        ))}
      </ul>
      {issues.length > 0 && (
        <div role="alert" className="rounded-[8px] bg-[#FFFBEB] px-2.5 py-1.5 text-[12px] text-[#92400E]">
          {issues.map((i) => (
            <div key={i}>⚠ {i}</div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        <span className="font-semibold text-[#475569]">To:</span>
        {[...recipients.map((r) => ({ k: r, label: ROLE_NAMES[r] ?? r, extra: false })), ...extra.map((e) => ({ k: e, label: e, extra: true }))].map((r) => (
          <span key={r.k} className="inline-flex items-center gap-1 rounded-full border border-[#9CCFF3] bg-white px-2 py-0.5 font-semibold text-[#0B2540]">
            {r.label}
            <button
              type="button"
              aria-label={`Remove ${r.label}`}
              onClick={() => (r.extra ? setExtra((x) => x.filter((y) => y !== r.k)) : setRecipients((x) => x.filter((y) => y !== r.k)))}
              className="leading-none text-[#5B6B80] hover:text-[#991B1B]"
            >
              ×
            </button>
          </span>
        ))}
        <form
          className="inline-flex"
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim();
            if (v.length >= 2) setExtra((x) => Array.from(new Set([...x, v])));
            setDraft("");
          }}
        >
          <label htmlFor={`add-${record.id}`} className="sr-only">
            Add a recipient by name
          </label>
          <input
            id={`add-${record.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="+ add anyone, e.g. Origin Energy"
            className="h-7 w-[200px] rounded-full border border-[#CBD5E1] bg-white px-2.5 text-[12px]"
          />
        </form>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || recipients.length + extra.length === 0}
          onClick={() => void send()}
          className="h-8 rounded-[8px] bg-[#0B4A7A] px-3.5 text-[12.5px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Sending…" : issues.length ? "Send anyway" : "Send"}
        </button>
        <span className="text-[11.5px] text-[#5B6B80]">Already saved and linked to this job, the customer file and the installer account.</span>
      </div>
    </div>
  );
}
