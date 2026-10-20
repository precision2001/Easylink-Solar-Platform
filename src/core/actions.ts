import { z } from "zod";
import { RecordRef } from "./envelope.js";
import { RECORD_TYPES } from "./records.js";

/**
 * The generic actions (spec 7.1). Portals, agents, workflows and integrations
 * all call these; agents receive them as tools generated from the same schemas.
 */
export type ActionKind = "read" | "write" | "send" | "meta";
export type Sensitivity = "low" | "medium" | "high";

/**
 * Kill-switch families. The first six are the switches already on the master
 * portal's AI control centre; quotes, offers, refunds, lodging and dispatch are
 * enforced on workflow templates that declare them.
 */
export const ACTION_FAMILIES = {
  messages: { label: "Outbound messages and calls", detail: "Email, SMS, Voxa outbound calls" },
  quotes: { label: "Quote changes and discounts", detail: "Sales agent" },
  offers: { label: "Job offers to installers", detail: "Matching agent" },
  refunds: { label: "Refunds and payouts", detail: "Support and Finance agents" },
  lodging: { label: "DNSP and STC submissions", detail: "Delivery agent" },
  dispatch: { label: "VPP battery dispatch", detail: "Optimiser stays in its own safe mode" },
  records: { label: "Record changes", detail: "Leads, customers, tasks, notes, files" },
  scheduling: { label: "Bookings", detail: "Consultations, installs, service visits" },
  workflows: { label: "Workflows", detail: "Multi-step templates" },
  memory: { label: "AI memory", detail: "Facts and summaries" },
} as const;
export type ActionFamily = keyof typeof ACTION_FAMILIES;

export type ActionDef<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  kind: ActionKind;
  family: ActionFamily;
  sensitivity: Sensitivity;
  description: string;
  input: S;
};

const recordTypeEnum = z.enum(Object.keys(RECORD_TYPES) as [string, ...string[]]);

export const MessageChannel = z.enum(["email", "sms", "portal"]);

