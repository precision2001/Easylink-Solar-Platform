import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { EventEnvelope, Principal } from "../core/envelope.js";
import type { ActionService } from "../actions/service.js";
import type { Backend } from "../backend/client.js";
import type { ModelClient } from "../ai/model.js";
import type { Store } from "../store/types.js";
import { newId } from "../core/envelope.js";

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
  "other",
] as const;

export type FileLabel = { label: (typeof FILE_LABELS)[number]; confidence: number };
export type Classification = { labels: FileLabel[]; extracted: Record<string, string>; description: string };

export interface FileBytes {
  /** Bytes and image format, or null when the file is not an image we can look at. */
  load(doc: Record<string, unknown>): Promise<{ format: "jpeg" | "png" | "webp"; bytes: Uint8Array } | null>;
}

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
}

export function imageFormat(nameOrMime: string): "jpeg" | "png" | "webp" | null {
  const s = nameOrMime.toLowerCase();
  if (/jpe?g/.test(s)) return "jpeg";
  if (/png/.test(s)) return "png";
  if (/webp/.test(s)) return "webp";
  return null;
}

const SYSTEM_PROMPT = `You label photos and documents uploaded to an Australian solar installer's customer files.
Return ONLY JSON: {"labels":[{"label":<one of ${FILE_LABELS.join(", ")}>,"confidence":0..1}],"extracted":{...},"description":"<one sentence>"}.
Put the best label first. In "extracted" include only values you can read clearly, using these keys when present:
meter_number, nmi, serial_number, make, model, kw_rating, retailer, bill_period, licence_number, licence_expiry.
Do not describe people. If a photo shows a person's face or a licence, do not copy personal details other than licence_number and licence_expiry.`;

export const AUTO_CONFIDENCE = 0.7;

export class FileClassifier {
  constructor(
    private deps: { model: ModelClient; backend: Backend; actions: ActionService; store: Store; bytes: FileBytes; serviceToken: string },
    private principal: Principal = { kind: "system", id: "file-classifier", roles: ["SYSTEM"], on_behalf_of: null },
  ) {}

  async classify(evt: EventEnvelope): Promise<Classification | null> {
    if (evt.subject.type !== "document") return null;
    const doc = await this.deps.backend.get("document", evt.subject.id, { token: this.deps.serviceToken });
    if (!doc.ok || !doc.data) return null;
    const image = await this.deps.bytes.load(doc.data);
    const hint = [doc.data.fileName, doc.data.category, evt.data.slot].filter(Boolean).join(" | ");

    const turn = await this.deps.model.converse({
      tier: "fast",
      system: SYSTEM_PROMPT,
      maxTokens: 400,
      messages: [{ role: "user", image: image ?? undefined, text: `File: ${hint || "(no name)"}${image ? "" : "\n(No image available; label from the name only.)"}` }],
    });
    const c = parseClassification(turn.text);
    if (!c) return null;

    const top = c.labels[0];
    const reviewState = top && top.confidence >= AUTO_CONFIDENCE ? "auto" : "needs_review";
    await this.deps.actions.run({
      name: "update_record",
      input: {
        record: evt.subject,
        fields: { aiLabels: c.labels, extracted: c.extracted, reviewState, ...(top && top.confidence >= AUTO_CONFIDENCE && !doc.data.category ? { category: top.label } : {}) },
      },
      principal: this.principal,
      causationId: evt.event_id,
      correlationId: evt.correlation_id,
    });

    if (reviewState === "needs_review") {
      const now = new Date();
      await this.deps.store.putInbox({
        id: newId("inb_"),
        kind: "review",
        status: "open",
        title: `Check photo label: ${top?.label ?? "unknown"} (${Math.round((top?.confidence ?? 0) * 100)}%)`,
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
    return { labels, extracted, description: String(j.description ?? "") };
  } catch {
    return null;
  }
}
