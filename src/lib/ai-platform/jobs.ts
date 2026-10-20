import { aiRequest, type AiPortal } from "./client";

/** The job journey (EasyLink Job Journey doc), as the AI platform returns it. */
export type Who = "customer" | "installer" | "staff";
export type InvoiceLine = { description: string; qty: number; unitExGst: number; gst: boolean };
export type Invoice = {
  id: string;
  number: string;
  jobId: string;
  kind: "deposit" | "final" | "variation" | "credit" | "other";
  lines: InvoiceLine[];
  notes?: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "void";
  totals: { exGst: number; gst: number; total: number };
  payments: { at: string; amount: number; method: string; ref: string }[];
  createdVia: "form" | "ai" | "auto";
  creditFor?: string;
  sentAt?: string;
  paidAt?: string;
};
export type SignatureView = {
  id: string;
  kind: "agreement" | "quote_revision" | "install_complete" | "stc_assignment";
  title: string;
  signer: { who: "customer" | "installer"; id: string; name: string };
  status: "pending" | "signed";
  createdAt: string;
  signedAt?: string;
};
export type Offer = { id: string; jobId: string; installerId: string; installerName: string; score: number; parts: { distanceKm: number; rating: number; reliability: number }; status: string; at: string; expiresAt: string };
export type Job = {
  id: string;
  leadId: string;
  customerId: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  installerId: string | null;
  installerName?: string;
  seller: { name: string; abn?: string };
  site: { address: string; postcode: string; state: string; lat: number; lng: number; nmi?: string; zoneRating: number; zoneConfirmed: boolean };
  selection: {
    title: string;
    kw: number;
    panels: { model: string; count: number; watts: number };
    inverter: { model: string; kw: number };
    battery: { model: string; usableKwh: number } | null;
    accessories: { name: string; price: number }[];
    price: number;
    annualOutputKwh: number;
    savingsPerYear: number;
  };
  quoteVersion: number;
  revisions: { version: number; at: string; changes: string[]; price: number; status: string; signatureId?: string }[];
  confirmation?: { transcript: string; at: string; items: string[] };
  photos: { requestedAt?: string; items: { label: string; ok: boolean; note?: string }[] };
  depositPercent: number;
  windows: { id: string; day1: string; day2: string }[];
  installDates?: { day1: string; day2: string };
  connection: { dnsp: string; status: string; reference?: string; submittedAt?: string; approval?: { number: string; exportLimitKw: number; at: string; conditions?: string } };
  bills: { requestedAt?: string; items: { retailer: string; nmi?: string; tariff: string; dailyKwh: number; feedInCents?: number; period: string }[]; savingsBefore?: number; savingsAfter?: number };
  retailer?: { name: string };
  order: { status: "draft" | "placed" | "paid"; lines: { sku: string; name: string; qty: number }[]; ref?: string; placedAt?: string; paidAt?: string; serials: { kind: string; serial: string }[] };
  delivery: { status: "none" | "booked" | "delivered"; carrier?: string; window?: string; pod?: { at: string; note: string } };
  onsite: {
    checkins: { day: 1 | 2; at: string }[];
    checklist: { key: string; day: 1 | 2; label: string; photo: boolean; done: boolean; at?: string }[];
    scanned: { kind: string; serial: string; matched: boolean; at: string }[];
    tests?: { insulationMOhm: number; vocPerString: number[]; iscPerString: number[]; earthOk: boolean; exportLimitKw: number; csipTest: string; at: string };
    completeAt?: string;
    customerSignatureId?: string;
  };
  stc: { status: string; solar: number; battery: number; batteryFactor: number; deemingYears: number; checks: { label: string; ok: boolean; detail?: string }[]; signatureId?: string; agentRef?: string; lodgedAt?: string; deadline?: string };
  handover: { sentAt?: string; documents: string[] };
  monitoring: { provider: string; linkedAt?: string; days: { date: string; kwh: number; expectedKwh: number; online: boolean; faults: string[] }[]; issues: { at: string; text: string; status: "open" | "fixed" }[] };
  phase: string;
  updatedAt: string;
};
export type Milestone = { key: string; stage: number; label: string; who: Who; next: string; done: boolean; at: string | null; open: boolean };
export type JobView = {
  job: Job;
  milestones: Milestone[];
  next: { key: string; label: string; who: Who }[];
  waitingOn: { key: string; label: string; who: Who }[];
  invoices: Invoice[];
  signatures: SignatureView[];
  offers: Offer[];
  stage: number;
  viewer: Who;
  stcPrice: number;
};
export type JobRow = { id: string; customerName: string; address: string; installerName: string | null; system: string; stage: number; installDates: { day1: string; day2: string } | null; updatedAt: string; offer: { id: string; expiresAt: string; installerName: string } | null };
export type RankRow = { installerId: string; name: string; distanceKm: number; rating: number; reviews: number; reliability: number; score: number; eligible: boolean; reasons: string[] };

export const STAGES = ["Design", "Installer", "Confirm", "Deposit and date", "Connection", "Bills, order, delivery", "Installation", "Close-out and STCs", "Monitoring"];

export const jobs = {
  list: (portal: AiPortal) => aiRequest<JobRow[]>(portal, "/jobs"),
  get: (portal: AiPortal, id: string) => aiRequest<JobView>(portal, `/jobs/${encodeURIComponent(id)}`),
  step: <T = Record<string, unknown>>(portal: AiPortal, id: string, action: string, input: Record<string, unknown> = {}) =>
    aiRequest<T>(portal, `/jobs/${encodeURIComponent(id)}/steps/${encodeURIComponent(action)}`, { method: "POST", body: JSON.stringify(input) }),
  ranking: (id: string) => aiRequest<RankRow[]>("admin", `/jobs/${encodeURIComponent(id)}/ranking`),
  invoiceDoc: (portal: AiPortal, id: string) => aiRequest<{ html: string }>(portal, `/documents/invoice/${encodeURIComponent(id)}`),
  fileLink: (portal: AiPortal, id: string, fileId: string) => aiRequest<{ url: string }>(portal, `/jobs/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}/link`),
  /** Upload a photo or bill to the job (multipart, checked and stored by the AI platform). */
  upload: async (portal: AiPortal, id: string, file: File, purpose: "photo" | "bill" | "site", label: string) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("purpose", purpose);
    fd.set("label", label);
    const base = portal === "admin" ? "/api/admin/ai" : portal === "installer" ? "/api/installers/ai" : "/api/customers/ai";
    const res = await fetch(`${base}/jobs/${encodeURIComponent(id)}/uploads`, { method: "POST", body: fd, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { data?: { fileId: string; name: string }; message?: string };
    if (!res.ok || !json.data) throw new Error(json.message || "Upload failed");
    return json.data;
  },
  signatureDoc: (portal: AiPortal, id: string) => aiRequest<{ html: string }>(portal, `/documents/signature/${encodeURIComponent(id)}`),
};

export const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Sydney" }) : "—");
export const when = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" }) : "—";
export const lineTotal = (l: InvoiceLine) => l.qty * l.unitExGst * (l.gst ? 1.1 : 1);
export function totals(lines: InvoiceLine[]) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const exGst = r(lines.reduce((s, l) => s + l.qty * l.unitExGst, 0));
  const gst = r(lines.reduce((s, l) => s + (l.gst ? l.qty * l.unitExGst * 0.1 : 0), 0));
  return { exGst, gst, total: r(exGst + gst) };
}
