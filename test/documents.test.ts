import { describe, expect, it } from "vitest";
import { makeEvent } from "../src/core/envelope.js";
import { checkFile, checkMessageBody } from "../src/files/safety.js";
import { officialDomain } from "../src/contacts/finder.js";
import { setup } from "./helpers.js";

const inst = { kind: "installer" as const, id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null };
const staff = { kind: "staff" as const, id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null };
const customerP = { kind: "customer" as const, id: "usr_cust_1", roles: ["CUSTOMER"], on_behalf_of: null };
const pdf = (extra = "") => new TextEncoder().encode(`%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj ${extra}\n%%EOF`);

const POC = JSON.stringify({
  labels: [{ label: "proof_of_completion", confidence: 0.94 }],
  extracted: { site_address: "Castle Hill NSW 2154", completion_date: "2026-10-20", signed_by_customer: "yes", retailer: "Origin Energy" },
  issues: [],
  description: "Proof of completion for a 6.6 kW system",
});

/** Installer uploads a Proof of Completion PDF on site. */
async function uploadPoc(s: ReturnType<typeof setup>, id = "doc_poc") {
  s.backend.seed("document", [{ id, customerId: "cus_1", installerId: "usr_inst_1", fileName: "Proof of Completion.pdf", mimeType: "application/pdf", url: `/uploads/${id}.pdf`, sizeBytes: 900 }]);
  s.contents.set(id, { bytes: pdf(), contentType: "application/pdf" });
  const evt = makeEvent({ type: "file.uploaded", source: "portal:installer", principal: inst, subject: { type: "document", id }, links: [{ type: "customer", id: "cus_1" }] });
  await s.c.classifier.classify(evt);
  return evt;
}

