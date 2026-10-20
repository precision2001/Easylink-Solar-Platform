import type { ActionFamily, ActionName } from "../core/actions.js";
import type { RecordRef } from "../core/envelope.js";

/**
 * Saved workflow templates (spec 9). A template is a short list of generic
 * actions; each step still goes through policy and autonomy, so a workflow can
 * never do more than its caller could do step by step.
 */
export type WorkflowStep = { id: string; action: ActionName; input: Record<string, unknown>; optional?: boolean };
export type WorkflowTemplate = { id: string; title: string; description: string; family?: ActionFamily; steps: (inputs: Record<string, unknown>) => WorkflowStep[] };

const ref = (v: unknown): RecordRef => v as RecordRef;

export const WORKFLOWS: Record<string, WorkflowTemplate> = {
  request_missing_photos: {
    id: "request_missing_photos",
    title: "Request missing photos",
    description: "Ask the customer (or installer) to upload photos for slots that are still empty, and track it as a task.",
    steps: (i) => {
      const to = ref(i.to ?? i.customer);
      const slots = (i.slots as string[] | undefined) ?? ["meter", "switchboard"];
      const pretty = slots.map((s) => s.replace(/_/g, " ")).join(", ");
      return [
        {
          id: "message",
          action: "send_message",
          input: {
            to: { record: to },
            channel: ["sms", "email"],
            purpose: "transactional",
            subject: "Photos needed for your solar installation",
            body: `Hi, to keep your installation on track we need photos of: ${pretty}. You can upload them in your EasyLink portal under Documents.`,
            reason: `Missing photo slots: ${pretty}`,
          },
        },
        {
          id: "task",
          action: "create_task",
          optional: true,
          input: {
            title: `Chase photos: ${pretty}`,
            details: "Created by the request_missing_photos workflow. Close when the photos arrive.",
            about: to,
            due: i.due,
          },
        },
      ];
    },
  },
  lead_intake: {
    id: "lead_intake",
    title: "Lead intake",
    description: "Qualify a new lead: mark it contacted, record the summary as a fact and hand a follow-up to sales.",
    steps: (i) => {
      const lead = ref(i.lead);
      return [
        { id: "status", action: "update_record", input: { record: lead, fields: { status: "CONTACTED" } } },
        ...(i.summary
          ? [{ id: "fact", action: "write_fact" as const, input: { about: lead, statement: String(i.summary).slice(0, 300), confidence: 0.9 }, optional: true }]
          : []),
        {
          id: "task",
          action: "create_task",
          input: { title: "Follow up new lead", details: String(i.summary ?? ""), about: lead, assignee_id: i.assignee_id },
        },
      ];
    },
  },
  lead_to_customer: {
    id: "lead_to_customer",
    title: "Convert lead to customer record",
    description: "Write a qualified lead as a customer record and link the two.",
    steps: (i) => {
      const lead = ref(i.lead);
      const f = (i.fields as Record<string, unknown>) ?? {};
      return [
        { id: "create", action: "create_record", input: { type: "customer", fields: { ...f, leadId: lead.id } } },
        { id: "status", action: "update_record", input: { record: lead, fields: { status: "QUALIFIED" } }, optional: true },
      ];
    },
  },
};
