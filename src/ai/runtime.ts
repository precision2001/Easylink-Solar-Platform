import { createHash } from "node:crypto";
import type { Tool } from "@aws-sdk/client-bedrock-runtime";
import { toolSpecFor } from "../core/actions.js";
import { isRegisteredType } from "../core/catalogue.js";
import { EventEnvelope, newId, redactEvent, type Principal } from "../core/envelope.js";
import type { ActionService, ActionResult } from "../actions/service.js";
import type { Store, AiDecision } from "../store/types.js";
import { isOptOut } from "../compliance/au.js";
import { AGENTS, SHARED_RULES, agentsForEvent, type AgentDef } from "./agents.js";
import { turnCostAud, type ChatMessage, type ModelClient } from "./model.js";
import type { FileClassifier } from "../files/classify.js";

export const SYSTEM: Principal = { kind: "system", id: "ai-platform", roles: ["SYSTEM"], on_behalf_of: null };

/** Event types that only feed memory; no agent wakes for them on their own. */
const MEMORY_ONLY = new Set(["page.viewed", "cta.clicked", "ui.interacted", "field.hesitated", "search.performed"]);

/** Text-bearing fields copied into memory chunks for search_memory. */
const TEXT_FIELDS = ["transcript", "summary", "body", "text", "message", "content", "notes"];

export type RuntimeDeps = {
  store: Store;
  actions: ActionService;
  model: ModelClient;
  classifier?: FileClassifier;
  now?: () => Date;
};

export type TriageResult = {
  event_id: string;
  status: "quarantined" | "duplicate" | "memory_only" | "handled";
  agents: { agentId: string; outcome: AiDecision["outcome"]; steps: number; results: { action: string; status: string }[] }[];
};

/**
 * The AI layer entry point (spec 6.1–6.2): every event on the bus comes here.
 * Deterministic rules first (cheap, predictable), then the agents subscribed to
 * the event type.
 */
export class AiRuntime {
  constructor(private deps: RuntimeDeps) {}

  private now() {
    return this.deps.now?.() ?? new Date();
  }

