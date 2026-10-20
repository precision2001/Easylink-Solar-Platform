import { createHash, randomBytes } from "node:crypto";
import { ACTIONS, isActionName, type ActionName } from "../core/actions.js";
import { makeEvent, newId, type EventEnvelope, type Principal, type RecordRef } from "../core/envelope.js";
import { RECORD_TYPES, readPath } from "../core/records.js";
import type { Backend, BackendAuth } from "../backend/client.js";
import type { EventBus } from "../bus/bus.js";
import { evaluatePolicy, isStaff, type PolicyDecision, type PolicyRequest } from "../policy/policy.js";
import { resolveAutonomy } from "../policy/autonomy.js";
import type { AutonomyLevel, InboxItem, MessageCopy, Store } from "../store/types.js";
import type { FileLinks, Messaging } from "./ports.js";
import { WORKFLOWS } from "./workflows.js";
import { absoluteUrl, type FileBytes } from "../files/classify.js";
import { checkFile, checkMessageBody, LIMITS, s3ScanStatus } from "../files/safety.js";
import type { ContactFinder } from "../contacts/finder.js";
import { Relations } from "../access/relations.js";

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
  /** The caller's user record from the backend (/users/me), for relationship checks. */
  user?: Record<string, unknown>;
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
  /** Reads file contents for attachments and safety checks. */
  bytes?: FileBytes;
  /** Who is related to what (assignments). */
  relations?: Relations;
  /** Finds contacts that aren't on file (web search under the contact rules). */
  contacts?: ContactFinder;
  /** Malware scan result for a stored file (GuardDuty Malware Protection for S3). */
  scan?: (doc: Record<string, unknown>) => Promise<"clean" | "infected" | null>;
  now?: () => Date;
  /** The job journey (set by the container); used by draft_invoice. */
  jobs?: () => { act: (id: string, action: string, input: Record<string, unknown>, p: Principal) => Promise<unknown> };
};

/** Contact details for any record kind; the sender never sees them. */
export function contactOf(type: string, d: Record<string, unknown>) {
  return {
    email: (type === "partner" ? d.submissionEmail ?? d.email : d.email ?? d.customerEmail) as string | undefined,
    phone: (d.phone ?? d.mobile ?? d.customerPhone) as string | undefined,
    name: String(d.name ?? ([d.firstName, d.lastName].filter(Boolean).join(" ") || d.customerName) ?? `${type} ${d.id}`),
  };
}

type Ctx = {
  req: ActionRequest;
  name: ActionName;
  input: Record<string, unknown>;
  auth: BackendAuth;
  events: EventEnvelope[];
  correlationId: string;
};

