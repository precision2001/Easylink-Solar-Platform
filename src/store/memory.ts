import type { EventEnvelope, RecordRef } from "../core/envelope.js";
import {
  DEFAULT_CONTROL,
  refKey,
  type ActionLogEntry,
  type AiDecision,
  type AutonomyRule,
  type ControlState,
  type Fact,
  type FileLabels,
  type InboxItem,
  type MemoryChunk,
  type ScreenRecord,
  type TimelineItem,
  type Store,
  type Summary,
} from "./types.js";

/** In-memory store for local development and tests. */
export class MemoryStore implements Store {
  seen = new Set<string>();
  quarantined: { evt: unknown; reason: string; at: string }[] = [];
  events: EventEnvelope[] = [];
  idem = new Map<string, unknown>();
  inbox = new Map<string, InboxItem>();
  decisions: AiDecision[] = [];
  actionLog: ActionLogEntry[] = [];
  rules: AutonomyRule[] = [];
  control: ControlState = { ...DEFAULT_CONTROL };
  facts: Fact[] = [];
  summaries = new Map<string, Summary>();
  chunks: MemoryChunk[] = [];
  screens: ScreenRecord[] = [];
  labels = new Map<string, FileLabels>();
  records = new Map<string, Map<string, Record<string, unknown>>>();
  timeline: TimelineItem[] = [];

  async markEventSeen(eventId: string) {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
  async quarantine(evt: unknown, reason: string) {
    this.quarantined.push({ evt, reason, at: new Date().toISOString() });
  }
  async listQuarantine(limit: number) {
    return this.quarantined.slice(-limit).reverse();
  }
  async recordEvent(evt: EventEnvelope) {
    this.events.push(evt);
    if (this.events.length > 5000) this.events.shift();
  }
  async recentEvents(limit: number) {
    return this.events.slice(-limit).reverse();
  }
  async getIdempotent(key: string) {
    return this.idem.get(key);
  }
  async putIdempotent(key: string, value: unknown) {
    this.idem.set(key, value);
  }
  async putInbox(item: InboxItem) {
    this.inbox.set(item.id, item);
  }
  async getInbox(id: string) {
    return this.inbox.get(id);
  }
  async listInbox(filter: { status?: InboxItem["status"]; kind?: InboxItem["kind"]; limit?: number }) {
    return [...this.inbox.values()]
      .filter((i) => (!filter.status || i.status === filter.status) && (!filter.kind || i.kind === filter.kind))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 100);
  }
  async putDecision(d: AiDecision) {
    this.decisions.push(d);
  }
  async listDecisions(filter: { agentId?: string; subject?: RecordRef; sinceIso?: string; limit?: number }) {
    return this.decisions
      .filter(
        (d) =>
          (!filter.agentId || d.agentId === filter.agentId) &&
          (!filter.subject || (d.subject && refKey(d.subject) === refKey(filter.subject))) &&
          (!filter.sinceIso || d.createdAt >= filter.sinceIso),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 500);
  }
  async putActionLog(e: ActionLogEntry) {
    this.actionLog.push(e);
  }
  async listActionLog(filter: { subject?: RecordRef; sinceIso?: string; limit?: number }) {
    return this.actionLog
      .filter(
        (e) =>
          (!filter.subject || (e.subject && refKey(e.subject) === refKey(filter.subject))) &&
          (!filter.sinceIso || e.createdAt >= filter.sinceIso),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, filter.limit ?? 500);
  }
  async listAutonomyRules(agentId?: string) {
    return this.rules.filter((r) => !agentId || r.agentId === agentId);
  }
  async putAutonomyRule(rule: AutonomyRule) {
    const same = (r: AutonomyRule) =>
      r.agentId === rule.agentId && r.action === rule.action && JSON.stringify(r.condition) === JSON.stringify(rule.condition);
    this.rules = this.rules.filter((r) => !same(r));
    this.rules.push(rule);
  }
  async getControl() {
    return this.control;
  }
  async putControl(state: ControlState) {
    this.control = state;
  }
  async putFact(f: Fact) {
    this.facts = this.facts.filter((x) => x.id !== f.id);
    this.facts.push(f);
  }
  async listFacts(subject: RecordRef) {
    return this.facts.filter((f) => refKey(f.subject) === refKey(subject));
  }
  async getSummary(subject: RecordRef) {
    return this.summaries.get(refKey(subject));
  }
  async putSummary(s: Summary) {
    this.summaries.set(refKey(s.subject), s);
  }
  async putChunk(c: MemoryChunk) {
    this.chunks.push(c);
  }
  async searchChunks(query: string, allowed: RecordRef[] | "all", limit: number) {
    const allowedKeys = allowed === "all" ? null : new Set(allowed.map(refKey));
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    return this.chunks
      .filter((c) => !allowedKeys || c.subjects.some((s) => allowedKeys.has(refKey(s))))
      .map((c) => ({ c, score: terms.reduce((n, t) => n + (c.text.toLowerCase().includes(t) ? 1 : 0), 0) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.c.occurredAt.localeCompare(a.c.occurredAt))
      .slice(0, limit)
      .map((x) => x.c);
  }
  async putFileLabels(l: FileLabels) {
    this.labels.set(l.documentId, l);
  }
  async getFileLabels(ids: string[]) {
    return ids.map((id) => this.labels.get(id)).filter((x): x is FileLabels => !!x);
  }
  async putTimeline(item: TimelineItem) {
    this.timeline = this.timeline.filter((t) => t.id !== item.id);
    this.timeline.push(item);
  }
  async listTimeline(record: RecordRef, limit: number) {
    const k = refKey(record);
    return this.timeline
      .filter((t) => t.records.some((r) => refKey(r) === k))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, limit);
  }
  async putRecord(type: string, row: Record<string, unknown> & { id: string }) {
    const m = this.records.get(type) ?? new Map<string, Record<string, unknown>>();
    m.set(row.id, row);
    this.records.set(type, m);
  }
  async getRecord(type: string, id: string) {
    return this.records.get(type)?.get(id);
  }
  async listRecords(type: string) {
    return [...(this.records.get(type)?.values() ?? [])];
  }
  async putScreen(s: ScreenRecord) {
    this.screens = this.screens.filter((x) => x.id !== s.id);
    this.screens.push(s);
  }
  async listScreens(ownerId: string) {
    return this.screens.filter((s) => s.ownerId === ownerId);
  }
}
