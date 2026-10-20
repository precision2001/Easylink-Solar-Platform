import type { RecordRef, Principal, EventEnvelope } from "../core/envelope.js";
import type { ActionName } from "../core/actions.js";

/** Autonomy levels (spec 8.3). The existing AI control UI labels them Shadow / Recommends / Decides. */
export type AutonomyLevel = "L0" | "L1" | "L2" | "L3";

export type InboxKind = "proposal" | "question" | "review" | "exception" | "alert";
export type InboxStatus = "open" | "approved" | "rejected" | "answered" | "resolved";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  status: InboxStatus;
  title: string;
  agentId: string | null;
  subject: RecordRef | null;
  action: ActionName | null;
  input: Record<string, unknown> | null;
  reasoning: string;
  createdAt: string;
  dueAt: string;
  decisionId: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  /** Set when a person approved after editing the proposal. */
  editedInput: Record<string, unknown> | null;
};

export type AiDecision = {
  id: string;
  agentId: string;
  eventId: string | null;
  subject: RecordRef | null;
  reasoningSummary: string;
  action: ActionName | null;
  autonomyLevel: AutonomyLevel | null;
  outcome: "executed" | "proposed" | "denied" | "escalated" | "no_action" | "error";
  approverId: string | null;
  costAud: number;
  contextHash: string | null;
  createdAt: string;
};

export type ActionLogEntry = {
  id: string;
  principal: Principal;
  action: ActionName;
  inputDigest: string;
  outcome: "executed" | "proposed" | "denied" | "invalid" | "dry_run" | "error";
  policyIds: string[];
  decisionId: string | null;
  subject: RecordRef | null;
  createdAt: string;
};

export type AutonomyRule = {
  agentId: string;
  action: ActionName;
  /** Simple equality conditions on the action context, e.g. { recipient_type: "installer" }. */
  condition: Record<string, string>;
  level: AutonomyLevel;
  setBy: string;
  setAt: string;
  reason: string;
};

export type ControlState = {
  /** The red "Set all agents to recommend-only" switch. */
  globalRecommendOnly: boolean;
  pausedAgents: Record<string, boolean>;
  /** Action kill switches by family. true = off. */
  familiesOff: Record<string, boolean>;
  dailyBudgetAud: number | null;
  updatedBy: string;
  updatedAt: string;
};

export type Fact = {
  id: string;
  subject: RecordRef;
  statement: string;
  confidence: number;
  confirmed: boolean;
  writtenBy: string;
  sourceEventId: string | null;
  createdAt: string;
};

export type Summary = {
  subject: RecordRef;
  headline: string;
  text: string;
  openItems: string[];
  risks: string[];
  version: number;
  updatedAt: string;
};

export type MemoryChunk = {
  id: string;
  subjects: RecordRef[];
  sourceType: string;
  sourceId: string;
  text: string;
  occurredAt: string;
};

export type ScreenRecord = {
  id: string;
  title: string;
  ownerId: string;
  spec: Record<string, unknown>;
  pinned: boolean;
  sharedRoles: string[];
  version: number;
  createdAt: string;
};

/** AI labels for a stored file, kept here as well so they work before the backend has the columns. */
export type FileLabels = {
  documentId: string;
  labels: { label: string; confidence: number }[];
  extracted: Record<string, string>;
  reviewState: "auto" | "needs_review" | "confirmed";
  description: string;
  updatedAt: string;
};

export interface Store {
  // event de-duplication and quarantine
  markEventSeen(eventId: string): Promise<boolean>;
  quarantine(evt: unknown, reason: string): Promise<void>;
  listQuarantine(limit: number): Promise<{ evt: unknown; reason: string; at: string }[]>;
  recordEvent(evt: EventEnvelope): Promise<void>;
  recentEvents(limit: number): Promise<EventEnvelope[]>;

  // idempotency
  getIdempotent(key: string): Promise<unknown | undefined>;
  putIdempotent(key: string, value: unknown): Promise<void>;

  // inbox
  putInbox(item: InboxItem): Promise<void>;
  getInbox(id: string): Promise<InboxItem | undefined>;
  listInbox(filter: { status?: InboxStatus; kind?: InboxKind; limit?: number }): Promise<InboxItem[]>;

  // decisions and action log
  putDecision(d: AiDecision): Promise<void>;
  listDecisions(filter: { agentId?: string; subject?: RecordRef; sinceIso?: string; limit?: number }): Promise<AiDecision[]>;
  putActionLog(e: ActionLogEntry): Promise<void>;
  listActionLog(filter: { subject?: RecordRef; sinceIso?: string; limit?: number }): Promise<ActionLogEntry[]>;

  // autonomy and control
  listAutonomyRules(agentId?: string): Promise<AutonomyRule[]>;
  putAutonomyRule(rule: AutonomyRule): Promise<void>;
  getControl(): Promise<ControlState>;
  putControl(state: ControlState): Promise<void>;

  // memory
  putFact(f: Fact): Promise<void>;
  listFacts(subject: RecordRef): Promise<Fact[]>;
  getSummary(subject: RecordRef): Promise<Summary | undefined>;
  putSummary(s: Summary): Promise<void>;
  putChunk(c: MemoryChunk): Promise<void>;
  searchChunks(query: string, allowedSubjects: RecordRef[] | "all", limit: number): Promise<MemoryChunk[]>;

  // file labels
  putFileLabels(l: FileLabels): Promise<void>;
  getFileLabels(documentIds: string[]): Promise<FileLabels[]>;

  // screens
  putScreen(s: ScreenRecord): Promise<void>;
  listScreens(ownerId: string): Promise<ScreenRecord[]>;
}

export const DEFAULT_CONTROL: ControlState = {
  globalRecommendOnly: false,
  pausedAgents: {},
  familiesOff: {},
  dailyBudgetAud: null,
  updatedBy: "system",
  updatedAt: new Date(0).toISOString(),
};

export const refKey = (r: RecordRef) => `${r.type}#${r.id}`;
