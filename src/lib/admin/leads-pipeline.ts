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
  cards: PipelineLead[];
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

export async function fetchBoard(): Promise<BoardColumn[]> {
  const data = await json<{ columns: BoardColumn[] }>(
    await fetch("/api/admin/leads/pipeline/board", { cache: "no-store" }),
    "Could not load the pipeline board.",
  );
  return data.columns;
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
