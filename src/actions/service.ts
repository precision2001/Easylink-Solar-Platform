import { createHash } from "node:crypto";
import { ACTIONS, isActionName, type ActionName } from "../core/actions.js";
import { makeEvent, newId, type EventEnvelope, type Principal, type RecordRef } from "../core/envelope.js";
import { RECORD_TYPES, readPath } from "../core/records.js";
import type { Backend, BackendAuth } from "../backend/client.js";
import type { EventBus } from "../bus/bus.js";
import { evaluatePolicy, isStaff, type PolicyDecision, type PolicyRequest } from "../policy/policy.js";
import { resolveAutonomy } from "../policy/autonomy.js";
import type { AutonomyLevel, InboxItem, Store } from "../store/types.js";
import type { FileLinks, Messaging } from "./ports.js";
import { WORKFLOWS } from "./workflows.js";
import { absoluteUrl } from "../files/classify.js";

const SITE = () => process.env.PUBLIC_SITE_URL ?? "";

export type ActionStatus = "executed" | "proposed" | "denied" | "invalid" | "dry_run" | "shadow" | "blocked" | "error";

export type ActionResult = {
  status: ActionStatus;
  action_id: string;
  autonomy_level: AutonomyLevel | null;
  result?: unknown;
  events: string[];
  policy: { decision: "allow" | "deny"; policies: string[]; reasons: string[] };
  approval_id?: string;
  errors?: unknown;
  message?: string;
};

export type ActionRequest = {
  name: string;
  input: unknown;
  principal: Principal;
  /** Bearer token of the person calling (portals). Agents and system jobs use the service token. */
  auth?: BackendAuth;
  idempotencyKey?: string;
  dryRun?: boolean;
  correlationId?: string;
  causationId?: string | null;
  /** Set by the agent runtime. */
  agent?: { agentId: string; decisionId?: string; eventId?: string; reasoning?: string };
  /** Set when a person approves an inbox proposal: skips the autonomy gate, keeps policy. */
  approvedBy?: string;
};

export type ActionServiceDeps = {
  store: Store;
  bus: EventBus;
  backend: Backend;
  messaging: Messaging;
  files: FileLinks;
  /** Service account token for agents and system jobs. */
  serviceToken: string;
  now?: () => Date;
};

type Ctx = {
  req: ActionRequest;
  name: ActionName;
  input: Record<string, unknown>;
  auth: BackendAuth;
  events: EventEnvelope[];
  correlationId: string;
};

export class ActionService {
  constructor(private deps: ActionServiceDeps) {}

  private now() {
    return this.deps.now?.() ?? new Date();
  }

  async run(req: ActionRequest): Promise<ActionResult> {
    const actionId = newId("act_");
    const base = { action_id: actionId, events: [] as string[], autonomy_level: null as AutonomyLevel | null };
    const allow = { decision: "allow" as const, policies: [] as string[], reasons: [] as string[] };

    if (!isActionName(req.name)) {
      return { ...base, status: "invalid", policy: allow, message: `Unknown action ${req.name}` };
    }
    const name = req.name;
    const parsed = ACTIONS[name].input.safeParse(req.input);
    if (!parsed.success) {
      await this.log(actionId, req, name, "invalid", [], null);
      return { ...base, status: "invalid", policy: allow, errors: parsed.error.flatten() };
    }
    const input = parsed.data as Record<string, unknown>;

    if (req.idempotencyKey) {
      const prior = await this.deps.store.getIdempotent(`${req.principal.id}:${req.idempotencyKey}`);
      if (prior) return prior as ActionResult;
    }

    const usesService = ["agent", "system", "integration"].includes(req.principal.kind);
    const auth: BackendAuth | undefined = usesService ? { token: this.deps.serviceToken } : req.auth;
    if (!auth?.token) {
      return { ...base, status: "denied", policy: { decision: "deny", policies: ["authenticated"], reasons: ["No credentials for the backend."] } };
    }

    const ctx: Ctx = { req, name, input, auth, events: [], correlationId: req.correlationId ?? newId("cor_") };

    // Policy
    let policy: PolicyDecision;
    let subject: RecordRef | null = null;
    try {
      const pr = await this.buildPolicyRequest(ctx);
      subject = pr.resource?.ref ?? null;
      policy = evaluatePolicy(pr);
    } catch (e) {
      return { ...base, status: "error", policy: allow, message: (e as Error).message };
    }
    if (policy.decision === "deny") {
      await this.log(actionId, req, name, "denied", policy.policies, subject);
      return { ...base, status: "denied", policy };
    }

    // Autonomy (agents only, unless a person has approved this exact action)
    let level: AutonomyLevel | null = null;
    if (req.principal.kind === "agent" && req.agent && !req.approvedBy) {
      const [rules, control] = await Promise.all([this.deps.store.listAutonomyRules(req.agent.agentId), this.deps.store.getControl()]);
      const a = resolveAutonomy({
        agentId: req.agent.agentId,
        action: name,
        context: this.autonomyContext(ctx, subject),
        rules,
        control,
        requireHuman: policy.requireHuman,
      });
      level = a.level;
      if (a.outcome === "blocked") {
        await this.log(actionId, req, name, "denied", [...policy.policies, "kill_switch"], subject);
        return { ...base, autonomy_level: level, status: "blocked", policy, message: a.why };
      }
      if (a.outcome === "shadow") {
        await this.log(actionId, req, name, "dry_run", policy.policies, subject);
        return { ...base, autonomy_level: level, status: "shadow", policy, message: a.why };
      }
      if (a.outcome === "propose") {
        const item = await this.propose(ctx, subject, a.why);
        await this.log(actionId, req, name, "proposed", policy.policies, subject);
        const evt = this.event(ctx, "ai.proposed", subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id, action: name });
        await this.emit(ctx, [evt]);
        return { ...base, autonomy_level: level, status: "proposed", approval_id: item.id, policy, events: [evt.event_id] };
      }
    }