  async handle(raw: unknown): Promise<TriageResult> {
    const parsed = EventEnvelope.safeParse(raw);
    const id = (raw as { event_id?: string })?.event_id ?? "unknown";
    if (!parsed.success) {
      await this.deps.store.quarantine(raw, `Invalid envelope: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      return { event_id: id, status: "quarantined", agents: [] };
    }
    const evt = parsed.data;
    if (!isRegisteredType(evt.type)) {
      await this.deps.store.quarantine(evt, `Unregistered event type ${evt.type}`);
      return { event_id: evt.event_id, status: "quarantined", agents: [] };
    }
    if (!(await this.deps.store.markEventSeen(evt.event_id))) return { event_id: evt.event_id, status: "duplicate", agents: [] };

    await this.remember(evt);
    await this.rules(evt);
    if (MEMORY_ONLY.has(evt.type)) return { event_id: evt.event_id, status: "memory_only", agents: [] };

    const agents = agentsForEvent(evt.type).filter(
      // An agent is never woken by its own actions (prevents loops).
      (a) => !(evt.principal.kind === "agent" && evt.principal.id === a.id),
    );
    const out: TriageResult["agents"] = [];
    for (const agent of agents) out.push(await this.runAgent(agent, evt));
    return { event_id: evt.event_id, status: "handled", agents: out };
  }

  /** Deterministic handling that must never depend on a model. */
  private async rules(evt: EventEnvelope) {
    // STOP / unsubscribe replies are honoured immediately (Spam Act).
    if (evt.type === "sms.received" || evt.type === "email.received") {
      const text = String(evt.data.body ?? evt.data.text ?? "");
      if (isOptOut(text) && ["customer", "lead"].includes(evt.subject.type)) {
        await this.deps.actions.run({
          name: "update_record",
          input: { record: evt.subject, fields: { optedOut: true, smsConsent: false, marketingConsent: false } },
          principal: SYSTEM,
          causationId: evt.event_id,
          correlationId: evt.correlation_id,
        });
      }
    }
    // Every uploaded file is labelled by the AI at upload: no checkboxes.
    if (evt.type === "file.uploaded" && this.deps.classifier) {
      await this.deps.classifier.classify(evt);
    }
  }

  private async remember(evt: EventEnvelope) {
    const texts = TEXT_FIELDS.map((k) => evt.data[k]).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (!texts.length) return;
    await this.deps.store.putChunk({
      id: newId("chk_"),
      subjects: [evt.subject, ...evt.links],
      sourceType: evt.type,
      sourceId: evt.event_id,
      text: texts.join("\n").slice(0, 8000),
      occurredAt: evt.occurred_at,
    });
  }

  private async overBudget(): Promise<boolean> {
    const control = await this.deps.store.getControl();
    if (control.dailyBudgetAud == null) return false;
    const start = new Date(this.now());
    start.setUTCHours(0, 0, 0, 0);
    const today = await this.deps.store.listDecisions({ sinceIso: start.toISOString(), limit: 10_000 });
    return today.reduce((s, d) => s + d.costAud, 0) >= control.dailyBudgetAud;
  }

  async runAgent(agent: AgentDef, evt: EventEnvelope): Promise<TriageResult["agents"][number]> {
    const decisionId = newId("dec_");
    const principal: Principal = { kind: "agent", id: agent.id, roles: [agent.id], on_behalf_of: null };
    const results: { action: string; status: string }[] = [];
    let cost = 0;
    let lastAction: AiDecision["action"] = null;
    let lastLevel: AiDecision["autonomyLevel"] = null;
    let outcome: AiDecision["outcome"] = "no_action";
    let summary = "";

    const control = await this.deps.store.getControl();
    if (control.pausedAgents[agent.id] || (await this.overBudget())) {
      outcome = "escalated";
      summary = control.pausedAgents[agent.id] ? "Agent paused." : "Daily AI budget reached.";
      await this.saveDecision({ decisionId, agent, evt, summary, lastAction, lastLevel, outcome, cost, contextHash: null });
      return { agentId: agent.id, outcome, steps: 0, results };
    }

    const context = await this.contextFor(principal, agent, evt, decisionId);
    const tools: Tool[] = agent.actions.map((a) => toolSpecFor(a, agent.recordTypes) as Tool);
    const system = `You are the ${agent.name} agent. ${agent.brief}\n\n${SHARED_RULES}\n\nNow (UTC): ${this.now().toISOString()}`;
    const messages: ChatMessage[] = [{ role: "user", text: context }];
    const contextHash = createHash("sha256").update(system + context).digest("hex").slice(0, 16);

    let steps = 0;
    for (; steps < agent.maxSteps; steps++) {
      const turn = await this.deps.model.converse({ tier: agent.tier, system, messages, tools });
      cost += turnCostAud(agent.tier, turn);
      messages.push({ role: "assistant", text: turn.text, toolUses: turn.toolUses });
      if (!turn.toolUses.length) {
        summary = turn.text.slice(0, 500);
        break;
      }
      const toolResults: { toolUseId: string; json: unknown; error?: boolean }[] = [];
      for (const use of turn.toolUses) {
        const r: ActionResult = await this.deps.actions.run({
          name: use.name,
          input: use.input,
          principal,
          agent: { agentId: agent.id, decisionId, eventId: evt.event_id, reasoning: turn.text.slice(0, 1000) },
          correlationId: evt.correlation_id,
          causationId: evt.event_id,
          idempotencyKey: `${evt.event_id}:${agent.id}:${use.name}:${hashInput(use.input)}`,
        });
        results.push({ action: use.name, status: r.status });
        if (r.status !== "invalid" && use.name !== "search_records" && use.name !== "get_record" && use.name !== "search_memory" && use.name !== "list_files") {
          lastAction = use.name as AiDecision["action"];
          lastLevel = r.autonomy_level;
        }
        toolResults.push({
          toolUseId: use.toolUseId,
          json: { status: r.status, result: r.result ?? null, message: r.message ?? null, reasons: r.policy.reasons, approval_id: r.approval_id ?? null },
          error: ["invalid", "denied", "error", "blocked"].includes(r.status),
        });
      }
      messages.push({ role: "user", toolResults });
    }

    const statuses = results.map((r) => r.status);
    if (statuses.includes("proposed")) outcome = "proposed";
    else if (results.some((r) => r.status === "executed" && !["search_records", "get_record", "search_memory", "list_files"].includes(r.action))) outcome = "executed";
    else if (statuses.includes("denied") || statuses.includes("blocked")) outcome = "denied";
    else if (statuses.includes("error")) outcome = "error";
    if (results.some((r) => r.action === "request_approval" && r.status === "executed")) outcome = "escalated";
    if (steps >= agent.maxSteps && !summary) summary = "Stopped at the step limit.";

    await this.saveDecision({ decisionId, agent, evt, summary, lastAction, lastLevel, outcome, cost, contextHash });
    return { agentId: agent.id, outcome, steps: steps + 1, results };
  }

  private async saveDecision(a: {
    decisionId: string;
    agent: AgentDef;
    evt: EventEnvelope;
    summary: string;
    lastAction: AiDecision["action"];
    lastLevel: AiDecision["autonomyLevel"];
    outcome: AiDecision["outcome"];
    cost: number;
    contextHash: string | null;
  }) {
    await this.deps.store.putDecision({
      id: a.decisionId,
      agentId: a.agent.id,
      eventId: a.evt.event_id,
      subject: a.evt.subject,
      reasoningSummary: a.summary,
      action: a.lastAction,
      autonomyLevel: a.lastLevel,
      outcome: a.outcome,
      approverId: null,
      costAud: Math.round(a.cost * 10000) / 10000,
      contextHash: a.contextHash,
      createdAt: this.now().toISOString(),
    });
  }

  /** What the agent sees: the event (PII paths redacted), the subject record and its memory. */
  private async contextFor(principal: Principal, agent: AgentDef, evt: EventEnvelope, decisionId: string): Promise<string> {
    const parts = [`Event:\n${JSON.stringify(redactEvent(evt), null, 2)}`];
    if (agent.recordTypes.includes(evt.subject.type)) {
      const r = await this.deps.actions.run({
        name: "get_record",
        input: { record: evt.subject },
        principal,
        agent: { agentId: agent.id, decisionId, eventId: evt.event_id },
      });
      if (r.status === "executed") parts.push(`Subject record (${evt.subject.type} ${evt.subject.id}):\n${JSON.stringify(r.result, null, 2).slice(0, 6000)}`);
    }
    const recent = await this.deps.store.searchChunks(String(evt.data.transcript ?? evt.data.body ?? evt.type), [evt.subject], 3);
    if (recent.length) parts.push(`Related memory:\n${recent.map((c) => `- [${c.sourceType} ${c.occurredAt}] ${c.text.slice(0, 400)}`).join("\n")}`);
    parts.push("Decide what, if anything, needs doing for this event and do it with the tools.");
    return parts.join("\n\n");
  }
}

function hashInput(v: unknown) {
  return createHash("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 10);
}

export { AGENTS };