export const ACTIONS = {
  search_records: {
    name: "search_records",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description:
      "Find records of one type (lead, customer, design, product, appointment, task, note, document) using filters. Returns at most `limit` records the caller is allowed to see.",
    input: z.object({
      type: recordTypeEnum,
      filter: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
      limit: z.number().int().min(1).max(50).default(10),
    }),
  },
  get_record: {
    name: "get_record",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description: "Read one record by type and id, with its AI summary and confirmed facts.",
    input: z.object({ record: RecordRef }),
  },
  search_memory: {
    name: "search_memory",
    kind: "read",
    family: "memory",
    sensitivity: "low",
    description:
      "Search past conversations, notes, transcripts and facts for text relevant to a question. Results are limited to records the caller may see.",
    input: z.object({ query: z.string().min(2), subjects: z.array(RecordRef).default([]), limit: z.number().int().min(1).max(8).default(5) }),
  },
  create_record: {
    name: "create_record",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description: "Create a record of the given type with the given fields.",
    input: z.object({ type: recordTypeEnum, fields: z.record(z.unknown()) }),
  },
  update_record: {
    name: "update_record",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description: "Change fields on an existing record. Agents may only change fields marked AI-writable for that type.",
    input: z.object({ record: RecordRef, fields: z.record(z.unknown()) }),
  },
  link_records: {
    name: "link_records",
    kind: "write",
    family: "records",
    sensitivity: "low",
    description: "Link one record to another, e.g. a document to a lead.",
    input: z.object({ from: RecordRef, to: RecordRef }),
  },
  list_files: {
    name: "list_files",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description:
      "List documents and photos on a customer or lead, optionally filtered by slot or AI label (meter, switchboard, inverter, isolator, array, roof, serial_plate, before_clean, after_clean, electricity_bill, licence).",
    input: z.object({
      record: RecordRef,
      slot: z.string().optional(),
      label: z.string().optional(),
      latest_only: z.boolean().default(true),
    }),
  },
  get_file_link: {
    name: "get_file_link",
    kind: "read",
    family: "records",
    sensitivity: "medium",
    description: "Get a time-limited download link for a file.",
    input: z.object({ file: RecordRef, expires_in_hours: z.number().int().min(1).max(168).default(168) }),
  },
  send_message: {
    name: "send_message",
    kind: "send",
    family: "messages",
    sensitivity: "high",
    description:
      "Send an email, SMS or portal message, optionally with files, to anyone on record: a customer, lead, portal user (installer or staff) or partner (retailer, DNSP, supplier). `to` is always a record; the platform looks up the contact details, so raw addresses are never accepted. Files are checked for type, size and malware before sending.",
    input: z.object({
      to: z.object({ record: RecordRef }),
      channel: z.array(MessageChannel).min(1),
      purpose: z.enum(["transactional", "marketing"]).default("transactional"),
      subject: z.string().max(140).optional(),
      body: z.string().min(1).max(4000),
      files: z.array(RecordRef).max(20).default([]),
      /** Send files as email attachments instead of links (partners that require it get attachments anyway). */
      attach: z.boolean().default(false),
      /** Why this recipient gets it, e.g. "customer", "retailer" (shown in delivery history). */
      role: z.string().max(40).optional(),
      /** The project this message is about, so it shows in that project's history. */
      about: RecordRef.optional(),
      reason: z.string().min(3),
    }),
  },
  place_call: {
    name: "place_call",
    kind: "send",
    family: "messages",
    sensitivity: "high",
    description: "Place an outbound call to a person on file through the distributor line.",
    input: z.object({
      to: z.object({ record: RecordRef }),
      purpose: z.enum(["operational", "marketing"]),
      reason: z.string().min(3),
    }),
  },
  schedule: {
    name: "schedule",
    kind: "write",
    family: "scheduling",
    sensitivity: "medium",
    description: "Book, move or cancel an appointment, or list availability.",
    input: z.object({
      mode: z.enum(["book", "move", "cancel", "availability"]),
      appointment: RecordRef.optional(),
      fields: z.record(z.unknown()).default({}),
    }),
  },
  create_task: {
    name: "create_task",
    kind: "write",
    family: "records",
    sensitivity: "low",
    description: "Hand a piece of work to a person: title, details, due date and the record it is about.",
    input: z.object({
      title: z.string().min(3).max(200),
      details: z.string().max(4000).default(""),
      due: z.string().optional(),
      about: RecordRef.optional(),
      assignee_id: z.string().optional(),
    }),
  },
  start_workflow: {
    name: "start_workflow",
    kind: "write",
    family: "workflows",
    sensitivity: "medium",
    description: "Start a saved workflow template by name with inputs.",
    input: z.object({ template: z.string().min(2), inputs: z.record(z.unknown()).default({}) }),
  },
  assign_installer: {
    name: "assign_installer",
    kind: "write",
    family: "offers",
    sensitivity: "high",
    description:
      "Assign an installer to a customer's project (customer or lead), replacing the current one or adding a second. Staff do it directly; a customer or installer asking for it sends the request to EasyLink staff. The new installer sees the project's full history; the previous one stops seeing it.",
    input: z.object({
      project: RecordRef,
      installer: RecordRef,
      mode: z.enum(["replace", "add"]).default("replace"),
      reason: z.string().min(3).max(500),
      notify: z.boolean().default(true),
    }),
  },
  find_contact: {
    name: "find_contact",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description:
      "Find the right email for an organisation that isn't on file (an electricity retailer, DNSP, supplier) by searching its own website, following EasyLink's contact rules. Saves it as an unverified partner and returns it; the first send to it waits for a staff OK.",
    input: z.object({
      organisation: z.string().min(2).max(120),
      kind: z.enum(["retailer", "dnsp", "supplier", "other"]),
      purpose: z.string().max(300).default(""),
      about: RecordRef.optional(),
    }),
  },
  draft_invoice: {
    name: "draft_invoice",
    kind: "write",
    family: "quotes",
    sensitivity: "medium",
    description:
      "Draft a tax invoice on a job when an installer or staff member asks (e.g. 'invoice Daniel for the switchboard upgrade'). Lines are ex GST with a GST flag. It is only a draft: the installer checks it and presses Send.",
    input: z.object({
      job: z.string().min(1).describe("The job id (the lead id)"),
      kind: z.enum(["deposit", "final", "variation", "other"]).default("variation"),
      lines: z.array(z.object({ description: z.string().min(1).max(200), qty: z.number().positive(), unitExGst: z.number(), gst: z.boolean().default(true) })).min(1).max(30),
      notes: z.string().max(1000).default(""),
      dueDays: z.number().int().min(0).max(90).default(7),
    }),
  },
  write_fact: {
    name: "write_fact",
    kind: "write",
    family: "memory",
    sensitivity: "low",
    description:
      "Save a short, durable fact about a record (e.g. 'dog on site, call ahead'). Never store health conditions; store only the handling instruction.",
    input: z.object({
      about: RecordRef,
      statement: z.string().min(3).max(300),
      confidence: z.number().min(0).max(1).default(0.8),
    }),
  },
  request_approval: {
    name: "request_approval",
    kind: "meta",
    family: "records",
    sensitivity: "low",
    description: "Ask a person a question or for approval when the agent cannot proceed safely.",
    input: z.object({ question: z.string().min(5), about: RecordRef.optional() }),
  },
} satisfies Record<string, ActionDef>;

