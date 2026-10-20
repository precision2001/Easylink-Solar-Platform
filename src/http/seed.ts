import { FakeBackend } from "../backend/client.js";
import { OverlayBackend } from "../backend/overlay.js";
import { newId } from "../core/envelope.js";
import type { Container } from "../container.js";

/** Demo data for local development and screenshots. All names are invented. */
export async function seedDemo(c: Container) {
  const b = c.backend instanceof OverlayBackend ? c.backend.inner : c.backend;
  if (!(b instanceof FakeBackend)) return;
  b.users.set("admin-local", { id: "usr_admin_1", role: "ADMIN", firstName: "Ops", lastName: "Team" });
  b.users.set("installer-local", { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers" });
  b.users.set("svc-local", { id: "usr_ai", role: "ADMIN", firstName: "AI", lastName: "Service" });
  // Real portal JWTs can be mapped for local end-to-end runs of the website.
  if (process.env.LOCAL_ADMIN_TOKEN) b.users.set(process.env.LOCAL_ADMIN_TOKEN, { id: "usr_admin_1", role: "ADMIN", firstName: "Ops", lastName: "Team" });
  b.users.set("customer-local", { id: "usr_cust_1", role: "CUSTOMER", firstName: "Daniel", lastName: "Okafor", email: "daniel@example.com" });
  if (process.env.LOCAL_CUSTOMER_TOKEN) b.users.set(process.env.LOCAL_CUSTOMER_TOKEN, { id: "usr_cust_1", role: "CUSTOMER", firstName: "Daniel", lastName: "Okafor", email: "daniel@example.com" });
  b.users.set("installer2-local", { id: "usr_inst_2", role: "INSTALLER", firstName: "Kim", lastName: "Lee" });
  if (process.env.LOCAL_INSTALLER_TOKEN) b.users.set(process.env.LOCAL_INSTALLER_TOKEN, { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers" });
  b.seed("user", [
    { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers", email: "sam@riverselectrical.example", phone: "+61400000101", address: "Parramatta NSW 2150" },
    { id: "usr_inst_2", role: "INSTALLER", firstName: "Kim", lastName: "Lee", email: "kim@leesolar.example", phone: "+61400000102", address: "Hornsby NSW 2077" },
    { id: "usr_inst_3", role: "INSTALLER", firstName: "Priya", lastName: "Shah", email: "priya@shahenergy.example", phone: "+61400000103", address: "Liverpool NSW 2170" },
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

  // A retailer on file (invented) and a completion document waiting to be sent.
  await c.store.putRecord("partner", { id: "par_sunrise", name: "Sunrise Power", kind: "retailer", submissionEmail: "solar.docs@sunrisepower.example", attach: true, verified: true, aliases: ["Sunrise"] });
  b.seed("customer", [{ id: "cus_2001", firstName: "Daniel", lastName: "Okafor", email: "daniel@example.com", phone: "+61400000301", address: "7 Gum Tree Ct, Castle Hill NSW 2154", smsConsent: true, emailConsent: true, leadId: "ld_0999", retailer: "Sunrise Power" }]);
  b.seed("document", [{ id: "doc_4", customerId: "cus_2001", installerId: "usr_inst_1", fileName: "Proof of Completion.pdf", mimeType: "application/pdf", url: "/uploads/doc_4.pdf", sizeBytes: 182000, createdAt: "2026-10-20T03:10:00Z" }, { id: "doc_5", customerId: "cus_2001", installerId: "usr_inst_1", fileName: "Site report.pdf", mimeType: "application/pdf", url: "/uploads/doc_5.pdf", sizeBytes: 94000, createdAt: "2026-10-20T03:12:00Z" }]);
  const nowIso = new Date().toISOString();
  await c.store.putFileLabels({ documentId: "doc_4", labels: [{ label: "proof_of_completion", confidence: 0.95 }], extracted: { site_address: "7 Gum Tree Ct, Castle Hill NSW 2154", signed_by_customer: "yes" }, reviewState: "auto", description: "Proof of completion, 6.6 kW", updatedAt: nowIso, links: [{ type: "customer", id: "cus_2001" }, { type: "user", id: "usr_inst_1" }], routes: ["customer", "retailer"], issues: [], deliveredTo: [] });
  await c.store.putFileLabels({ documentId: "doc_5", labels: [{ label: "site_report", confidence: 0.91 }], extracted: {}, reviewState: "auto", description: "Site report", updatedAt: nowIso, links: [{ type: "customer", id: "cus_2001" }, { type: "user", id: "usr_inst_1" }], routes: ["customer"], issues: ["No customer signature on page 2."], deliveredTo: [] });

  // Project history for Daniel: lead → assignment → install → documents → sends and opens.
  b.seed("lead", [{ id: "ld_0999", customerName: "Daniel Okafor", customerId: "cus_2001", customerEmail: "daniel@example.com", address: "7 Gum Tree Ct, Castle Hill NSW 2154", status: "WON", assignedToId: "usr_inst_1", systemSize: 6.6, createdAt: "2026-09-02T01:00:00Z" }]);
  await c.store.putRecord("assignment", { id: "asg_seed_1", customerId: "cus_2001", leadId: "ld_0999", installerId: "usr_inst_1", installerName: "Sam Rivers", from: "2026-09-04T02:00:00Z", to: null, assignedBy: "usr_admin_1", reason: "Closest accredited installer" });
  const tl = async (at: string, kind: string, title: string, actor: { kind: string; id: string; name?: string }, extra: Partial<import("../store/types.js").TimelineItem> = {}) =>
    c.store.putTimeline({ id: newId("tl_"), at, kind, title, actor, records: [{ type: "customer", id: "cus_2001" }, { type: "lead", id: "ld_0999" }], audience: "related", ...extra });
  const sam = { kind: "installer", id: "usr_inst_1", name: "Sam Rivers" };
  const easy = { kind: "staff", id: "usr_admin_1", name: "EasyLink" };
  const aiA = { kind: "agent", id: "delivery", name: "EasyLink AI" };
  await tl("2026-09-02T01:00:00Z", "record", "Enquiry received", { kind: "visitor", id: "v_1", name: "Website" });
  await tl("2026-09-04T02:00:00Z", "assignment", "Sam Rivers assigned", easy, { detail: "Closest accredited installer" });
  await tl("2026-09-05T23:30:00Z", "booking", "Appointment booked", sam, { detail: "Site inspection, Tue 9 Sep 10:00" });
  await tl("2026-10-12T02:00:00Z", "file", "Uploaded IMG_4412.jpg", sam, { files: [{ id: "doc_1", name: "IMG_4412.jpg" }] });
  await tl("2026-10-12T02:00:30Z", "ai", "AI read the file: meter", aiA, { files: [{ id: "doc_1" }] });
  await tl("2026-10-12T02:05:30Z", "ai", "AI read the file: isolator (needs a check)", aiA, { files: [{ id: "doc_3" }] });
  await tl("2026-10-12T02:06:00Z", "approval", "Isolator label sent to EasyLink to check", aiA, { audience: "staff" });
  await tl("2026-10-20T03:10:00Z", "file", "Uploaded Proof of Completion.pdf", sam, { files: [{ id: "doc_4", name: "Proof of Completion.pdf" }] });
  await tl("2026-10-20T03:10:20Z", "ai", "AI read the file: proof of completion", aiA, { files: [{ id: "doc_4" }] });
  await tl("2026-10-20T03:12:20Z", "warning", "Site report: no customer signature on page 2", aiA, { files: [{ id: "doc_5" }] });
  await c.store.putRecord("message", {
    id: "msg_seed_1", at: "2026-10-12T04:00:00Z", from: { kind: "installer", id: "usr_inst_1" }, to: { record: { type: "customer", id: "cus_2001" }, name: "Daniel Okafor", role: "customer", address: "daniel@example.com" },
    channels: ["email", "sms"], subject: "Meter and switchboard photos", body: "Hi Daniel, here are the meter and switchboard photos from today's inspection. Install is booked for 28 Oct.",
    files: [{ id: "doc_1", name: "IMG_4412.jpg" }, { id: "doc_2", name: "IMG_4413.jpg" }], attached: false, status: "opened", statusAt: "2026-10-12T06:20:00Z", providerIds: {}, records: [{ type: "customer", id: "cus_2001" }, { type: "lead", id: "ld_0999" }], retention: "sales_12m",
  });
  await tl("2026-10-12T04:00:00Z", "message", "Sent to Daniel Okafor (customer) by email and SMS with 2 files", sam, { detail: "Meter and switchboard photos", messageId: "msg_seed_1", files: [{ id: "doc_1", name: "IMG_4412.jpg" }, { id: "doc_2", name: "IMG_4413.jpg" }] });
  await tl("2026-10-12T04:01:10Z", "message", "Message delivered (Daniel Okafor)", { kind: "integration", id: "delivery-receipts" }, { messageId: "msg_seed_1" });
  await tl("2026-10-12T06:20:00Z", "file", "Opened IMG_4412.jpg (Daniel Okafor)", { kind: "customer", id: "usr_cust_1", name: "Daniel Okafor" }, { files: [{ id: "doc_1" }] });

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
