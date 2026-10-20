/**
 * Browser-side client for the AI platform, through the portal's own API routes
 * (/api/admin/ai/*, /api/installers/ai/*). Types mirror easylink-ai-platform.
 */
export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";
export type RecordRef = { type: string; id: string };

export type AiAgentRow = {
  id: string;
  name: string;
  paused: boolean;
  level: AutonomyLevel;
  label: "Shadow" | "Recommends" | "Decides";
  decisions24h: number;
  executed24h: number;
  proposed24h: number;
  escalated24h: number;
  costAud24h: number;
  openInbox: number;
  proposals30d: number;
  actions: string[];
  actionLevels: Record<string, AutonomyLevel>;
};

export type AiControlState = {
  globalRecommendOnly: boolean;
  pausedAgents: Record<string, boolean>;
  familiesOff: Record<string, boolean>;
  dailyBudgetAud: number | null;
  updatedBy: string;
  updatedAt: string;
};

export type AiControlResponse = {
  control: AiControlState;
  agents: AiAgentRow[];
  families: { family: string; label: string; detail: string; off: boolean }[];
  kpis: { decisions24h: number; autoResolvedPct: number; openInbox: number; overdueInbox: number; costAud24h: number; quarantined: number };
  quarantine: { reason: string; at: string }[];
};

export type AiInboxItem = {
  id: string;
  kind: "proposal" | "question" | "review" | "exception" | "alert";
  status: "open" | "approved" | "rejected" | "answered" | "resolved";
  title: string;
  agentId: string | null;
  subject: RecordRef | null;
  action: string | null;
  input: Record<string, unknown> | null;
  reasoning: string;
  createdAt: string;
  dueAt: string;
  resolvedBy: string | null;
  resolution: string | null;
};

export type AiDecision = {
  id: string;
  agentId: string;
  eventId: string | null;
  subject: RecordRef | null;
  reasoningSummary: string;
  action: string | null;
  autonomyLevel: AutonomyLevel | null;
  outcome: "executed" | "proposed" | "denied" | "escalated" | "no_action" | "error";
  costAud: number;
  createdAt: string;
};

export type AiFile = {
  id: string;
  name: string;
  slot: string | null;
  labels: { label: string; confidence: number }[];
  reviewState: "auto" | "needs_review" | "confirmed" | "pending";
  url: string | null;
  mimeType: string | null;
  createdAt: string | null;
  /** Who this kind of document normally goes to, e.g. ["customer", "retailer"]. */
  routes?: string[];
  /** Problems found checking it against the job. */
  issues?: string[];
  deliveredTo?: { role: string; at: string; channels: string[] }[];
};

export type AiRecordPanel = {
  summary: { headline: string; text: string; openItems: string[]; risks: string[]; updatedAt: string } | null;
  facts: { id: string; statement: string; confirmed: boolean; writtenBy: string; createdAt: string }[];
  decisions: AiDecision[];
  inbox: AiInboxItem[];
  files: AiFile[];
  workflows: { id: string; title: string; description: string }[];
};

export type AiActionResult = {
  status: "executed" | "proposed" | "denied" | "invalid" | "dry_run" | "shadow" | "blocked" | "error";
  action_id: string;
  result?: unknown;
  message?: string;
  approval_id?: string;
  policy: { decision: "allow" | "deny"; reasons: string[] };
};

export class AiNotConnectedError extends Error {}

type Envelope<T> = { success?: boolean; message?: string; data?: T; code?: string; errors?: unknown };

export type AiPortal = "admin" | "installer";
const base = (portal: AiPortal) => (portal === "admin" ? "/api/admin/ai" : "/api/installers/ai");

