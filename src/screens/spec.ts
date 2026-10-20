import { z } from "zod";
import { ACTIONS, isActionName } from "../core/actions.js";
import { RECORD_TYPES } from "../core/records.js";
import type { ModelClient } from "../ai/model.js";
import type { Principal } from "../core/envelope.js";
import { isStaff } from "../policy/policy.js";

/**
 * Generated screens (spec 13). The model never writes code: it writes a screen
 * spec that uses only approved portal components, and every data binding is a
 * read action that goes through the same policy as everything else. Forms can
 * only submit through the Action API, so a generated screen can never do more
 * than the viewer could do on an existing screen.
 */
export const Binding = z.object({
  action: z.enum(["search_records", "get_record", "list_files", "search_memory"]),
  input: z.record(z.unknown()),
});
export type Binding = z.infer<typeof Binding>;

const Base = { id: z.string().min(1).max(40), title: z.string().max(80).optional(), span: z.number().int().min(1).max(12).default(12) };

export const Component = z.discriminatedUnion("kind", [
  z.object({ ...Base, kind: z.literal("kpi"), binding: Binding, measure: z.enum(["count", "sum", "avg"]).default("count"), field: z.string().optional() }),
  z.object({
    ...Base,
    kind: z.literal("table"),
    binding: Binding,
    columns: z.array(z.object({ field: z.string(), label: z.string() })).min(1).max(10),
    rowLink: z.enum(["lead", "customer", "appointment", "task"]).optional(),
  }),
  z.object({
    ...Base,
    kind: z.literal("chart"),
    binding: Binding,
    chart: z.enum(["bar", "line"]),
    x: z.string(),
    y: z.string().optional(),
    measure: z.enum(["count", "sum"]).default("count"),
  }),
  z.object({ ...Base, kind: z.literal("record_panel"), record: z.object({ type: z.string(), id: z.string() }) }),
  z.object({ ...Base, kind: z.literal("files"), binding: Binding }),
  z.object({ ...Base, kind: z.literal("text"), markdown: z.string().max(2000) }),
  z.object({
    ...Base,
    kind: z.literal("action_form"),
    action: z.string(),
    fields: z.array(z.object({ name: z.string(), label: z.string(), type: z.enum(["text", "textarea", "date", "select", "number"]), options: z.array(z.string()).optional() })).max(12),
    fixed: z.record(z.unknown()).default({}),
    submitLabel: z.string().max(30).default("Submit"),
  }),
]);
export type Component = z.infer<typeof Component>;

export const ScreenSpec = z.object({
  version: z.literal(1).default(1),
  title: z.string().min(2).max(80),
  description: z.string().max(300).default(""),
  components: z.array(Component).min(1).max(12),
});
export type ScreenSpec = z.infer<typeof ScreenSpec>;

export type ValidationResult = { ok: true; spec: ScreenSpec } | { ok: false; errors: string[] };

/** Portal-visible record types per principal kind. */
function visibleTypes(p: Principal): string[] {
  if (isStaff(p)) return Object.keys(RECORD_TYPES);
  if (p.kind === "installer") return ["lead", "customer", "design", "product", "appointment", "task", "note", "document"];
  if (p.kind === "customer") return ["design", "appointment", "document"];
  return [];
}

export function validateScreen(raw: unknown, viewer: Principal): ValidationResult {
  const parsed = ScreenSpec.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const spec = parsed.data;
  const errors: string[] = [];
  const types = new Set(visibleTypes(viewer));
  const seen = new Set<string>();
  for (const c of spec.components) {
    if (seen.has(c.id)) errors.push(`Duplicate component id ${c.id}`);
    seen.add(c.id);
    if ("binding" in c) {
      const t = (c.binding.input.type ?? (c.binding.input.record as { type?: string } | undefined)?.type) as string | undefined;
      if (c.binding.action === "search_records" && (!t || !types.has(t))) errors.push(`${c.id}: record type ${t} is not available to this viewer`);
      const check = ACTIONS[c.binding.action].input.safeParse(c.binding.input);
      if (!check.success) errors.push(`${c.id}: binding input invalid (${check.error.issues[0]?.message})`);
    }
    if (c.kind === "record_panel" && !types.has(c.record.type)) errors.push(`${c.id}: record type ${c.record.type} not available`);
    if (c.kind === "action_form") {
      if (!isActionName(c.action)) errors.push(`${c.id}: unknown action ${c.action}`);
      else if (ACTIONS[c.action].kind === "read") errors.push(`${c.id}: forms must submit a write action`);
      else if (viewer.kind === "customer" && !["schedule", "create_task"].includes(c.action)) errors.push(`${c.id}: customers cannot submit ${c.action}`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, spec };
}

const SCREEN_PROMPT = (viewer: Principal) => `You design screens for the EasyLink Solar portals by writing a JSON screen spec. You never write code.
Components: kpi, table, chart, record_panel, files, text, action_form (span is a 12-column grid width).
Data bindings use only these read actions: search_records {type, filter, limit}, get_record {record}, list_files {record, slot?, label?}, search_memory {query}.
Record types available to this viewer: ${visibleTypes(viewer).join(", ")}.
Lead statuses: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST.
action_form submits one of: update_record, create_task, schedule, send_message, start_workflow (put constant inputs in "fixed").
Return ONLY the JSON object: {"title","description","components":[...]}.`;

export async function generateScreen(model: ModelClient, request: string, viewer: Principal, feedback?: string[]): Promise<ValidationResult> {
  const turn = await model.converse({
    tier: "smart",
    system: SCREEN_PROMPT(viewer),
    maxTokens: 2500,
    messages: [{ role: "user", text: feedback?.length ? `${request}\n\nYour last spec was rejected:\n- ${feedback.join("\n- ")}\nFix it.` : request }],
  });
  const m = turn.text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, errors: ["Model did not return JSON"] };
  try {
    return validateScreen(JSON.parse(m[0]), viewer);
  } catch {
    return { ok: false, errors: ["Model returned invalid JSON"] };
  }
}

/** Generate with one repair round (spec 13.4). */
export async function generateScreenWithRepair(model: ModelClient, request: string, viewer: Principal): Promise<ValidationResult> {
  const first = await generateScreen(model, request, viewer);
  if (first.ok) return first;
  return generateScreen(model, request, viewer, first.errors);
}
