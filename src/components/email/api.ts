"use client";

/** Shared client helpers for Email (Outlook and Gmail) in both portals. */

export type EmailPortal = "admin" | "installer";

export const emailBase = (portal: EmailPortal) => (portal === "admin" ? "/api/admin/email" : "/api/installers/email");
export const leadsBase = (portal: EmailPortal) => (portal === "admin" ? "/api/admin/leads" : "/api/installers/leads");
export const emailPage = (portal: EmailPortal) => (portal === "admin" ? "/master/email" : "/installers/dashboard/email");

export type Provider = "MICROSOFT" | "GOOGLE";

export type EmailStatus = { microsoft: boolean; google: boolean; ai: boolean; redirectUris: { microsoft: string; google: string } };

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
  subject: string;
  snippet: string;
  sentAt: string;
  isRead: boolean;
  hasAttachments: boolean;
  threadId: string | null;
  lead: LeadRef | null;
};

export type FullMessage = ListItem & {
  cc: string[];
  bodyText: string;
  attachments: { name: string; size: number; contentType: string }[];
  linkSource: string | null;
  aiSummary: string | null;
  aiDraft: string | null;
  aiEnabled: boolean;
  accountStatus: "ACTIVE" | "REAUTH";
  thread: { id: string; direction: string; fromAddress: string; fromName: string | null; sentAt: string; snippet: string }[];
};

export async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...(init.headers ?? {}) } : init?.headers,
    });
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, data: json.data, message: json.message };
  } catch {
    return { ok: false, message: "Couldn't reach EasyLink. Try again." };
  }
}

export const PROVIDER_LABEL: Record<Provider, string> = { MICROSOFT: "Outlook", GOOGLE: "Gmail" };
/** Blue for Outlook, orange for Gmail: they differ in lightness, not hue alone. */
export const PROVIDER_DOT: Record<Provider, string> = { MICROSOFT: "#1976D2", GOOGLE: "#C2410C" };

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
