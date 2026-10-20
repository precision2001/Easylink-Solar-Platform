import { z } from "zod";
import { ulid } from "ulid";

/** Who caused an event or is calling an action (spec 3.1, 8.1). */
export const PrincipalKind = z.enum([
  "staff",
  "installer",
  "customer",
  "visitor",
  "agent",
  "system",
  "integration",
]);
export type PrincipalKind = z.infer<typeof PrincipalKind>;

export const Principal = z.object({
  kind: PrincipalKind,
  id: z.string().min(1),
  /** Roles from the existing backend (ADMIN, INSTALLER, CUSTOMER…) or the agent id. */
  roles: z.array(z.string()).default([]),
  /** Set when an agent acts for a person. */
  on_behalf_of: z.string().nullable().default(null),
});
export type Principal = z.infer<typeof Principal>;

export const RecordRef = z.object({ type: z.string().min(1), id: z.string().min(1) });
export type RecordRef = z.infer<typeof RecordRef>;

/** The one event envelope used everywhere (spec 3.1). */
export const EventEnvelope = z.object({
  event_id: z.string().min(10),
  type: z.string().regex(/^[a-z_]+\.[a-z_]+$/, "type must be <entity>.<past_tense_verb>"),
  version: z.number().int().positive().default(1),
  occurred_at: z.string().datetime(),
  source: z.string().min(1),
  principal: Principal,
  subject: RecordRef,
  links: z.array(RecordRef).default([]),
  data: z.record(z.unknown()).default({}),
  correlation_id: z.string().min(1),
  causation_id: z.string().nullable().default(null),
  pii: z.array(z.string()).default([]),
});
export type EventEnvelope = z.infer<typeof EventEnvelope>;

export const MAX_ENVELOPE_BYTES = 64 * 1024;

export function newId(prefix: string): string {
  return `${prefix}${ulid()}`;
}

export function makeEvent(input: {
  type: string;
  source: string;
  principal: Principal;
  subject: RecordRef;
  links?: RecordRef[];
  data?: Record<string, unknown>;
  correlation_id?: string;
  causation_id?: string | null;
  pii?: string[];
}): EventEnvelope {
  return EventEnvelope.parse({
    event_id: newId("evt_"),
    type: input.type,
    version: 1,
    occurred_at: new Date().toISOString(),
    source: input.source,
    principal: input.principal,
    subject: input.subject,
    links: input.links ?? [],
    data: input.data ?? {},
    correlation_id: input.correlation_id ?? newId("cor_"),
    causation_id: input.causation_id ?? null,
    pii: input.pii ?? [],
  });
}

/** Remove the values at the `pii` paths, for logs and analytics (spec 3.1). */
export function redactEvent(evt: EventEnvelope): EventEnvelope {
  if (evt.pii.length === 0) return evt;
  const data = structuredClone(evt.data) as Record<string, unknown>;
  for (const path of evt.pii) {
    const parts = path.split(".");
    let cur: Record<string, unknown> | undefined = data;
    for (let i = 0; i < parts.length - 1 && cur; i++) {
      const next: unknown = cur[parts[i]!];
      cur = next && typeof next === "object" ? (next as Record<string, unknown>) : undefined;
    }
    const last = parts.at(-1);
    if (cur && last && last in cur) cur[last] = "[redacted]";
  }
  return { ...evt, data };
}

export function envelopeSize(evt: EventEnvelope): number {
  return Buffer.byteLength(JSON.stringify(evt), "utf8");
}
