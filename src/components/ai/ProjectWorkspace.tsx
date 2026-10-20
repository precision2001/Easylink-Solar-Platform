"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ai,
  AiNotConnectedError,
  LABEL_NAMES,
  ROLE_NAMES,
  timeAgo,
  type AiPortal,
  type HistoryLine,
  type MessageCopyView,
  type ProjectDetail,
  type ProjectFile,
  type RecordRef,
} from "@/lib/ai-platform/client";

/**
 * One project's files and history, the same in every portal (spec 8.8).
 * What appears depends on who is signed in, decided by the AI platform:
 *   staff — everything, contact details, and changing the installer;
 *   installer — projects assigned to them, with the full history;
 *   customer — their own project, including everything from its installers.
 */
type Tab = "files" | "history" | "installer";

const KIND_DOT: Record<string, string> = {
  file: "#0B4A7A",
  ai: "#6D28D9",
  message: "#0E7490",
  warning: "#B45309",
  assignment: "#166534",
  booking: "#0B4A7A",
  record: "#475569",
  call: "#0E7490",
  approval: "#92400E",
};

const STATUS: Record<MessageCopyView["status"], [string, string, string]> = {
  sent: ["Sent", "#F1F5F9", "#334155"],
  delivered: ["Delivered", "#DCFCE7", "#166534"],
  opened: ["Opened", "#DCFCE7", "#166534"],
  bounced: ["Bounced", "#FEE2E2", "#991B1B"],
  failed: ["Not delivered", "#FEE2E2", "#991B1B"],
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtSize = (n: number | null) => (n == null ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const labelName = (l: string | null) => (l ? LABEL_NAMES[l] ?? l.replace(/_/g, " ") : "Not read yet");

export function ProjectWorkspace({ portal, project, onChanged }: { portal: AiPortal; project: RecordRef; onChanged?: () => void }) {
  const [tab, setTab] = useState<Tab>("files");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [history, setHistory] = useState<HistoryLine[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "denied" | "error">("loading");
  const [message, setMessage] = useState<MessageCopyView | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([ai.project(portal, project), ai.projectFiles(portal, project), ai.projectHistory(portal, project)])
      .then(([d, f, h]) => {
        setDetail(d);
        setFiles(f);
        setHistory(h);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof AiNotConnectedError) setState("offline");
        else if (e instanceof Error && /Not your|403/.test(e.message)) setState("denied");
        else setState("error");
      });
  }, [portal, project]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const openFile = async (id: string) => {
    try {
      const { url } = await ai.fileLink(portal, id);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(load, 800); // the open is now part of the history
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't open the file");
    }
  };
  const openMessage = async (id: string) => {
    try {
      setMessage(await ai.message(portal, id));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't open the message");
    }
  };

  if (state === "loading") return <p className="p-4 text-[14px] text-[#475569]">Loading…</p>;
  if (state === "offline")
    return (
      <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">
        Files and history will appear here once the EasyLink AI platform is connected.
      </div>
    );
  if (state === "denied")
    return <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">This project isn&apos;t assigned to you.</div>;
  if (state === "error" || !detail) return <div className="rounded-[14px] border border-[#FCA5A5] bg-[#FEF2F2] p-4 text-[14px] text-[#991B1B]">Couldn&apos;t load this project.</div>;

  const counts = { files: files?.length ?? 0, history: history?.length ?? 0, installer: detail.installerHistory.length };

  return (
    <section aria-label={`Project: ${detail.name}`} className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-start gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
          <h2 className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">{detail.name || "Project"}</h2>
          <span className="text-[13px] text-[#475569]">
            {detail.address}
            {detail.status ? ` · ${detail.status.replace(/_/g, " ").toLowerCase()}` : ""}
          </span>
          {detail.contact && (
            <span className="text-[12.5px] text-[#475569]">
              {[detail.contact.email, detail.contact.phone].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">Installer</span>
          <div className="flex flex-wrap gap-1.5">
            {detail.installers.length ? (
              detail.installers.map((i) => (
                <span key={i.id} className="rounded-full border border-[#9CCFF3] bg-[#EEF7FE] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#0B2540]">
                  {i.name}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-[#92400E]">Not assigned yet</span>
            )}
          </div>
        </div>
      </header>

      {note && (
        <div role="status" className="rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-[13px] text-[#1E3A8A]">
          {note}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <div role="tablist" aria-label="Project" className="flex gap-1 border-b border-[#E3E8EF]">
        {(
          [
            ["files", "Files"],
            ["history", "History"],
            ["installer", "Installer"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className="-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold"
            style={{ borderColor: tab === k ? "#0B4A7A" : "transparent", color: tab === k ? "#0B2540" : "#5B6B80" }}
          >
            {l} <span className="text-[12px] font-normal text-[#5B6B80]">{counts[k]}</span>
          </button>
        ))}
      </div>

      {tab === "files" && <FilesTab files={files ?? []} onOpen={openFile} />}
      {tab === "history" && <HistoryTab lines={history ?? []} onOpenFile={openFile} onOpenMessage={openMessage} />}
      {tab === "installer" && (
        <InstallerTab
          portal={portal}
          project={project}
          detail={detail}
          onDone={(msg) => {
            setNote(msg);
            load();
            onChanged?.();
          }}
        />
      )}

      </div>

      {message && <MessageDrawer m={message} onClose={() => setMessage(null)} onOpenFile={openFile} />}
    </section>
  );
}

function FilesTab({ files, onOpen }: { files: ProjectFile[]; onOpen: (id: string) => void }) {
  const [kind, setKind] = useState("all");
  const kinds = useMemo(() => Array.from(new Set(files.map((f) => f.label ?? "unread"))), [files]);
  const shown = files.filter((f) => kind === "all" || (f.label ?? "unread") === kind);
  if (!files.length) return <p className="text-[14px] text-[#475569]">No files yet. Uploads, photos and documents for this project will appear here.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Filter files by kind">
        {["all", ...kinds].map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className="h-7 rounded-full border px-2.5 text-[12px] font-semibold"
            style={{ background: kind === k ? "#0B4A7A" : "#FFFFFF", color: kind === k ? "#FFFFFF" : "#0B2540", borderColor: kind === k ? "#0B4A7A" : "#CBD5E1" }}
          >
            {k === "all" ? `All · ${files.length}` : k === "unread" ? "Not read yet" : labelName(k)}
          </button>
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((f) => (
          <li key={f.id} className="flex flex-wrap items-start gap-3 rounded-[12px] border border-[#E3E8EF] bg-white p-3">
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
              <button type="button" onClick={() => onOpen(f.id)} className="truncate text-left text-[14px] font-semibold text-[#0B4A7A] hover:underline" title={`Open ${f.name}`}>
                {f.name}
              </button>
              <span className="text-[12px] text-[#5B6B80]">
                {[f.uploadedBy?.name ? `Uploaded by ${f.uploadedBy.name}` : null, fmtDate(f.createdAt), fmtSize(f.sizeBytes)].filter(Boolean).join(" · ")}
              </span>
              {f.issues.map((i) => (
                <span key={i} className="text-[12px] text-[#92400E]">
                  ⚠ {i}
                </span>
              ))}
            </div>
            <div className="flex flex-col items-start gap-1 text-[12px]">
              <span
                className="rounded-full border px-2 py-0.5 font-semibold"
                style={f.reviewState === "needs_review" ? { background: "#FFFBEB", color: "#92400E", borderColor: "#FCD34D" } : { background: "#EEF7FE", color: "#0B2540", borderColor: "#9CCFF3" }}
              >
                {labelName(f.label)}
                {f.reviewState === "needs_review" ? " · being checked" : ""}
              </span>
              {f.deliveredTo.length ? (
                <span className="text-[#166534]">
                  Sent to {Array.from(new Set(f.deliveredTo.map((d) => ROLE_NAMES[d.role] ?? d.role))).join(", ")} · {timeAgo(f.deliveredTo.at(-1)!.at)}
                </span>
              ) : (
                <span className="text-[#5B6B80]">Not sent to anyone</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryTab({ lines, onOpenFile, onOpenMessage }: { lines: HistoryLine[]; onOpenFile: (id: string) => void; onOpenMessage: (id: string) => void }) {
  const [kind, setKind] = useState("all");
  const shown = lines.filter((l) => kind === "all" || l.kind === kind || (kind === "file" && l.kind === "ai"));
  const days = useMemo(() => {
    const m = new Map<string, HistoryLine[]>();
    for (const l of shown) {
      const d = fmtDay(l.at);
      m.set(d, [...(m.get(d) ?? []), l]);
    }
    return [...m.entries()];
  }, [shown]);
  if (!lines.length) return <p className="text-[14px] text-[#475569]">Nothing has happened on this project yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Filter history">
        {(
          [
            ["all", "Everything"],
            ["message", "Messages"],
            ["file", "Files"],
            ["assignment", "Installer"],
            ["warning", "Warnings"],
          ] as [string, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className="h-7 rounded-full border px-2.5 text-[12px] font-semibold"
            style={{ background: kind === k ? "#0B4A7A" : "#FFFFFF", color: kind === k ? "#FFFFFF" : "#0B2540", borderColor: kind === k ? "#0B4A7A" : "#CBD5E1" }}
          >
            {l}
          </button>
        ))}
      </div>
      {days.map(([day, items]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-1">
          <h3 className="m-0 text-[12px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">{day}</h3>
          <ol className="m-0 flex list-none flex-col gap-0 border-l-2 border-[#E3E8EF] p-0 pl-4">
            {items.map((l) => (
              <li key={l.id} className="relative flex flex-col gap-0.5 py-2">
                <span aria-hidden="true" className="absolute -left-[22px] top-[13px] size-2.5 rounded-full border-2 border-white" style={{ background: KIND_DOT[l.kind] ?? "#475569" }} />
                <span className="text-[14px] text-[#0F172A]">
                  <strong className="font-semibold">{l.title}</strong>
                </span>
                {l.detail && <span className="text-[13px] text-[#334155]">{l.detail}</span>}
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#5B6B80]">
                  <span>
                    {l.actor.name} · {new Date(l.at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {l.messageId && (
                    <button type="button" onClick={() => onOpenMessage(l.messageId!)} className="font-semibold text-[#0B4A7A] hover:underline">
                      View message
                    </button>
                  )}
                  {l.files
                    .filter((f) => f.name)
                    .slice(0, 3)
                    .map((f) => (
                      <button key={f.id} type="button" onClick={() => onOpenFile(f.id)} className="font-semibold text-[#0B4A7A] hover:underline">
                        {f.name}
                      </button>
                    ))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function InstallerTab({ portal, project, detail, onDone }: { portal: AiPortal; project: RecordRef; detail: ProjectDetail; onDone: (msg: string) => void }) {
  const [installers, setInstallers] = useState<{ id: string; name: string; area: string | null }[]>([]);
  const [chosen, setChosen] = useState("");
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!detail.can.assignInstaller) return;
    ai.installers()
      .then(setInstallers)
      .catch(() => setInstallers([]));
  }, [detail.can.assignInstaller]);

  const assign = async () => {
    setBusy(true);
    try {
      const r = await ai.action(portal, "start_workflow", {
        template: "reassign_installer",
        inputs: { project, installer: { type: "user", id: chosen }, mode, reason },
      });
      const steps = (r.result as { results?: { step: string; status: string; message?: string }[] } | undefined)?.results ?? [];
      const first = steps[0];
      onDone(first?.status === "executed" ? "Installer changed. The new installer and the customer have been told." : `Not changed: ${first?.message ?? r.message ?? r.status}`);
      setReason("");
      setChosen("");
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Couldn't change the installer");
    } finally {
      setBusy(false);
    }
  };
  const ask = async () => {
    setBusy(true);
    try {
      await ai.requestInstallerChange(portal, project, reason);
      onDone("Sent to EasyLink. They'll be in touch about a different installer.");
      setReason("");
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Couldn't send the request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {detail.installerHistory.length === 0 && <li className="text-[14px] text-[#475569]">{detail.installers.length ? `${detail.installers.map((i) => i.name).join(", ")} (assigned before history was kept)` : "No installer yet."}</li>}
        {detail.installerHistory.map((h, i) => (
          <li key={`${h.installer.id}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-[12px] border border-[#E3E8EF] bg-white p-3 text-[13px]">
            <strong className="text-[14px] text-[#0F172A]">{h.installer.name}</strong>
            <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={h.to ? { background: "#F1F5F9", color: "#475569" } : { background: "#DCFCE7", color: "#166534" }}>
              {h.to ? "Previous" : "Current"}
            </span>
            <span className="text-[#5B6B80]">
              {h.from ? fmtDate(h.from) : "Before history"} → {h.to ? fmtDate(h.to) : "now"}
            </span>
            {h.reason && <span className="w-full text-[#334155]">{h.reason}</span>}
          </li>
        ))}
      </ol>

      {detail.can.assignInstaller && (
        <form
          className="flex flex-col gap-2 rounded-[12px] border border-[#9CCFF3] bg-[#F5FAFE] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (chosen && reason.trim().length >= 3) void assign();
          }}
        >
          <strong className="text-[14px] text-[#0B2540]">Change the installer</strong>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] font-semibold text-[#475569]">
              New installer
              <select value={chosen} onChange={(e) => setChosen(e.target.value)} className="h-9 rounded-[8px] border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]">
                <option value="">Choose…</option>
                {installers
                  .filter((i) => !detail.installers.some((c) => c.id === i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.area ? ` — ${i.area}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <fieldset className="flex items-end gap-3 text-[13px]">
              <legend className="sr-only">Replace or add</legend>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace current
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="mode" checked={mode === "add"} onChange={() => setMode("add")} /> Add alongside
              </label>
            </fieldset>
          </div>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
            Reason (shown in the history)
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-[8px] border border-[#CBD5E1] bg-white px-2 text-[13px]" placeholder="e.g. Original installer unavailable this week" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={busy || !chosen || reason.trim().length < 3} className="h-9 shrink-0 whitespace-nowrap rounded-[8px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white disabled:opacity-50">
              {busy ? "Changing…" : "Change installer"}
            </button>
            <span className="text-[12px] text-[#5B6B80]">The new installer sees the full history; the previous one stops seeing this project. Both the installer and customer are told.</span>
          </div>
        </form>
      )}

      {detail.can.requestInstallerChange && (
        <form
          className="flex flex-col gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length >= 3) void ask();
          }}
        >
          <strong className="text-[14px] text-[#0F172A]">{portal === "installer" ? "Hand this job to another installer" : "Ask for a different installer"}</strong>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
            Why? EasyLink staff will review it.
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="rounded-[8px] border border-[#CBD5E1] p-2 text-[13px]" />
          </label>
          <div>
            <button type="submit" disabled={busy || reason.trim().length < 3} className="h-9 rounded-[8px] border border-[#0B4A7A] px-4 text-[13px] font-bold text-[#0B4A7A] disabled:opacity-50">
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MessageDrawer({ m, onClose, onOpenFile }: { m: MessageCopyView; onClose: () => void; onOpenFile: (id: string) => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const [l, bg, fg] = STATUS[m.status];
  return (
    <div role="dialog" aria-modal="true" aria-label="Message" className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-[520px] flex-col gap-3 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <h2 className="m-0 flex-grow font-source-sans text-[20px] font-bold text-[#0F172A]">{m.subject || "Message"}</h2>
          <button type="button" onClick={onClose} autoFocus className="h-8 rounded-[8px] border border-[#CBD5E1] px-3 text-[13px] font-semibold">
            Close
          </button>
        </div>
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[13px]">
          <dt className="font-semibold text-[#5B6B80]">From</dt>
          <dd className="m-0 text-[#0F172A]">{m.from.name}</dd>
          <dt className="font-semibold text-[#5B6B80]">To</dt>
          <dd className="m-0 text-[#0F172A]">
            {m.to.name} ({ROLE_NAMES[m.to.role] ?? m.to.role}){m.to.address ? ` · ${m.to.address}` : ""}
          </dd>
          <dt className="font-semibold text-[#5B6B80]">How</dt>
          <dd className="m-0 text-[#0F172A]">{m.channels.map((c) => (c === "sms" ? "SMS" : c === "email" ? "Email" : "Portal")).join(" + ")}</dd>
          <dt className="font-semibold text-[#5B6B80]">When</dt>
          <dd className="m-0 text-[#0F172A]">{fmtDate(m.at)}</dd>
          <dt className="font-semibold text-[#5B6B80]">Status</dt>
          <dd className="m-0">
            <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: bg, color: fg }}>
              {l}
            </span>{" "}
            <span className="text-[12px] text-[#5B6B80]">{fmtDate(m.statusAt)}</span>
          </dd>
        </dl>
        <p className="m-0 whitespace-pre-wrap rounded-[10px] bg-[#F8FAFC] p-3 text-[14px] text-[#0F172A]">{m.body}</p>
        {m.files.length > 0 && (
          <div className="flex flex-col gap-1 text-[13px]">
            <span className="font-semibold text-[#5B6B80]">{m.attached ? "Attached" : "Linked"} files</span>
            {m.files.map((f) => (
              <button key={f.id} type="button" onClick={() => onOpenFile(f.id)} className="text-left font-semibold text-[#0B4A7A] hover:underline">
                {f.name}
              </button>
            ))}
          </div>
        )}
        <span className="text-[12px] text-[#5B6B80]">This is a read-only copy of exactly what was sent.</span>
      </div>
    </div>
  );
}

/** A list of projects on the left, the chosen one on the right (installer and master portals). */
export function ProjectBrowser({ portal, title }: { portal: AiPortal; title: string }) {
  const [rows, setRows] = useState<{ ref: RecordRef; name: string; address: string; status: string; installers: { id: string; name: string }[] }[] | null>(null);
  const [selected, setSelected] = useState<RecordRef | null>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");

  const load = useCallback(
    (search: string) =>
      ai
        .projects(portal, search)
        .then((r) => {
          setRows(r);
          setState("ready");
          setSelected((s) => s ?? r[0]?.ref ?? null);
        })
        .catch((e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : "error")),
    [portal],
  );
  useEffect(() => {
    const t = setTimeout(() => void load(""), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = (rows ?? []).filter((r) => portal === "admin" || !q || `${r.name} ${r.address}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 md:px-8 md:py-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-grow flex-col gap-1">
          <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">{title}</h1>
          <span className="text-[14px] text-[#475569]">
            {portal === "admin" ? "Every customer's files, messages and history." : "Files, messages and history for the customers assigned to you."}
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (portal === "admin") void load(q);
          }}
        >
          <label htmlFor="project-search" className="sr-only">
            Search customers
          </label>
          <input id="project-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or address" className="h-9 w-[260px] rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px]" />
        </form>
      </div>
      {state === "offline" && <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">Files and history will appear here once the EasyLink AI platform is connected.</div>}
      {state === "error" && <p className="text-[14px] text-[#991B1B]">Couldn&apos;t load customers.</p>}
      {state === "ready" && (
        <div className="flex flex-wrap items-start gap-4">
          <nav aria-label="Customers" className="flex max-h-[75vh] w-full flex-col gap-1 overflow-y-auto rounded-[14px] border border-[#E3E8EF] bg-white p-2 md:w-[300px]">
            {filtered.length === 0 && <span className="p-3 text-[13px] text-[#475569]">{portal === "installer" ? "No customers are assigned to you yet." : "No customers found."}</span>}
            {filtered.map((r) => {
              const on = selected?.type === r.ref.type && selected.id === r.ref.id;
              return (
                <button
                  key={`${r.ref.type}:${r.ref.id}`}
                  type="button"
                  onClick={() => setSelected(r.ref)}
                  aria-current={on ? "true" : undefined}
                  className="flex flex-col items-start gap-0.5 rounded-[10px] px-3 py-2 text-left"
                  style={{ background: on ? "#EEF7FE" : "transparent" }}
                >
                  <span className="text-[14px] font-semibold text-[#0F172A]">{r.name || "Unnamed"}</span>
                  <span className="text-[12px] text-[#5B6B80]">{r.address}</span>
                  {portal === "admin" && <span className="text-[11.5px] text-[#475569]">{r.installers.map((i) => i.name).join(", ") || "No installer"}</span>}
                </button>
              );
            })}
          </nav>
          <div className="min-w-0 flex-[1_1_560px]">{selected ? <ProjectWorkspace key={`${selected.type}:${selected.id}`} portal={portal} project={selected} onChanged={() => void load(portal === "admin" ? q : "")} /> : null}</div>
        </div>
      )}
    </div>
  );
}
