import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
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

/**
 * Single-table DynamoDB store for the AI layer's own state. Business records
 * stay in the existing backend database.
 *
 * pk / sk layout:
 *   SEEN#<event_id>        / SEEN                (ttl 7 days)
 *   QUAR                   / <iso>#<rand>        (ttl 30 days)
 *   EVT                    / <iso>#<event_id>    (ttl 90 days, recent feed only; full archive is S3)
 *   IDEM#<key>             / IDEM                (ttl 1 day)
 *   INBOX                  / <iso>#<id>          + gsi1: INBOX#<status> / <iso>
 *   INBOXID#<id>           / INBOX               (pointer)
 *   DEC                    / <iso>#<id>          + gsi1: DECAGENT#<agent> / <iso>, gsi2: SUBJ#<type#id> / <iso>
 *   ACT                    / <iso>#<id>          + gsi2: SUBJ#<type#id> / <iso>
 *   RULE#<agent>           / <action>#<cond>
 *   CONTROL                / CONTROL
 *   FACT#<type#id>         / <id>
 *   SUM#<type#id>          / SUM
 *   CHUNK#<type#id>        / <iso>#<id>          (keyword search; vector search runs in pgvector, spec 5.2)
 *   SCREEN#<owner>         / <id>
 *   LABELS#<document_id>   / LABELS
 *   TL#<type#id>           / <iso>#<id>          (history line, one copy per record it concerns; 7 years)
 *   REC#<type>             / <id>                (partners, routing config: records the backend does not hold yet)
 */
export class DynamoStore implements Store {
  private doc: DynamoDBDocumentClient;
  constructor(private table: string, client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }

