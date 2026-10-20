import { FakeBackend } from "../backend/client.js";
import { newId } from "../core/envelope.js";
import type { Container } from "../container.js";

/** Demo data for local development and screenshots. All names are invented. */
export async function seedDemo(c: Container) {
  const b = c.backend;
  if (!(b instanceof FakeBackend)) return;
  b.users.set("admin-local", { id: "usr_admin_1", role: "ADMIN", firstName: "Ops", lastName: "Team" });
  b.users.set("installer-local", { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers" });
  b.users.set("svc-local", { id: "usr_ai", role: "ADMIN", firstName: "AI", lastName: "Service" });
  // Real portal JWTs can be mapped for local end-to-end runs of the website.
  if (process.env.LOCAL_ADMIN_TOKEN) b.users.set(process.env.LOCAL_ADMIN_TOKEN, { id: "usr_admin_1", role: "ADMIN", firstName: "Ops", lastName: "Team" });
  if (process.env.LOCAL_INSTALLER_TOKEN) b.users.set(process.env.LOCAL_INSTALLER_TOKEN, { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers" });
  b.seed("user", [
    { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers", email: "sam@riverselectrical.example", phone: "+61400000101", address: "Parramatta NSW 2150" },
  ]);
  b.seed("lead", [
    { id: "ld_1001", customerName: "Priya Natarajan", customerEmail: "priya@example.com", customerPhone: "+61400000201", address: "12 Wattle St, Blacktown NSW 2148", status: "NEW", assignedToId: "usr_inst_1", systemSize: 6.6, createdAt: "2026-10-19T22:10:00Z" },
    { id: "ld_1002", customerName: "Tom Becker", customerEmail: "tom@example.com", customerPhone: "+61400000202", address: "4 Banksia Ave, Penrith NSW 2750", status: "CONTACTED", assignedToId: "usr_inst_1", systemSize: 10, createdAt: "2026-10-18T03:00:00Z" },
    { id: "ld_1003", customerName: "Mei Chen", customerEmail: "mei@example.com", customerPhone: "+61400000203", address: "88 Ocean Rd, Geelong VIC 3220", status: "PROPOSAL_SENT", assignedToId: "usr_inst_2", systemSize: 13.2, createdAt: "2026-10-15T01:00:00Z" },
  ]);
  b.seed("customer", [
    { id: "cus_2001", firstName: "Daniel", lastName: "Okafor", email: "daniel@example.com", phone: "+61400000301", address: "7 Gum Tree Ct, Castle Hill NSW 2154", smsConsent: true, emailConsent: true, leadId: "ld_0999" },
  ]);
  b.seed("document", [
    { id: "doc_1", customerId: "cus_2001", fileName: "IMG_4412.jpg", s3Key: "customers/cus_2001/IMG_4412.jpg", aiLabels: [{ label: "meter", confidence: 0.96 }], extracted: { meter_number: "NMI 4102 XXXX" }, reviewState: "auto", createdAt: "2026-10-12T02:00:00Z" },
    { id: "doc_2", customerId: "cus_2001", fileName: "IMG_4413.jpg", s3Key: "customers/cus_2001/IMG_4413.jpg", aiLabels: [{ label: "switchboard", confidence: 0.91 }], reviewState: "auto", createdAt: "2026-10-12T02:01:00Z" },
    { id: "doc_3", customerId: "cus_2001", fileName: "IMG_4420.jpg", s3Key: "customers/cus_2001/IMG_4420.jpg", aiLabels: [{ label: "isolator", confidence: 0.58 }, { label: "inverter", confidence: 0.35 }], reviewState: "needs_review", createdAt: "2026-10-12T02:05:00Z" },
  ]);

  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  const base = { resolvedBy: null, resolvedAt: null, resolution: null, editedInput: null, decisionId: null };
  await c.store.putInbox({
    ...base,
    id: newId("inb_"),
    kind: "proposal",
    status: "open",
    title: "Send sms + email to user usr_inst_1",
    agentId: "concierge",
    subject: { type: "customer", id: "cus_2001" },
    action: "send_message",
    input: {
      to: { record: { type: "user", id: "usr_inst_1" } },
      channel: ["sms", "email"],
      purpose: "transactional",
      subject: "Meter photos – Daniel Okafor, Castle Hill",
      body: "Hi Sam, here are the meter and switchboard photos for Daniel Okafor (7 Gum Tree Ct, Castle Hill). Links are valid for 7 days.",
      files: [{ type: "document", id: "doc_1" }, { type: "document", id: "doc_2" }],
      reason: "Installer Sam Rivers called asking for the meter photos on this customer file.",
    },
    reasoning: "Caller matched installer Sam Rivers by phone number. He is assigned to this job. Found 2 photos labelled meter and switchboard (96%, 91%).",
    createdAt: iso(4),
    dueAt: iso(-11),
  });
  await c.store.putInbox({
    ...base,
    id: newId("inb_"),
    kind: "proposal",
    status: "open",
    title: "Update lead ld_1002: status, notes",
    agentId: "sales",
    subject: { type: "lead", id: "ld_1002" },
    action: "update_record",
    input: { record: { type: "lead", id: "ld_1002" }, fields: { status: "QUALIFIED", notes: "Confirmed 10 kW on north roof; wants battery quote. Bill ~$780/qtr." } },
    reasoning: "Call transcript: customer confirmed roof, budget and timeline. Meets qualification rules.",
    createdAt: iso(38),
    dueAt: iso(-82),
  });
  await c.store.putInbox({
    ...base,
    id: newId("inb_"),
    kind: "review",
    status: "open",
    title: "Check photo label: isolator (58%)",
    agentId: null,
    subject: { type: "document", id: "doc_3" },
    action: null,
    input: { labels: [{ label: "isolator", confidence: 0.58 }, { label: "inverter", confidence: 0.35 }] },
    reasoning: "Grey enclosure with a rotary switch, partly obscured.",
    createdAt: iso(70),
    dueAt: iso(-1300),
  });
  await c.store.putInbox({
    ...base,
    id: newId("inb_"),
    kind: "question",
    status: "open",
    title: "Customer asked for a 10% discount to match a competitor quote. How should I respond?",
    agentId: "sales",
    subject: { type: "lead", id: "ld_1003" },
    action: null,
    input: null,
    reasoning: "Discounts are outside what I may offer.",
    createdAt: iso(120),
    dueAt: iso(120),
  });

  const agents = ["concierge", "sales", "delivery", "design", "care", "finance", "support", "matching"];
  const outcomes = ["executed", "executed", "executed", "no_action", "proposed", "executed", "escalated"] as const;
  for (let i = 0; i < 64; i++) {
    const agentId = agents[i % agents.length]!;
    await c.store.putDecision({
      id: newId("dec_"),
      agentId,
      eventId: null,
      subject: i % 3 ? { type: "lead", id: "ld_1001" } : { type: "customer", id: "cus_2001" },
      reasoningSummary: "Demo decision",
      action: null,
      autonomyLevel: "L2",
      outcome: outcomes[i % outcomes.length]!,
      approverId: null,
      costAud: 0.004 + (i % 5) * 0.003,
      contextHash: null,
      createdAt: iso(i * 17),
    });
  }
  await c.store.putSummary({
    subject: { type: "customer", id: "cus_2001" },
    headline: "Install booked 28 Oct; meter and switchboard photos on file",
    text: "6.6 kW system, Sungrow inverter. Customer prefers SMS. Installer Sam Rivers assigned. Isolator photo needs a check.",
    openItems: ["Confirm isolator photo", "Send pre-install checklist"],
    risks: [],
    version: 3,
    updatedAt: iso(30),
  });
  await c.store.putFact({ id: newId("fct_"), subject: { type: "customer", id: "cus_2001" }, statement: "Dog on site; call ahead before arriving.", confidence: 0.95, confirmed: true, writtenBy: "concierge", sourceEventId: null, createdAt: iso(3000) });
  await c.store.putAutonomyRule({ agentId: "concierge", action: "send_message", condition: { recipient_type: "user", purpose: "transactional" }, level: "L2", setBy: "usr_admin_1", setAt: iso(5000), reason: "Installers asking for their own job files" });
}
