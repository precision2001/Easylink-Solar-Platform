import type { ActionFamily, ActionName } from "../core/actions.js";
import type { RecordRef } from "../core/envelope.js";
import type { FileLabels } from "../store/types.js";
import { matchesName } from "../contacts/finder.js";

/**
 * Saved workflow templates (spec 9). A template is a short list of generic
 * actions; each step still goes through policy and autonomy, so a workflow can
 * never do more than its caller could do step by step.
 */
export type WorkflowStep = { id: string; action: ActionName; input: Record<string, unknown>; optional?: boolean };
/** Read-only helpers a template may use to resolve who and what (service account; nothing is returned to the caller). */
export type WorkflowContext = {
  get(ref: RecordRef): Promise<Record<string, unknown> | null>;
  list(type: string, filter: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  fileProfiles(ids: string[]): Promise<FileLabels[]>;
};
export type WorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  family?: ActionFamily;
  steps: (inputs: Record<string, unknown>, ctx: WorkflowContext) => WorkflowStep[] | Promise<WorkflowStep[]>;
};

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
  deliver_documents: {
    id: "deliver_documents",
    title: "Store and send documents",
    description:
      "Send documents to the people and organisations that need them: the customer, their electricity retailer, the installer, the DNSP or any record. Files are already saved and linked; this sends them and records who got what.",
    steps: (i, ctx) => deliverSteps(i, ctx),
  },
  job_completion_pack: {
    id: "job_completion_pack",
    title: "Job completion pack",
    description: "When an install is finished: send the completion documents to the customer and their retailer, then mark the job complete.",
    steps: async (i, ctx) => {
      const about = ref(i.about ?? i.customer);
      let documents = (i.documents as RecordRef[] | undefined) ?? [];
      if (!documents.length) {
        // Every completion document on the job that hasn't gone out yet.
        const files = await ctx.list("document", { [about.type === "lead" ? "leadId" : "customerId"]: about.id });
        const profiles = await ctx.fileProfiles(files.map((f) => String(f.id)));
        documents = profiles
          .filter((p) => (p.routes?.length ?? 0) > 0 && !(p.deliveredTo?.length))
          .map((p) => ({ type: "document", id: p.documentId }));
      }
      const steps = await deliverSteps({ ...i, about, documents, to: i.to ?? ["customer", "retailer"] }, ctx);
      const customer = about.type === "customer" ? await ctx.get(about) : null;
      const lead = about.type === "lead" ? about.id : (customer?.leadId as string | undefined);
      if (lead) steps.push({ id: "complete", action: "update_record", optional: true, input: { record: { type: "lead", id: String(lead) }, fields: { projectPhase: "COMPLETED" } } });
      return steps;
    },
  },
};

const BODY: Record<string, (who: string, site: string, names: string) => { subject: string; body: string }> = {
  customer: (who, site, names) => ({
    subject: "Your solar installation documents",
    body: `Hi ${who},\n\nYour installation documents are ready: ${names}. They are also saved in your EasyLink portal under Documents.\n\nThanks for choosing EasyLink Solar.`,
  }),
  retailer: (_who, site, names) => ({
    subject: `Solar installation documents – ${site}`,
    body: `Hello,\n\nPlease find attached the documents for the solar installation at ${site}: ${names}.\n\nRegards,\nEasyLink Solar`,
  }),
  installer: (who, site, names) => ({ subject: `Documents – ${site}`, body: `Hi ${who},\n\nDocuments for ${site}: ${names}.` }),
  other: (_who, site, names) => ({ subject: `Documents – ${site}`, body: `Hello,\n\nDocuments for ${site}: ${names}.\n\nEasyLink Solar` }),
};

