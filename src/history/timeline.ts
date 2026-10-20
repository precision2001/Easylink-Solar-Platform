import type { Backend } from "../backend/client.js";
import type { EventEnvelope, RecordRef } from "../core/envelope.js";
import { newId } from "../core/envelope.js";
import type { Store, TimelineItem } from "../store/types.js";

/**
 * Turns events into history lines (spec 8.8). Every event the platform sees is
 * offered here; the ones people care about become a line under every record
 * they concern: the customer, the lead, the document, the recipient. Lines are
 * written once and never edited.
 */
const pretty = (s: unknown) => String(s ?? "").replace(/_/g, " ");

type Line = Omit<TimelineItem, "id" | "at" | "actor" | "records" | "eventId"> & { extraRecords?: RecordRef[] };

function lineFor(evt: EventEnvelope): Line | null {
  const d = evt.data as Record<string, unknown>;
  switch (evt.type) {
    case "file.uploaded":
      return { kind: "file", title: `Uploaded ${pretty(d.fileName ?? "a file")}`, files: [{ id: evt.subject.id, name: d.fileName as string | undefined }], audience: "related" };
    case "file.classified": {
      const labels = (d.labels as { label: string }[] | undefined) ?? [];
      const fields = (d.fields as string[] | undefined) ?? [];
      if (!labels.length && !fields.includes("aiLabels")) return null;
      return { kind: "ai", title: `AI read the file${labels[0] ? `: ${pretty(labels[0].label)}` : ""}`, files: [{ id: evt.subject.id }], audience: "related" };
    }
    case "document.issue_found":
      return { kind: "warning", title: "Not sent: the file didn't pass the safety checks", detail: String(d.reason ?? ""), files: [{ id: evt.subject.id }], audience: "related" };
    case "document.delivered":
      return null; // the message line below carries it
    case "email.sent":
    case "sms.sent":
    case "message.sent": {
      const channel = evt.type === "email.sent" ? "email" : evt.type === "sms.sent" ? "SMS" : "the portal";
      const name = String(d.to_name ?? `${evt.subject.type}`);
      const files = Array.isArray(d.files) ? (d.files as unknown[]).map((f) => (typeof f === "string" ? { id: f } : (f as { id: string; name?: string }))) : [];
      return {
        kind: "message",
        title: `Sent to ${name}${d.role ? ` (${pretty(d.role)})` : ""} by ${channel}${files.length ? ` with ${files.length} file${files.length > 1 ? "s" : ""}` : ""}`,
        detail: d.subject ? String(d.subject) : undefined,
        files,
        messageId: d.message_copy_id as string | undefined,
        audience: "related",
        extraRecords: Array.isArray(d.records) ? (d.records as RecordRef[]) : [],
      };
    }
    case "message.delivered":
    case "message.opened":
    case "message.bounced":
    case "message.failed":
      return {
        kind: evt.type === "message.bounced" || evt.type === "message.failed" ? "warning" : "message",
        title: `Message ${evt.type.split(".")[1]}${d.to_name ? ` (${d.to_name})` : ""}`,
        detail: d.reason ? String(d.reason) : undefined,
        messageId: d.message_copy_id as string | undefined,
        audience: "related",
        extraRecords: Array.isArray(d.records) ? (d.records as RecordRef[]) : [],
      };
    case "file.downloaded":
      return { kind: "file", title: `Opened ${pretty(d.fileName ?? "a file")}${d.by_name ? ` (${d.by_name})` : ""}`, files: [{ id: evt.subject.id, name: d.fileName as string | undefined }], audience: "related" };
    case "installer.assigned":
      return { kind: "assignment", title: `${d.installer_name ?? "An installer"} assigned`, detail: d.reason ? String(d.reason) : undefined, audience: "related", extraRecords: [{ type: "user", id: String(d.installer_id) }] };
    case "installer.unassigned":
      return { kind: "assignment", title: `${d.installer_name ?? "Previous installer"} no longer assigned`, audience: "related" };
    case "installer.change_requested":
      return { kind: "assignment", title: "Asked EasyLink for a different installer", detail: d.reason ? String(d.reason) : undefined, audience: "related" };
    case "job.progressed":
      return { kind: String(d.kind ?? "record"), title: String(d.title ?? "Job updated"), detail: d.detail ? String(d.detail) : undefined, audience: d.audience === "staff" ? "staff" : "related" };
    case "lead.created":
      return { kind: "record", title: "Enquiry received", audience: "related" };
    case "lead.updated":
    case "lead.qualified":
    case "lead.lost": {
      const fields = (d.fields as string[] | undefined) ?? [];
      return { kind: "record", title: evt.type === "lead.qualified" ? "Project qualified" : evt.type === "lead.lost" ? "Project closed" : `Project updated${fields.length ? `: ${fields.join(", ")}` : ""}`, audience: "related" };
    }
    case "lead.converted":
    case "customer.created":
      return { kind: "record", title: "Customer account created", audience: "related" };
    case "appointment.booked":
    case "appointment.moved":
    case "appointment.cancelled":
      return { kind: "booking", title: `Appointment ${evt.type.split(".")[1]}`, detail: d.startsAt ? String(d.startsAt) : undefined, audience: "related" };
    case "call.transcribed":
      return { kind: "call", title: "Phone call", detail: d.summary ? String(d.summary).slice(0, 300) : undefined, audience: "related" };
    case "ai.proposed":
      return { kind: "approval", title: "Waiting for an EasyLink approval", detail: d.action ? pretty(d.action) : undefined, audience: "related" };
    case "ai.corrected":
      return { kind: "approval", title: "EasyLink declined an AI proposal", detail: d.reason ? String(d.reason) : undefined, audience: "staff" };
    case "ai.escalated":
      return { kind: "approval", title: "Question for EasyLink staff", audience: "staff" };
    default:
      return null;
  }
}

