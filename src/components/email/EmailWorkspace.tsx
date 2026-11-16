"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Counts,
  type Draft,
  type EmailPortal,
  type Folder,
  type FullMessage,
  type ListItem,
} from "./api";
import { Composer, type ComposeInit } from "./Composer";
import { LinkedRecord, MessageView, type MessageAction } from "./MessageView";

/**
 * Email: every connected mailbox (Hostinger, Outlook, Gmail) in one inbox.
 * Folders (Inbox, Starred, Sent, Drafts, Archive, Trash and the customer
 * folders), bulk actions, a full conversation view, compose with Attach,
 * Cc/Bcc, signature and drafts, keyboard shortcuts, and linking to leads.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const BORDER = "#E2E8F0";
const BORDER_2 = "#CBD5E1";
const BLUE = "#1976D2";
const NAVY = "#0B1A2E";

const FOLDERS: { key: Folder; label: string; icon: string }[] = [
  { key: "inbox", label: "Inbox", icon: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" },
  { key: "starred", label: "Starred", icon: "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" },
  { key: "sent", label: "Sent", icon: "M22 2 11 13M22 2l-7 20-4-9-9-4z" },
  { key: "drafts", label: "Drafts", icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
  { key: "archive", label: "Archive", icon: "M3 4h18v5H3zM5 9v11h14V9M10 13h4" },
  { key: "trash", label: "Trash", icon: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" },
  { key: "linked", label: "Linked to customers", icon: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" },
  { key: "unlinked", label: "Needs linking", icon: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" },
  { key: "all", label: "All mail", icon: "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM22 7l-10 6L2 7" },
];

type LeadHit = { id: string; customerName: string; customerEmail: string | null; address: string | null };
type Bulk = "read" | "unread" | "star" | "unstar" | "archive" | "unarchive" | "trash" | "restore";

const btn = "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-60";
const small = "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold";
const STAR = "m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";
const CLIP = "M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5";
const BIN = "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6";

function Svg({ d, size = 18, color = "currentColor", fill = "none" }: { d: string; size?: number; color?: string; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

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

const quoteOf = (m: FullMessage) =>
  `On ${longTime(m.sentAt)}, ${m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress} wrote:\n` +
  (m.bodyText || m.snippet)
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

const forwardOf = (m: FullMessage) =>
  [
    "---------- Forwarded message ----------",
    `From: ${m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}`,
    `Date: ${longTime(m.sentAt)}`,
    `Subject: ${m.subject}`,
    `To: ${m.to.join(", ")}`,
    ...(m.cc.length ? [`Cc: ${m.cc.join(", ")}`] : []),
    "",
    m.bodyText || m.snippet,
  ].join("\n");

const prefixed = (prefix: "Re" | "Fwd", s: string) => (new RegExp(`^${prefix}:`, "i").test(s.trim()) ? s : `${prefix}: ${s}`);

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DONE: Record<Bulk, string> = {
  archive: "Archived",
  unarchive: "Moved to Inbox",
  trash: "Moved to Trash",
  restore: "Restored",
  read: "Marked read",
  unread: "Marked unread",
  star: "Starred",
  unstar: "Star removed",
};

export function EmailWorkspace({ portal }: { portal: EmailPortal }) {
  const base = emailBase(portal);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts>({ unread: 0, unlinked: 0, starred: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<FullMessage | null>(null);
  const [compose, setCompose] = useState<ComposeInit | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadAccounts = useCallback(async () => {
    const r = await call<Account[]>(`${base}/accounts`);
    setSignedOut(r.status === 401);
    setAccounts(r.status === 401 ? null : r.data ?? []);
  }, [base]);

  const loadList = useCallback(
    async (more: boolean, cursor: string | null = null) => {
      setLoading(true);
      if (folder === "drafts") {
        const r = await call<Draft[]>(`${base}/drafts`);
        setDrafts(r.data ?? []);
        setItems([]);
        setNextBefore(null);
        setLoading(false);
        return;
      }
      const p = new URLSearchParams({ folder });
      if (accountId) p.set("accountId", accountId);
      if (search.trim()) p.set("search", search.trim());
      if (more && cursor) p.set("before", cursor);
      const r = await call<{ items: ListItem[]; nextBefore: string | null; counts: Counts }>(`${base}/messages?${p}`);
      if (r.status === 401) setSignedOut(true);
      setItems((xs) => (more ? [...xs, ...(r.data?.items ?? [])] : r.data?.items ?? []));
      setNextBefore(r.data?.nextBefore ?? null);
      if (r.data?.counts) setCounts(r.data.counts);
      setLoading(false);
    },
    [base, folder, accountId, search],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void loadAccounts(), 0);
    return () => window.clearTimeout(t);
  }, [loadAccounts]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadList(false), search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [loadList, search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("compose")) setCompose({ mode: "NEW" });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const open = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setCompose(null);
      setPicking(false);
      setNote(null);
      const r = await call<FullMessage>(`${base}/messages/${id}`);
      if (r.data) {
        setMsg(r.data);
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
      } else setNote(r.message ?? "Couldn't open that email.");
    },
    [base],
  );

  const syncAll = async () => {
    setBusy("sync");
    const list = (accounts ?? []).filter((a) => a.status === "ACTIVE" && (!accountId || a.id === accountId));
    await Promise.all(list.map((a) => call(`${base}/accounts/${a.id}/sync`, { method: "POST" })));
    setBusy(null);
    await Promise.all([loadAccounts(), loadList(false)]);
  };

  /** Actions that take an email out of the folder being shown. */
  const leaves = (action: Bulk) =>
    (action === "archive" && (folder === "inbox" || folder === "unlinked")) ||
    (action === "trash" && folder !== "trash") ||
    ((action === "restore" || action === "unarchive") && (folder === "trash" || folder === "archive")) ||
    (action === "unstar" && folder === "starred");

  const act = async (ids: string[], action: Bulk) => {
    if (!ids.length) return;
    const r = await call<{ updated: number }>(`${base}/messages/bulk`, { method: "POST", body: JSON.stringify({ ids, action }) });
    if (!r.ok) {
      setNote(r.message ?? "Couldn't update those emails.");
      return;
    }
    const patch = <T extends ListItem>(x: T): T =>
      action === "read" ? { ...x, isRead: true }
      : action === "unread" ? { ...x, isRead: false }
      : action === "star" ? { ...x, isStarred: true }
      : action === "unstar" ? { ...x, isStarred: false }
      : action === "archive" ? { ...x, isArchived: true, isTrashed: false }
      : action === "trash" ? { ...x, isTrashed: true }
      : { ...x, isArchived: false, isTrashed: false };
    const gone = leaves(action);
    const set = new Set(ids);
    let nextId: string | null = null;
    if (gone && selectedId && set.has(selectedId)) {
      const idx = items.findIndex((x) => x.id === selectedId);
      nextId = items.slice(idx + 1).find((x) => !set.has(x.id))?.id ?? null;
    }
    setItems((xs) => (gone ? xs.filter((x) => !set.has(x.id)) : xs.map((x) => (set.has(x.id) ? patch(x) : x))));
    setChecked(new Set());
    setNote(`${DONE[action]}${ids.length > 1 ? ` (${ids.length} emails)` : ""}.`);
    if (msg && set.has(msg.id)) {
      if ((gone || action === "unread") && selectedId && set.has(selectedId)) {
        setMsg(null);
        setSelectedId(null);
        if (gone && nextId) void open(nextId);
      } else setMsg(patch(msg));
    }
    const c = await call<{ counts: Counts }>(`${base}/messages?folder=inbox&take=1${accountId ? `&accountId=${accountId}` : ""}`);
    if (c.data?.counts) setCounts(c.data.counts);
  };

  const accountById = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a])), [accounts]);
  const sigFor = (id: string | null | undefined) => {
    const s = id ? accountById.get(id)?.signature : null;
    return s ? `\n\n${s}` : "";
  };
  const defaultAccount = () => accountId ?? (accounts ?? []).find((a) => a.status === "ACTIVE")?.id ?? null;
  const newEmail = () => {
    setMsg(null);
    setSelectedId(null);
    const id = defaultAccount();
    setCompose({ mode: "NEW", accountId: id, body: sigFor(id) });
  };

  const startReply = (m: FullMessage, mode: "REPLY" | "REPLY_ALL", text = "") => {
    const own = m.accountAddress.toLowerCase();
    const from = m.direction === "INBOUND" ? [m.fromAddress] : m.to;
    const to = mode === "REPLY" ? from : [...new Set([...from, ...m.to])].filter((x) => x && x !== own);
    const cc = mode === "REPLY_ALL" ? m.cc.filter((x) => x !== own && !to.includes(x)) : [];
    setCompose({
      mode,
      accountId: m.accountId,
      to: to.length ? to : from,
      cc,
      subject: prefixed("Re", m.subject),
      body: `${text}${sigFor(m.accountId)}\n\n${quoteOf(m)}`,
      sourceMessageId: m.id,
      leadId: m.lead?.id ?? null,
    });
  };

  const onAction = async (a: MessageAction) => {
    if (!msg) return;
    switch (a) {
      case "reply":
        return startReply(msg, "REPLY");
      case "replyAll":
        return startReply(msg, "REPLY_ALL");
      case "forward":
        return setCompose({
          mode: "FORWARD",
          accountId: msg.accountId,
          subject: prefixed("Fwd", msg.subject),
          body: `${sigFor(msg.accountId)}\n\n${forwardOf(msg)}`,
          sourceMessageId: msg.id,
          sourceAttachments: msg.attachments,
          includeAttachments: true,
          leadId: msg.lead?.id ?? null,
        });
      case "aiReply": {
        if (msg.aiDraft) return startReply(msg, "REPLY", msg.aiDraft);
        setBusy("ai");
        const r = await call<{ aiSummary: string | null; aiDraft: string | null }>(`${base}/messages/${msg.id}/ai`, { method: "POST" });
        setBusy(null);
        if (r.data) {
          const next = { ...msg, aiSummary: r.data.aiSummary, aiDraft: r.data.aiDraft };
          setMsg(next);
          startReply(next, "REPLY", r.data.aiDraft ?? "");
        } else setNote(r.message ?? "EasyLink AI couldn't draft a reply.");
        return;
      }
      case "print": {
        const w = window.open("", "_blank", "width=800,height=900");
        if (!w) return;
        w.opener = null;
        w.document.write(
          `<!doctype html><title>${escapeHtml(msg.subject)}</title><body style="font:14px/1.6 system-ui,sans-serif;padding:32px"><h2>${escapeHtml(msg.subject)}</h2><p style="color:#555">From: ${escapeHtml(msg.fromName ? `${msg.fromName} <${msg.fromAddress}>` : msg.fromAddress)}<br>To: ${escapeHtml(msg.to.join(", "))}<br>Date: ${escapeHtml(longTime(msg.sentAt))}</p><hr><div style="white-space:pre-wrap">${escapeHtml(msg.bodyText || msg.snippet)}</div></body>`,
        );
        w.document.close();
        w.focus();
        w.print();
        return;
      }
      case "back":
        setMsg(null);
        setSelectedId(null);
        return;
      default:
        return act([msg.id], a);
    }
  };

  const link = async (leadId: string | null) => {
    if (!msg) return;
    setBusy("link");
    const r = await call<FullMessage>(`${base}/messages/${msg.id}/link`, { method: "PATCH", body: JSON.stringify({ leadId }) });
    setBusy(null);
    setPicking(false);
    if (r.data) {
      setMsg(r.data);
      void loadList(false);
    } else setNote(r.message ?? "Couldn't link that email.");
  };

  const createLead = async () => {
    if (!msg) return;
    setBusy("lead");
    const r = await call<FullMessage>(`${base}/messages/${msg.id}/create-lead`, { method: "POST" });
    setBusy(null);
    if (r.data) {
      setMsg(r.data);
      void loadList(false);
    } else setNote(r.message ?? "Couldn't create the lead.");
  };

  const openDraft = (d: Draft) => {
    setSelectedId(d.id);
    setMsg(null);
    setCompose({
      mode: d.mode,
      accountId: d.accountId,
      to: d.to,
      cc: d.cc,
      bcc: d.bcc,
      subject: d.subject,
      body: d.body,
      sourceMessageId: d.sourceMessageId,
      includeAttachments: d.includeAttachments,
      leadId: d.leadId,
      draftId: d.id,
    });
  };

  const onComposeClose = (res: { sent: boolean; message?: string }) => {
    setCompose(null);
    if (res.message) setNote(res.message);
    void loadList(false);
  };

  // Keyboard shortcuts while not typing: c compose, r reply, a reply all, f forward,
  // e archive, # delete, s star, u unread, j/k next/previous, / search.
  const keys = useRef<(e: KeyboardEvent) => void>(() => undefined);
  const onKeyNow = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (e.metaKey || e.ctrlKey || e.altKey || compose || (t && t.closest("input, textarea, select, [contenteditable=true]"))) return;
    const idx = items.findIndex((x) => x.id === selectedId);
    const k = e.key;
    if (k === "c") newEmail();
    else if (k === "/") searchRef.current?.focus();
    else if (k === "j" && items[idx + 1]) void open(items[idx + 1]!.id);
    else if (k === "k" && idx > 0) void open(items[idx - 1]!.id);
    else if (!msg) return;
    else if (k === "r") void onAction("reply");
    else if (k === "a") void onAction("replyAll");
    else if (k === "f") void onAction("forward");
    else if (k === "e") void onAction(msg.isArchived ? "unarchive" : "archive");
    else if (k === "#") void onAction("trash");
    else if (k === "s") void onAction(msg.isStarred ? "unstar" : "star");
    else if (k === "u") void onAction("unread");
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    keys.current = onKeyNow;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reauth = (accounts ?? []).filter((a) => a.status === "REAUTH");
  const lastSync = (accounts ?? [])
    .map((a) => a.lastSyncAt)
    .filter(Boolean)
    .sort()
    .pop();
  const noAccounts = accounts !== null && accounts.length === 0;
  const allChecked = items.length > 0 && items.every((x) => checked.has(x.id));
  const checkedIds = [...checked];
  const checkedItems = items.filter((x) => checked.has(x.id));
  const showReading = Boolean(compose || msg);
  const folderCount = (f: Folder) => (f === "inbox" ? counts.unread : f === "starred" ? counts.starred : f === "drafts" ? counts.drafts : f === "unlinked" ? counts.unlinked : 0);

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
        <label className="flex h-11 min-w-[200px] flex-[0_1_380px] items-center gap-2 rounded-xl bg-white px-3" style={{ border: `1px solid ${BORDER_2}` }}>
          <Svg d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" color={MUTED} />
          <span className="sr-only">Search email</span>
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail, people and customers"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          />
        </label>
        <button type="button" onClick={newEmail} className={btn} style={{ background: BLUE, color: "#FFFFFF" }} title="Compose (c)">
          <Svg d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          Compose
        </button>
        <Link href={`${emailPage(portal)}/accounts`} className={btn} style={{ border: "1px solid #2196F3", color: BLUE, background: "#FFFFFF" }}>
          Accounts
        </Link>
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
            {reauth.map((a) => a.address).join(", ")} {reauth.length === 1 ? "needs" : "need"} reconnecting before new mail can sync.
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
            Bring Hostinger, Outlook or Gmail into the portal. Emails are matched to customers and leads automatically, and replies go out from your own address.
          </p>
          <Link href={`${emailPage(portal)}/accounts`} className={`${btn} self-start`} style={{ background: BLUE, color: "#FFFFFF" }}>
            Connect a mailbox
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-wrap lg:flex-nowrap">
          {/* Folders and mailboxes */}
          <nav aria-label="Mail folders" className={`box-border flex-col gap-5 px-4 py-5 lg:flex lg:w-[230px] lg:flex-none ${showReading ? "hidden" : "flex w-full"}`} style={{ borderRight: `1px solid ${BORDER}` }}>
            <div className="flex flex-col gap-0.5">
              {FOLDERS.map((f) => {
                const n = folderCount(f.key);
                const on = folder === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setFolder(f.key);
                      setSelectedId(null);
                      setMsg(null);
                      setCompose(null);
                      setChecked(new Set());
                      setNote(null);
                    }}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[14px]"
                    style={{ background: on ? "#E3F2FD" : "transparent", fontWeight: on ? 600 : 400, color: INK }}
                  >
                    <Svg d={f.icon} size={16} color={on ? BLUE : "#475569"} />
                    <span className="flex-1">{f.label}</span>
                    {n ? <span className="text-[12px] font-semibold">{n}</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-1">
              <p className="px-2 pb-1 text-[12px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                Mailboxes
              </p>
              {[{ id: null as string | null, label: "All mailboxes", sub: `${accounts?.length ?? 0} connected`, dot: NAVY, unread: 0 }]
                .concat((accounts ?? []).map((a) => ({ id: a.id, label: accountName(a), sub: a.address, dot: PROVIDER_DOT[a.provider], unread: a.unread })))
                .map((a) => (
                  <button
                    key={a.id ?? "all"}
                    type="button"
                    aria-pressed={accountId === a.id}
                    onClick={() => {
                      setAccountId(a.id);
                      setSelectedId(null);
                      setMsg(null);
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
            <div className="mt-auto flex flex-col gap-1.5 rounded-xl bg-white p-3 text-[12px]" style={{ border: `1px solid ${BORDER}`, color: "#475569" }}>
              <span>{lastSync ? `Last checked ${shortTime(lastSync)}` : "Not checked yet"} · new mail every 5 min</span>
              <button type="button" onClick={syncAll} disabled={busy === "sync"} className="self-start font-semibold" style={{ color: BLUE }}>
                {busy === "sync" ? "Checking…" : "Check for new mail"}
              </button>
              <span>Keys: c compose · r reply · a reply all · f forward · e archive · # delete · s star · u unread · j/k next/previous · / search</span>
            </div>
          </nav>

          {/* List */}
          <section aria-label="Emails" className={`min-w-0 flex-col bg-white lg:flex lg:w-[420px] lg:flex-none ${showReading ? "hidden" : "flex w-full"}`} style={{ borderRight: `1px solid ${BORDER}` }}>
            {folder !== "drafts" ? (
              <div className="flex min-h-[52px] flex-wrap items-center gap-2 px-4 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChecked}
                  onChange={(e) => setChecked(e.target.checked ? new Set(items.map((x) => x.id)) : new Set())}
                  className="h-[18px] w-[18px]"
                />
                {checked.size ? (
                  <>
                    <span className="text-[13px] font-semibold">{checked.size} selected</span>
                    {folder === "trash" ? (
                      <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, "restore")}>
                        Restore
                      </button>
                    ) : (
                      <>
                        {folder === "archive" ? (
                          <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, "unarchive")}>
                            Move to Inbox
                          </button>
                        ) : (
                          <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, "archive")}>
                            Archive
                          </button>
                        )}
                        <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}`, color: "#B91C1C" }} onClick={() => void act(checkedIds, "trash")}>
                          Delete
                        </button>
                      </>
                    )}
                    {checkedItems.some((x) => !x.isRead) ? (
                      <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, "read")}>
                        Mark read
                      </button>
                    ) : (
                      <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, "unread")}>
                        Mark unread
                      </button>
                    )}
                    <button type="button" className={small} style={{ border: `1px solid ${BORDER_2}` }} onClick={() => void act(checkedIds, checkedItems.every((x) => x.isStarred) ? "unstar" : "star")}>
                      {checkedItems.every((x) => x.isStarred) ? "Unstar" : "Star"}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[14px] font-semibold">{FOLDERS.find((f) => f.key === folder)?.label}</span>
                    <button type="button" onClick={() => void loadList(false)} className={small} style={{ border: `1px solid ${BORDER_2}` }}>
                      <Svg d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" size={14} />
                      Refresh
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {folder === "drafts" ? (
              drafts.length === 0 ? (
                <p className="p-5 text-[14px]" style={{ color: MUTED }}>
                  No drafts. An email you start and close is kept here.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {drafts.map((d) => (
                    <li key={d.id} className="flex items-stretch" style={{ borderBottom: "1px solid #EEF2F6", background: selectedId === d.id ? "#E3F2FD" : "#FFFFFF" }}>
                      <button type="button" onClick={() => openDraft(d)} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-4 py-3.5 text-left">
                        <span className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold" style={{ color: "#B91C1C" }}>
                            Draft
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{d.to.length ? `To ${d.to.join(", ")}` : "(no recipients)"}</span>
                          <span className="text-[12px]" style={{ color: MUTED }}>
                            {shortTime(d.updatedAt)}
                          </span>
                        </span>
                        <span className="truncate text-[14px]">{d.subject || "(no subject)"}</span>
                        <span className="truncate text-[13px]" style={{ color: MUTED }}>
                          {d.body.replace(/\s+/g, " ").slice(0, 120)}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete draft"
                        onClick={async () => {
                          await call(`${base}/drafts/${d.id}`, { method: "DELETE" });
                          if (compose?.draftId === d.id) setCompose(null);
                          void loadList(false);
                        }}
                        className="flex w-12 cursor-pointer items-center justify-center"
                      >
                        <Svg d={BIN} size={16} color="#B91C1C" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : loading && items.length === 0 ? (
              <p className="p-5 text-[14px]" style={{ color: MUTED }}>
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="p-5 text-[14px]" style={{ color: MUTED }}>
                {search ? "Nothing matches that search." : folder === "inbox" ? "All caught up. New mail arrives every few minutes." : "Nothing here."}
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((t) => {
                  const sel = t.id === selectedId;
                  const who = t.direction === "INBOUND" ? t.fromName || t.fromAddress : `To ${t.to.join(", ")}`;
                  return (
                    <li key={t.id} className="flex items-stretch" style={{ background: sel ? "#E3F2FD" : checked.has(t.id) ? "#F1F5F9" : "#FFFFFF", borderBottom: "1px solid #EEF2F6", boxShadow: sel ? `inset 3px 0 0 ${BLUE}` : "none" }}>
                      <div className="flex flex-col items-center gap-1 pl-3 pt-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${t.subject}`}
                          checked={checked.has(t.id)}
                          onChange={(e) => {
                            const n = new Set(checked);
                            if (e.target.checked) n.add(t.id);
                            else n.delete(t.id);
                            setChecked(n);
                          }}
                          className="h-[18px] w-[18px]"
                        />
                        <button type="button" aria-label={t.isStarred ? "Remove star" : "Star"} onClick={() => void act([t.id], t.isStarred ? "unstar" : "star")} className="flex h-8 w-8 cursor-pointer items-center justify-center">
                          <Svg d={STAR} size={16} color={t.isStarred ? "#D97706" : "#94A3B8"} fill={t.isStarred ? "#FBBF24" : "none"} />
                        </button>
                      </div>
                      <button type="button" onClick={() => void open(t.id)} className="flex min-w-0 flex-1 cursor-pointer gap-3 px-3 py-3.5 text-left">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-semibold" style={{ background: BORDER, color: "#1E3A5F" }}>
                          {initials(t.direction === "INBOUND" ? t.fromName || t.fromAddress : t.to[0] ?? "")}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            {!t.isRead ? <span className="h-2 w-2 flex-none rounded-full" style={{ background: BLUE }} title="Unread" /> : null}
                            <span className="min-w-0 flex-1 truncate text-[14px]" style={{ fontWeight: t.isRead ? 500 : 700 }}>
                              {who}
                            </span>
                            {t.hasAttachments ? <Svg d={CLIP} size={14} color={MUTED} /> : null}
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
                              {t.accountLabel || PROVIDER_LABEL[t.provider]}
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
                {nextBefore ? (
                  <li className="p-3">
                    <button type="button" onClick={() => void loadList(true, nextBefore)} disabled={loading} className={`${small} w-full justify-center`} style={{ border: `1px solid ${BORDER_2}` }}>
                      {loading ? "Loading…" : "Load more"}
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
          </section>

          {/* Reading pane / composer */}
          <div className={`box-border min-w-0 flex-1 flex-col gap-4 px-4 py-5 sm:px-7 lg:flex ${showReading ? "flex w-full" : "hidden"}`}>
            {compose ? (
              <Composer key={`${compose.draftId ?? ""}-${compose.mode}-${compose.sourceMessageId ?? ""}`} portal={portal} accounts={accounts ?? []} init={compose} onClose={onComposeClose} />
            ) : msg ? (
              <MessageView
                portal={portal}
                msg={msg}
                busy={busy}
                note={note}
                onAction={(a) => void onAction(a)}
                linkSlot={
                  picking ? (
                    <LeadPicker portal={portal} onPick={(id) => void link(id)} onCancel={() => setPicking(false)} />
                  ) : (
                    <LinkedRecord portal={portal} msg={msg} busy={busy} onChange={() => setPicking(true)} onUnlink={() => void link(null)} onCreateLead={() => void createLead()} />
                  )
                }
              />
            ) : (
              <div className="flex flex-col items-start gap-3">
                {note ? (
                  <p role="status" className="rounded-xl px-4 py-2.5 text-[13px] font-semibold" style={{ background: "#DCFCE7", color: "#14532D" }}>
                    {note}
                  </p>
                ) : null}
                <p className="text-[14px]" style={{ color: MUTED }}>
                  Select an email to read it, or press Compose.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
