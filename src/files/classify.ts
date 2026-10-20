import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { EventEnvelope, Principal } from "../core/envelope.js";
import type { ActionService } from "../actions/service.js";
import type { Backend } from "../backend/client.js";
import type { ModelClient } from "../ai/model.js";
import type { Store } from "../store/types.js";
import { newId, type RecordRef } from "../core/envelope.js";

/**
 * Photo and document labelling at upload (spec 11.2). Whatever the uploader
 * picks (or doesn't), the AI labels the file, reads what it can (meter number,
 * serial plates, bill NMI) and writes the result onto the document record.
 * Nobody ticks a checkbox; people only see the low-confidence ones.
 */
export const FILE_LABELS = [
  "meter",
  "switchboard",
  "inverter",
  "isolator",
  "array",
  "roof",
  "serial_plate",
  "battery",
  "before_clean",
  "after_clean",
  "electricity_bill",
  "licence",
  "compliance_certificate",
  "site_photo",
  // documents
  "proof_of_completion",
  "site_report",
  "electrical_safety_certificate",
  "commissioning_sheet",
  "stc_assignment_form",
  "signed_contract",
  "warranty",
  "invoice",
  "quote",
  "other_document",
  "other",
] as const;

/**
 * Who each kind of document normally goes to (suggestions shown on the record;
 * people can send any document to anyone on record). Staff can override this
 * with a "config/document_routes" record.
 */
export const DEFAULT_ROUTES: Partial<Record<(typeof FILE_LABELS)[number], string[]>> = {
  proof_of_completion: ["customer", "retailer"],
  electrical_safety_certificate: ["customer", "retailer"],
  compliance_certificate: ["customer", "retailer"],
  site_report: ["customer"],
  commissioning_sheet: ["customer"],
  signed_contract: ["customer"],
  warranty: ["customer"],
  invoice: ["customer"],
  quote: ["customer"],
};

export type FileLabel = { label: (typeof FILE_LABELS)[number]; confidence: number };
export type Classification = { labels: FileLabel[]; extracted: Record<string, string>; description: string; issues: string[] };

export type RawFile = { bytes: Uint8Array; contentType: string; fileName: string };

export interface FileBytes {
  /** Bytes and image format, or null when the file is not an image we can look at. */
  load(doc: Record<string, unknown>): Promise<{ format: "jpeg" | "png" | "webp"; bytes: Uint8Array } | null>;
  /** The whole file, for attachments, PDF reading and safety checks; null if missing or over `maxBytes`. */
  raw(doc: Record<string, unknown>, maxBytes: number): Promise<RawFile | null>;
}

const nameOf = (doc: Record<string, unknown>) => String(doc.fileName ?? doc.name ?? "file");
const typeOf = (doc: Record<string, unknown>) => String(doc.mimeType ?? "application/octet-stream");