/** Refused because of what is being sent (type, size, malware, links, limits), not who is sending. */
export class SafetyError extends Error {}

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

    // A person's request that policy says needs a staff OK (e.g. the first send to a contact the AI
    // found on the web) waits in the inbox. Staff are trusted to act directly.
    if (req.principal.kind !== "agent" && policy.requireHuman && !req.approvedBy && !isStaff(req.principal) && !req.dryRun) {
      if (name === "send_message") {
        // Check now that the sender can open every file, so the approval isn't wasted.
        for (const f of (input.files as RecordRef[]) ?? []) {
          const fr = await this.deps.backend.get(f.type, f.id, auth);
          if (!fr.ok) return { ...base, status: "denied", policy: { decision: "deny", policies: ["sender_can_open_files"], reasons: [`You can't send ${f.type} ${f.id}.`] } };
        }
      }
      const item = await this.propose(ctx, subject, policy.reasons.join(" ") || "Needs a staff approval.");
      await this.log(actionId, req, name, "proposed", policy.policies, subject);
      const evt = this.event(ctx, "ai.proposed", subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id, action: name, requested_by: req.principal.id });
      await this.emit(ctx, [evt]);
      return { ...base, status: "proposed", approval_id: item.id, policy, events: [evt.event_id], message: "Sent to EasyLink staff to approve. You'll be told when it goes." };
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
      if (e instanceof SafetyError) {
        await this.log(actionId, req, name, "denied", [...policy.policies, "content_safety"], subject);
        return { ...base, autonomy_level: level, status: "denied", policy: { decision: "deny", policies: [...policy.policies, "content_safety"], reasons: [e.message] }, message: e.message };
      }
      await this.log(actionId, req, name, "error", policy.policies, subject);
      return { ...base, autonomy_level: level, status: "error", policy, message: (e as Error).message };
    }
  }

  /** A person approves (optionally after editing) an inbox proposal. */
  async approve(inboxId: string, approver: Principal, editedInput?: Record<string, unknown>): Promise<ActionResult> {
    const item = await this.deps.store.getInbox(inboxId);
    if (!item || item.kind !== "proposal" || !item.action || !(item.agentId || item.requestedBy)) throw new Error("Not an open proposal");
    if (item.status !== "open") throw new Error(`Proposal is already ${item.status}`);
    const input = editedInput ?? item.input;
    const res = item.agentId
      ? await this.run({
          name: item.action,
          input,
          principal: { kind: "agent", id: item.agentId, roles: [item.agentId], on_behalf_of: approver.id },
          agent: { agentId: item.agentId, decisionId: item.decisionId ?? undefined },
          approvedBy: approver.id,
        })
      : // A person's request: runs as them; file access was checked when they asked.
        await this.run({ name: item.action, input, principal: item.requestedBy!, auth: { token: this.deps.serviceToken }, approvedBy: approver.id });
    // Approving the first send to a contact the AI found makes that contact trusted.
    if (res.status === "executed" && item.action === "send_message") {
      const to = (input as { to?: { record?: RecordRef } } | null)?.to?.record;
      if (to?.type === "partner") {
        await this.deps.backend.update("partner", to.id, { verified: true, verifiedBy: approver.id, verifiedAt: this.now().toISOString() }, { token: this.deps.serviceToken });
      }
    }
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
        // Anyone signed in may contact anyone on record: the recipient is looked up by the
        // platform (service account), so it is not an ownership check on the sender. What the
        // sender must be able to see is the files they attach (checked when sending).
        const to = (input.to as { record: RecordRef }).record;
        const r = RECORD_TYPES[to.type] ? await this.deps.backend.get(to.type, to.id, { token: this.deps.serviceToken }) : null;
        const loaded = r?.ok && r.data ? { ref: to, data: r.data as Record<string, unknown> } : undefined;
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
          verified: to.type === "partner" ? d.verified !== false : true,
          source: (d.source as { url?: string } | undefined)?.url ?? null,
        };
        pr.purpose = input.purpose as PolicyRequest["purpose"];
        pr.channels = (input.channel as string[] | undefined) ?? (name === "place_call" ? ["call"] : []);
        break;
      }
      case "assign_installer": {
        const project = input.project as RecordRef;
        pr.resource = { ref: project, data: null };
        if (this.deps.relations && !isStaff(req.principal) && ["customer", "installer"].includes(req.principal.kind)) {
          const scope = await this.deps.relations.scope(req.principal, req.user ?? {});
          pr.related = Relations.covers(scope, project);
        }
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
      agentId: ctx.req.agent?.agentId ?? null,
      requestedBy: ctx.req.agent ? null : ctx.req.principal,
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
          if (!l) return f;
          return {
            ...f,
            ...(f.aiLabels ? {} : { aiLabels: l.labels, extracted: l.extracted, reviewState: l.reviewState }),
            routes: l.routes ?? [],
            issues: l.issues ?? [],
            deliveredTo: l.deliveredTo ?? [],
          };
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
          routes: f.routes ?? [],
          issues: f.issues ?? [],
          deliveredTo: ((f.deliveredTo as { role: string; at: string; channels: string[] }[] | undefined) ?? []).map((d) => ({ role: d.role, at: d.at, channels: d.channels })),
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
      case "assign_installer": {
        if (!this.deps.relations) throw new Error("Assignments are not configured.");
        const project = input.project as RecordRef;
        if (!["customer", "lead"].includes(project.type)) throw new Error("A project is a customer or a lead.");
        const svc = { token: this.deps.serviceToken };
        const inst = await this.deps.backend.get("user", (input.installer as RecordRef).id, svc);
        if (!inst.ok || !inst.data) throw new Error("Installer not found");
        if (String(inst.data.role ?? "").toUpperCase() !== "INSTALLER") throw new Error("That user isn't an installer.");
        const installerName = [inst.data.firstName, inst.data.lastName].filter(Boolean).join(" ") || String(inst.data.name ?? inst.data.id);
        const ids = await this.deps.relations.linkedIds(project);
        const customerId = [...ids.customers][0] ?? null;
        const leadId = [...ids.leads][0] ?? null;
        const before = await this.deps.relations.currentInstallers(project);
        const { current, closed } = await this.deps.relations.assign({
          customerId,
          leadId,
          installerId: String(inst.data.id),
          installerName,
          by: ctx.req.approvedBy ?? ctx.req.principal.id,
          reason: String(input.reason),
          replace: input.mode === "replace",
          now: this.now().toISOString(),
        });
        // Keep the backend's lead in step so existing screens agree.
        if (leadId) {
          const r = await this.deps.backend.call("POST", `/leads/${encodeURIComponent(leadId)}/assign`, { installerId: current.installerId, assignedToId: current.installerId }, svc);
          if (!r.ok) await this.deps.backend.update("lead", leadId, { assignedToId: current.installerId }, svc);
        }
        const links: RecordRef[] = [{ type: "user", id: current.installerId }];
        if (customerId) links.push({ type: "customer", id: customerId });
        if (leadId) links.push({ type: "lead", id: leadId });
        ctx.events.push(this.event(ctx, "installer.assigned", project, { installer_id: current.installerId, installer_name: installerName, reason: input.reason, mode: input.mode, previous: before }, links));
        for (const c of closed) {
          ctx.events.push(this.event(ctx, "installer.unassigned", project, { installer_id: c.installerId, installer_name: c.installerName ?? null }, [{ type: "user", id: c.installerId }, ...links.slice(1)]));
        }
        return { assignment: current, previous: closed.map((c) => c.installerId), installerName };
      }
      case "draft_invoice": {
        if (!this.deps.jobs) throw new Error("Jobs are not configured.");
        const r = (await this.deps.jobs().act(String(input.job), "create_invoice", { kind: input.kind, lines: input.lines, notes: input.notes, dueDays: input.dueDays, via: "ai" }, ctx.req.principal)) as { invoice: { id: string; number: string; totals: { total: number } } };
        return { invoice_id: r.invoice.id, number: r.invoice.number, total: r.invoice.totals.total, status: "draft — the installer checks it and presses Send" };
      }
      case "find_contact": {
        if (!this.deps.contacts) throw new Error("Contact search is not configured (SEARCH_API_KEY).");
        const r = await this.deps.contacts.find(String(input.organisation), String(input.kind), String(input.purpose ?? ""));
        const about = input.about as RecordRef | undefined;
        if (!r.found) {
          // Nothing safe to use: ask staff, with what was found.
          const item: InboxItem = {
            id: newId("inb_"),
            kind: "question",
            status: "open",
            title: `Who at ${input.organisation} should receive this? ${r.reason}`,
            agentId: ctx.req.agent?.agentId ?? null,
            subject: about ?? null,
            action: null,
            input: { organisation: input.organisation, kind: input.kind, candidates: r.candidates },
            reasoning: r.candidates.length ? `Addresses seen: ${r.candidates.map((c) => c.email).join(", ")}` : r.reason,
            createdAt: this.now().toISOString(),
            dueAt: new Date(this.now().getTime() + 4 * 3_600_000).toISOString(),
            decisionId: ctx.req.agent?.decisionId ?? null,
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            editedInput: null,
            requestedBy: ctx.req.agent ? null : ctx.req.principal,
          };
          await this.deps.store.putInbox(item);
          ctx.events.push(this.event(ctx, "ai.escalated", about ?? { type: "inbox", id: item.id }, { inbox_id: item.id, reason: r.reason }));
          return { partner: null, reason: r.reason, inbox_id: item.id };
        }
        const f = r.found;
        if (!f.verified && f.source) ctx.events.push(this.event(ctx, "partner.created", f.partner, { found_by: "ai", source: f.source.url, domain: f.domain }));
        return { partner: f.partner, name: f.name, email: f.email, verified: f.verified, source: f.source?.url ?? null, confidence: f.confidence };
      }
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
    const { input, auth, req } = ctx;
    const p = req.principal;
    const to = (input.to as { record: RecordRef }).record;
    // The platform resolves the recipient; their details never go back to the sender.
    const rec = await this.deps.backend.get(to.type, to.id, { token: this.deps.serviceToken });
    if (!rec.ok || !rec.data) throw new Error("Recipient not found");
    const contact = contactOf(to.type, rec.data);
    const channels = input.channel as string[];
    const files = input.files as RecordRef[];
    const people = !["agent", "system", "integration"].includes(p.kind);

    if (people) {
      const body = checkMessageBody(String(input.body), { senderIsStaff: isStaff(p) });
      if (!body.ok) throw new SafetyError(body.reason);
      await this.rateLimit(p.id);
    }
    if (files.length > LIMITS.maxFilesPerMessage) throw new SafetyError(`At most ${LIMITS.maxFilesPerMessage} files per message.`);

    // Files: the sender must be able to open each one (their own token), and each must pass the safety checks.
    const copyId = newId("msg_");
    const wantAttach = Boolean(input.attach) || Boolean(rec.data.attach);
    const prepared: { ref: RecordRef; name: string; url: string; raw: { bytes: Uint8Array; contentType: string; fileName: string } | null; customerId?: unknown; leadId?: unknown }[] = [];
    for (const f of files) {
      const fr = await this.deps.backend.get(f.type, f.id, auth);
      if (!fr.ok || !fr.data) throw new SafetyError(`You can't send ${f.type} ${f.id}: it isn't on a record you can open.`);
      const doc = fr.data;
      const raw = this.deps.bytes ? await this.deps.bytes.raw(doc, LIMITS.maxFileBytes).catch(() => null) : null;
      const scan = this.deps.scan ? await this.deps.scan(doc) : doc.s3Key && process.env.FILES_BUCKET ? await s3ScanStatus(process.env.FILES_BUCKET, String(doc.s3Key)) : null;
      const verdict = checkFile({ name: String(doc.fileName ?? doc.name ?? f.id), sizeBytes: Number(doc.sizeBytes ?? raw?.bytes.byteLength ?? 0), mimeType: doc.mimeType as string | undefined, bytes: raw?.bytes, scan });
      if (!verdict.ok) {
        ctx.events.push(this.event(ctx, "document.issue_found", f, { code: verdict.code, reason: verdict.reason }));
        await this.emit(ctx, ctx.events.splice(0));
        throw new SafetyError(verdict.reason);
      }
      const direct = doc.s3Key ? await this.deps.files.signedUrl(String(doc.s3Key), 7 * 86400) : absoluteUrl(String(doc.url ?? ""), SITE());
      // Links go through the platform when it has a public address, so opening one shows in the history.
      const url = direct ? await this.trackedLink(f, String(doc.fileName ?? f.id), to, copyId, direct) : "";
      prepared.push({ ref: f, name: String(doc.fileName ?? f.id), url, raw, customerId: doc.customerId, leadId: doc.leadId });
    }
    const attachBytes = prepared.reduce((s, x) => s + (x.raw?.bytes.byteLength ?? Infinity), 0);
    const attach = wantAttach && prepared.length > 0 && attachBytes <= LIMITS.maxAttachBytes;
    const links = attach ? [] : prepared.map((x) => x.url).filter(Boolean);

    // Which records this message concerns: the recipient, the sender, each file's project, and what it's about.
    const records: RecordRef[] = [to];
    if (p.kind !== "agent" && p.kind !== "system" && p.kind !== "integration") records.push({ type: p.kind === "customer" ? "user" : "user", id: p.id });
    for (const f of prepared) {
      records.push(f.ref);
      if (f.customerId) records.push({ type: "customer", id: String(f.customerId) });
      if (f.leadId) records.push({ type: "lead", id: String(f.leadId) });
    }
    if (input.about) records.push(input.about as RecordRef);
    if (to.type === "customer" && rec.data.leadId) records.push({ type: "lead", id: String(rec.data.leadId) });
    if (to.type === "lead" && rec.data.customerId) records.push({ type: "customer", id: String(rec.data.customerId) });
    const uniq = records.filter((r, i) => records.findIndex((x) => x.type === r.type && x.id === r.id) === i);
    const role = String(input.role ?? (to.type === "partner" ? String(rec.data.kind ?? "partner") : to.type));
    const fileList = prepared.map((x) => ({ id: x.ref.id, name: x.name }));
    const common = { message_copy_id: copyId, to_name: contact.name, role, subject: input.subject ?? null, files: fileList, records: uniq, attached: false };

    const sent: Record<string, string> = {};
    if (channels.includes("email")) {
      if (!contact.email) throw new Error(`${contact.name} has no email on file`);
      sent.email = (
        await this.deps.messaging.sendEmail({
          to: contact.email,
          subject: (input.subject as string) ?? "EasyLink Solar",
          body: input.body as string,
          links,
          attachments: attach ? prepared.map((x) => ({ fileName: x.raw!.fileName || x.name, contentType: x.raw!.contentType, bytes: x.raw!.bytes })) : undefined,
        })
      ).id;
      ctx.events.push(this.event(ctx, "email.sent", to, { ...common, message_id: sent.email, attached: attach }));
    }
    if (channels.includes("sms")) {
      if (!contact.phone) throw new Error(`${contact.name} has no mobile on file`);
      const body = [String(input.body).slice(0, 320), ...prepared.map((x) => x.url).filter(Boolean)].join("\n");
      sent.sms = (await this.deps.messaging.sendSms({ to: contact.phone, body })).id;
      ctx.events.push(this.event(ctx, "sms.sent", to, { ...common, message_id: sent.sms }));
    }
    if (channels.includes("portal")) {
      ctx.events.push(this.event(ctx, "message.sent", to, { ...common, channel: "portal" }));
    }

    // A read-only copy of exactly what was sent, kept with the records it concerns.
    const at = this.now().toISOString();
    const contract = new Set(["proof_of_completion", "electrical_safety_certificate", "compliance_certificate", "signed_contract", "stc_assignment_form", "warranty", "commissioning_sheet"]);
    const profiles = await this.deps.store.getFileLabels(prepared.map((x) => x.ref.id));
    const copy: MessageCopy = {
      id: copyId,
      at,
      from: { kind: p.kind, id: p.id },
      to: { record: to, name: contact.name, role, address: [channels.includes("email") ? contact.email : null, channels.includes("sms") ? contact.phone : null].filter(Boolean).join(", ") },
      channels,
      subject: String(input.subject ?? ""),
      body: String(input.body),
      files: fileList,
      attached: attach,
      status: "sent",
      statusAt: at,
      providerIds: sent,
      records: uniq,
      retention: profiles.some((x) => contract.has(x.labels[0]?.label ?? "")) ? "contract_7y" : "sales_12m",
    };
    await this.deps.store.putRecord("message", copy as unknown as Record<string, unknown> & { id: string });
    for (const [, pid] of Object.entries(sent)) if (pid) await this.deps.store.putRecord("message_by_provider", { id: pid, copyId });

    // Remember who each document went to: shows on the record and stops double sends.
    for (const f of prepared) {
      const [cur] = await this.deps.store.getFileLabels([f.ref.id]);
      const base = cur ?? { documentId: f.ref.id, labels: [], extracted: {}, reviewState: "auto" as const, description: "", updatedAt: at };
      const delivery = { recipient: to, role, channels, at, by: p.id, attached: attach };
      await this.deps.store.putFileLabels({ ...base, updatedAt: at, deliveredTo: [...(base.deliveredTo ?? []), delivery] });
      ctx.events.push(this.event(ctx, "document.delivered", f.ref, { to, role, channels, attached: attach, message_copy_id: copyId }, [to]));
      ctx.events.push(this.event(ctx, "file.shared", f.ref, { to }));
    }
    return { sent, message_id: copyId, to: { type: to.type, name: contact.name }, files: prepared.length, attached: attach, links: links.length };
  }

  /**
   * A link that goes through the platform (PUBLIC_API_URL/f/<token>) so opening the
   * file is recorded, then redirects to the stored file. Expires with the file link.
   */
  private async trackedLink(file: RecordRef, fileName: string, to: RecordRef, copyId: string, direct: string): Promise<string> {
    const api = process.env.PUBLIC_API_URL;
    if (!api) return direct;
    const token = randomBytes(18).toString("base64url");
    await this.deps.store.putRecord("share_link", { id: token, file, fileName, to, copyId, direct, expiresAt: new Date(this.now().getTime() + 7 * 86_400_000).toISOString() });
    return `${api.replace(/\/+$/, "")}/f/${token}`;
  }

  /** Per-person sending limits (people only; agents have their own budget). */
  private async rateLimit(senderId: string) {
    const now = this.now();
    const hourKey = `${senderId}:${now.toISOString().slice(0, 13)}`;
    const dayKey = `${senderId}:${now.toISOString().slice(0, 10)}`;
    const [h, d] = await Promise.all([this.deps.store.getRecord("send_count", hourKey), this.deps.store.getRecord("send_count", dayKey)]);
    const hn = Number(h?.n ?? 0) + 1;
    const dn = Number(d?.n ?? 0) + 1;
    if (hn > LIMITS.perHour || dn > LIMITS.perDay) throw new SafetyError("Sending limit reached. Try again later or ask EasyLink staff.");
    await Promise.all([this.deps.store.putRecord("send_count", { id: hourKey, n: hn }), this.deps.store.putRecord("send_count", { id: dayKey, n: dn })]);
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
    const outputs = new Map<string, unknown>();
    /** Replace {"$step": "<id>", "path": "a.b"} with that earlier step's result. */
    const resolve = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(resolve);
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.$step === "string") return readPath(outputs.get(o.$step), String(o.path ?? "")) ?? null;
        return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, resolve(x)]));
      }
      return v;
    };
    const hasNull = (v: unknown): boolean => v === null || (Array.isArray(v) ? v.some(hasNull) : !!v && typeof v === "object" && Object.values(v).some(hasNull));
    const svc = { token: this.deps.serviceToken };
    const wctx = {
      get: async (r: RecordRef) => {
        const x = RECORD_TYPES[r.type] ? await this.deps.backend.get(r.type, r.id, svc) : null;
        return x?.ok ? (x.data as Record<string, unknown>) : null;
      },
      list: async (type: string, filter: Record<string, unknown>) => {
        const x = await this.deps.backend.list(type, filter, svc);
        return (x.ok ? x.data ?? [] : []) as Record<string, unknown>[];
      },
      fileProfiles: (ids: string[]) => this.deps.store.getFileLabels(ids),
    };
    for (const step of await template.steps(ctx.input.inputs as Record<string, unknown>, wctx)) {
      const input = resolve(step.input);
      if (JSON.stringify(step.input).includes('"$step"') && hasNull(input)) {
        results.push({ step: step.id, status: "invalid", message: "Skipped: an earlier step found nothing to use." });
        continue;
      }
      const r = await this.run({
        name: step.action,
        input,
        principal: ctx.req.principal,
        auth: ctx.req.auth,
        correlationId: ctx.correlationId,
        causationId: ctx.req.causationId,
        agent: ctx.req.agent,
        approvedBy: ctx.req.approvedBy,
      });
      results.push({ step: step.id, status: r.status, message: r.message });
      outputs.set(step.id, r.result);
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