export type ActionName = keyof typeof ACTIONS;
export type ActionInput<N extends ActionName> = z.infer<(typeof ACTIONS)[N]["input"]>;

export function isActionName(name: string): name is ActionName {
  return name in ACTIONS;
}

/** Bedrock Converse toolSpec for an action (spec 7.5). */
export function toolSpecFor(name: ActionName, allowedRecordTypes?: string[]) {
  const def = ACTIONS[name];
  const schema = zodToJsonSchema(def.input) as Record<string, unknown>;
  if (allowedRecordTypes) restrictRecordTypes(schema, allowedRecordTypes);
  return { toolSpec: { name: def.name, description: def.description, inputSchema: { json: schema } } };
}

function restrictRecordTypes(schema: Record<string, unknown>, allowed: string[]) {
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.enum) && n.enum.every((v) => typeof v === "string" && v in RECORD_TYPES)) {
      n.enum = (n.enum as string[]).filter((v) => allowed.includes(v));
    }
    for (const v of Object.values(n)) walk(v);
  };
  walk(schema);
}

/** Minimal Zod → JSON Schema for the shapes used above (object, enum, string, number, boolean, array, record, union, optional, default). */
export function zodToJsonSchema(s: z.ZodTypeAny): unknown {
  const def = s._def as { typeName: string; [k: string]: unknown };
  switch (def.typeName) {
    case "ZodObject": {
      const shape = (s as z.ZodObject<z.ZodRawShape>).shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchema(v as z.ZodTypeAny);
        const t = (v as z.ZodTypeAny)._def.typeName;
        if (t !== "ZodOptional" && t !== "ZodDefault") required.push(k);
      }
      return { type: "object", properties, ...(required.length ? { required } : {}) };
    }
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return { type: "string", enum: [...(def.values as string[])] };
    case "ZodArray":
      return { type: "array", items: zodToJsonSchema(def.type as z.ZodTypeAny) };
    case "ZodRecord":
      return { type: "object", additionalProperties: zodToJsonSchema(def.valueType as z.ZodTypeAny) };
    case "ZodUnion":
      return { anyOf: (def.options as z.ZodTypeAny[]).map(zodToJsonSchema) };
    case "ZodOptional":
      return zodToJsonSchema(def.innerType as z.ZodTypeAny);
    case "ZodDefault": {
      const inner = zodToJsonSchema(def.innerType as z.ZodTypeAny) as Record<string, unknown>;
      return { ...inner, default: (def.defaultValue as () => unknown)() };
    }
    case "ZodUnknown":
    case "ZodAny":
      return {};
    case "ZodNullable":
      return zodToJsonSchema(def.innerType as z.ZodTypeAny);
    default:
      return {};
  }
}