export class S3FileBytes implements FileBytes {
  constructor(private bucket = process.env.FILES_BUCKET ?? "", private s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {}
  async load(doc: Record<string, unknown>) {
    const key = doc.s3Key as string | undefined;
    const format = imageFormat(String(doc.mimeType ?? doc.fileName ?? key ?? ""));
    if (!key || !format) return null;
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await r.Body?.transformToByteArray();
    return bytes && bytes.byteLength <= 3_750_000 ? { format, bytes } : null;
  }
  async raw(doc: Record<string, unknown>, maxBytes: number) {
    const key = doc.s3Key as string | undefined;
    if (!key) return null;
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if ((r.ContentLength ?? 0) > maxBytes) return null;
    const bytes = await r.Body?.transformToByteArray();
    return bytes ? { bytes, contentType: r.ContentType ?? typeOf(doc), fileName: nameOf(doc) } : null;
  }
}

/**
 * Today the portal stores uploads under the website's /uploads path (doc.url).
 * Until they move to S3, fetch them from the site. PUBLIC_SITE_URL is the site origin.
 */
export class UrlFileBytes implements FileBytes {
  constructor(private origin = process.env.PUBLIC_SITE_URL ?? "", private fetchImpl: typeof fetch = fetch) {}
  async load(doc: Record<string, unknown>) {
    const url = absoluteUrl(String(doc.url ?? doc.fileUrl ?? ""), this.origin);
    const format = imageFormat(String(doc.mimeType ?? doc.fileName ?? url));
    if (!url || !format) return null;
    const r = await this.fetchImpl(url);
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    return bytes.byteLength <= 3_750_000 ? { format, bytes } : null;
  }
  async raw(doc: Record<string, unknown>, maxBytes: number) {
    const url = absoluteUrl(String(doc.url ?? doc.fileUrl ?? ""), this.origin);
    if (!url) return null;
    const r = await this.fetchImpl(url);
    if (!r.ok || Number(r.headers.get("content-length") ?? 0) > maxBytes) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    return bytes.byteLength <= maxBytes ? { bytes, contentType: r.headers.get("content-type") ?? typeOf(doc), fileName: nameOf(doc) } : null;
  }
}

/** S3 when the document has an s3Key, otherwise the site URL. */
export class AnyFileBytes implements FileBytes {
  constructor(private s3 = new S3FileBytes(), private web = new UrlFileBytes()) {}
  load(doc: Record<string, unknown>) {
    return doc.s3Key ? this.s3.load(doc) : this.web.load(doc);
  }
  raw(doc: Record<string, unknown>, maxBytes: number) {
    return doc.s3Key ? this.s3.raw(doc, maxBytes) : this.web.raw(doc, maxBytes);
  }
}

export function absoluteUrl(u: string, origin: string): string {
  if (!u) return "";
  if (/^https?:\/\//.test(u)) return u;
  return origin ? `${origin.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}` : "";
}

export function documentFormat(nameOrMime: string): "pdf" | "docx" | "doc" | "xlsx" | "xls" | "csv" | "txt" | null {
  const s = nameOrMime.toLowerCase();
  if (/pdf/.test(s)) return "pdf";
  if (/wordprocessingml|\.docx$/.test(s)) return "docx";
  if (/msword|\.doc$/.test(s)) return "doc";
  if (/spreadsheetml|\.xlsx$/.test(s)) return "xlsx";
  if (/ms-excel|\.xls$/.test(s)) return "xls";
  if (/csv/.test(s)) return "csv";
  if (/text\/plain|\.txt$/.test(s)) return "txt";
  return null;
}

/** Street number and first street word match: "12 Wattle St, Blacktown" ~ "12 Wattle Street Blacktown NSW". */
export function sameAddress(a: string, b: string): boolean {
  const key = (x: string) => {
    const m = x.toLowerCase().match(/(\d+[a-z]?)\s+([a-z]+)/);
    return m ? `${m[1]} ${m[2]}` : x.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  };
  return key(a) === key(b);
}

export function imageFormat(nameOrMime: string): "jpeg" | "png" | "webp" | null {
  const s = nameOrMime.toLowerCase();
  if (/jpe?g/.test(s)) return "jpeg";
  if (/png/.test(s)) return "png";
  if (/webp/.test(s)) return "webp";
  return null;
}

const SYSTEM_PROMPT = `You label photos and documents uploaded to an Australian solar installer's job files.
Return ONLY JSON: {"labels":[{"label":<one of ${FILE_LABELS.join(", ")}>,"confidence":0..1}],"extracted":{...},"issues":[...],"description":"<one sentence>"}.
Put the best label first. "electrical_safety_certificate" covers the state certificates (CCEW in NSW, COES in VIC, Certificate of Testing and Safety in QLD, and the equivalents elsewhere).
In "extracted" include only values you can read clearly, using these keys when present:
meter_number, nmi, serial_number, inverter_serial, panel_count, make, model, kw_rating, system_kw, retailer, bill_period,
site_address, completion_date, installer_name, installer_licence, certificate_number, signed_by_customer (yes/no), signed_by_installer (yes/no),
licence_number, licence_expiry.
In "issues" list problems a reviewer would send back: missing signatures, blank required fields, unreadable pages, a date in the future. Empty if none.
Do not describe people. If a photo shows a person's face or a licence, do not copy personal details other than licence_number and licence_expiry.`;

export const AUTO_CONFIDENCE = 0.7;

export class FileClassifier {
  constructor(
    private deps: { model: ModelClient; backend: Backend; actions: ActionService; store: Store; bytes: FileBytes; serviceToken: string },
    private principal: Principal = { kind: "system", id: "file-classifier", roles: ["SYSTEM"], on_behalf_of: null },
  ) {}

  async classify(evt: EventEnvelope): Promise<Classification | null> {
    if (evt.subject.type !== "document") return null;
    const svc = { token: this.deps.serviceToken };
    const doc = await this.deps.backend.get("document", evt.subject.id, svc);
    if (!doc.ok || !doc.data) return null;
    const d = doc.data;
    const image = await this.deps.bytes.load(d).catch(() => null);
    const name = String(d.fileName ?? "");
    const docFormat = !image ? documentFormat(String(d.mimeType ?? name)) : null;
    const raw = docFormat ? await this.deps.bytes.raw(d, 4_500_000).catch(() => null) : null;
    const hint = [name, d.category, evt.data.slot].filter(Boolean).join(" | ");

    const turn = await this.deps.model.converse({
      tier: "fast",
      system: SYSTEM_PROMPT,
      maxTokens: 700,
      messages: [
        {
          role: "user",
          image: image ?? undefined,
          document: raw && docFormat ? { format: docFormat, name, bytes: raw.bytes } : undefined,
          text: `File: ${hint || "(no name)"}${image || raw ? "" : "\n(Contents not available; label from the name only.)"}`,
        },
      ],
    });
    const c = parseClassification(turn.text);
    if (!c) return null;

    // Which records it belongs to: the customer and lead on the document, and whoever uploaded it.
    const links: RecordRef[] = [];
    const add = (type: string, id: unknown) => {
      if (id != null && id !== "" && !links.some((l) => l.type === type && l.id === String(id))) links.push({ type, id: String(id) });
    };
    add("customer", d.customerId);
    add("lead", d.leadId);
    add("user", d.installerId ?? d.uploadedById);
    if (evt.principal.kind === "installer" || evt.principal.kind === "staff") add("user", evt.principal.id);
    for (const l of evt.links) add(l.type, l.id);
    const customer = d.customerId ? await this.deps.backend.get("customer", String(d.customerId), svc) : null;
    if (customer?.data?.leadId) add("lead", customer.data.leadId);

    // Check it against the job.
    const issues = [...c.issues];
    const site = String(customer?.data?.address ?? "");
    if (c.extracted.site_address && site && !sameAddress(c.extracted.site_address, site)) {
      issues.push(`Site address on the document (${c.extracted.site_address}) doesn't match the customer's address (${site}).`);
    }
    const top = c.labels[0];
    const reviewState = top && top.confidence >= AUTO_CONFIDENCE ? "auto" : "needs_review";
    const routesConfig = ((await this.deps.store.getRecord("config", "document_routes"))?.routes ?? DEFAULT_ROUTES) as Record<string, string[]>;
    const routes = top && reviewState === "auto" ? routesConfig[top.label] ?? [] : [];

    await this.deps.actions.run({
      name: "update_record",
      input: {
        record: evt.subject,
        fields: { aiLabels: c.labels, extracted: c.extracted, reviewState, ...(top && top.confidence >= AUTO_CONFIDENCE && !d.category ? { category: top.label } : {}) },
      },
      principal: this.principal,
      causationId: evt.event_id,
      correlationId: evt.correlation_id,
    });

    const [prev] = await this.deps.store.getFileLabels([evt.subject.id]);
    await this.deps.store.putFileLabels({
      ...(prev ?? {}),
      documentId: evt.subject.id,
      labels: c.labels,
      extracted: c.extracted,
      reviewState,
      description: c.description,
      updatedAt: new Date().toISOString(),
      links,
      routes,
      issues,
      deliveredTo: prev?.deliveredTo ?? [],
    });
    c.issues = issues;

    if (reviewState === "needs_review") {
      const now = new Date();
      await this.deps.store.putInbox({
        id: newId("inb_"),
        kind: "review",
        status: "open",
        title: `Check label: ${top?.label ?? "unknown"} (${Math.round((top?.confidence ?? 0) * 100)}%)`,
        agentId: null,
        subject: evt.subject,
        action: null,
        input: { labels: c.labels },
        reasoning: c.description,
        createdAt: now.toISOString(),
        dueAt: new Date(now.getTime() + 86_400_000).toISOString(),
        decisionId: null,
        resolvedBy: null,
        resolvedAt: null,
        resolution: null,
        editedInput: null,
      });
    }
    return c;
  }
}

export function parseClassification(text: string): Classification | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<Classification>;
    const labels = (j.labels ?? [])
      .filter((l): l is FileLabel => !!l && (FILE_LABELS as readonly string[]).includes(l.label) && typeof l.confidence === "number")
      .map((l) => ({ label: l.label, confidence: Math.max(0, Math.min(1, l.confidence)) }))
      .sort((a, b) => b.confidence - a.confidence);
    const extracted: Record<string, string> = {};
    for (const [k, v] of Object.entries(j.extracted ?? {})) if (typeof v === "string" || typeof v === "number") extracted[k] = String(v);
    const issues = Array.isArray(j.issues) ? j.issues.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 200)).slice(0, 10) : [];
    return { labels, extracted, description: String(j.description ?? ""), issues };
  } catch {
    return null;
  }
}
