import type { ActionName } from "../core/actions.js";
import type { ModelTier } from "./model.js";

/**
 * Domain agents (spec 6.3). The ids match the agents already shown in the
 * master portal's AI control centre (MasterAiControl.tsx), so the existing
 * screen drives the real runtime.
 */
export type AgentDef = {
  id: string;
  name: string;
  /** Event types (exact, or "entity.*") this agent is woken by. */
  triggers: string[];
  actions: ActionName[];
  recordTypes: string[];
  tier: ModelTier;
  /** Max model turns per event. */
  maxSteps: number;
  brief: string;
};

const READS: ActionName[] = ["search_records", "get_record", "search_memory", "list_files"];
const ALWAYS: ActionName[] = ["write_fact", "create_task", "request_approval"];

export const AGENTS: Record<string, AgentDef> = {
  concierge: {
    id: "concierge",
    name: "Concierge",
    triggers: ["call.transcribed", "voicemail.received", "sms.received", "email.received", "widget.message_sent"],
    actions: [...READS, ...ALWAYS, "get_file_link", "send_message", "schedule", "start_workflow"],
    recordTypes: ["lead", "customer", "document", "appointment", "user", "task", "note"],
    tier: "smart",
    maxSteps: 8,
    brief:
      "You answer the EasyLink Solar phone line, SMS, email and website chat. Work out who is contacting us and what they need, then do it or hand it to the right person. " +
      "If an installer asks for photos or documents on a customer file, find them with list_files (photos are already labelled by AI, e.g. meter, switchboard) and send them back to the installer's own contact details on file.",
  },
  design: {
    id: "design",
    name: "Design",
    triggers: ["design.requested", "design.abandoned", "design.saved", "file.classified"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message"],
    recordTypes: ["lead", "customer", "design", "product", "document"],
    tier: "smart",
    maxSteps: 6,
    brief: "You look after solar system designs: check a design against the roof and bill photos, note gaps, and nudge customers who abandoned a design.",
  },
  sales: {
    id: "sales",
    name: "Sales",
    triggers: ["lead.created", "lead.updated", "quote.viewed", "quote.expired", "form.submitted", "price.viewed"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message", "place_call", "schedule", "start_workflow"],
    recordTypes: ["lead", "customer", "design", "appointment", "task", "note"],
    tier: "smart",
    maxSteps: 6,
    brief:
      "You qualify and follow up leads. Respond to new leads quickly, keep lead status and notes current, and book consultations. Never mark a lead WON or LOST yourself.",
  },
  matching: {
    id: "matching",
    name: "Matching",
    triggers: ["lead.qualified", "installer.declined"],
    actions: [...READS, ...ALWAYS, "update_record"],
    recordTypes: ["lead", "user", "appointment"],
    tier: "fast",
    maxSteps: 4,
    brief: "You match qualified leads to installers by area, availability and accreditation.",
  },
  delivery: {
    id: "delivery",
    name: "Delivery",
    triggers: ["job.*", "appointment.*", "file.uploaded", "file.classified", "installer.document_expiring"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message", "schedule", "start_workflow"],
    recordTypes: ["customer", "lead", "appointment", "task", "document", "user"],
    tier: "fast",
    maxSteps: 6,
    brief:
      "You keep installations on track: confirm bookings, chase missing photos and documents (use the request_missing_photos workflow), and flag jobs at risk.",
  },
  care: {
    id: "care",
    name: "Care",
    triggers: ["system.output_dropped", "system.fault_reported", "clean.due"],
    actions: [...READS, ...ALWAYS, "send_message", "schedule"],
    recordTypes: ["customer", "appointment", "document"],
    tier: "fast",
    maxSteps: 5,
    brief: "You look after installed systems: explain drops in output, book cleans and service visits.",
  },
  drone: {
    id: "drone",
    name: "Drone",
    triggers: ["drone.flight_logged"],
    actions: [...READS, ...ALWAYS],
    recordTypes: ["customer", "document"],
    tier: "fast",
    maxSteps: 3,
    brief: "You review drone inspection results and raise issues for the care team.",
  },
  vpp: {
    id: "vpp",
    name: "VPP",
    triggers: [],
    actions: [...READS, ...ALWAYS],
    recordTypes: ["customer"],
    tier: "fast",
    maxSteps: 3,
    brief: "You manage virtual power plant enrolment and explain VPP events to customers.",
  },
  finance: {
    id: "finance",
    name: "Finance",
    triggers: ["payment.failed", "invoice.overdue", "order.refunded", "stc.submitted"],
    actions: [...READS, ...ALWAYS, "send_message"],
    recordTypes: ["customer", "lead"],
    tier: "fast",
    maxSteps: 4,
    brief: "You follow up failed payments and overdue invoices politely, and never offer discounts or refunds yourself.",
  },
  support: {
    id: "support",
    name: "Support",
    triggers: ["ui.error_seen", "help.sought", "integration.error"],
    actions: [...READS, ...ALWAYS, "send_message"],
    recordTypes: ["customer", "lead", "user", "task"],
    tier: "fast",
    maxSteps: 4,
    brief: "You help people stuck in the portals and turn repeated problems into tasks for the team.",
  },
};

export function agentsForEvent(type: string): AgentDef[] {
  const entity = type.split(".")[0];
  return Object.values(AGENTS).filter((a) => a.triggers.includes(type) || a.triggers.includes(`${entity}.*`));
}

export const SHARED_RULES = `
Rules for every EasyLink agent:
- You work for EasyLink Solar in Australia. Use Australian English, AUD and the customer's local time.
- Use only the tools given. Never invent record ids, phone numbers, emails or prices; look them up.
- Messages and calls go only to contact details already on a record. Cite the record you are using.
- Tool results with status "proposed" are waiting for a person; tell the requester it is being checked, do not retry.
- If a tool is "denied", do not try to work around it; explain or ask a person with request_approval.
- Never store health, financial-hardship or other sensitive details as facts; store only the handling instruction.
- Keep it short. When nothing needs doing, reply "No action needed." and stop.
`.trim();