describe("documents from site", () => {
  it("reads the PDF, links it to customer, lead and installer, and suggests customer + retailer", async () => {
    const s = setup([{ text: POC }]);
    s.backend.seed("customer", [{ id: "cus_1", firstName: "Dan", email: "dan@example.test", phone: "+61400000301", address: "7 Gum Tree Ct, Castle Hill NSW 2154", leadId: "ld_1" }]);
    await uploadPoc(s);
    // The model was given the PDF itself.
    const msg = s.model.calls[0]!.messages[0] as { document?: { format: string } };
    expect(msg.document?.format).toBe("pdf");
    const [p] = await s.store.getFileLabels(["doc_poc"]);
    expect(p!.labels[0]!.label).toBe("proof_of_completion");
    expect(p!.routes).toEqual(["customer", "retailer"]);
    expect(p!.links).toEqual(expect.arrayContaining([{ type: "customer", id: "cus_1" }, { type: "lead", id: "ld_1" }, { type: "user", id: "usr_inst_1" }]));
  });

  it("flags a document whose site address doesn't match the job", async () => {
    const s = setup([{ text: POC.replace("Castle Hill NSW 2154", "99 Other Rd, Penrith NSW 2750") }]);
    s.backend.seed("customer", [{ id: "cus_1", firstName: "Dan", email: "dan@example.test", address: "7 Gum Tree Ct, Castle Hill NSW 2154" }]);
    await uploadPoc(s);
    const [p] = await s.store.getFileLabels(["doc_poc"]);
    expect(p!.issues!.join(" ")).toMatch(/doesn't match/);
  });

  it("installer sends to the customer and a retailer on file: links to the customer, attachment to the retailer", async () => {
    const s = setup([{ text: POC }]);
    await s.store.putRecord("partner", { id: "par_origin", name: "Origin Energy", kind: "retailer", submissionEmail: "solar@origin.example", attach: true, verified: true });
    await uploadPoc(s);
    const r = await s.c.actions.run({
      name: "start_workflow",
      input: { template: "deliver_documents", inputs: { about: { type: "customer", id: "cus_1" }, documents: [{ type: "document", id: "doc_poc" }], to: ["customer", "retailer"] } },
      principal: inst,
      auth: { token: "inst" },
    });
    expect(r.status).toBe("executed");
    const toCustomer = s.messaging.sent.find((m) => m.to === "dan@example.test")!;
    expect(toCustomer.links!.length).toBe(1);
    const toRetailer = s.messaging.sent.find((m) => m.to === "solar@origin.example")!;
    expect(toRetailer.attachments![0]!.fileName).toBe("Proof of Completion.pdf");
    expect(toRetailer.subject).toContain("Castle Hill");
    const [p] = await s.store.getFileLabels(["doc_poc"]);
    expect(p!.deliveredTo!.map((d) => d.role).sort()).toEqual(["customer", "retailer"]);
  });

  it("finds a retailer that isn't on file from its own website, then waits for one staff OK", async () => {
    const pick = JSON.stringify({ index: 1, confidence: 0.9, why: "Solar connections mailbox for installer paperwork" });
    const s = setup();
    // Answer by prompt, not by order: agents woken by the upload also call the model.
    s.model.converse = async (args) => {
      s.model.calls.push({ tier: args.tier, system: args.system, messages: args.messages, toolNames: [] });
      const text = args.system.startsWith("You label") ? POC : args.system.startsWith("You choose which published email") ? pick : "No action needed.";
      return { text, toolUses: [], stopReason: "end_turn", usage: { inputTokens: 0, outputTokens: 0 } };
    };
    s.web.results = {
      "origin energy": [
        { title: "Solar connections | Origin Energy", url: "https://www.originenergy.com.au/solar/connections", snippet: "" },
        { title: "Contact us | Origin Energy", url: "https://www.originenergy.com.au/contact-us", snippet: "" },
        { title: "Origin Energy review", url: "https://forum.example.com/origin", snippet: "" },
      ],
    };
    s.web.pages = {
      "https://www.originenergy.com.au/solar/connections":
        "Installers: email completion paperwork. General: hello@originenergy.com.au. For solar connections send documents to solarconnections@originenergy.com.au. Privacy: privacy@originenergy.com.au",
      "https://forum.example.com/origin": "email me at someone@gmail.com",
    };
    await uploadPoc(s); // the bill-read retailer is "Origin Energy"
    const r = await s.c.actions.run({
      name: "start_workflow",
      input: { template: "deliver_documents", inputs: { about: { type: "customer", id: "cus_1" }, documents: [{ type: "document", id: "doc_poc" }], to: ["retailer"] } },
      principal: inst,
      auth: { token: "inst" },
    });
    const steps = (r.result as { results: { step: string; status: string; message?: string }[] }).results;
    expect(steps.map((x) => [x.step, x.status])).toEqual([
      ["find-retailer", "executed"],
      ["send-retailer-find-retailer", "proposed"],
    ]);
    // Only addresses on the organisation's own site were offered, never privacy@ or gmail.
    const pickPrompt = JSON.stringify(s.model.calls.find((c) => c.system.startsWith("You choose"))!.messages);
    expect(pickPrompt).toContain("solarconnections@originenergy.com.au");
    expect(pickPrompt).not.toMatch(/\d+\. privacy@/);
    expect(pickPrompt).not.toMatch(/\d+\. [a-z]+@gmail/);
    const partner = (await s.store.listRecords("partner"))[0]!;
    expect(partner).toMatchObject({ name: "Origin Energy", submissionEmail: "solarconnections@originenergy.com.au", verified: false });
    expect(s.messaging.sent).toHaveLength(0);

    const inbox = await s.store.listInbox({ status: "open", kind: "proposal" });
    expect(inbox[0]!.requestedBy?.id).toBe("usr_inst_1");
    const approved = await s.c.actions.approve(inbox[0]!.id, staff);
    expect(approved.status).toBe("executed");
    expect(s.messaging.sent[0]!.to).toBe("solarconnections@originenergy.com.au");
    expect(s.messaging.sent[0]!.attachments).toHaveLength(1);
    expect((await s.store.getRecord("partner", String(partner.id)))!.verified).toBe(true);
  });

  it("asks staff when the website doesn't publish a suitable address", async () => {
    const s = setup();
    s.web.results = { "tiny power": [{ title: "Tiny Power", url: "https://tinypower.com.au/", snippet: "" }] };
    s.web.pages = { "https://tinypower.com.au/": "Call us on 1300 000 000" };
    const r = await s.c.actions.run({ name: "find_contact", input: { organisation: "Tiny Power", kind: "retailer" }, principal: inst, auth: { token: "inst" } });
    expect((r.result as { partner: unknown }).partner).toBeNull();
    expect((await s.store.listInbox({ kind: "question" })).length).toBe(1);
  });

  it("lets anyone signed in send to anyone on record, but blocks dangerous content", async () => {
    const s = setup();
    // A customer can message their installer (whose details they never see).
    const ok = await s.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "user", id: "usr_inst_1" } }, channel: ["email"], body: "Gate code is 1234, see you Thursday.", reason: "Access details" },
      principal: customerP,
      auth: { token: "cust" },
    });
    expect(ok.status).toBe("executed");
    expect(JSON.stringify(ok.result)).not.toContain("sam@example.test");

    s.backend.seed("document", [{ id: "doc_bad", customerId: "cus_1", fileName: "invoice.pdf.exe", url: "/x" }]);
    const exe = await s.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], body: "invoice", files: [{ type: "document", id: "doc_bad" }], reason: "invoice" },
      principal: inst,
      auth: { token: "inst" },
    });
    expect(exe.status).toBe("denied");
    expect(exe.policy.policies).toContain("content_safety");

    const phish = await s.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], body: "Pay your deposit at http://bit.ly/xyz", reason: "payment" },
      principal: inst,
      auth: { token: "inst" },
    });
    expect(phish.status).toBe("denied");
  });
});