  private ttl(days: number) {
    return Math.floor(Date.now() / 1000) + days * 86400;
  }
  private async put(item: Record<string, unknown>, condition?: string) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: item, ConditionExpression: condition }));
  }
  private async get<T>(pk: string, sk: string): Promise<T | undefined> {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { pk, sk } }));
    return r.Item?.data as T | undefined;
  }
  private async query<T>(input: Omit<QueryCommandInput, "TableName">): Promise<T[]> {
    const r = await this.doc.send(new QueryCommand({ TableName: this.table, ...input }));
    return (r.Items ?? []).map((i) => i.data as T);
  }

  async markEventSeen(eventId: string) {
    try {
      await this.put({ pk: `SEEN#${eventId}`, sk: "SEEN", ttl: this.ttl(7) }, "attribute_not_exists(pk)");
      return true;
    } catch (e) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") return false;
      throw e;
    }
  }
  async quarantine(evt: unknown, reason: string) {
    const at = new Date().toISOString();
    await this.put({ pk: "QUAR", sk: `${at}#${Math.random().toString(36).slice(2)}`, ttl: this.ttl(30), data: { evt, reason, at } });
  }
  async listQuarantine(limit: number) {
    return this.query<{ evt: unknown; reason: string; at: string }>({
      KeyConditionExpression: "pk = :p",
      ExpressionAttributeValues: { ":p": "QUAR" },
      ScanIndexForward: false,
      Limit: limit,
    });
  }
  async recordEvent(evt: EventEnvelope) {
    await this.put({ pk: "EVT", sk: `${evt.occurred_at}#${evt.event_id}`, ttl: this.ttl(90), data: evt });
  }
  async recentEvents(limit: number) {
    return this.query<EventEnvelope>({
      KeyConditionExpression: "pk = :p",
      ExpressionAttributeValues: { ":p": "EVT" },
      ScanIndexForward: false,
      Limit: limit,
    });
  }
  async getIdempotent(key: string) {
    return this.get<unknown>(`IDEM#${key}`, "IDEM");
  }
  async putIdempotent(key: string, value: unknown) {
    await this.put({ pk: `IDEM#${key}`, sk: "IDEM", ttl: this.ttl(1), data: value });
  }
  async putInbox(item: InboxItem) {
    await this.put({ pk: "INBOX", sk: `${item.createdAt}#${item.id}`, gsi1pk: `INBOX#${item.status}`, gsi1sk: item.createdAt, data: item });
    await this.put({ pk: `INBOXID#${item.id}`, sk: "INBOX", data: item });
  }
  async getInbox(id: string) {
    return this.get<InboxItem>(`INBOXID#${id}`, "INBOX");
  }
  async listInbox(filter: { status?: InboxItem["status"]; kind?: InboxItem["kind"]; limit?: number }) {
    const items = filter.status
      ? await this.query<InboxItem>({
          IndexName: "gsi1",
          KeyConditionExpression: "gsi1pk = :p",
          ExpressionAttributeValues: { ":p": `INBOX#${filter.status}` },
          ScanIndexForward: false,
          Limit: filter.limit ?? 100,
        })
      : await this.query<InboxItem>({
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": "INBOX" },
          ScanIndexForward: false,
          Limit: filter.limit ?? 100,
        });
    // The INBOX partition keeps the first written copy; prefer the pointer copy for current status.
    const fresh = await Promise.all(items.map((i) => this.getInbox(i.id)));
    return fresh
      .filter((i): i is InboxItem => !!i)
      .filter((i) => (!filter.status || i.status === filter.status) && (!filter.kind || i.kind === filter.kind));
  }
  async putDecision(d: AiDecision) {
    await this.put({
      pk: "DEC",
      sk: `${d.createdAt}#${d.id}`,
      gsi1pk: `DECAGENT#${d.agentId}`,
      gsi1sk: d.createdAt,
      ...(d.subject ? { gsi2pk: `SUBJ#${refKey(d.subject)}`, gsi2sk: d.createdAt } : {}),
      ttl: this.ttl(730),
      data: d,
    });
  }
  async listDecisions(filter: { agentId?: string; subject?: RecordRef; sinceIso?: string; limit?: number }) {
    const since = filter.sinceIso ?? "0";
    if (filter.subject) {
      return this.query<AiDecision>({
        IndexName: "gsi2",
        KeyConditionExpression: "gsi2pk = :p AND gsi2sk >= :s",
        ExpressionAttributeValues: { ":p": `SUBJ#${refKey(filter.subject)}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 50,
      });
    }
    if (filter.agentId) {
      return this.query<AiDecision>({
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :p AND gsi1sk >= :s",
        ExpressionAttributeValues: { ":p": `DECAGENT#${filter.agentId}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 500,
      });
    }
    return this.query<AiDecision>({
      KeyConditionExpression: "pk = :p AND sk >= :s",
      ExpressionAttributeValues: { ":p": "DEC", ":s": since },
      ScanIndexForward: false,
      Limit: filter.limit ?? 500,
    });
  }
  async putActionLog(e: ActionLogEntry) {
    await this.put({
      pk: "ACT",
      sk: `${e.createdAt}#${e.id}`,
      ...(e.subject ? { gsi2pk: `SUBJ#${refKey(e.subject)}`, gsi2sk: e.createdAt } : {}),
      ttl: this.ttl(730),
      data: e,
    });
  }
  async listActionLog(filter: { subject?: RecordRef; sinceIso?: string; limit?: number }) {
    const since = filter.sinceIso ?? "0";
    if (filter.subject) {
      const rows = await this.query<ActionLogEntry & { principal: unknown }>({
        IndexName: "gsi2",
        KeyConditionExpression: "gsi2pk = :p AND gsi2sk >= :s",
        ExpressionAttributeValues: { ":p": `SUBJ#${refKey(filter.subject)}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 50,
      });
      return rows.filter((r) => "action" in r && "inputDigest" in r) as ActionLogEntry[];
    }
    return this.query<ActionLogEntry>({
      KeyConditionExpression: "pk = :p AND sk >= :s",
      ExpressionAttributeValues: { ":p": "ACT", ":s": since },
      ScanIndexForward: false,
      Limit: filter.limit ?? 500,
    });
  }
  async listAutonomyRules(agentId?: string) {
    if (agentId) {
      return this.query<AutonomyRule>({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `RULE#${agentId}` } });
    }
    return this.query<AutonomyRule>({ IndexName: "gsi1", KeyConditionExpression: "gsi1pk = :p", ExpressionAttributeValues: { ":p": "RULES" } });
  }
  async putAutonomyRule(rule: AutonomyRule) {
    const cond = Object.entries(rule.condition).sort().map(([k, v]) => `${k}=${v}`).join("&") || "*";
    await this.put({ pk: `RULE#${rule.agentId}`, sk: `${rule.action}#${cond}`, gsi1pk: "RULES", gsi1sk: `${rule.agentId}#${rule.action}#${cond}`, data: rule });
  }
  async getControl() {
    return (await this.get<ControlState>("CONTROL", "CONTROL")) ?? { ...DEFAULT_CONTROL };
  }
  async putControl(state: ControlState) {
    await this.put({ pk: "CONTROL", sk: "CONTROL", data: state });
  }
  async putFact(f: Fact) {
    await this.put({ pk: `FACT#${refKey(f.subject)}`, sk: f.id, data: f });
  }
  async listFacts(subject: RecordRef) {
    return this.query<Fact>({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `FACT#${refKey(subject)}` } });
  }
  async getSummary(subject: RecordRef) {
    return this.get<Summary>(`SUM#${refKey(subject)}`, "SUM");
  }
  async putSummary(s: Summary) {
    await this.put({ pk: `SUM#${refKey(s.subject)}`, sk: "SUM", data: s });
  }
  async putChunk(c: MemoryChunk) {
    await Promise.all(
      c.subjects.map((s) => this.put({ pk: `CHUNK#${refKey(s)}`, sk: `${c.occurredAt}#${c.id}`, data: c })),
    );
  }
  async searchChunks(query: string, allowed: RecordRef[] | "all", limit: number) {
    if (allowed === "all") return []; // org-wide semantic search runs in pgvector (spec 5.2), not DynamoDB
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    const lists = await Promise.all(
      allowed.slice(0, 10).map((s) =>
        this.query<MemoryChunk>({
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": `CHUNK#${refKey(s)}` },
          ScanIndexForward: false,
          Limit: 200,
        }),
      ),
    );
    return lists
      .flat()
      .map((c) => ({ c, score: terms.reduce((n, t) => n + (c.text.toLowerCase().includes(t) ? 1 : 0), 0) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.c);
  }
  async putFileLabels(l: FileLabels) {
    await this.put({ pk: `LABELS#${l.documentId}`, sk: "LABELS", data: l });
  }
  async getFileLabels(ids: string[]) {
    const out = await Promise.all(ids.map((id) => this.get<FileLabels>(`LABELS#${id}`, "LABELS")));
    return out.filter((x): x is FileLabels => !!x);
  }
  async putTimeline(item: TimelineItem) {
    const seen = new Set<string>();
    for (const r of item.records) {
      const k = refKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      await this.put({ pk: `TL#${k}`, sk: `${item.at}#${item.id}`, ttl: this.ttl(2557), data: item });
    }
  }
  async listTimeline(record: RecordRef, limit: number) {
    return this.query<TimelineItem>({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `TL#${refKey(record)}` }, ScanIndexForward: false, Limit: limit });
  }
  async putRecord(type: string, row: Record<string, unknown> & { id: string }) {
    await this.put({ pk: `REC#${type}`, sk: row.id, data: row });
  }
  async getRecord(type: string, id: string) {
    return this.get<Record<string, unknown>>(`REC#${type}`, id);
  }
  async putRecordIfRev(type: string, row: Record<string, unknown> & { id: string; rev: number }, expectRev: number) {
    try {
      await this.doc.send(new PutCommand({
        TableName: this.table,
        Item: { pk: `REC#${type}`, sk: row.id, data: row },
        ConditionExpression: expectRev === 0 ? "attribute_not_exists(#d.#r) OR #d.#r = :r" : "#d.#r = :r",
        ExpressionAttributeNames: { "#d": "data", "#r": "rev" },
        ExpressionAttributeValues: { ":r": expectRev },
      }));
      return true;
    } catch (e) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") return false;
      throw e;
    }
  }
  async listRecords(type: string) {
    return this.query<Record<string, unknown>>({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `REC#${type}` } });
  }
  async putScreen(s: ScreenRecord) {
    await this.put({ pk: `SCREEN#${s.ownerId}`, sk: s.id, data: s });
  }
  async listScreens(ownerId: string) {
    return this.query<ScreenRecord>({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `SCREEN#${ownerId}` } });
  }
}
