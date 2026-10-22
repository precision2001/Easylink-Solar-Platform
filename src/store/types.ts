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
  /** When a person's own request needs a staff approval (e.g. first send to a contact the AI found), who asked. */
  requestedBy?: Principal | null;
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

/** Who a document was sent to, and when. */
export type Delivery = { recipient: RecordRef; role: string; channels: string[]; at: string; by: string; attached: boolean };

/**
 * The AI's profile of a stored file: labels, what it read, which records it
 * belongs to, who it should go to, and who it has gone to. Kept here as well
 * so it works before the backend has the columns.
 */
export type FileLabels = {
  documentId: string;
  labels: { label: string; confidence: number }[];
  extracted: Record<string, string>;
  reviewState: "auto" | "needs_review" | "confirmed";
  description: string;
  updatedAt: string;
  /** Every record the file belongs to: customer, lead, the installer who uploaded it. */
  links?: RecordRef[];
  /** Suggested recipient roles for this kind of document, e.g. ["customer", "retailer"]. */
  routes?: string[];
  /** Problems found when checking the document against the job (missing signature, serial mismatch). */
  issues?: string[];
  deliveredTo?: Delivery[];
};

/**
 * One line in a record's history. Written once, indexed under every record it
 * concerns (customer, lead, document, recipient), shown to whoever may see
 * that record. `audience: "staff"` lines (AI reasoning, policy refusals) are
 * never shown to customers or installers.
 */
export type TimelineItem = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail?: string;
  actor: { kind: string; id: string; name?: string };
  records: RecordRef[];
  files?: { id: string; name?: string }[];
  /** A stored copy of the message this line is about. */
  messageId?: string;
  audience: "related" | "staff";
  eventId?: string;
};

/** A read-only copy of everything sent: what, to whom, how, and what happened to it. */
export type MessageCopy = {
  id: string;
  at: string;
  from: { kind: string; id: string; name?: string };
  to: { record: RecordRef; name: string; role: string; address?: string };
  channels: string[];
  subject: string;
  body: string;
  files: { id: string; name: string }[];
  attached: boolean;
  status: "sent" | "delivered" | "opened" | "bounced" | "failed";
  statusAt: string;
  providerIds: Record<string, string>;
  /** Records this message concerns (for access). */
  records: RecordRef[];
  retention: "sales_12m" | "contract_7y";
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

  // history
  putTimeline(item: TimelineItem): Promise<void>;
  listTimeline(record: RecordRef, limit: number): Promise<TimelineItem[]>;

  // records the AI platform keeps until the backend has them (partners, routing config)
  putRecord(type: string, row: Record<string, unknown> & { id: string }): Promise<void>;
  getRecord(type: string, id: string): Promise<Record<string, unknown> | undefined>;
  listRecords(type: string): Promise<Record<string, unknown>[]>;
  /** Write only if the stored row's `rev` still equals `expectRev` (first-come purchases). False if someone got there first. */
  putRecordIfRev(type: string, row: Record<string, unknown> & { id: string; rev: number }, expectRev: number): Promise<boolean>;

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
