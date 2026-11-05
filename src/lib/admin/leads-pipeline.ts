/**
 * Operations portal: the lead pipeline (stage, owner, next action, response
 * target). Types, API calls and the wording of due times, shared by the
 * Quotes & Leads table and pipeline board.
 */

export type LeadStage =
  | "NEW_LEAD"
  | "APPOINTMENT"
  | "SITE_ASSESSMENT"
  | "DESIGNING"
  | "PROPOSAL_SENT"
  | "DEPOSIT_PAID"
  | "INSTALLING"
  | "PAYMENT_COMPLETED";

/**
 * The eight sales stages in order, with the wording the backend serves in
 * `/leads/pipeline/meta` (`modules/leads/lead-pipeline.ts` STAGE_LABEL). For
 * screens that don't load the meta, such as the installer pipeline board.
 */
export const LEAD_STAGES: readonly LeadStage[] = [
  "NEW_LEAD",
  "APPOINTMENT",
  "SITE_ASSESSMENT",
  "DESIGNING",
  "PROPOSAL_SENT",
  "DEPOSIT_PAID",
  "INSTALLING",
  "PAYMENT_COMPLETED",
];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW_LEAD: "New lead",
  APPOINTMENT: "Appointment",
  SITE_ASSESSMENT: "Site assessment",
  DESIGNING: "Designing",
  PROPOSAL_SENT: "Proposal sent",
  DEPOSIT_PAID: "Deposit paid",
  INSTALLING: "Installing",
  PAYMENT_COMPLETED: "Payment completed",
};

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === "string" && (LEAD_STAGES as readonly string[]).includes(value);
}

export type TaskKind = "CALLBACK" | "SITE_VISIT" | "TASK";

export type NextAction = {
  id: string;
  kind: TaskKind;
  title: string;
  dueAt: string;
  overdue: boolean;
};

export type Person = { id: string; firstName: string; lastName: string; email?: string };

export type PipelineLead = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string | null;
  source: string | null;
  status: string;
  stage: LeadStage;
  estimatedValue: number | null;
  createdAt: string;
  owner: Person | null;
  lostReason: string | null;
  spamReason?: string | null;
  spamSuggestion?: string[] | null;
  nextAction: NextAction | null;
  /** Set while nobody has contacted them yet. */
  respondBy: string | null;
  responseOverdue: boolean;
  roofDesign?: RoofDesignSummary | null;
};

/** Automatic roof design (platform designer) for the lead's address. */
export type RoofDesignSummary = {
  status: "READY" | "NO_ROOF" | "NO_ADDRESS" | "FAILED";
  address: string;
  panelCount: number | null;
  panelWatts: number | null;
  systemKw: number | null;
  orientation: "PORTRAIT" | "LANDSCAPE" | null;
  faceCount: number | null;
  roofAreaM2: number | null;
  message: string | null;
  updatedAt: string;
};

export type PipelineMeta = {
  stages: { key: LeadStage; label: string }[];
  lostReasons: string[];
  owners: Person[];
};

export type BoardColumn = {
  stage: LeadStage;
  label: string;
  count: number;
  /** Sum of the stage's estimated system values. */
  value: number;
  cards: PipelineLead[];
};

/** Counts for the leads table's tabs. */
export type PipelineSummary = {
  open: number;
  overdue: number;
  dueToday: number;
  notContacted: number;
  unassigned: number;
  mine: number;
  spam: number;
};

export const TASK_KINDS: { key: TaskKind; label: string; defaultTitle: string }[] = [
  { key: "CALLBACK", label: "Call back", defaultTitle: "Call back" },
  { key: "SITE_VISIT", label: "Site visit", defaultTitle: "Site visit" },
  { key: "TASK", label: "Task", defaultTitle: "" },
];

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.message ?? fallback);
  return body.data as T;
}

export async function fetchPipelineMeta(): Promise<PipelineMeta> {
  return json(await fetch("/api/admin/leads/pipeline/meta", { cache: "no-store" }), "Could not load the pipeline.");
}

export async function fetchBoard(): Promise<{ columns: BoardColumn[]; summary: PipelineSummary }> {
  return json(
    await fetch("/api/admin/leads/pipeline/board", { cache: "no-store" }),
    "Could not load the pipeline board.",
  );
}

export type PipelinePatch = {
  stage?: LeadStage;
  ownerId?: string | null;
  lost?: { reason: string; note?: string };
  reopen?: true;
};