describe("content checks", () => {
  it("refuses programs, macros, scripts in PDFs, mismatched types and oversize files", () => {
    expect(checkFile({ name: "report.pdf", bytes: new TextEncoder().encode("%PDF-1.7 hello") }).ok).toBe(true);
    expect(checkFile({ name: "setup.exe" }).ok).toBe(false);
    expect(checkFile({ name: "photo.jpg", bytes: new Uint8Array([0x4d, 0x5a, 0, 0]) }).ok).toBe(false);
    expect(checkFile({ name: "form.pdf", bytes: new TextEncoder().encode("%PDF-1.7 /OpenAction << /S /JavaScript /JS (app.alert(1)) >>") }).ok).toBe(false);
    expect(checkFile({ name: "Sheet.xlsm" }).ok).toBe(false);
    expect(checkFile({ name: "big.pdf", sizeBytes: 40 * 1024 * 1024 }).ok).toBe(false);
    expect(checkFile({ name: "scan.pdf", scan: "infected" }).ok).toBe(false);
  });
  it("allows links only to EasyLink and government sites from portal users", () => {
    expect(checkMessageBody("See https://www.cleanenergyregulator.gov.au/RET", { senderIsStaff: false }).ok).toBe(true);
    expect(checkMessageBody("Login at https://easylink-solar-support.com", { senderIsStaff: false }).ok).toBe(false);
    expect(checkMessageBody("Login at https://anything.com", { senderIsStaff: true }).ok).toBe(true);
  });
  it("identifies the organisation's own website from search results", () => {
    expect(
      officialDomain("Origin Energy", [
        { title: "", url: "https://www.originenergy.com.au/a", snippet: "" },
        { title: "", url: "https://forum.example.com/origin", snippet: "" },
        { title: "", url: "https://originenergy.com.au/b", snippet: "" },
      ]),
    ).toBe("originenergy.com.au");
  });
});
