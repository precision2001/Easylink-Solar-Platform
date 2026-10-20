/**
 * The job journey (EasyLink Job Journey doc): one job per lead, from the
 * customer's chosen design to STC lodgement and three days of monitoring.
 *
 * Kept by the AI platform until the backend has tables for it; each part maps
 * to a backend home noted beside it (milestones → project_milestones,
 * invoices → invoices + invoice_lines, signatures → documents, …).
 */
export type Who = "customer" | "installer" | "staff";

export type MilestoneKey =
  | "design_selected"
  | "installer_assigned"
  | "selection_confirmed"
  | "site_photos_ok"
  | "job_accepted"
  | "agreement_signed"
  | "deposit_paid"
  | "install_date_set"
  | "connection_applied"
  | "connection_approved"
  | "bills_received"
  | "quote_final"
  | "equipment_paid"
  | "delivered"
  | "install_started"
  | "installed"
  | "site_docs_sent"
  | "final_paid"
  | "stc_pack_signed"
  | "handover_sent"
  | "stc_lodged"
  | "monitoring_clear";

export type MilestoneDef = { key: MilestoneKey; stage: number; label: string; who: Who; next: string };

/** In journey order. `who` = who acts to reach it; `next` = what that person sees as their next step. */
export const MILESTONES: MilestoneDef[] = [
  { key: "design_selected", stage: 1, label: "Design chosen", who: "customer", next: "Choose one of your four designs" },
  { key: "installer_assigned", stage: 2, label: "Installer assigned", who: "installer", next: "Accept or decline the job offer" },
  { key: "selection_confirmed", stage: 3, label: "Selection confirmed", who: "customer", next: "Confirm your panels, battery and extras" },
  { key: "site_photos_ok", stage: 3, label: "Site photos received", who: "customer", next: "Send photos of your meter and switchboard" },
  { key: "job_accepted", stage: 3, label: "Job accepted", who: "installer", next: "Review the photos and accept the job" },
  { key: "agreement_signed", stage: 3, label: "Agreement signed", who: "customer", next: "Sign your quote and installation agreement" },
  { key: "deposit_paid", stage: 4, label: "Deposit paid", who: "customer", next: "Pay your deposit" },
  { key: "install_date_set", stage: 4, label: "Installation date set", who: "customer", next: "Pick your installation dates" },
  { key: "connection_applied", stage: 5, label: "Connection applied for", who: "installer", next: "Submit the connection application to the DNSP" },
  { key: "connection_approved", stage: 5, label: "Connection approved", who: "installer", next: "Record the DNSP approval" },
  { key: "bills_received", stage: 6, label: "Energy bills received", who: "customer", next: "Upload your recent energy bills" },
  { key: "quote_final", stage: 6, label: "Quote final", who: "installer", next: "Confirm the final quote" },
  { key: "equipment_paid", stage: 6, label: "Equipment ordered and paid", who: "installer", next: "Place and pay the equipment order" },
  { key: "delivered", stage: 6, label: "Equipment delivered", who: "installer", next: "Book the delivery truck" },
  { key: "install_started", stage: 7, label: "Installation started", who: "installer", next: "Check in on site" },
  { key: "installed", stage: 7, label: "Installation complete", who: "installer", next: "Finish the on-site checklist" },
  { key: "site_docs_sent", stage: 7, label: "Site documents sent", who: "installer", next: "Send today's documents" },
  { key: "final_paid", stage: 8, label: "Final payment received", who: "customer", next: "Pay the final invoice" },
  { key: "stc_pack_signed", stage: 8, label: "STC pack signed", who: "customer", next: "Sign your STC assignment form" },
  { key: "handover_sent", stage: 8, label: "Handover pack sent", who: "installer", next: "Send the handover pack" },
  { key: "stc_lodged", stage: 8, label: "STCs lodged", who: "installer", next: "Lodge the STC claim" },
  { key: "monitoring_clear", stage: 9, label: "Three clear days", who: "installer", next: "Watch the system for three days" },
];

export const STAGES: { n: number; name: string }[] = [
  { n: 1, name: "Design" },
  { n: 2, name: "Installer" },
  { n: 3, name: "Confirm" },
  { n: 4, name: "Deposit and date" },
  { n: 5, name: "Connection" },
  { n: 6, name: "Bills, order, delivery" },
  { n: 7, name: "Installation" },
  { n: 8, name: "Close-out and STCs" },
  { n: 9, name: "Monitoring" },
];

export type Party = { name: string; abn?: string; email?: string; phone?: string; address?: string };

export type Selection = {
  designId: string | null;
  title: string;
  kw: number;
  panels: { model: string; count: number; watts: number };
  inverter: { model: string; kw: number };
  battery: { model: string; usableKwh: number } | null;
  accessories: { name: string; price: number }[];
  /** Total agreed price, AUD incl. GST, before the STC discount. */
  price: number;
  annualOutputKwh: number;
  savingsPerYear: number;
};

