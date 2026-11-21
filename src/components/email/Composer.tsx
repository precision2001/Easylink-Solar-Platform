"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { accountName, call, emailBase, fileSize, type Account, type Attachment, type ComposeMode, type Draft, type EmailPortal } from "./api";

/**
 * Write a new email, reply, reply all or forward: To/Cc/Bcc, Attach, signature,
 * drafts saved as you type, Ctrl/⌘+Enter to send.
 */

export type ComposeInit = {
  mode: ComposeMode;
  accountId?: string | null;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  sourceMessageId?: string | null;
  /** Files on the email being forwarded. */
  sourceAttachments?: Attachment[];
  includeAttachments?: boolean;
  leadId?: string | null;
  draftId?: string | null;
};

type Picked = { key: string; name: string; size: number; contentType: string; dataBase64: string };

const MAX_TOTAL = 15 * 1024 * 1024;
const EMAIL_RE = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;
const BORDER = "#E2E8F0";
const BLUE = "#1976D2";
const MUTED = "#5B6B80";

function AddressField({ id, label, value, onChange, autoFocus }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const commit = (raw: string) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map((x) => x.trim().replace(/^.*<(.+)>$/, "$1").toLowerCase())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setText("");
  };
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 px-4 py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <label htmlFor={id} className="text-[13px] font-semibold" style={{ color: "#475569" }}>
        {label}
      </label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5">
        {value.map((a) => (
          <span
            key={a}
            className="inline-flex h-7 items-center gap-1 rounded-full pl-2.5 pr-1 text-[13px]"
            style={EMAIL_RE.test(a) ? { background: "#E3F2FD", color: "#0B2540" } : { background: "#FEE2E2", color: "#991B1B" }}
            title={EMAIL_RE.test(a) ? a : `${a} isn't a valid email address`}
          >
            {a}
            <button type="button" aria-label={`Remove ${a}`} onClick={() => onChange(value.filter((x) => x !== a))} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={id}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]\s*$/.test(v)) commit(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === "Tab") && text.trim()) {
              e.preventDefault();
              commit(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => commit(text)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[,;\s]/.test(t.trim())) {
              e.preventDefault();
              commit(t);
            }
          }}
          className="h-9 min-w-[160px] flex-1 bg-transparent text-[14px] outline-none"
        />
      </div>
    </div>
  );
}

const readFile = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

