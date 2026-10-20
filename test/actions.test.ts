import { describe, expect, it } from "vitest";
import { setup, agent } from "./helpers.js";

const msg = {
  to: { record: { type: "user", id: "usr_inst_1" } },
  channel: ["sms", "email"],
  body: "Here are the meter photos for Dan.",
  files: [{ type: "document", id: "doc_1" }],
  reason: "Installer asked for meter photos",
};

describe("ActionService", () => {
  it("rejects invalid input and unknown actions", async () => {
    const { c } = setup();
    expect((await c.actions.run({ name: "drop_tables", input: {}, principal: agent("sales") })).status).toBe("invalid");
    expect((await c.actions.run({ name: "send_message", input: { to: "x" }, principal: agent("sales") })).status).toBe("invalid");
  });

  it("an agent's message is proposed to the inbox by default, then sent on approval", async () => {
    const { c, messaging, store } = setup();
    const r = await c.actions.run({ name: "send_message", input: msg, principal: agent("concierge"), agent: { agentId: "concierge" } });
    expect(r.status).toBe("proposed");
    expect(messaging.sent).toHaveLength(0);
    const inbox = await store.listInbox({ status: "open" });
    expect(inbox[0]?.action).toBe("send_message");

    const approved = await c.actions.approve(r.approval_id!, { kind: "staff", id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null });
    expect(approved.status).toBe("executed");
    expect(messaging.sent.map((m) => m.channel).sort()).toEqual(["email", "sms"]);
    expect(messaging.sent.find((m) => m.channel === "sms")?.to).toBe("+61400000101");
    expect(messaging.sent.find((m) => m.channel === "sms")?.body).toContain("https://files.example.test/c/a.jpg");
    expect((await store.getInbox(r.approval_id!))?.status).toBe("approved");
  });

  it("executes straight away when an autonomy rule says Decides", async () => {
    const { c, messaging, store } = setup();
    await store.putAutonomyRule({ agentId: "concierge", action: "send_message", condition: { recipient_type: "user" }, level: "L2", setBy: "admin", setAt: "", reason: "installers" });
    const r = await c.actions.run({ name: "send_message", input: msg, principal: agent("concierge"), agent: { agentId: "concierge" }, idempotencyKey: "k1" });
    expect(r.status).toBe("executed");
    expect(r.events.length).toBeGreaterThanOrEqual(3); // email.sent, sms.sent, file.shared
    // idempotent replay does not send twice
    await c.actions.run({ name: "send_message", input: msg, principal: agent("concierge"), agent: { agentId: "concierge" }, idempotencyKey: "k1" });
    expect(messaging.sent).toHaveLength(2);
  });

  it("kill switch blocks; pause shadows", async () => {
    const { c, store, messaging } = setup();
    await store.putControl({ ...(await store.getControl()), familiesOff: { messages: true } });
    expect((await c.actions.run({ name: "send_message", input: msg, principal: agent("concierge"), agent: { agentId: "concierge" } })).status).toBe("blocked");
    await store.putControl({ ...(await store.getControl()), familiesOff: {}, pausedAgents: { concierge: true } });
    expect((await c.actions.run({ name: "send_message", input: msg, principal: agent("concierge"), agent: { agentId: "concierge" } })).status).toBe("shadow");
    expect(messaging.sent).toHaveLength(0);
  });

  it("list_files finds AI-labelled photos without any checkbox", async () => {
    const { c } = setup();
    const r = await c.actions.run({ name: "list_files", input: { record: { type: "customer", id: "cus_1" }, label: "meter" }, principal: agent("concierge"), agent: { agentId: "concierge" } });
    expect(r.status).toBe("executed");
    expect((r.result as { id: string }[]).map((f) => f.id)).toEqual(["doc_1"]); // 0.4 confidence one is excluded
  });

  it("installers only see their own leads", async () => {
    const { c } = setup();
    const inst = { kind: "installer" as const, id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null };
    const r = await c.actions.run({ name: "search_records", input: { type: "lead" }, principal: inst, auth: { token: "inst" } });
    expect((r.result as { id: string }[]).map((x) => x.id)).toEqual(["ld_1"]);
    const denied = await c.actions.run({ name: "get_record", input: { record: { type: "lead", id: "ld_2" } }, principal: inst, auth: { token: "inst" } });
    expect(denied.status).toBe("denied");
  });

  it("workflows run their steps through the same gates", async () => {
    const { c, store } = setup();
    const r = await c.actions.run({
      name: "start_workflow",
      input: { template: "request_missing_photos", inputs: { to: { type: "customer", id: "cus_1" }, slots: ["isolator"] } },
      principal: agent("delivery"),
      agent: { agentId: "delivery" },
    });
    // start_workflow itself is L1 for agents → proposed
    expect(r.status).toBe("proposed");
    const res = await c.actions.approve(r.approval_id!, { kind: "staff", id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null });
    expect(res.status).toBe("executed");
    const steps = (res.result as { results: { step: string; status: string }[] }).results;
    expect(steps.map((s) => s.step)).toEqual(["message", "task"]);
    expect(steps[0]?.status).toBe("executed");
    expect((await store.listInbox({ status: "open" })).length).toBe(0);
  });
});