/** Resolve each requested recipient to a record, then one send per recipient. */
async function deliverSteps(i: Record<string, unknown>, ctx: WorkflowContext): Promise<WorkflowStep[]> {
  const about = ref(i.about);
  const documents = ((i.documents as RecordRef[] | undefined) ?? []).filter((d) => d?.id);
  if (!documents.length) return [{ id: "nothing", action: "request_approval", optional: true, input: { question: "There were no documents to send for this job.", about } }];
  const subject = await ctx.get(about);
  const customer = about.type === "customer" ? subject : subject?.customerId ? await ctx.get({ type: "customer", id: String(subject.customerId) }) : null;
  const site = String(customer?.address ?? subject?.address ?? "the site");
  const profiles = await ctx.fileProfiles(documents.map((d) => d.id));
  const names = profiles.map((p) => (p.labels[0]?.label ?? "document").replace(/_/g, " ")).join(", ") || `${documents.length} documents`;
  const wanted = (i.to as (string | RecordRef)[] | undefined) ?? Array.from(new Set(profiles.flatMap((p) => p.routes ?? [])));

  const steps: WorkflowStep[] = [];
  for (const w of wanted as (string | RecordRef | { organisation: string; kind?: string })[]) {
    let to: RecordRef | null = null;
    let organisation: string | null = null;
    let role = typeof w === "string" ? w : "organisation" in w ? w.kind ?? "other" : w.type;
    if (typeof w !== "string" && "organisation" in w) {
      // A named organisation ("send it to Origin"): on file if we have it, else found by the AI.
      const known = (await ctx.list("partner", {})).find((p) => matchesName(w.organisation, p));
      to = known ? { type: "partner", id: String(known.id) } : null;
      organisation = to ? null : w.organisation;
    } else if (typeof w !== "string") to = w as RecordRef;
    else if (w === "customer") to = customer ? { type: "customer", id: String(customer.id) } : about.type === "lead" ? about : null;
    else if (w === "installer") {
      const inst = profiles.flatMap((p) => p.links ?? []).find((l) => l.type === "user");
      to = inst ?? (subject?.assignedToId ? { type: "user", id: String(subject.assignedToId) } : null);
    } else if (w === "retailer" || w === "dnsp") {
      const r = await findPartner(ctx, w, customer, documents);
      to = r.ref;
      organisation = r.ref ? null : r.name;
    }

    const send = (target: RecordRef | { $step: string; path: string }, isPartner: boolean, who: string, stepRole: string): WorkflowStep => {
      const t = (BODY[stepRole] ?? BODY.other!)(who, site, names);
      return {
        id: `send-${stepRole}-${"id" in target ? target.id : target.$step}`,
        action: "send_message",
        optional: true,
        input: {
          to: { record: target },
          channel: isPartner ? ["email"] : ["portal", "email"],
          purpose: "transactional",
          subject: t.subject,
          body: i.note ? `${t.body}\n\n${String(i.note).slice(0, 1000)}` : t.body,
          files: documents,
          attach: isPartner,
          role: stepRole,
          reason: `Job documents for ${site} (${names})`,
        },
      };
    };

    if (!to && organisation) {
      // Not on file: find the right address on the organisation's own website (contact rules), then send.
      const findId = `find-${role}`;
      steps.push({ id: findId, action: "find_contact", optional: true, input: { organisation, kind: ["retailer", "dnsp", "supplier"].includes(role) ? role : "other", purpose: `documents for ${site}: ${names}`, about } });
      steps.push(send({ $step: findId, path: "partner" }, true, "there", role));
      continue;
    }
    if (!to) {
      steps.push({
        id: `missing-${role}`,
        action: "request_approval",
        optional: true,
        input: { question: `Which ${role} should receive ${names} for ${site}? It isn't on the customer record or their electricity bill.`, about },
      });
      continue;
    }
    const rec = await ctx.get(to);
    if (to.type === "partner") role = String(rec?.kind ?? role);
    const who = String(rec?.firstName ?? rec?.name ?? rec?.customerName ?? "there");
    steps.push(send(to, to.type === "partner", who, role));
  }
  return steps;
}

/** Retailer or DNSP for the customer: the partner on the record, else by name, else the retailer read from their electricity bill. */
async function findPartner(ctx: WorkflowContext, kind: string, customer: Record<string, unknown> | null, documents: RecordRef[]): Promise<{ ref: RecordRef | null; name: string | null }> {
  const idField = kind === "dnsp" ? "dnspPartnerId" : "retailerPartnerId";
  if (customer?.[idField]) return { ref: { type: "partner", id: String(customer[idField]) }, name: null };
  let name = String(customer?.[kind] ?? customer?.[kind === "dnsp" ? "dnspName" : "retailerName"] ?? "");
  if (!name && customer?.id) {
    const files = await ctx.list("document", { customerId: customer.id });
    const profiles = await ctx.fileProfiles([...files.map((f) => String(f.id)), ...documents.map((d) => d.id)]);
    name = profiles.map((p) => p.extracted?.[kind === "dnsp" ? "dnsp" : "retailer"]).find(Boolean) ?? "";
  }
  if (!name) return { ref: null, name: null };
  const hit = (await ctx.list("partner", { kind })).find((p) => matchesName(name, p));
  return { ref: hit ? { type: "partner", id: String(hit.id) } : null, name };
}
