"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { customerRecordHref } from "@/components/contact-centre/api";
import {
  PROVIDER_DOT,
  PROVIDER_LABEL,
  accountName,
  call,
  emailBase,
  emailPage,
  initials,
  leadsBase,
  longTime,
  shortTime,
  signInHref,
  type Account,
  type EmailPortal,
  type FullMessage,
  type ListItem,
} from "./api";

/**
 * Email: every connected Outlook and Gmail mailbox in one inbox. Each email
 * is linked to its customer or lead (by address, or by hand), and EasyLink AI
 * can summarise it and draft a reply. Replies go out from the mailbox the
 * email came to. Matches the "Email — Unified inbox" and "Compose" designs.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const BORDER = "#E2E8F0";
const BORDER_2 = "#CBD5E1";
const BLUE = "#1976D2";
const NAVY = "#0B1A2E";

type Folder = "inbox" | "linked" | "unlinked" | "sent" | "all";
const FOLDERS: { key: Folder; label: string }[] = [
  { key: "inbox", label: "Inbox" },
  { key: "linked", label: "Linked to customers" },
  { key: "unlinked", label: "Needs linking" },
  { key: "sent", label: "Sent" },
  { key: "all", label: "All mail" },
];

type LeadHit = { id: string; customerName: string; customerEmail: string | null; address: string | null };

const splitAddresses = (s: string) =>
  s
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const btn = "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-60";

function LeadPicker({ portal, onPick, onCancel }: { portal: EmailPortal; onPick: (id: string) => void; onCancel: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LeadHit[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setHits([]);
        return;
      }
      const r = await call<LeadHit[] | { items?: LeadHit[]; leads?: LeadHit[] }>(`${leadsBase(portal)}?limit=8&search=${encodeURIComponent(q.trim())}`);
      const d = r.data;
      setHits(Array.isArray(d) ? d : d?.items ?? d?.leads ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, portal]);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-3" style={{ border: `1px solid ${BORDER_2}` }}>
      <label htmlFor="lead-search" className="text-[13px] font-semibold">
        Find the customer or lead
      </label>
      <input
        id="lead-search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name, email, phone or address"
        className="h-11 rounded-lg px-3 text-[14px] outline-none"
        style={{ border: `1px solid ${BORDER_2}` }}
      />
      <ul className="flex flex-col">
        {hits.map((h) => (
          <li key={h.id}>
            <button type="button" onClick={() => onPick(h.id)} className="w-full cursor-pointer rounded-lg px-3 py-2 text-left hover:bg-[#F1F5F9]">
              <span className="block text-[14px] font-semibold">{h.customerName}</span>
              <span className="block text-[12px]" style={{ color: MUTED }}>
                {[h.customerEmail, h.address].filter(Boolean).join(" · ") || "No email or address"}
              </span>
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && hits.length === 0 ? (
          <li className="px-3 py-2 text-[13px]" style={{ color: MUTED }}>
            No matches yet.
          </li>
        ) : null}
      </ul>
      <button type="button" onClick={onCancel} className="self-start text-[13px] font-semibold" style={{ color: BLUE }}>
        Cancel
      </button>
    </div>
  );
}

function Compose({
  portal,
  accounts,
  onClose,
  onSent,
}: {
  portal: EmailPortal;
  accounts: Account[];
  onClose: () => void;
  onSent: () => void;
}) {
  const usable = accounts.filter((a) => a.status === "ACTIVE");
  const [from, setFrom] = useState(usable[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setMsg(null);
    const r = await call(`${emailBase(portal)}/send`, {
      method: "POST",
      body: JSON.stringify({ accountId: from, to: splitAddresses(to), cc: splitAddresses(cc), subject, body }),
    });
    setBusy(false);
    if (r.ok) onSent();
    else setMsg(r.message ?? "Couldn't send. Check the addresses and try again.");
  };

  return (
    <section aria-labelledby="compose-h" className="flex flex-col gap-0 rounded-2xl bg-white" style={{ border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <h2 id="compose-h" className="flex-grow text-[20px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
          New email
        </h2>
        <button type="button" onClick={onClose} className={btn} style={{ border: `1px solid ${BORDER_2}`, color: "#334155" }}>
          Discard
        </button>
      </div>
      {usable.length === 0 ? (
        <p className="p-5 text-[14px]" style={{ color: MUTED }}>
          Connect a mailbox first.{" "}
          <Link href={`${emailPage(portal)}/accounts`} className="font-semibold">
            Connect account
          </Link>
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-x-3 px-5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <label htmlFor="c-from" className="text-[14px] font-semibold" style={{ color: "#475569" }}>
              From
            </label>
            <select id="c-from" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 bg-transparent text-[14px]">
              {usable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.address} — {accountName(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-x-3 px-5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <label htmlFor="c-to" className="text-[14px] font-semibold" style={{ color: "#475569" }}>
              To
            </label>
            <div className="flex items-center gap-2">
              <input id="c-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com, another@example.com" className="h-11 min-w-0 flex-1 text-[14px] outline-none" />
              {!showCc ? (
                <button type="button" onClick={() => setShowCc(true)} className="text-[13px] font-semibold" style={{ color: BLUE }}>
                  Cc
                </button>
              ) : null}
            </div>
          </div>
          {showCc ? (
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-x-3 px-5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <label htmlFor="c-cc" className="text-[14px] font-semibold" style={{ color: "#475569" }}>
                Cc
              </label>
              <input id="c-cc" value={cc} onChange={(e) => setCc(e.target.value)} className="h-11 text-[14px] outline-none" />
            </div>
          ) : null}
          <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-x-3 px-5 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <label htmlFor="c-subject" className="text-[14px] font-semibold" style={{ color: "#475569" }}>
              Subject
            </label>
            <input id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 text-[15px] font-semibold outline-none" />
          </div>
          <label htmlFor="c-body" className="sr-only">
            Message
          </label>
          <textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[280px] resize-y p-5 text-[15px] leading-relaxed outline-none" />
          <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            {msg ? (
              <p role="alert" className="text-[13px] font-semibold" style={{ color: "#B91C1C" }}>
                {msg}
              </p>
            ) : null}
            <span className="flex-1" />
            <button
              type="button"
              onClick={send}
              disabled={busy || !from || !to.trim() || !subject.trim() || !body.trim()}
              className={btn}
              style={{ background: BLUE, color: "#FFFFFF" }}
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function EmailWorkspace({ portal }: { portal: EmailPortal }) {
  const base = emailBase(portal);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [counts, setCounts] = useState({ unread: 0, unlinked: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<FullMessage | null>(null);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const loadAccounts = useCallback(async () => {
    const r = await call<Account[]>(`${base}/accounts`);
    setSignedOut(r.status === 401);
    setAccounts(r.status === 401 ? null : r.data ?? []);
  }, [base]);

  const loadList = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ folder });
    if (accountId) p.set("accountId", accountId);
    if (search.trim()) p.set("search", search.trim());
    const r = await call<{ items: ListItem[]; counts: { unread: number; unlinked: number } }>(`${base}/messages?${p}`);
    setItems(r.data?.items ?? []);
    if (r.data?.counts) setCounts(r.data.counts);
    setLoading(false);
  }, [base, folder, accountId, search]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadAccounts(), 0);
    return () => window.clearTimeout(t);
  }, [loadAccounts]);
  useEffect(() => {
    const t = setTimeout(() => void loadList(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadList, search]);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("compose")) setCompose(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const open = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setCompose(false);
      setPicking(false);
      setNote(null);
      const r = await call<FullMessage>(`${base}/messages/${id}`);
      if (r.data) {
        setMsg(r.data);
        setDraft(r.data.aiDraft ?? "");
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
      }
    },
    [base],
  );

  useEffect(() => {
    if (selectedId || !items[0] || compose) return;
    const first = items[0].id;
    const t = window.setTimeout(() => void open(first), 0);
    return () => window.clearTimeout(t);
  }, [items, selectedId, compose, open]);

  const syncAll = async () => {
    setBusy("sync");
    const list = (accounts ?? []).filter((a) => a.status === "ACTIVE" && (!accountId || a.id === accountId));
    await Promise.all(list.map((a) => call(`${base}/accounts/${a.id}/sync`, { method: "POST" })));
    setBusy(null);
    await Promise.all([loadAccounts(), loadList()]);
  };

  const link = async (leadId: string | null) => {
    if (!msg) return;
    setBusy("link");
    const r = await call<FullMessage>(`${base}/messages/${msg.id}/link`, { method: "PATCH", body: JSON.stringify({ leadId }) });
    setBusy(null);
    setPicking(false);
    if (r.data) {
      setMsg(r.data);
      void loadList();
    } else setNote(r.message ?? "Couldn't link that email.");
  };

  const createLead = async () => {
    if (!msg) return;
    setBusy("lead");
    const r = await call<FullMessage>(`${base}/messages/${msg.id}/create-lead`, { method: "POST" });
    setBusy(null);
    if (r.data) {
      setMsg(r.data);
      void loadList();
    } else setNote(r.message ?? "Couldn't create the lead.");
  };

  const aiDraft = async () => {
    if (!msg) return;
    setBusy("ai");
    setNote(null);
    const r = await call<{ aiSummary: string | null; aiDraft: string | null }>(`${base}/messages/${msg.id}/ai`, { method: "POST" });
    setBusy(null);
    if (r.data) {
      setMsg({ ...msg, aiSummary: r.data.aiSummary, aiDraft: r.data.aiDraft });
      if (r.data.aiDraft) setDraft(r.data.aiDraft);
    } else setNote(r.message ?? "EasyLink AI couldn't draft a reply.");
  };

  const sendReply = async () => {
    if (!msg) return;
    setBusy("send");
    setNote(null);
    const to = msg.direction === "INBOUND" ? [msg.fromAddress] : msg.to;
    const subject = /^re:/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`;
    const r = await call(`${base}/send`, {
      method: "POST",
      body: JSON.stringify({ accountId: msg.accountId, to, subject, body: draft, replyToId: msg.id, leadId: msg.lead?.id ?? null }),
    });
    setBusy(null);
    if (r.ok) {
      setDraft("");
      setNote("Reply sent.");
      void loadList();
    } else setNote(r.message ?? "Couldn't send the reply.");
  };

  const acctById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const reauth = (accounts ?? []).filter((a) => a.status === "REAUTH");
  const lastSync = (accounts ?? [])
    .map((a) => a.lastSyncAt)
    .filter(Boolean)
    .sort()
    .pop();

  const noAccounts = accounts !== null && accounts.length === 0;

  return (
    <div className="flex min-h-screen flex-col" style={{ color: INK, fontFamily: "Inter, system-ui, sans-serif" }}>
      <header className="flex flex-wrap items-center gap-4 bg-white px-7 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex-grow">
          <p className="text-[13px]" style={{ color: MUTED }}>
            Communication
          </p>
          <h1 className="text-[28px] font-bold leading-tight" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Email
          </h1>
        </div>
        <label className="flex h-11 min-w-[200px] flex-[0_1_360px] items-center gap-2 rounded-xl bg-white px-3" style={{ border: `1px solid ${BORDER_2}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="sr-only">Search email</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail and customers"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          />
        </label>
        <Link href={`${emailPage(portal)}/accounts`} className={btn} style={{ border: `1px solid #2196F3`, color: BLUE, background: "#FFFFFF" }}>
          Connect account
        </Link>
        <button
          type="button"
          onClick={() => {
            setCompose(true);
            setSelectedId(null);
            setMsg(null);
          }}
          className={btn}
          style={{ background: BLUE, color: "#FFFFFF" }}
        >
          Compose
        </button>
      </header>

      {signedOut ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-7 py-3 text-[14px] font-semibold" style={{ background: "#FFF7ED", color: "#7C2D12", borderBottom: "1px solid #FDBA74" }}>
          <span className="flex-1">Your sign-in has expired. Sign in again to see your email.</span>
          <a href={signInHref(portal)} className="rounded-lg px-3 py-2 text-white" style={{ background: "#C2410C" }}>
            Sign in again
          </a>
        </div>
      ) : null}

      {reauth.length ? (
        <div role="status" className="flex flex-wrap items-center gap-3 px-7 py-3 text-[14px]" style={{ background: "#FFF7ED", color: "#7C2D12", borderBottom: "1px solid #FDBA74" }}>
          <span className="flex-1">
            {reauth.map((a) => a.address).join(", ")} {reauth.length === 1 ? "needs" : "need"} signing in again before new mail can sync.
          </span>
          <Link href={`${emailPage(portal)}/accounts`} className="font-semibold" style={{ color: "#9A3412" }}>
            Reconnect
          </Link>
        </div>
      ) : null}

      {noAccounts ? (
        <div className="m-7 flex max-w-[640px] flex-col gap-3 rounded-2xl bg-white p-7" style={{ border: `1px solid ${BORDER}` }}>
          <h2 className="text-[22px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Connect your first mailbox
          </h2>
          <p className="text-[15px] leading-relaxed" style={{ color: "#475569" }}>
            Bring Outlook or Gmail into the portal. Emails are matched to customers and leads automatically, and replies go out from your own address.
          </p>
          <Link href={`${emailPage(portal)}/accounts`} className={`${btn} self-start`} style={{ background: BLUE, color: "#FFFFFF" }}>
            Connect Outlook or Gmail
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-wrap">
          <section aria-label="Mailboxes" className="box-border flex max-w-[260px] flex-[1_1_220px] flex-col gap-5 px-4 py-5" style={{ borderRight: `1px solid ${BORDER}` }}>
            <div className="flex flex-col gap-1">
              <p className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                Accounts
              </p>
              {[{ id: null as string | null, label: "All inboxes", sub: `${accounts?.length ?? 0} connected`, dot: NAVY, unread: counts.unread }]
                .concat(
                  (accounts ?? []).map((a) => ({ id: a.id, label: accountName(a), sub: a.address, dot: PROVIDER_DOT[a.provider], unread: a.unread })),
                )
                .map((a) => (
                  <button
                    key={a.id ?? "all"}
                    type="button"
                    aria-pressed={accountId === a.id}
                    onClick={() => {
                      setAccountId(a.id);
                      setSelectedId(null);
                    }}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left"
                    style={{ background: accountId === a.id ? "#E3F2FD" : "transparent" }}
                  >
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: a.dot }} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[14px] font-semibold">{a.label}</span>
                      <span className="truncate text-[12px]" style={{ color: MUTED }}>
                        {a.sub}
                      </span>
                    </span>
                    {a.unread ? <span className="text-[12px] font-semibold">{a.unread}</span> : null}
                  </button>
                ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                Folders
              </p>
              {FOLDERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={folder === f.key}
                  onClick={() => {
                    setFolder(f.key);
                    setSelectedId(null);
                  }}
                  className="flex cursor-pointer justify-between rounded-xl px-2.5 py-2.5 text-left text-[14px]"
                  style={{ background: folder === f.key ? "#E3F2FD" : "transparent", fontWeight: folder === f.key ? 600 : 400 }}
                >
                  {f.label}
                  {f.key === "unlinked" && counts.unlinked ? <span>{counts.unlinked}</span> : null}
                </button>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-1.5 rounded-xl bg-white p-3 text-[12px]" style={{ border: `1px solid ${BORDER}`, color: "#475569" }}>
              <span>{lastSync ? `Last sync ${shortTime(lastSync)}` : "Not synced yet"}</span>
              <button type="button" onClick={syncAll} disabled={busy === "sync"} className="self-start font-semibold" style={{ color: BLUE }}>
                {busy === "sync" ? "Syncing…" : "Sync now"}
              </button>
            </div>
          </section>

          <section aria-label="Emails" className="flex min-w-0 max-w-[420px] flex-[1_1_320px] flex-col bg-white" style={{ borderRight: `1px solid ${BORDER}` }}>
            {loading && items.length === 0 ? (
              <p className="p-5 text-[14px]" style={{ color: MUTED }}>
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="p-5 text-[14px]" style={{ color: MUTED }}>
                {search ? "Nothing matches that search." : "No emails here yet. New mail arrives every few minutes."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((t) => {
                  const sel = t.id === selectedId;
                  const who = t.direction === "INBOUND" ? t.fromName || t.fromAddress : `To ${t.to.join(", ")}`;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => void open(t.id)}
                        className="flex w-full cursor-pointer gap-3 px-4 py-3.5 text-left"
                        style={{ background: sel ? "#E3F2FD" : "#FFFFFF", borderBottom: "1px solid #EEF2F6", boxShadow: sel ? `inset 3px 0 0 ${BLUE}` : "none" }}
                      >
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-semibold" style={{ background: BORDER, color: "#1E3A5F" }}>
                          {initials(t.direction === "INBOUND" ? t.fromName || t.fromAddress : t.to[0] ?? "")}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[14px]" style={{ fontWeight: t.isRead ? 500 : 700 }}>
                              {who}
                            </span>
                            <span className="text-[12px]" style={{ color: MUTED }}>
                              {shortTime(t.sentAt)}
                            </span>
                          </span>
                          <span className="truncate text-[14px]" style={{ fontWeight: t.isRead ? 500 : 700 }}>
                            {t.subject}
                          </span>
                          <span className="truncate text-[13px]" style={{ color: MUTED }}>
                            {t.snippet}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: "#F1F5F9", color: "#334155" }}>
                              <span className="h-[7px] w-[7px] rounded-full" style={{ background: PROVIDER_DOT[t.provider] }} />
                              {PROVIDER_LABEL[t.provider]}
                            </span>
                            {t.lead ? (
                              <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: "#DCFCE7", color: "#14532D" }}>
                                {t.lead.name}
                              </span>
                            ) : t.direction === "INBOUND" ? (
                              <span className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: "#FFEDD5", color: "#7C2D12" }}>
                                Needs linking
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="box-border flex min-w-0 flex-[999_1_420px] flex-col gap-4 px-7 py-6">
            {compose ? (
              <Compose
                portal={portal}
                accounts={accounts ?? []}
                onClose={() => setCompose(false)}
                onSent={() => {
                  setCompose(false);
                  setFolder("sent");
                  setNote("Email sent.");
                }}
              />
            ) : msg ? (
              <article aria-label="Email" className="flex flex-col gap-4">
                <div>
                  <h2 className="mb-2 text-[24px] font-bold leading-tight" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                    {msg.subject}
                  </h2>
                  <p className="text-[14px]" style={{ color: "#334155" }}>
                    <strong>{msg.fromName || msg.fromAddress}</strong> &lt;{msg.fromAddress}&gt;
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: MUTED }}>
                    to {msg.to.join(", ")}
                    {msg.cc.length ? `, cc ${msg.cc.join(", ")}` : ""} · via {PROVIDER_LABEL[msg.provider]} ({msg.accountAddress}) · {longTime(msg.sentAt)}
                  </p>
                </div>

                {picking ? (
                  <LeadPicker portal={portal} onPick={(id) => void link(id)} onCancel={() => setPicking(false)} />
                ) : msg.lead ? (
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
                    <button type="button" onClick={() => setPicking(true)} className="text-[14px] font-semibold" style={{ color: BLUE }}>
                      Change link
                    </button>
                    <button type="button" onClick={() => void link(null)} className="text-[14px] font-semibold" style={{ color: "#475569" }}>
                      Unlink
                    </button>
                  </div>
                ) : msg.direction === "INBOUND" ? (
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: "#FFF7ED", border: "1px solid #FDBA74" }}>
                    <span className="min-w-[240px] flex-1 text-[14px]" style={{ color: "#7C2D12" }}>
                      No customer or lead matches this sender yet.
                    </span>
                    <button type="button" onClick={() => setPicking(true)} className="h-10 cursor-pointer rounded-lg bg-white px-3.5 text-[14px] font-semibold" style={{ border: "1px solid #C2410C", color: "#9A3412" }}>
                      Link to customer…
                    </button>
                    {portal === "admin" ? (
                      <button type="button" onClick={createLead} disabled={busy === "lead"} className="h-10 cursor-pointer rounded-lg px-3.5 text-[14px] font-semibold" style={{ background: "#C2410C", color: "#FFFFFF" }}>
                        {busy === "lead" ? "Creating…" : "Create lead"}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {msg.aiSummary ? (
                  <div className="flex flex-col gap-1.5 rounded-2xl px-4 py-3.5" style={{ background: NAVY, color: "#E2E8F0" }}>
                    <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#FFE866" }}>
                      EasyLink AI summary
                    </span>
                    <span className="text-[14px] leading-relaxed">{msg.aiSummary}</span>
                  </div>
                ) : null}

                {msg.thread.length ? (
                  <details className="rounded-xl bg-white px-4 py-3 text-[13px]" style={{ border: `1px solid ${BORDER}` }}>
                    <summary className="cursor-pointer font-semibold">
                      {msg.thread.length} earlier {msg.thread.length === 1 ? "email" : "emails"} in this conversation
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {msg.thread.map((t) => (
                        <li key={t.id}>
                          <button type="button" onClick={() => void open(t.id)} className="w-full text-left">
                            <strong>{t.fromName || t.fromAddress}</strong> · {shortTime(t.sentAt)} — <span style={{ color: MUTED }}>{t.snippet}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed" style={{ color: "#1E293B" }}>
                  {msg.bodyText || msg.snippet}
                </div>

                {msg.attachments.length ? (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px]" style={{ border: `1px solid ${BORDER}` }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" aria-hidden="true">
                          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <path d="M14 3v6h6" />
                        </svg>
                        {f.name}
                      </span>
                    ))}
                    <span className="self-center text-[12px]" style={{ color: MUTED }}>
                      Attachments open in {PROVIDER_LABEL[msg.provider]}.
                    </span>
                  </div>
                ) : null}

                <div className="mt-2 flex flex-col rounded-2xl bg-white" style={{ border: `1px solid ${BORDER_2}` }}>
                  <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 text-[13px]" style={{ borderBottom: `1px solid ${BORDER}`, color: "#475569" }}>
                    <span>
                      Reply from <strong style={{ color: INK }}>{acctById.get(msg.accountId)?.address ?? msg.accountAddress}</strong>
                    </span>
                    <span className="flex-1" />
                    {msg.aiEnabled ? (
                      <button
                        type="button"
                        onClick={aiDraft}
                        disabled={busy === "ai"}
                        className="h-9 cursor-pointer rounded-lg px-3 text-[13px] font-bold"
                        style={{ background: "linear-gradient(90deg, #FFE866, #F68A0A)", color: "#3B1D00" }}
                      >
                        {busy === "ai" ? "Drafting…" : "Draft reply with EasyLink AI"}
                      </button>
                    ) : null}
                  </div>
                  <label htmlFor="reply-body" className="sr-only">
                    Reply
                  </label>
                  <textarea
                    id="reply-body"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a reply…"
                    className="min-h-[120px] resize-y p-3.5 text-[14px] leading-relaxed outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                    {note ? (
                      <p role="status" className="text-[13px] font-semibold" style={{ color: note.endsWith("sent.") ? "#166534" : "#B91C1C" }}>
                        {note}
                      </p>
                    ) : null}
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={sendReply}
                      disabled={busy === "send" || !draft.trim() || msg.accountStatus !== "ACTIVE"}
                      className={btn}
                      style={{ background: BLUE, color: "#FFFFFF" }}
                    >
                      {busy === "send" ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <p className="text-[14px]" style={{ color: MUTED }}>
                {note ?? "Select an email to read it."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