export function Composer({
  portal,
  accounts,
  init,
  onClose,
}: {
  portal: EmailPortal;
  accounts: Account[];
  init: ComposeInit;
  /** sent: true when the email went out. */
  onClose: (result: { sent: boolean; message?: string }) => void;
}) {
  const base = emailBase(portal);
  const usable = accounts.filter((a) => a.status === "ACTIVE");
  const [accountId, setAccountId] = useState(init.accountId ?? usable[0]?.id ?? "");
  const [to, setTo] = useState<string[]>(init.to ?? []);
  const [cc, setCc] = useState<string[]>(init.cc ?? []);
  const [bcc, setBcc] = useState<string[]>(init.bcc ?? []);
  const [showCc, setShowCc] = useState((init.cc?.length ?? 0) > 0 || (init.bcc?.length ?? 0) > 0);
  const [subject, setSubject] = useState(init.subject ?? "");
  const [body, setBody] = useState(init.body ?? "");
  const [files, setFiles] = useState<Picked[]>([]);
  const [includeOriginal, setIncludeOriginal] = useState(init.includeAttachments ?? true);
  const [draftId, setDraftId] = useState<string | null>(init.draftId ?? null);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);

  const account = usable.find((a) => a.id === accountId);
  const lockedAccount = init.mode === "REPLY" || init.mode === "REPLY_ALL";
  const total = files.reduce((n, f) => n + f.size, 0);
  const title = init.mode === "REPLY" ? "Reply" : init.mode === "REPLY_ALL" ? "Reply all" : init.mode === "FORWARD" ? "Forward" : "New email";

  // Put the cursor at the top of the body (above any quoted email).
  useEffect(() => {
    const el = bodyRef.current;
    if (el && init.mode !== "NEW") {
      el.focus();
      el.setSelectionRange(0, 0);
      el.scrollTop = 0;
    }
  }, [init.mode]);

  const saveDraft = useCallback(async () => {
    const payload = {
      accountId: accountId || null,
      to,
      cc,
      bcc,
      subject,
      body,
      mode: init.mode,
      sourceMessageId: init.sourceMessageId ?? null,
      includeAttachments: includeOriginal,
      leadId: init.leadId ?? null,
    };
    setSaveState("saving");
    const r = draftId
      ? await call<Draft>(`${base}/drafts/${draftId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await call<Draft>(`${base}/drafts`, { method: "POST", body: JSON.stringify(payload) });
    if (r.data) {
      setDraftId(r.data.id);
      setSaveState("saved");
    } else setSaveState("");
  }, [accountId, to, cc, bcc, subject, body, includeOriginal, draftId, base, init.mode, init.sourceMessageId, init.leadId]);

  // Save a draft two seconds after typing stops.
  useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => {
      saving.current = saveDraft();
    }, 2000);
    return () => window.clearTimeout(t);
  }, [to, cc, bcc, subject, body, includeOriginal, accountId, saveDraft]);
  const touch = () => {
    dirty.current = true;
    setSaveState("");
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const picked: Picked[] = [];
    let sum = total;
    for (const f of Array.from(list)) {
      sum += f.size;
      if (sum > MAX_TOTAL) {
        setError("Attachments can be up to 15 MB in total.");
        break;
      }
      picked.push({ key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, size: f.size, contentType: f.type || "application/octet-stream", dataBase64: await readFile(f) });
    }
    setFiles((xs) => [...xs, ...picked]);
  };

  const insertSignature = () => {
    if (!account?.signature) return;
    touch();
    setBody((b) => `${b.replace(/\s+$/, "")}\n\n${account.signature}\n`);
  };

  const [linking, setLinking] = useState(false);
  /** Insert a booking link: the customer's own when the email is tied to a lead, else the general one. */
  const insertBookingLink = async () => {
    setLinking(true);
    setError(null);
    let link: string | null = null;
    try {
      const url = init.leadId
        ? `${portal === "admin" ? "/api/admin/booking-link/leads" : "/api/installers/booking-link/leads"}?leadId=${encodeURIComponent(init.leadId)}`
        : portal === "admin"
          ? "/api/admin/booking-link"
          : "/api/installers/booking-link";
      const r = await fetch(url, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { data?: { link?: string; publicUrl?: string }; message?: string };
      link = j.data?.link ?? j.data?.publicUrl ?? null;
      if (!r.ok || !link) setError(j.message || "Couldn't get a booking link.");
    } catch {
      setError("Couldn't get a booking link.");
    }
    setLinking(false);
    if (!link) return;
    touch();
    const line = `Book a time that suits you: ${link}`;
    const el = bodyRef.current;
    if (el && document.activeElement === el) {
      const at = el.selectionStart ?? body.length;
      setBody((b) => `${b.slice(0, at)}${line}${b.slice(at)}`);
    } else {
      setBody((b) => {
        const sig = account?.signature ? b.lastIndexOf(account.signature) : -1;
        return sig > 0 ? `${b.slice(0, sig).replace(/\s+$/, "")}\n\n${line}\n\n${b.slice(sig)}` : `${b.replace(/\s+$/, "")}\n\n${line}\n`;
      });
    }
  };

  const send = async () => {
    setError(null);
    const all = [...to, ...cc, ...bcc];
    const bad = all.filter((a) => !EMAIL_RE.test(a));
    if (!to.length) return setError("Add at least one recipient.");
    if (bad.length) return setError(`Check ${bad.join(", ")}: not a valid email address.`);
    if (!subject.trim()) return setError("Add a subject.");
    if (!accountId) return setError("Choose which mailbox to send from.");
    setBusy(true);
    await saving.current?.catch(() => undefined);
    const r = await call(`${base}/send`, {
      method: "POST",
      body: JSON.stringify({
        accountId,
        to,
        cc,
        bcc,
        subject: subject.trim(),
        body: body.trim() ? body : " ",
        mode: init.mode,
        sourceMessageId: init.sourceMessageId ?? null,
        includeAttachments: includeOriginal,
        attachments: files.map(({ name, contentType, dataBase64 }) => ({ name, contentType, dataBase64 })),
        leadId: init.leadId ?? null,
        draftId,
      }),
    });
    setBusy(false);
    if (r.ok) onClose({ sent: true, message: "Email sent." });
    else setError(r.message ?? "Couldn't send. Try again.");
  };

  const discard = async () => {
    if ((body.trim() || subject.trim() || to.length || files.length) && !window.confirm("Discard this email? The draft will be deleted.")) return;
    await saving.current?.catch(() => undefined);
    if (draftId) await call(`${base}/drafts/${draftId}`, { method: "DELETE" });
    onClose({ sent: false });
  };

  const close = async () => {
    if (dirty.current) {
      await saving.current?.catch(() => undefined);
      await saveDraft();
    }
    onClose({ sent: false, message: dirty.current ? "Saved to Drafts." : undefined });
  };

  return (
    <section
      aria-labelledby="compose-h"
      className="flex min-h-[560px] flex-col rounded-2xl bg-white"
      style={{ border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void send();
        }
      }}
    >
      <div className="flex items-center gap-3 rounded-t-2xl px-4 py-3" style={{ background: "#0B1A2E", color: "#FFFFFF" }}>
        <h2 id="compose-h" className="flex-grow text-[16px] font-semibold">
          {title}
        </h2>
        <span className="text-[12px]" style={{ color: "#CBD5E1" }}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Draft saved" : ""}
        </span>
        <button type="button" onClick={() => void close()} aria-label="Close and keep as draft" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg" style={{ color: "#FFFFFF" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {usable.length === 0 ? (
        <p className="p-5 text-[14px]" style={{ color: MUTED }}>
          Connect a mailbox first (Connect account).
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 px-4 py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <label htmlFor="c-from" className="text-[13px] font-semibold" style={{ color: "#475569" }}>
              From
            </label>
            <div className="flex items-center gap-2">
              <select
                id="c-from"
                value={accountId}
                disabled={lockedAccount}
                onChange={(e) => {
                  touch();
                  setAccountId(e.target.value);
                }}
                className="h-10 min-w-0 flex-1 bg-transparent text-[14px]"
              >
                {usable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.address} — {accountName(a)}
                  </option>
                ))}
              </select>
              {!showCc ? (
                <button type="button" onClick={() => setShowCc(true)} className="text-[13px] font-semibold" style={{ color: BLUE }}>
                  Cc / Bcc
                </button>
              ) : null}
            </div>
          </div>
          <AddressField id="c-to" label="To" value={to} autoFocus={init.mode === "NEW" || init.mode === "FORWARD"} onChange={(v) => { touch(); setTo(v); }} />
          {showCc ? (
            <>
              <AddressField id="c-cc" label="Cc" value={cc} onChange={(v) => { touch(); setCc(v); }} />
              <AddressField id="c-bcc" label="Bcc" value={bcc} onChange={(v) => { touch(); setBcc(v); }} />
            </>
          ) : null}
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 px-4 py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <label htmlFor="c-subject" className="text-[13px] font-semibold" style={{ color: "#475569" }}>
              Subject
            </label>
            <input id="c-subject" value={subject} onChange={(e) => { touch(); setSubject(e.target.value); }} className="h-10 text-[15px] font-semibold outline-none" />
          </div>

          <label htmlFor="c-body" className="sr-only">
            Message
          </label>
          <textarea
            id="c-body"
            ref={bodyRef}
            value={body}
            onChange={(e) => {
              touch();
              setBody(e.target.value);
            }}
            placeholder="Write your email…"
            className="min-h-[260px] flex-1 resize-y p-4 text-[15px] leading-relaxed outline-none"
          />

          {init.mode === "FORWARD" && init.sourceAttachments?.length ? (
            <label className="flex flex-wrap items-center gap-2 px-4 pb-2 text-[13px]" style={{ color: "#334155" }}>
              <input type="checkbox" checked={includeOriginal} onChange={(e) => { touch(); setIncludeOriginal(e.target.checked); }} className="h-[18px] w-[18px]" />
              Include the original attachments ({init.sourceAttachments.map((a) => a.name).join(", ")})
            </label>
          ) : null}

          {files.length ? (
            <ul className="flex flex-wrap gap-2 px-4 pb-3">
              {files.map((f) => (
                <li key={f.key} className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px]" style={{ border: `1px solid ${BORDER}` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" aria-hidden="true">
                    <path d="M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
                  </svg>
                  <span className="max-w-[220px] truncate">{f.name}</span>
                  <span style={{ color: MUTED }}>{fileSize(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((xs) => xs.filter((x) => x.key !== f.key))} className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="3" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-5 text-[14px] font-semibold disabled:opacity-60"
              style={{ background: BLUE, color: "#FFFFFF" }}
              title="Send (Ctrl/⌘ + Enter)"
            >
              {busy ? "Sending…" : "Send"}
            </button>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[14px] font-semibold"
              style={{ border: "1px solid #CBD5E1", color: "#334155" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg>
              Attach
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void insertBookingLink()}
              disabled={linking}
              className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-[14px] font-semibold disabled:opacity-60"
              style={{ border: "1px solid #CBD5E1", color: "#334155" }}
              title={init.leadId ? "Insert this customer's booking link" : "Insert the booking link"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {linking ? "Adding…" : "Booking link"}
            </button>
            {account?.signature ? (
              <button type="button" onClick={insertSignature} className="inline-flex h-11 cursor-pointer items-center rounded-xl px-4 text-[14px] font-semibold" style={{ border: "1px solid #CBD5E1", color: "#334155" }}>
                Signature
              </button>
            ) : null}
            {files.length ? (
              <span className="text-[12px]" style={{ color: MUTED }}>
                {fileSize(total)} of 15 MB
              </span>
            ) : null}
            <span className="flex-1" />
            {error ? (
              <p role="alert" className="text-[13px] font-semibold" style={{ color: "#B91C1C" }}>
                {error}
              </p>
            ) : null}
            <button type="button" onClick={() => void discard()} aria-label="Discard" title="Discard draft" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl" style={{ border: "1px solid #CBD5E1" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