export type Job = {
  id: string;
  leadId: string;
  customerId: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  installerId: string | null;
  installerName?: string;
  seller: Party;
  site: { address: string; postcode: string; state: string; lat: number; lng: number; nmi?: string; phases: 1 | 3; zoneRating: number; zoneConfirmed: boolean };
  selection: Selection;
  quoteVersion: number;
  revisions: { version: number; at: string; changes: string[]; price: number; status: "draft" | "sent" | "accepted"; signatureId?: string }[];
  milestones: Partial<Record<MilestoneKey, { at: string; by: string }>>;
  confirmation?: { transcript: string; at: string; items: string[] };
  photos: { requestedAt?: string; items: { label: string; ok: boolean; note?: string; documentId?: string }[] };
  depositPercent: number;
  windows: { id: string; day1: string; day2: string }[];
  installDates?: { day1: string; day2: string };
  connection: { dnsp: string; portalUrl?: string; status: "draft" | "submitted" | "approved" | "refused"; reference?: string; submittedAt?: string; approval?: { number: string; exportLimitKw: number; at: string; conditions?: string } };
  bills: { requestedAt?: string; items: { retailer: string; nmi?: string; tariff: string; dailyKwh: number; feedInCents?: number; period: string }[]; savingsBefore?: number; savingsAfter?: number };
  retailer?: { partnerId?: string; name: string };
  order: { status: "draft" | "placed" | "paid"; lines: { sku: string; name: string; qty: number; unit: number }[]; ref?: string; placedAt?: string; paidAt?: string; serials: { kind: "panel" | "inverter" | "battery"; serial: string }[] };
  delivery: { status: "none" | "booked" | "delivered"; carrier?: string; window?: string; bookedAt?: string; pod?: { at: string; note: string } };
  onsite: {
    checkins: { day: 1 | 2; at: string; lat: number; lng: number }[];
    checklist: { key: string; day: 1 | 2; label: string; photo: boolean; done: boolean; at?: string }[];
    scanned: { kind: "panel" | "inverter" | "battery"; serial: string; matched: boolean; at: string }[];
    tests?: { insulationMOhm: number; vocPerString: number[]; iscPerString: number[]; earthOk: boolean; exportLimitKw: number; csipTest: "passed" | "failed" | "not_required"; at: string };
    completeAt?: string;
    customerSignatureId?: string;
  };
  stc: {
    status: "not_started" | "ready" | "sent_for_signature" | "signed" | "lodged" | "failed";
    solar: number;
    battery: number;
    batteryFactor: number;
    deemingYears: number;
    checks: { label: string; ok: boolean; detail?: string }[];
    signatureId?: string;
    agentRef?: string;
    lodgedAt?: string;
    deadline?: string;
  };
  handover: { sentAt?: string; documents: string[] };
  monitoring: { provider: string; linkedAt?: string; days: { date: string; kwh: number; expectedKwh: number; online: boolean; faults: string[] }[]; issues: { at: string; text: string; status: "open" | "fixed" }[] };
  phase: "DESIGN_AND_PERMISSIONS" | "INSTALLATION" | "COMMISSIONING" | "MAINTENANCE_AND_MONITORING";
  createdAt: string;
  updatedAt: string;
};

export type InvoiceLine = { description: string; qty: number; unitExGst: number; gst: boolean };
export type Invoice = {
  id: string;
  number: string;
  jobId: string;
  kind: "deposit" | "final" | "variation" | "credit" | "other";
  seller: Party;
  buyer: Party;
  lines: InvoiceLine[];
  notes?: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "void";
  totals: { exGst: number; gst: number; total: number };
  payments: { at: string; amount: number; method: string; ref: string }[];
  creditFor?: string;
  createdBy: string;
  createdVia: "form" | "ai" | "auto";
  sentAt?: string;
  paidAt?: string;
};

export type Signature = {
  id: string;
  jobId: string;
  kind: "agreement" | "quote_revision" | "install_complete" | "stc_assignment";
  title: string;
  signer: { who: "customer" | "installer"; id: string; name: string; phone?: string };
  html: string;
  hash: string;
  status: "pending" | "signed";
  codeHash?: string;
  codeExpires?: string;
  attempts: number;
  createdAt: string;
  signedAt?: string;
  audit?: { name: string; phone: string; at: string; ip: string; userAgent: string; hash: string };
};

export type Offer = {
  id: string;
  jobId: string;
  installerId: string;
  installerName: string;
  score: number;
  parts: { distanceKm: number; rating: number; reliability: number };
  status: "open" | "accepted" | "declined" | "expired";
  at: string;
  expiresAt: string;
  reason?: string;
};

export const money = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function invoiceTotals(lines: InvoiceLine[]) {
  const exGst = round2(lines.reduce((s, l) => s + l.qty * l.unitExGst, 0));
  const gst = round2(lines.reduce((s, l) => s + (l.gst ? l.qty * l.unitExGst * 0.1 : 0), 0));
  return { exGst, gst, total: round2(exGst + gst) };
}