export async function updateLeadPipeline(id: string, patch: PipelinePatch) {
  return json(
    await fetch(`/api/admin/leads/${encodeURIComponent(id)}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
    "Could not update the lead.",
  );
}

export async function addNextAction(input: {
  leadId: string;
  kind: TaskKind;
  title: string;
  dueAt: Date;
  assigneeId?: string | null;
}) {
  return json(
    await fetch("/api/admin/cc/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, dueAt: input.dueAt.toISOString() }),
    }),
    "Could not save the next action.",
  );
}

export async function completeAction(taskId: string) {
  return json(
    await fetch(`/api/admin/cc/follow-ups/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    }),
    "Could not complete the action.",
  );
}

/* ---------- wording ---------- */

export type Tone = "late" | "soon" | "normal";

const TZ = "Australia/Sydney";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const clock = (d: Date) =>
  d.toLocaleTimeString("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

function span(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}

/** "Overdue 25 min", "Today 3:15 pm", "Tomorrow 10:00 am", "Thu 6 Nov 9:00 am". */
export function describeDue(dueIso: string, now = new Date()): { text: string; tone: Tone } {
  const due = new Date(dueIso);
  if (due < now) return { text: `Overdue ${span(now.getTime() - due.getTime())}`, tone: "late" };
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86_400_000));
  if (dayKey(due) === today) return { text: `Today ${clock(due)}`, tone: "soon" };
  if (dayKey(due) === tomorrow) return { text: `Tomorrow ${clock(due)}`, tone: "normal" };
  const date = due
    .toLocaleDateString("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" })
    .replace(",", "");
  return { text: `${date} ${clock(due)}`, tone: "normal" };
}

export const TONE_COLOUR: Record<Tone, string> = {
  late: "#B91C1C",
  soon: "#92400E",
  normal: "#475569",
};

export function personName(p: Person | null | undefined): string {
  return p ? `${p.firstName} ${p.lastName}`.trim() : "";
}

export function initials(p: Person | null | undefined): string {
  if (!p) return "";
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
}

/** "25 Gilbert Street, Colyton NSW, Australia" → "Colyton NSW". */
export function suburbOf(address: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const local = parts.filter((p) => !/^australia$/i.test(p));
  return local.length > 1 ? local[local.length - 1]! : local[0] ?? "";
}

export function aud(n: number | null): string {
  if (!n) return "";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

/** Default due time for a new next action: in an hour, or 10 am tomorrow late in the day. */
export function defaultDueLocal(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() >= 16) {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  } else {
    d.setMinutes(Math.ceil((d.getMinutes() + 60) / 15) * 15, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- urgency, shared by board cards and table rows ---------- */

/**
 * How urgently a lead needs attention: overdue work, a missed first
 * response, or no next action at all are "late"; something due today is
 * "soon".
 */
export function leadUrgency(lead: PipelineLead, now = new Date()): Tone {
  if (lead.status === "LOST") return "normal";
  if (lead.responseOverdue || !lead.nextAction || lead.nextAction.overdue) return "late";
  return describeDue(lead.nextAction.dueAt, now).tone;
}

export const TONE_RAIL: Record<Tone, string> = {
  late: "#DC2626",
  soon: "#F59E0B",
  normal: "transparent",
};

export const TONE_CHIP: Record<Tone, { bg: string; fg: string }> = {
  late: { bg: "#FEE2E2", fg: "#991B1B" },
  soon: { bg: "#FEF3C7", fg: "#92400E" },
  normal: { bg: "#F1F5F9", fg: "#334155" },
};

/** Where a lead came from, as a short label for its chip. */
export function sourceKind(source: string | null): { label: string; icon: "sun" | "users" | "mail" | "phone" | "link" } {
  const s = (source ?? "").toLowerCase();
  if (s.includes("referral")) return { label: "Referral", icon: "users" };
  if (s.startsWith("design platform")) return { label: "Design", icon: "sun" };
  if (s.startsWith("contact form")) return { label: "Contact form", icon: "mail" };
  // Staff-entered "New lead" sources: an inbound call isn't the dialler.
  if (s === "phone call") return { label: "Phone call", icon: "phone" };
  if (/dial|call/.test(s)) return { label: "Dialler", icon: "phone" };
  if (s.includes("partner")) return { label: "Partner", icon: "link" };
  return { label: source ? source.split(/ [—·] /)[0]!.slice(0, 22) : "Other", icon: "link" };
}

/** "Just now", "25 min ago", "3 h ago", "2 days ago", then the date. */
export function ago(iso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" });
}

/** "$48k", "$1.2m" for column totals. */
export function compactAud(n: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
