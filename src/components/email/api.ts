"use client";

/** Shared client helpers for Email (Outlook and Gmail) in both portals. */

export type EmailPortal = "admin" | "installer";

export const emailBase = (portal: EmailPortal) => (portal === "admin" ? "/api/admin/email" : "/api/installers/email");
export const leadsBase = (portal: EmailPortal) => (portal === "admin" ? "/api/admin/leads" : "/api/installers/leads");
export const emailPage = (portal: EmailPortal) => (portal === "admin" ? "/master/email" : "/installers/dashboard/email");

export type Provider = "MICROSOFT" | "GOOGLE" | "IMAP";

export type EmailStatus = { microsoft: boolean; google: boolean; imap?: boolean; ai: boolean; redirectUris: { microsoft: string; google: string } };

export type Account = {
  id: string;
  provider: Provider;
  address: string;
  displayName: string | null;
  label: string | null;
  shared: boolean;
  visibility: "OWNER" | "STAFF";
  status: "ACTIVE" | "REAUTH";
  historyDays: number;
  autoLink: boolean;
  createLeads: boolean;
  aiEnabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  signature: string | null;
  server: { imapHost: string | null; imapPort: number | null; smtpHost: string | null; smtpPort: number | null; loginUser: string | null } | null;
  owner: string | null;
  mine: boolean;
  unread: number;
};

export type LeadRef = { id: string; name: string; status: string; address: string | null };

export type ListItem = {
  id: string;
  accountId: string;
  provider: Provider;
  accountAddress: string;
  accountLabel: string | null;
  direction: "INBOUND" | "OUTBOUND";
  fromAddress: string;
  fromName: string | null;
  to: string[];
  cc: string[];
  subject: string;
  snippet: string;
  sentAt: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  hasAttachments: boolean;
  threadId: string | null;
  lead: LeadRef | null;
};

export type Attachment = { index: number; name: string; size: number; contentType: string };

export type ThreadItem = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  fromAddress: string;
  fromName: string | null;
  to: string[];
  cc: string[];
  sentAt: string;
  snippet: string;
  bodyText: string;
  attachments: Attachment[];
};

export type FullMessage = ListItem & {
  bodyText: string;
  attachments: Attachment[];
  linkSource: string | null;
  aiSummary: string | null;
  aiDraft: string | null;
  aiEnabled: boolean;
  accountStatus: "ACTIVE" | "REAUTH";
  signature: string | null;
  thread: ThreadItem[];
};

export type ComposeMode = "NEW" | "REPLY" | "REPLY_ALL" | "FORWARD";

export type Draft = {
  id: string;
  accountId: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  mode: ComposeMode;
  sourceMessageId: string | null;
  includeAttachments: boolean;
  leadId: string | null;
  updatedAt: string;
};

export type Folder = "inbox" | "starred" | "sent" | "drafts" | "archive" | "trash" | "linked" | "unlinked" | "all";

export type Counts = { unread: number; unlinked: number; starred: number; drafts: number };

export const fileSize = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`;


export async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status?: number; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers ?? {}) } : init?.headers,
    });
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, status: res.status, data: json.data, message: res.status === 401 ? SIGNED_OUT : json.message };
  } catch {
    return { ok: false, message: "Couldn't reach EasyLink. Try again." };
  }
}

/** Shown whenever the portal session has run out. */
export const SIGNED_OUT = "Your sign-in has expired. Sign in again to use Email.";

export const signInHref = (portal: EmailPortal) =>
  `/installers/auth?from=${encodeURIComponent(portal === "admin" ? "/master/email/accounts" : "/installers/dashboard/email/accounts")}`;

export const PROVIDER_LABEL: Record<Provider, string> = { MICROSOFT: "Outlook", GOOGLE: "Gmail", IMAP: "IMAP" };
/** Blue for Outlook, orange for Gmail: they differ in lightness, not hue alone. */
export const PROVIDER_DOT: Record<Provider, string> = { MICROSOFT: "#1976D2", GOOGLE: "#C2410C", IMAP: "#0F766E" };

const TZ = "Australia/Sydney";
export function shortTime(iso: string) {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("en-AU", { timeZone: TZ });
  if (d.toLocaleDateString("en-AU", { timeZone: TZ }) === today) {
    return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  }
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: TZ });
}
export const longTime = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });

export const initials = (s: string) =>
  s
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export const accountName = (a: Pick<Account, "label" | "address" | "provider">) =>
  `${a.label ? `${a.label} · ` : ""}${PROVIDER_LABEL[a.provider]}`;

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", zwnj: "", zwj: "", shy: "", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®", trade: "™" };

/**
 * Tidies text taken from an email: drops inline-image markers ("[cid:…]"),
 * leftover HTML entities ("&zwnj;", "&nbsp;"), invisible spacer characters
 * marketing emails use, and long runs of blank lines.
 */
export function cleanMailText(text: string): string {
  return text
    .replace(/\[cid:[^\]\s]*\]/gi, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e: string) => {
      const k = e.toLowerCase();
      if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16) || 32);
      if (k.startsWith("#")) return String.fromCodePoint(parseInt(k.slice(1), 10) || 32);
      return k in ENTITIES ? ENTITIES[k] : all;
    })
    .replace(/[​-‍⁠﻿͏­]/g, "")
    .replace(/[ \t ]+$/gm, "")
    .replace(/^[ \t ]+(?=\S)/gm, (s) => (s.length > 8 ? "" : s))
    .replace(/(?:[ \t ]{2,})/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