export async function aiRequest<T>(portal: AiPortal, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base(portal)}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  let json: Envelope<T> = {};
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* empty body */
  }
  if (res.status === 503 && json.code === "AI_NOT_CONFIGURED") throw new AiNotConnectedError(json.message ?? "AI platform is not connected");
  // Action results carry their own status (proposed / denied) in data even on 4xx.
  if (!res.ok && !(json.data && typeof json.data === "object" && "status" in (json.data as object))) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export const ai = {
  control: () => aiRequest<AiControlResponse>("admin", "/control"),
  setGlobal: (recommendOnly: boolean) => aiRequest<AiControlState>("admin", "/control/global", { method: "PUT", body: JSON.stringify({ recommendOnly }) }),
  pauseAgent: (id: string, paused: boolean) => aiRequest<AiControlState>("admin", `/control/agents/${encodeURIComponent(id)}/pause`, { method: "POST", body: JSON.stringify({ paused }) }),
  setSwitch: (family: string, off: boolean) => aiRequest<AiControlState>("admin", `/control/switches/${encodeURIComponent(family)}`, { method: "PUT", body: JSON.stringify({ off }) }),
  setBudget: (dailyBudgetAud: number | null) => aiRequest<AiControlState>("admin", "/control/budget", { method: "PUT", body: JSON.stringify({ dailyBudgetAud }) }),
  setAutonomy: (rule: { agentId: string; action: string; level: AutonomyLevel; reason: string; condition?: Record<string, string> }) =>
    aiRequest("admin", "/control/autonomy", { method: "PUT", body: JSON.stringify(rule) }),
  promotions: () => aiRequest<{ agentId: string; action: string; from: AutonomyLevel; to: AutonomyLevel; proposals: number }[]>("admin", "/control/promotions"),
  inbox: (status = "open") => aiRequest<AiInboxItem[]>("admin", `/inbox?status=${status}`),
  approve: (id: string, input?: Record<string, unknown>) => aiRequest<AiActionResult>("admin", `/inbox/${id}/approve`, { method: "POST", body: JSON.stringify({ input }) }),
  reject: (id: string, reason: string) => aiRequest<AiInboxItem>("admin", `/inbox/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  resolve: (id: string, body: { note?: string; label?: string }) => aiRequest<AiInboxItem>("admin", `/inbox/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  activity: (limit = 100) => aiRequest<{ decisions: AiDecision[]; events: { id: string; type: string; at: string; subject: RecordRef }[] }>("admin", `/activity?limit=${limit}`),
  panel: (portal: AiPortal, ref: RecordRef) => aiRequest<AiRecordPanel>(portal, `/records/${ref.type}/${encodeURIComponent(ref.id)}/panel`),
  action: (portal: AiPortal, name: string, input: unknown, opts?: { dryRun?: boolean; idempotencyKey?: string }) =>
    aiRequest<AiActionResult>(portal, `/actions/${name}`, {
      method: "POST",
      body: JSON.stringify({ input, dry_run: opts?.dryRun }),
      headers: opts?.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : undefined,
    }),
  generateScreen: (portal: AiPortal, request: string) => aiRequest<{ id: string; title: string; spec: unknown }>(portal, "/screens", { method: "POST", body: JSON.stringify({ request }) }),
  screens: (portal: AiPortal) => aiRequest<{ id: string; title: string; spec: unknown; pinned: boolean; createdAt: string }[]>(portal, "/screens"),
  pinScreen: (portal: AiPortal, id: string, pinned: boolean) => aiRequest(portal, `/screens/${id}/pin`, { method: "POST", body: JSON.stringify({ pinned }) }),
};

export const AGENT_NAMES: Record<string, string> = {
  concierge: "Concierge",
  design: "Design",
  sales: "Sales",
  matching: "Matching",
  delivery: "Delivery",
  care: "Care",
  drone: "Drone ops",
  vpp: "VPP",
  finance: "Finance",
  support: "Support",
};

export const LABEL_NAMES: Record<string, string> = {
  meter: "Meter",
  switchboard: "Switchboard",
  inverter: "Inverter",
  isolator: "Isolator",
  array: "Array",
  roof: "Roof",
  serial_plate: "Serial plate",
  battery: "Battery",
  before_clean: "Before clean",
  after_clean: "After clean",
  electricity_bill: "Electricity bill",
  licence: "Licence",
  compliance_certificate: "Compliance certificate",
  site_photo: "Site photo",
  other: "Other",
  proof_of_completion: "Proof of completion",
  site_report: "Site report",
  electrical_safety_certificate: "Electrical safety certificate",
  commissioning_sheet: "Commissioning sheet",
  stc_assignment_form: "STC assignment form",
  signed_contract: "Signed contract",
  warranty: "Warranty",
  invoice: "Invoice",
  quote: "Quote",
  other_document: "Document",
};

export const ROLE_NAMES: Record<string, string> = {
  customer: "Customer",
  retailer: "Retailer",
  dnsp: "Network (DNSP)",
  installer: "Installer",
  supplier: "Supplier",
};

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const fut = s < 0;
  const a = Math.abs(s);
  const v = a < 60 ? `${a}s` : a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} d`;
  return fut ? `in ${v}` : `${v} ago`;
}