    if (req.dryRun) return { ...base, autonomy_level: level, status: "dry_run", policy };

    try {
      const result = await this.execute(ctx);
      await this.log(actionId, req, name, "executed", policy.policies, subject);
      await this.emit(ctx, ctx.events);
      const out: ActionResult = {
        ...base,
        autonomy_level: level,
        status: "executed",
        result,
        policy,
        events: ctx.events.map((e) => e.event_id),
      };
      if (req.idempotencyKey) await this.deps.store.putIdempotent(`${req.principal.id}:${req.idempotencyKey}`, out);
      return out;
    } catch (e) {
      await this.log(actionId, req, name, "error", policy.policies, subject);
      return { ...base, autonomy_level: level, status: "error", policy, message: (e as Error).message };
    }
  }

  /** A person approves (optionally after editing) an inbox proposal. */
  async approve(inboxId: string, approver: Principal, editedInput?: Record<string, unknown>): Promise<ActionResult> {
    const item = await this.deps.store.getInbox(inboxId);
    if (!item || item.kind !== "proposal" || !item.action || !item.agentId) throw new Error("Not an open proposal");
    if (item.status !== "open") throw new Error(`Proposal is already ${item.status}`);
    const res = await this.run({
      name: item.action,
      input: editedInput ?? item.input,
      principal: { kind: "agent", id: item.agentId, roles: [item.agentId], on_behalf_of: approver.id },
      agent: { agentId: item.agentId, decisionId: item.decisionId ?? undefined },
      approvedBy: approver.id,
    });
    const resolved: InboxItem = {
      ...item,
      status: res.status === "executed" ? "approved" : "open",
      resolvedBy: approver.id,
      resolvedAt: this.now().toISOString(),
      resolution: res.status === "executed" ? (editedInput ? "approved_with_edits" : "approved_unchanged") : `failed: ${res.message ?? res.status}`,
      editedInput: editedInput ?? null,
    };
    await this.deps.store.putInbox(resolved);
    return res;
  }

  async reject(inboxId: string, approver: Principal, reason: string): Promise<InboxItem> {
    const item = await this.deps.store.getInbox(inboxId);
    if (!item) throw new Error("Inbox item not found");
    const resolved: InboxItem = {
      ...item,
      status: "rejected",
      resolvedBy: approver.id,
      resolvedAt: this.now().toISOString(),
      resolution: reason,
    };
    await this.deps.store.putInbox(resolved);
    const evt = makeEvent({
      type: "ai.corrected",
      source: "inbox",
      principal: approver,
      subject: item.subject ?? { type: "inbox", id: item.id },
      data: { inbox_id: item.id, agent: item.agentId, action: item.action, reason },
    });
    await this.deps.store.recordEvent(evt);
    await this.deps.bus.publish([evt]);
    return resolved;
  }

  // ---------- internals ----------

  private async buildPolicyRequest(ctx: Ctx): Promise<PolicyRequest> {
    const { name, input, req, auth } = ctx;
    const pr: PolicyRequest = { principal: req.principal, action: name, now: this.now() };
    const loadRef = async (ref: RecordRef | undefined) => {
      if (!ref || !RECORD_TYPES[ref.type]) return undefined;
      const r = await this.deps.backend.get(ref.type, ref.id, auth);
      return { ref, data: (r.ok ? r.data : null) as Record<string, unknown> | null };
    };
    switch (name) {
      case "get_record":
      case "list_files":
        pr.resource = await loadRef(input.record as RecordRef);
        break;
      case "update_record": {
        pr.resource = await loadRef(input.record as RecordRef);
        pr.fields = input.fields as Record<string, unknown>;
        pr.changedFields = Object.keys(pr.fields);
        break;
      }
      case "get_file_link":
        pr.resource = await loadRef(input.file as RecordRef);
        break;
      case "write_fact":
        pr.resource = await loadRef(input.about as RecordRef);
        break;
      case "send_message":
      case "place_call": {
        const to = (input.to as { record: RecordRef }).record;
        const loaded = await loadRef(to);
        pr.resource = loaded;
        const d = loaded?.data ?? {};
        pr.recipient = {
          resolvedFromRecord: !!loaded?.data,
          type: to.type,
          consent: {
            sms: d.smsConsent as boolean | undefined,
            email: d.emailConsent as boolean | undefined,
            calls: d.callConsent as boolean | undefined,
            marketing: d.marketingConsent as boolean | undefined,
          },
          optedOut: Boolean(d.optedOut),
          dncrRegistered: Boolean(d.dncrRegistered),
          address: (d.address as string | undefined) ?? null,
        };
        pr.purpose = input.purpose as PolicyRequest["purpose"];
        pr.channels = (input.channel as string[] | undefined) ?? (name === "place_call" ? ["call"] : []);
        break;
      }
      case "start_workflow": {
        const ids = (input.inputs as Record<string, unknown>).records;
        pr.count = Array.isArray(ids) ? ids.length : 1;
        break;
      }
    }
    return pr;
  }

  private autonomyContext(ctx: Ctx, subject: RecordRef | null): Record<string, string> {
    const c: Record<string, string> = {};
    if (subject) c.record_type = subject.type;
    if (ctx.name === "send_message") {
      c.recipient_type = (ctx.input.to as { record: RecordRef }).record.type;
      c.purpose = String(ctx.input.purpose);
    }
    if (ctx.name === "start_workflow") c.template = String(ctx.input.template);
    return c;
  }

  private async propose(ctx: Ctx, subject: RecordRef | null, why: string): Promise<InboxItem> {
    const now = this.now();
    const urgentMinutes = ctx.req.agent?.agentId === "concierge" ? 15 : 120;
    const item: InboxItem = {
      id: newId("inb_"),
      kind: "proposal",
      status: "open",
      title: describeAction(ctx.name, ctx.input),
      agentId: ctx.req.agent!.agentId,
      subject,
      action: ctx.name,
      input: ctx.input,
      reasoning: ctx.req.agent?.reasoning ?? why,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() + urgentMinutes * 60_000).toISOString(),
      decisionId: ctx.req.agent?.decisionId ?? null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
      editedInput: null,
    };
    await this.deps.store.putInbox(item);
    return item;
  }

  private event(ctx: Ctx, type: string, subject: RecordRef, data: Record<string, unknown> = {}, links: RecordRef[] = []) {
    return makeEvent({
      type,
      source: ctx.req.principal.kind === "agent" ? `agent:${ctx.req.principal.id}` : "action-api",
      principal: ctx.req.principal,
      subject,
      links,
      data,
      correlation_id: ctx.correlationId,
      causation_id: ctx.req.causationId ?? ctx.req.agent?.eventId ?? null,
    });
  }

  private async emit(_ctx: Ctx, events: EventEnvelope[]) {
    if (!events.length) return;
    for (const e of events) await this.deps.store.recordEvent(e);
    await this.deps.bus.publish(events);
  }

  private async log(id: string, req: ActionRequest, action: ActionName, outcome: Parameters<Store["putActionLog"]>[0]["outcome"], policyIds: string[], subject: RecordRef | null) {
    await this.deps.store.putActionLog({
      id,
      principal: req.principal,
      action,
      inputDigest: createHash("sha256").update(JSON.stringify(req.input ?? null)).digest("hex").slice(0, 16),
      outcome,
      policyIds,
      decisionId: req.agent?.decisionId ?? null,
      subject,
      createdAt: this.now().toISOString(),
    });
  }

  private async execute(ctx: Ctx): Promise<unknown> {
    const { name, input, auth } = ctx;
    const b = this.deps.backend;
    switch (name) {
      case "search_records": {
        const type = input.type as string;
        const r = await b.list(type, input.filter as Record<string, unknown>, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        let rows = (r.data ?? []) as Record<string, unknown>[];
        // Installers only see their own records even if the backend list is wider.
        const def = RECORD_TYPES[type];
        const p = ctx.req.principal;
        if (p.kind === "installer" && !isStaff(p) && def?.ownerInstallerPath) {
          rows = rows.filter((row) => {
            const o = readPath(row, def.ownerInstallerPath);
            return o == null || String(o) === p.id;
          });
        }
        return rows.slice(0, input.limit as number);
      }
      case "get_record": {
        const ref = input.record as RecordRef;
        const r = await b.get(ref.type, ref.id, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        const [summary, facts] = await Promise.all([this.deps.store.getSummary(ref), this.deps.store.listFacts(ref)]);
        return { record: r.data, summary: summary ?? null, facts: facts.filter((f) => f.confirmed) };
      }
      case "search_memory": {
        const p = ctx.req.principal;
        const subjects = input.subjects as RecordRef[];
        const allowed = isStaff(p) || p.kind === "agent" ? (subjects.length ? subjects : "all") : subjects;
        return this.deps.store.searchChunks(input.query as string, allowed, input.limit as number);
      }
      case "create_record": {
        const type = input.type as string;
        const r = await b.create(type, input.fields as Record<string, unknown>, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        const id = String((r.data as Record<string, unknown>)?.id ?? "");
        ctx.events.push(this.event(ctx, RECORD_TYPES[type]!.events.created, { type, id }, { fields: Object.keys(input.fields as object) }));
        return r.data;
      }
      case "update_record": {
        const ref = input.record as RecordRef;
        const r = await b.update(ref.type, ref.id, input.fields as Record<string, unknown>, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, RECORD_TYPES[ref.type]!.events.updated, ref, { fields: Object.keys(input.fields as object) }));
        return r.data;
      }
      case "link_records": {
        const from = input.from as RecordRef;
        const to = input.to as RecordRef;
        const r = await b.update(from.type, from.id, { [`${to.type}Id`]: to.id }, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, RECORD_TYPES[from.type]!.events.updated, from, { linked: to }, [to]));
        return r.data;
      }
      case "list_files": {
        const ref = input.record as RecordRef;
        const filterKey = ref.type === "lead" ? "leadId" : "customerId";
        const r = await b.list("document", { [filterKey]: ref.id }, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        let rows = (r.data ?? []) as Record<string, unknown>[];
        // Labels live on the backend row once it has the columns; until then in the AI store.
        const stored = new Map((await this.deps.store.getFileLabels(rows.map((f) => String(f.id)))).map((l) => [l.documentId, l]));
        rows = rows.map((f) => {
          const l = stored.get(String(f.id));
          return l && !f.aiLabels ? { ...f, aiLabels: l.labels, extracted: l.extracted, reviewState: l.reviewState } : f;
        });
        const want = (input.slot ?? input.label) as string | undefined;
        if (want) {
          rows = rows.filter((f) => {
            const labels = (f.aiLabels as { label: string; confidence: number }[] | undefined) ?? [];
            return f.slot === want || f.category === want || labels.some((l) => l.label === want && l.confidence >= 0.7);
          });
        }
        rows.sort((a, z) => String(z.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
        if (input.latest_only && want) rows = rows.slice(0, 3);
        return rows.map((f) => ({
          id: f.id,
          name: f.fileName ?? f.name ?? f.title,
          slot: f.slot ?? f.category ?? null,
          labels: f.aiLabels ?? [],
          reviewState: f.reviewState ?? (f.aiLabels ? "auto" : "pending"),
          url: f.url ?? null,
          mimeType: f.mimeType ?? null,
          createdAt: f.createdAt ?? null,
        }));
      }
      case "get_file_link": {
        const ref = input.file as RecordRef;
        const r = await b.get(ref.type, ref.id, auth);
        if (!r.ok || !r.data) throw new Error("File not found");
        const f = r.data;
        const url = f.s3Key
          ? await this.deps.files.signedUrl(String(f.s3Key), (input.expires_in_hours as number) * 3600)
          : absoluteUrl(String(f.url ?? f.fileUrl ?? ""), SITE());
        if (!url) throw new Error("File has no stored location");
        ctx.events.push(this.event(ctx, "file.shared", ref, { expires_in_hours: input.expires_in_hours }));
        return { url, expires_in_hours: input.expires_in_hours };
      }
      case "send_message":
        return this.sendMessage(ctx);
      case "place_call": {
        const to = (input.to as { record: RecordRef }).record;
        const rec = await b.get(to.type, to.id, auth);
        const phone = String(rec.data?.phone ?? rec.data?.customerPhone ?? "");
        if (!phone) throw new Error("Recipient has no phone number on file");
        const r = await b.call("POST", "/calls/dial", { to: phone, reason: input.reason }, { token: this.deps.serviceToken });
        if (!r.ok) throw new Error(r.message ?? "Dial failed");
        ctx.events.push(this.event(ctx, "call.started", to, { direction: "outbound", purpose: input.purpose }));
        return r.data;
      }
      case "schedule":
        return this.schedule(ctx);
      case "create_task": {
        const about = input.about as RecordRef | undefined;
        const fields: Record<string, unknown> = {
          title: input.title,
          description: input.details,
          dueDate: input.due,
          assignedToId: input.assignee_id,
          ...(about ? { [`${about.type}Id`]: about.id } : {}),
        };
        const r = await b.create("task", fields, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, "task.created", { type: "task", id: String(r.data?.id ?? "") }, {}, about ? [about] : []));
        return r.data;
      }
      case "start_workflow":
        return this.startWorkflow(ctx);
      case "write_fact": {
        const about = input.about as RecordRef;
        const confidence = input.confidence as number;
        const fact = {
          id: newId("fct_"),
          subject: about,
          statement: input.statement as string,
          confidence,
          confirmed: confidence >= 0.8 || ctx.req.principal.kind !== "agent",
          writtenBy: ctx.req.principal.id,
          sourceEventId: ctx.req.agent?.eventId ?? null,
          createdAt: this.now().toISOString(),
        };
        await this.deps.store.putFact(fact);
        if (!fact.confirmed) {
          await this.deps.store.putInbox({
            id: newId("inb_"),
            kind: "review",
            status: "open",
            title: `Confirm fact: "${fact.statement}"`,
            agentId: ctx.req.agent?.agentId ?? null,
            subject: about,
            action: null,
            input: { fact_id: fact.id },
            reasoning: `Written with confidence ${confidence.toFixed(2)}.`,
            createdAt: fact.createdAt,
            dueAt: new Date(this.now().getTime() + 86_400_000).toISOString(),
            decisionId: ctx.req.agent?.decisionId ?? null,
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            editedInput: null,
          });
        }
        ctx.events.push(this.event(ctx, "fact.written", about, { fact_id: fact.id, confirmed: fact.confirmed }));
        return fact;
      }
      case "request_approval": {
        const item: InboxItem = {
          id: newId("inb_"),
          kind: "question",
          status: "open",
          title: input.question as string,
          agentId: ctx.req.agent?.agentId ?? null,
          subject: (input.about as RecordRef | undefined) ?? null,
          action: null,
          input: null,
          reasoning: ctx.req.agent?.reasoning ?? "",
          createdAt: this.now().toISOString(),
          dueAt: new Date(this.now().getTime() + 4 * 3_600_000).toISOString(),
          decisionId: ctx.req.agent?.decisionId ?? null,
          resolvedBy: null,
          resolvedAt: null,
          resolution: null,
          editedInput: null,
        };
        await this.deps.store.putInbox(item);
        ctx.events.push(this.event(ctx, "ai.escalated", item.subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id }));
        return { inbox_id: item.id };
      }
    }
  }

  private async sendMessage(ctx: Ctx) {
    const { input, auth } = ctx;
    const to = (input.to as { record: RecordRef }).record;
    const rec = await this.deps.backend.get(to.type, to.id, auth);
    if (!rec.ok || !rec.data) throw new Error("Recipient not found");
    const d = rec.data;
    const email = (d.email ?? d.customerEmail) as string | undefined;
    const phone = (d.phone ?? d.customerPhone) as string | undefined;
    const channels = input.channel as string[];
    const files = input.files as RecordRef[];
    const links: string[] = [];
    for (const f of files) {
      const fr = await this.deps.backend.get(f.type, f.id, auth);
      if (fr.ok && fr.data) {
        const url = fr.data.s3Key ? await this.deps.files.signedUrl(String(fr.data.s3Key), 7 * 86400) : absoluteUrl(String(fr.data.url ?? ""), SITE());
        if (url) links.push(url);
      }
    }
    const sent: Record<string, string> = {};
    if (channels.includes("email")) {
      if (!email) throw new Error("Recipient has no email on file");
      sent.email = (await this.deps.messaging.sendEmail({ to: email, subject: (input.subject as string) ?? "EasyLink Solar", body: input.body as string, links })).id;
      ctx.events.push(this.event(ctx, "email.sent", to, { message_id: sent.email, files: files.length }));
    }
    if (channels.includes("sms")) {
      if (!phone) throw new Error("Recipient has no mobile on file");
      const body = [String(input.body).slice(0, 320), ...links].join("\n");
      sent.sms = (await this.deps.messaging.sendSms({ to: phone, body })).id;
      ctx.events.push(this.event(ctx, "sms.sent", to, { message_id: sent.sms }));
    }
    if (channels.includes("portal")) {
      ctx.events.push(this.event(ctx, "message.sent", to, { channel: "portal" }));
    }
    for (const f of files) ctx.events.push(this.event(ctx, "file.shared", f, { to }));
    return { sent, links: links.length };
  }

  private async schedule(ctx: Ctx) {
    const { input, auth } = ctx;
    const b = this.deps.backend;
    const mode = input.mode as string;
    const fields = input.fields as Record<string, unknown>;
    const appt = input.appointment as RecordRef | undefined;
    if (mode === "availability") {
      const r = await b.list("appointment", fields, auth);
      return { booked: r.data ?? [] };
    }
    if (mode === "book") {
      const r = await b.create("appointment", fields, auth);
      if (!r.ok) throw new Error(r.message ?? "Booking failed");
      ctx.events.push(this.event(ctx, "appointment.booked", { type: "appointment", id: String(r.data?.id ?? "") }));
      return r.data;
    }
    if (!appt) throw new Error("appointment is required to move or cancel");
    const patch = mode === "cancel" ? { ...fields, status: "CANCELLED" } : fields;
    const r = await b.update("appointment", appt.id, patch, auth);
    if (!r.ok) throw new Error(r.message ?? "Update failed");
    ctx.events.push(this.event(ctx, mode === "cancel" ? "appointment.cancelled" : "appointment.moved", appt));
    return r.data;
  }

  private async startWorkflow(ctx: Ctx) {
    const template = WORKFLOWS[ctx.input.template as string];
    if (!template) throw new Error(`Unknown workflow ${ctx.input.template}`);
    if (template.family && (await this.deps.store.getControl()).familiesOff[template.family]) {
      throw new Error(`The "${template.family}" kill switch is off.`);
    }
    const results: { step: string; status: ActionStatus; message?: string }[] = [];
    for (const step of template.steps(ctx.input.inputs as Record<string, unknown>)) {
      const r = await this.run({
        name: step.action,
        input: step.input,
        principal: ctx.req.principal,
        auth: ctx.req.auth,
        correlationId: ctx.correlationId,
        causationId: ctx.req.causationId,
        agent: ctx.req.agent,
        approvedBy: ctx.req.approvedBy,
      });
      results.push({ step: step.id, status: r.status, message: r.message });
      if (!["executed", "proposed"].includes(r.status) && !step.optional) break;
    }
    return { template: template.id, results };
  }
}

export function describeAction(name: ActionName, input: Record<string, unknown>): string {
  switch (name) {
    case "send_message": {
      const to = (input.to as { record: RecordRef }).record;
      return `Send ${(input.channel as string[]).join(" + ")} to ${to.type} ${to.id}`;
    }
    case "place_call":
      return `Call ${(input.to as { record: RecordRef }).record.type} ${(input.to as { record: RecordRef }).record.id}`;
    case "update_record": {
      const r = input.record as RecordRef;
      return `Update ${r.type} ${r.id}: ${Object.keys(input.fields as object).join(", ")}`;
    }
    case "create_record":
      return `Create ${input.type}`;
    case "schedule":
      return `${String(input.mode)[0]!.toUpperCase()}${String(input.mode).slice(1)} appointment`;
    case "start_workflow":
      return `Run workflow "${input.template}"`;
    case "create_task":
      return `Create task: ${input.title}`;
    default:
      return name.replace(/_/g, " ");
  }
}