export class TimelineWriter {
  private names = new Map<string, string>();
  constructor(private deps: { store: Store; backend: Backend; serviceToken: string }) {}

  private async name(kind: string, id: string): Promise<string | undefined> {
    if (kind === "agent") return "EasyLink AI";
    if (kind === "system" || kind === "integration") return "EasyLink";
    if (kind === "visitor") return "Website visitor";
    if (this.names.has(id)) return this.names.get(id);
    const r = await this.deps.backend.get("user", id, { token: this.deps.serviceToken }).catch(() => null);
    const n = r?.data ? [r.data.firstName, r.data.lastName].filter(Boolean).join(" ") || String(r.data.name ?? "") : "";
    if (n) this.names.set(id, n);
    return n || undefined;
  }

  /** The project a record belongs to, so a document's line also shows on its customer. */
  private async related(ref: RecordRef): Promise<RecordRef[]> {
    if (ref.type !== "document" && ref.type !== "appointment" && ref.type !== "task" && ref.type !== "note") return [];
    const r = await this.deps.backend.get(ref.type, ref.id, { token: this.deps.serviceToken }).catch(() => null);
    const out: RecordRef[] = [];
    if (r?.data?.customerId) out.push({ type: "customer", id: String(r.data.customerId) });
    if (r?.data?.leadId) out.push({ type: "lead", id: String(r.data.leadId) });
    return out;
  }

  async index(evt: EventEnvelope): Promise<TimelineItem | null> {
    const line = lineFor(evt);
    if (!line) return null;
    const { extraRecords = [], ...rest } = line;
    const records: RecordRef[] = [evt.subject, ...evt.links, ...extraRecords];
    for (const r of [...records]) records.push(...(await this.related(r)));
    for (const f of rest.files ?? []) records.push(...(await this.related({ type: "document", id: f.id })));
    const uniq = records.filter((r, i) => r?.id && records.findIndex((x) => x.type === r.type && x.id === r.id) === i);
    const item: TimelineItem = {
      ...rest,
      id: newId("tl_"),
      at: evt.occurred_at,
      actor: { kind: evt.principal.kind, id: evt.principal.id, name: await this.name(evt.principal.kind, evt.principal.id) },
      records: uniq,
      eventId: evt.event_id,
    };
    await this.deps.store.putTimeline(item);
    return item;
  }
}
