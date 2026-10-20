import { describe, expect, it } from "vitest";
import { makeEvent } from "../src/core/envelope.js";
import { setup } from "./helpers.js";

const connect = { kind: "integration" as const, id: "amazon-connect", roles: [], on_behalf_of: null };

describe("AI runtime", () => {
  it("installer calls for meter photos → concierge finds labelled photos and sends them back", async () => {
    const { c, messaging, store } = setup([
      { text: "Caller is installer Sam. Looking for the customer file.", tools: [{ name: "list_files", input: { record: { type: "customer", id: "cus_1" }, label: "meter" } }] },
      ({ messages }) => {
        const last = messages.at(-1) as { toolResults?: { json: { result: { id: string }[] } }[] };
        const ids = last.toolResults?.[0]?.json.result.map((f) => f.id) ?? [];
        return {
          text: "Sending the photos.",
          tools: [
            {
              name: "send_message",
              input: {
                to: { record: { type: "user", id: "usr_inst_1" } },
                channel: ["sms", "email"],
                subject: "Meter photos",
                body: "Hi Sam, meter photos for Dan attached.",
                files: ids.map((id) => ({ type: "document", id })),
                reason: "Installer requested meter photos by phone",
              },
            },
          ],
        };
      },
      { text: "Done: photos sent to Sam by SMS and email." },
    ]);
    await store.putAutonomyRule({ agentId: "concierge", action: "send_message", condition: { recipient_type: "user", purpose: "transactional" }, level: "L2", setBy: "admin", setAt: "", reason: "installers' own jobs" });

    const evt = makeEvent({
      type: "call.transcribed",
      source: "contact-centre",
      principal: connect,
      subject: { type: "user", id: "usr_inst_1" },
      links: [{ type: "customer", id: "cus_1" }],
      data: { transcript: "Hi it's Sam from Rivers Electrical, can you send me the meter photos for Dan in Castle Hill?" },
    });
    const r = await c.runtime.handle(evt);
    expect(r.status).toBe("handled");
    const concierge = r.agents.find((a) => a.agentId === "concierge")!;
    expect(concierge.outcome).toBe("executed");
    expect(messaging.sent.map((m) => m.to)).toContain("sam@example.test");
    expect(messaging.sent.find((m) => m.channel === "email")?.links).toEqual(["https://files.example.test/c/a.jpg?expires=604800"]);
    const decisions = await store.listDecisions({ agentId: "concierge" });
    expect(decisions[0]?.costAud).toBeGreaterThan(0);
    // The transcript went into memory for later search
    expect((await store.searchChunks("meter photos", "all", 5)).length).toBe(1);
  });

  it("quarantines unknown types and ignores duplicates", async () => {
    const { c, store } = setup();
    const bad = makeEvent({ type: "spaceship.landed", source: "x", principal: connect, subject: { type: "x", id: "1" } });
    expect((await c.runtime.handle(bad)).status).toBe("quarantined");
    expect((await store.listQuarantine(5)).length).toBe(1);
    const page = makeEvent({ type: "page.viewed", source: "web", principal: connect, subject: { type: "visitor", id: "v1" } });
    expect((await c.runtime.handle(page)).status).toBe("memory_only");
    expect((await c.runtime.handle(page)).status).toBe("duplicate");
  });

  it("STOP replies opt the customer out without any model", async () => {
    const { c, backend, model } = setup([{ text: "No action needed." }]);
    const evt = makeEvent({ type: "sms.received", source: "sms", principal: connect, subject: { type: "customer", id: "cus_1" }, data: { body: "STOP" } });
    await c.runtime.handle(evt);
    expect((await backend.get("customer", "cus_1")).data?.optedOut).toBe(true);
    expect(model.calls.length).toBeLessThanOrEqual(1); // only the concierge, after the opt-out is already applied
  });

  it("uploaded photos are labelled automatically; unsure ones go to review", async () => {
    const { c, backend, store } = setup([
      { text: '{"labels":[{"label":"inverter","confidence":0.55},{"label":"isolator","confidence":0.3}],"extracted":{"serial_number":"A1B2"},"description":"Inverter on garage wall"}' },
    ]);
    backend.seed("document", [{ id: "doc_9", customerId: "cus_1", fileName: "IMG_1.jpg", s3Key: "c/IMG_1.jpg" }]);
    const evt = makeEvent({ type: "file.uploaded", source: "portal:installer", principal: connect, subject: { type: "document", id: "doc_9" } });
    await c.classifier.classify(evt);
    const doc = (await backend.get("document", "doc_9")).data!;
    expect(doc.aiLabels).toEqual([{ label: "inverter", confidence: 0.55 }, { label: "isolator", confidence: 0.3 }]);
    expect(doc.extracted).toEqual({ serial_number: "A1B2" });
    expect(doc.reviewState).toBe("needs_review");
    expect((await store.listInbox({ kind: "review" })).length).toBe(1);
  });
});
