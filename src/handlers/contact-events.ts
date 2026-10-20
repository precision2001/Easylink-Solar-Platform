import { buildContainer } from "../container.js";
import { loadSecrets } from "./secrets.js";

await loadSecrets();
import { makeEvent, type RecordRef } from "../core/envelope.js";

const c = buildContainer();
const CONTACT: { kind: "integration"; id: string; roles: string[]; on_behalf_of: null } = { kind: "integration", id: "amazon-connect", roles: [], on_behalf_of: null };

/**
 * Amazon Connect (Contact Lens / Transcribe post-call) and inbound SMS / email
 * adapters land here and become catalogue events. The caller is matched to a
 * record by phone or email through the existing backend, so the concierge agent
 * starts with "who is this".
 */
type Inbound = {
  channel: "call" | "voicemail" | "sms" | "email";
  from: string;
  to?: string;
  contactId: string;
  transcript?: string;
  body?: string;
  subject?: string;
  recordingKey?: string;
  durationSec?: number;
};

export async function handler(input: Inbound) {
  const subject = await matchCaller(input.from);
  const type = { call: "call.transcribed", voicemail: "voicemail.received", sms: "sms.received", email: "email.received" }[input.channel];
  const evt = makeEvent({
    type,
    source: "contact-centre",
    principal: CONTACT,
    subject: subject ?? { type: "contact", id: input.contactId },
    data: {
      contact_id: input.contactId,
      from: input.from,
      to: input.to ?? null,
      transcript: input.transcript ?? null,
      body: input.body ?? null,
      subject: input.subject ?? null,
      recording_key: input.recordingKey ?? null,
      duration_sec: input.durationSec ?? null,
      matched: !!subject,
    },
    pii: ["from", "transcript", "body"],
  });
  await c.store.recordEvent(evt);
  await c.bus.publish([evt]);
  return { event_id: evt.event_id, matched: subject };
}

async function matchCaller(from: string): Promise<RecordRef | null> {
  const auth = { token: c.serviceToken };
  const digits = from.replace(/\D/g, "").replace(/^61/, "0");
  // Installers first (needs GET /users?role=INSTALLER&search= in the backend; skipped if it is not there).
  for (const type of ["user", "customer", "lead"] as const) {
    const r = await c.backend.list(type, type === "user" ? { role: "INSTALLER", search: digits } : { search: digits }, auth);
    if (!r.ok) continue;
    const row = (r.data as Record<string, unknown>[] | null)?.[0];
    if (row?.id) return { type, id: String(row.id) };
  }
  return null;
}
