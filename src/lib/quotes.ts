import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";
import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";
import type { CustomerQuoteAction, StaffQuoteAction } from "@/lib/quotes-actions";

/**
 * Quote versions and deposits, shared by the operations, installer and
 * customer portals. Shapes mirror the backend /quotes API exactly; all money
 * is in cents and includes GST. Nothing here invents a figure: when the
 * backend hasn't sent something, the helpers say so instead.
 */

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "SUPERSEDED";
export type DepositMode = "PERCENT" | "FIXED";
export type PaymentLinkChannel = "email" | "sms" | "both";

export type QuoteLine = {
  category: string;
  productId?: string | null;
  name: string;
  brand?: string | null;
  model?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

/** The frozen copy of the design taken when the version was made. */
export type QuoteSnapshot = {
  address?: string | null;
  roofFaceCount?: number | null;
  panelLayoutCount?: number | null;
  equipment?: QuoteLine[] | null;
  extras?: QuoteLine[] | null;
  [key: string]: unknown;
};

export type Quote = {
  id: string;
  number: number;
  leadId: string | null;
  customerId: string | null;
  sourceDesignId: string | null;
  version: number;
  status: QuoteStatus;
  title: string;
  snapshot: QuoteSnapshot | null;
  systemKw: number | null;
  panelCount: number | null;
  batteryKwh: number | null;
  subtotalCents: number;
  stcDiscountCents: number;
  rebateCents: number;
  totalCents: number;
  depositMode: DepositMode;
  depositPercent: number;
  depositCents: number;
  validUntil: string;
  notes: string | null;
  /** Staff and installer only; never sent to the customer. */
  internalNotes?: string | null;
  createdById?: string;
  createdBy?: { firstName?: string | null; lastName?: string | null } | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  acceptedName?: string | null;
  termsVersion?: string | null;
  depositPaymentId?: string | null;
  depositPaidAt: string | null;
  lastReminderAt?: string | null;
  reminderCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateQuoteInput = {
  leadId?: string;
  customerId?: string;
  designId?: string;
  depositPercent?: number;
  depositFixedCents?: number;
  validDays?: number;
  notes?: string;
  internalNotes?: string;
};

export type UpdateQuoteInput = {
  depositPercent?: number;
  depositFixedCents?: number;
  validUntil?: string;
  notes?: string | null;
  internalNotes?: string | null;
  title?: string;
  /** Hand-edited lines (drafts only); both lists are replaced together. */
  lines?: { equipment: EditableEquipmentLine[]; works: EditableWorksLine[] };
  stcDiscountCents?: number;
  rebateCents?: number;
};

export type EditableEquipmentLine = {
  category: string;
  productId?: string;
  name: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitPriceCents: number;
};
export type EditableWorksLine = { name: string; note?: string; quantity: number; unitPriceCents: number };

export const DEFAULT_DEPOSIT_PERCENT = 25;
export const DEFAULT_VALID_DAYS = 30;
export const QUOTE_TERMS_HREF = "/warranty";
/** The backend sends at most this many automatic reminders per quote. */
export const MAX_QUOTE_REMINDERS = 5;

/* ---------- money ---------- */

const AUD_WHOLE = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const AUD_CENTS = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$15,980" for whole dollars, "$3,995.50" when there are cents. */
export function formatCents(cents: number | null | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  const rounded = Math.round(cents);
  return rounded % 100 === 0 ? AUD_WHOLE.format(rounded / 100) : AUD_CENTS.format(rounded / 100);
}

/** Dollars typed into a form ("3,995.50", "$4000") to cents; null when it isn't a number. */
export function dollarsToCents(input: string): number | null {
  const clean = input.replace(/[$,\s]/g, "");
  if (!clean || !/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

/** Signed dollars typed into a price cell ("-500", "$1,250.50") to cents; null when it isn't a number. */
export function signedDollarsToCents(input: string): number | null {
  const clean = input.replace(/[$,\s]/g, "");
  if (!clean || !/^-?\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** Same rounding as the backend: quantity × unit price, to the cent. */
export function lineTotal(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

/** Subtotal of every line, less the STC discount and rebates (mirrors the backend). */
export function editedTotals(lines: { quantity: number; unitPriceCents: number }[], stcDiscountCents: number, rebateCents: number) {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l.quantity, l.unitPriceCents), 0);
  return { subtotalCents, totalCents: subtotalCents - stcDiscountCents - rebateCents };
}

/** True once staff have changed the lines or amounts by hand. */
export function isHandEdited(q: Pick<Quote, "snapshot">): boolean {
  const pricing = q.snapshot?.pricing;
  return !!pricing && typeof pricing === "object" && (pricing as { source?: unknown }).source === "MANUAL";
}

/** What's left to pay on completion once the deposit is in. */
export function balanceCents(q: Pick<Quote, "totalCents" | "depositCents">): number {
  return Math.max(0, q.totalCents - q.depositCents);
}

/** The same deposit rule the backend uses, for previews in the form. */
export function previewDepositCents(
  totalCents: number,
  mode: DepositMode,
  percent: number,
  fixedCents: number | null,
): number {
  if (mode === "FIXED") return Math.max(0, Math.min(totalCents, fixedCents ?? 0));
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return Math.round((totalCents * pct) / 100);
}

export function depositLabel(q: Pick<Quote, "depositMode" | "depositPercent">): string {
  if (q.depositMode === "FIXED") return "Deposit";
  const pct = Number.isInteger(q.depositPercent) ? String(q.depositPercent) : q.depositPercent.toFixed(1);
  return `Deposit (${pct}%)`;
}

/* ---------- labels ---------- */

export function quoteNumberLabel(n: number): string {
  return `Q-${String(Math.max(0, Math.trunc(n))).padStart(6, "0")}`;
}

/** "Quote 2 · Q-000123" */
export function quoteVersionLabel(q: Pick<Quote, "version" | "number">): string {
  return `Quote ${q.version} · ${quoteNumberLabel(q.number)}`;
}

export type QuoteTone = "good" | "warn" | "bad" | "muted" | "info" | "draft";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  SUPERSEDED: "Replaced",
};

/**
 * The status as it stands now. The backend expires quotes on a 15-minute
 * sweep, so a sent quote past its date reads as expired straight away.
 */
export function effectiveStatus(q: Pick<Quote, "status" | "validUntil">, now = new Date()): QuoteStatus {
  if ((q.status === "SENT" || q.status === "VIEWED") && isPast(q.validUntil, now)) return "EXPIRED";
  return q.status;
}

export function quoteStatusLabel(q: Pick<Quote, "status" | "validUntil" | "depositPaidAt">, now = new Date()): string {
  const s = effectiveStatus(q, now);
  if (s === "ACCEPTED") return q.depositPaidAt ? "Deposit paid" : "Accepted · deposit due";
  return QUOTE_STATUS_LABEL[s];
}

export function quoteStatusTone(q: Pick<Quote, "status" | "validUntil" | "depositPaidAt">, now = new Date()): QuoteTone {
  switch (effectiveStatus(q, now)) {
    case "DRAFT":
      return "draft";
    case "SENT":
    case "VIEWED":
      return "info";
    case "ACCEPTED":
      return q.depositPaidAt ? "good" : "warn";
    case "DECLINED":
      return "bad";
    default:
      return "muted";
  }
}

export const QUOTE_TONE_CHIP: Record<QuoteTone, { bg: string; fg: string; dot: string }> = {
  good: { bg: "#DCFCE7", fg: "#166534", dot: "#16A34A" },
  warn: { bg: "#FFF4D6", fg: "#7A3E00", dot: "#F68A0A" },
  bad: { bg: "#FEE2E2", fg: "#991B1B", dot: "#DC2626" },
  muted: { bg: "#EEF2F6", fg: "#475569", dot: "#94A3B8" },
  info: { bg: "#E0ECFF", fg: "#1E40AF", dot: "#2563EB" },
  draft: { bg: "#F1F5F9", fg: "#334155", dot: "#64748B" },
};

/* ---------- state ---------- */

function isPast(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= now.getTime();
}

/** Sent to the customer, still current and not yet answered. */
export function isOpen(q: Pick<Quote, "status" | "validUntil">, now = new Date()): boolean {
  return (q.status === "SENT" || q.status === "VIEWED") && !isPast(q.validUntil, now);
}

export function isDepositDue(q: Pick<Quote, "status" | "depositPaidAt" | "depositCents">): boolean {
  return q.status === "ACCEPTED" && !q.depositPaidAt && q.depositCents > 0;
}

/** Which staff actions apply to this version right now (mirrors the backend rules). */
export function staffActionsFor(q: Pick<Quote, "status" | "validUntil" | "depositPaidAt" | "depositCents">, now = new Date()) {
  const open = isOpen(q, now);
  return {
    edit: q.status === "DRAFT" || (q.status === "SENT" && open),
    reprice: q.status === "DRAFT",
    /** Change lines and amounts: in place on a draft, or as a new draft version of anything else. */
    editLines: true,
    send: q.status === "DRAFT",
    paymentLink: (open || q.status === "ACCEPTED") && !q.depositPaidAt && q.depositCents > 0,
    withdraw: q.status === "DRAFT" || open,
  };
}

const DAY = 86_400_000;

function sydneyDayNumber(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.round(Date.UTC(get("year"), get("month") - 1, get("day")) / DAY);
}

/** "Valid for 12 more days", "Expires today", "Expired 3 days ago" — by Sydney calendar days. */
export function expiresInText(validUntil: string | null | undefined, now = new Date()): string {
  if (!validUntil) return "No expiry date";
  const end = new Date(validUntil);
  if (Number.isNaN(end.getTime())) return "No expiry date";
  const days = sydneyDayNumber(end) - sydneyDayNumber(now);
  if (end.getTime() <= now.getTime()) {
    const ago = Math.max(0, -days);
    return ago === 0 ? "Expired today" : ago === 1 ? "Expired yesterday" : `Expired ${ago} days ago`;
  }
  if (days <= 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Valid for ${days} more days`;
}

export function formatQuoteDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
}

/** yyyy-mm-dd in Sydney, for a date input. */
export function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);
}

/** End of that day in Sydney (AEDT/AEST worked out from the date), as ISO. */
export function endOfSydneyDayIso(dateValue: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  // Sydney is UTC+10 or +11. Try +10 first: in summer it spills into the next
  // day, so +11 is the one that still lands on the chosen date.
  for (const offsetH of [10, 11]) {
    const t = new Date(guess - offsetH * 3_600_000);
    if (dateInputValue(t.toISOString()) === dateValue) return t.toISOString();
  }
  return new Date(guess - 10 * 3_600_000).toISOString();
}

export function isFuture(iso: string | null | undefined, now = new Date()): boolean {
  return Boolean(iso) && !isPast(iso, now);
}

export function createdByName(q: Pick<Quote, "createdBy">): string {
  return [q.createdBy?.firstName, q.createdBy?.lastName].filter(Boolean).join(" ").trim();
}

/** Newest first: highest version, then latest created. */
export function sortQuotes<T extends Pick<Quote, "version" | "createdAt">>(quotes: T[]): T[] {
  return [...quotes].sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt));
}

/* ---------- snapshot ---------- */

function toLine(raw: unknown): QuoteLine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const quantity = num(r.quantity) || 1;
  const total = typeof r.totalCents === "number" && Number.isFinite(r.totalCents) ? r.totalCents : null;
  // Works lines from the pricing engine carry only a total: derive the unit price.
  const unit = typeof r.unitPriceCents === "number" && Number.isFinite(r.unitPriceCents) ? r.unitPriceCents : total !== null ? Math.round(total / quantity) : 0;
  return {
    category: typeof r.category === "string" ? r.category : "",
    productId: typeof r.productId === "string" ? r.productId : null,
    name,
    brand: typeof r.brand === "string" ? r.brand : null,
    model: typeof r.model === "string" ? r.model : null,
    quantity,
    unitPriceCents: unit,
    totalCents: total ?? unit * quantity,
  };
}

/** Equipment then extras/works, skipping anything malformed. */
export function quoteLines(q: Pick<Quote, "snapshot">): { equipment: QuoteLine[]; extras: QuoteLine[] } {
  const s = q.snapshot ?? {};
  const list = (v: unknown) => (Array.isArray(v) ? v.map(toLine).filter((l): l is QuoteLine => l !== null) : []);
  return { equipment: list(s.equipment), extras: list(s.extras ?? s.works) };
}

export function quoteAddress(q: Pick<Quote, "snapshot">): string | null {
  const s = q.snapshot ?? {};
  const direct = typeof s.address === "string" ? s.address.trim() : "";
  if (direct) return direct;
  const design = s.design && typeof s.design === "object" ? (s.design as Record<string, unknown>) : null;
  const nested = typeof design?.address === "string" ? design.address.trim() : "";
  return nested || null;
}

const CATEGORY_LABEL: Record<string, string> = {
  panel: "Solar panels",
  panels: "Solar panels",
  inverter: "Inverter",
  battery: "Battery",
  "ev charger": "EV charger",
  ev_charger: "EV charger",
  "heat pump": "Heat pump",
  heat_pump: "Heat pump",
  installation: "Installation",
  solarpanel: "Solar panels",
  evcharger: "EV charger",
  heatpump: "Heat pump",
  other: "Other",
  extra: "Extra",
};

export function lineCategoryLabel(category: string): string {
  const key = category.trim().toLowerCase();
  if (!key) return "Item";
  return CATEGORY_LABEL[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]+/g, " ");
}

/** "6.6 kW solar · 15 panels · 10 kWh battery" from the real figures only. */
export function quoteSystemSummary(q: Pick<Quote, "systemKw" | "panelCount" | "batteryKwh">): string {
  const parts: string[] = [];
  if (q.systemKw && q.systemKw > 0) parts.push(`${formatKw(q.systemKw)} kW solar`);
  if (q.panelCount && q.panelCount > 0) parts.push(`${q.panelCount} panels`);
  if (q.batteryKwh && q.batteryKwh > 0) parts.push(`${formatKw(q.batteryKwh)} kWh battery`);
  return parts.join(" · ");
}

function formatKw(n: number): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(n);
}

/* ---------- compare ---------- */

export type CompareRow = { label: string; values: string[]; emphasise?: boolean };

/** Side-by-side rows for two or three versions; blank where a version lacks the figure. */
export function compareRows(quotes: Quote[], now = new Date()): CompareRow[] {
  const v = (fn: (q: Quote) => string) => quotes.map(fn);
  return [
    { label: "System", values: v((q) => quoteSystemSummary(q) || "—") },
    { label: "Price before STCs", values: v((q) => formatCents(q.subtotalCents)) },
    { label: "STC discount", values: v((q) => (q.stcDiscountCents > 0 ? `−${formatCents(q.stcDiscountCents)}` : "—")) },
    { label: "Rebates", values: v((q) => (q.rebateCents > 0 ? `−${formatCents(q.rebateCents)}` : "—")) },
    { label: "Total inc GST", values: v((q) => formatCents(q.totalCents)), emphasise: true },
    { label: "Deposit", values: v((q) => formatCents(q.depositCents)) },
    { label: "Balance on completion", values: v((q) => formatCents(balanceCents(q))) },
    { label: "Valid until", values: v((q) => formatQuoteDate(q.validUntil)) },
    { label: "Status", values: v((q) => quoteStatusLabel(q, now)) },
  ];
}

/* ---------- EasyLink AI ---------- */

export function quoteQuestion(q: Quote, now = new Date()): string {
  const lines = quoteLines(q);
  const items = [...lines.equipment, ...lines.extras]
    .slice(0, 8)
    .map((l) => `${l.quantity > 1 ? `${l.quantity} × ` : ""}${[l.brand, l.model || l.name].filter(Boolean).join(" ")}`)
    .join("; ");
  const parts = [
    `Explain my quote ${quoteVersionLabel(q)}: "${q.title}"`,
    quoteSystemSummary(q),
    `total ${formatCents(q.totalCents)} inc GST`,
    q.stcDiscountCents > 0 ? `after an STC discount of ${formatCents(q.stcDiscountCents)}` : "",
    q.rebateCents > 0 ? `and ${formatCents(q.rebateCents)} in rebates` : "",
    `deposit ${formatCents(q.depositCents)}, balance ${formatCents(balanceCents(q))} on completion`,
    `valid until ${formatQuoteDate(q.validUntil)} (${quoteStatusLabel(q, now).toLowerCase()})`,
    items ? `equipment: ${items}` : "",
  ].filter(Boolean);
  return `${parts.join(", ")}. What am I getting, is the price fair for Australia, and what should I check before I accept?`;
}

/* ---------- fetchers ---------- */

type Envelope<T> = { success?: boolean; message?: string; data?: T };

async function read<T>(res: Response, fallback: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body || body.success === false) throw new Error(body?.message?.trim() || fallback);
  return body.data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  cache: "no-store",
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type StaffPortal = "admin" | "installer";

const STAFF_BASE: Record<StaffPortal, string> = { admin: "/api/admin/quotes", installer: "/api/installers/quotes" };

function staffFetch(portal: StaffPortal, url: string, init?: RequestInit): Promise<Response> {
  return portal === "installer" ? fetchWithInstallerSession(url, init) : fetch(url, init);
}

export function staffQuotesUrl(portal: StaffPortal, filter: { leadId?: string | null; customerId?: string | null }): string {
  const sp = new URLSearchParams();
  if (filter.leadId) sp.set("leadId", filter.leadId);
  if (filter.customerId) sp.set("customerId", filter.customerId);
  const qs = sp.toString();
  return `${STAFF_BASE[portal]}${qs ? `?${qs}` : ""}`;
}

export async function listStaffQuotes(portal: StaffPortal, filter: { leadId?: string | null; customerId?: string | null }): Promise<Quote[]> {
  const data = await read<Quote[]>(await staffFetch(portal, staffQuotesUrl(portal, filter), { cache: "no-store" }), "Could not load quotes.");
  return Array.isArray(data) ? sortQuotes(data) : [];
}

export async function getStaffQuote(portal: StaffPortal, id: string): Promise<Quote> {
  return read(await staffFetch(portal, `${STAFF_BASE[portal]}/${encodeURIComponent(id)}`, { cache: "no-store" }), "Could not load the quote.");
}

export async function createStaffQuote(portal: StaffPortal, input: CreateQuoteInput): Promise<Quote> {
  return read(await staffFetch(portal, STAFF_BASE[portal], json("POST", input)), "Could not create the quote.");
}

export async function updateStaffQuote(portal: StaffPortal, id: string, patch: UpdateQuoteInput): Promise<Quote> {
  return read(await staffFetch(portal, `${STAFF_BASE[portal]}/${encodeURIComponent(id)}`, json("PATCH", patch)), "Could not save the quote.");
}

const STAFF_ACTION_ERROR: Record<StaffQuoteAction, string> = {
  send: "Could not send the quote.",
  reprice: "Could not reprice the quote.",
  "payment-link": "Could not send the payment link.",
  withdraw: "Could not withdraw the quote.",
  revise: "Could not make a new version to edit.",
};

export async function staffQuoteAction<T = Quote>(
  portal: StaffPortal,
  id: string,
  action: StaffQuoteAction,
  body?: Record<string, unknown>,
): Promise<T> {
  return read(
    await staffFetch(portal, `${STAFF_BASE[portal]}/${encodeURIComponent(id)}/${action}`, json("POST", body ?? {})),
    STAFF_ACTION_ERROR[action],
  );
}

export async function sendPaymentLink(portal: StaffPortal, id: string, channel: PaymentLinkChannel): Promise<{ url: string | null }> {
  const data = await staffQuoteAction<{ url?: string } | null>(portal, id, "payment-link", { channel });
  return { url: typeof data?.url === "string" ? data.url : null };
}

export async function fetchMyQuotes(): Promise<Quote[]> {
  const data = await read<Quote[]>(await fetchWithCustomerSession("/api/customers/quotes", { cache: "no-store" }), "Could not load your quotes.");
  return Array.isArray(data) ? sortQuotes(data) : [];
}

const CUSTOMER_ACTION_ERROR: Record<CustomerQuoteAction, string> = {
  viewed: "Could not open the quote.",
  accept: "Could not accept the quote.",
  decline: "Could not decline the quote.",
  "deposit-checkout": "Could not start the deposit payment.",
};

export async function customerQuoteAction<T = unknown>(id: string, action: CustomerQuoteAction, body?: Record<string, unknown>): Promise<T> {
  return read(
    await fetchWithCustomerSession(`/api/customers/quotes/${encodeURIComponent(id)}/${action}`, json("POST", body ?? {})),
    CUSTOMER_ACTION_ERROR[action],
  );
}

export async function acceptQuote(id: string, acceptedName: string): Promise<{ checkoutUrl: string | null }> {
  const data = await customerQuoteAction<{ checkoutUrl?: string } | null>(id, "accept", { acceptedName, agreeTerms: true });
  return { checkoutUrl: typeof data?.checkoutUrl === "string" ? data.checkoutUrl : null };
}

export async function depositCheckout(id: string): Promise<{ checkoutUrl: string | null }> {
  const data = await customerQuoteAction<{ checkoutUrl?: string } | null>(id, "deposit-checkout");
  return { checkoutUrl: typeof data?.checkoutUrl === "string" ? data.checkoutUrl : null };
}
