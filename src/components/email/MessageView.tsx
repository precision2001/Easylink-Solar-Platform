"use client";

import Link from "next/link";
import { useState } from "react";
import { customerRecordHref } from "@/components/contact-centre/api";
import { LinkedText } from "./LinkedText";
import { PROVIDER_LABEL, cleanMailText, emailBase, fileSize, initials, longTime, type Attachment, type EmailPortal, type FullMessage, type ThreadItem } from "./api";

/**
 * One email opened: a toolbar (Reply, Reply all, Forward, Archive, Delete,
 * Star, Mark unread, Print), the whole conversation, attachments to download,
 * the linked customer record and EasyLink AI.
 */

export type MessageAction = "reply" | "replyAll" | "forward" | "archive" | "unarchive" | "trash" | "restore" | "star" | "unstar" | "unread" | "aiReply" | "print" | "back";

const BORDER = "#E2E8F0";
const BLUE = "#1976D2";
const MUTED = "#5B6B80";

function Icon({ d, color = "currentColor" }: { d: string; color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const I = {
  reply: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 5 5v6",
  replyAll: "M7 14 2 9l5-5M12 14 7 9l5-5M7 9h9a5 5 0 0 1 5 5v6",
  forward: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0-5 5v6",
  archive: "M3 4h18v5H3zM5 9v11h14V9M10 13h4",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  restore: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  star: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  unread: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM22 7l-10 6L2 7",
  print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  back: "M15 18l-6-6 6-6",
  clip: "M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
};

function ToolButton({ label, icon, onClick, active, primary, danger }: { label: string; icon: string; onClick: () => void; active?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] font-semibold"
      style={
        primary
          ? { background: BLUE, color: "#FFFFFF" }
          : { border: "1px solid #CBD5E1", background: active ? "#FEF3C7" : "#FFFFFF", color: danger ? "#B91C1C" : "#334155" }
      }
    >
      <Icon d={icon} color={active ? "#B45309" : undefined} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Files({ portal, messageId, files }: { portal: EmailPortal; messageId: string; files: Attachment[] }) {
  if (!files.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((f) => (
        <li key={f.index}>
          <a
            href={`${emailBase(portal)}/messages/${messageId}/attachments/${f.index}`}
            download={f.name}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] no-underline"
            style={{ border: `1px solid ${BORDER}`, color: "#0F172A" }}
            title={`Download ${f.name}`}
          >
            <Icon d={I.clip} color={BLUE} />
            <span className="max-w-[240px] truncate font-medium">{f.name}</span>
            {f.size ? <span style={{ color: MUTED }}>{fileSize(f.size)}</span> : null}
            <Icon d={I.download} color={BLUE} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Earlier({ portal, t }: { portal: EmailPortal; t: ThreadItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-white" style={{ border: `1px solid ${BORDER}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: BORDER, color: "#1E3A5F" }}>
          {initials(t.fromName || t.fromAddress)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">{t.fromName || t.fromAddress}</span>
          {!open ? <span className="block truncate text-[13px]" style={{ color: MUTED }}>{t.snippet}</span> : null}
        </span>
        <span className="text-[12px]" style={{ color: MUTED }}>
          {longTime(t.sentAt)}
        </span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-[12px]" style={{ color: MUTED }}>
            to {t.to.join(", ")}
            {t.cc.length ? `, cc ${t.cc.join(", ")}` : ""}
          </p>
          <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed" style={{ color: "#1E293B" }}>
            <LinkedText text={cleanMailText(t.bodyText || t.snippet)} />
          </div>
          <Files portal={portal} messageId={t.id} files={t.attachments} />
        </div>
      ) : null}
    </li>
  );
}

export function MessageView({
  portal,
  msg,
  busy,
  note,
  onAction,
  linkSlot,
}: {
  portal: EmailPortal;
  msg: FullMessage;
  busy: string | null;
  note: string | null;
  onAction: (a: MessageAction) => void;
  /** Linked-record card / link picker, rendered by the workspace. */
  linkSlot: React.ReactNode;
}) {
  const canReply = msg.accountStatus === "ACTIVE";
  return (
    <article aria-label="Email" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="lg:hidden">
          <ToolButton label="Back" icon={I.back} onClick={() => onAction("back")} />
        </span>
        {canReply ? (
          <>
            <ToolButton label="Reply" icon={I.reply} onClick={() => onAction("reply")} primary />
            <ToolButton label="Reply all" icon={I.replyAll} onClick={() => onAction("replyAll")} />
            <ToolButton label="Forward" icon={I.forward} onClick={() => onAction("forward")} />
          </>
        ) : null}
        <span className="mx-1 hidden h-6 w-px sm:block" style={{ background: BORDER }} />
        {msg.isTrashed ? (
          <ToolButton label="Restore" icon={I.restore} onClick={() => onAction("restore")} />
        ) : msg.isArchived ? (
          <ToolButton label="Move to Inbox" icon={I.restore} onClick={() => onAction("unarchive")} />
        ) : (
          <ToolButton label="Archive" icon={I.archive} onClick={() => onAction("archive")} />
        )}
        {!msg.isTrashed ? <ToolButton label="Delete" icon={I.trash} onClick={() => onAction("trash")} danger /> : null}
        <ToolButton label={msg.isStarred ? "Starred" : "Star"} icon={I.star} onClick={() => onAction(msg.isStarred ? "unstar" : "star")} active={msg.isStarred} />
        <ToolButton label="Mark unread" icon={I.unread} onClick={() => onAction("unread")} />
        <ToolButton label="Print" icon={I.print} onClick={() => onAction("print")} />
      </div>

      {note ? (
        <p role="status" className="rounded-xl px-4 py-2.5 text-[13px] font-semibold" style={note.endsWith(".") && !/couldn|can't|isn't|failed/i.test(note) ? { background: "#DCFCE7", color: "#14532D" } : { background: "#FEE2E2", color: "#991B1B" }}>
          {note}
        </p>
      ) : null}

      <div>
        <h2 className="mb-2 text-[24px] font-bold leading-tight" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
          {msg.subject}
        </h2>
        {msg.accountStatus !== "ACTIVE" ? (
          <p className="mb-2 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#FFF7ED", color: "#7C2D12" }}>
            This mailbox needs reconnecting before you can reply (Connect account).
          </p>
        ) : null}
      </div>

      {linkSlot}

      {msg.aiSummary ? (
        <div className="flex flex-col gap-1.5 rounded-2xl px-4 py-3.5" style={{ background: "#0B1A2E", color: "#E2E8F0" }}>
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#FFE866" }}>
            EasyLink AI summary
          </span>
          <span className="text-[14px] leading-relaxed">{msg.aiSummary}</span>
        </div>
      ) : null}

      {msg.thread.length ? (
        <ol className="flex flex-col gap-2" aria-label="Earlier in this conversation">
          {msg.thread.map((t) => (
            <Earlier key={t.id} portal={portal} t={t} />
          ))}
        </ol>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-semibold" style={{ background: BORDER, color: "#1E3A5F" }}>
            {initials(msg.fromName || msg.fromAddress)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px]" style={{ color: "#334155" }}>
              <strong>{msg.fromName || msg.fromAddress}</strong> &lt;{msg.fromAddress}&gt;
            </p>
            <p className="text-[13px]" style={{ color: MUTED }}>
              to {msg.to.join(", ")}
              {msg.cc.length ? `, cc ${msg.cc.join(", ")}` : ""}
            </p>
          </div>
          <p className="text-[12px]" style={{ color: MUTED }}>
            {longTime(msg.sentAt)} · {PROVIDER_LABEL[msg.provider]} ({msg.accountAddress})
          </p>
        </div>
        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed" style={{ color: "#1E293B" }}>
          <LinkedText text={cleanMailText(msg.bodyText || msg.snippet)} />
        </div>
        <Files portal={portal} messageId={msg.id} files={msg.attachments} />
      </div>

      {canReply ? (
        <div className="flex flex-wrap gap-2">
          <ToolButton label="Reply" icon={I.reply} onClick={() => onAction("reply")} />
          <ToolButton label="Reply all" icon={I.replyAll} onClick={() => onAction("replyAll")} />
          <ToolButton label="Forward" icon={I.forward} onClick={() => onAction("forward")} />
          {msg.aiEnabled ? (
            <button
              type="button"
              onClick={() => onAction("aiReply")}
              disabled={busy === "ai"}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl px-4 text-[13px] font-bold"
              style={{ background: "linear-gradient(90deg, #FFE866, #F68A0A)", color: "#3B1D00" }}
            >
              {busy === "ai" ? "Drafting…" : "Draft reply with EasyLink AI"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function LinkedRecord({
  portal,
  msg,
  onChange,
  onUnlink,
  onCreateLead,
  busy,
}: {
  portal: EmailPortal;
  msg: FullMessage;
  onChange: () => void;
  onUnlink: () => void;
  onCreateLead: () => void;
  busy: string | null;
}) {
  if (msg.lead) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white px-4 py-3.5" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex min-w-[220px] flex-1 flex-col">
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#166534" }}>
            Linked {msg.linkSource === "AUTO" ? "automatically" : "record"}
          </span>
          <span className="text-[15px] font-semibold">{msg.lead.name}</span>
          <span className="text-[13px]" style={{ color: MUTED }}>
            {[msg.lead.status.replace(/_/g, " ").toLowerCase(), msg.lead.address].filter(Boolean).join(" · ")}
          </span>
        </div>
        <Link href={customerRecordHref(portal === "admin" ? "admin" : "installers", msg.lead.id)} className="text-[14px] font-semibold">
          Open record
        </Link>
        <button type="button" onClick={onChange} className="text-[14px] font-semibold" style={{ color: BLUE }}>
          Change link
        </button>
        <button type="button" onClick={onUnlink} className="text-[14px] font-semibold" style={{ color: "#475569" }}>
          Unlink
        </button>
      </div>
    );
  }
  if (msg.direction !== "INBOUND") return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#FFF7ED", border: "1px solid #FDBA74" }}>
      <span className="min-w-[240px] flex-1 text-[14px]" style={{ color: "#7C2D12" }}>
        No customer or lead matches this sender yet.
      </span>
      <button type="button" onClick={onChange} className="h-10 cursor-pointer rounded-lg bg-white px-3.5 text-[14px] font-semibold" style={{ border: "1px solid #C2410C", color: "#9A3412" }}>
        Link to customer…
      </button>
      {portal === "admin" ? (
        <button type="button" onClick={onCreateLead} disabled={busy === "lead"} className="h-10 cursor-pointer rounded-lg px-3.5 text-[14px] font-semibold" style={{ background: "#C2410C", color: "#FFFFFF" }}>
          {busy === "lead" ? "Creating…" : "Create lead"}
        </button>
      ) : null}
    </div>
  );
}
