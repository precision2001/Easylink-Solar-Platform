import { describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { setup } from "./helpers.js";

const H = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
type Res<T> = { data: T };
const get = async <T>(app: ReturnType<typeof createApp>, path: string, token: string) => {
  const r = await app.request(path, { headers: H(token) });
  return { status: r.status, body: (await r.json()) as Res<T> };
};

function world() {
  const s = setup();
  s.backend.users.set("cust", { id: "usr_cust_1", role: "CUSTOMER", email: "dan@example.test", firstName: "Dan" });
  s.backend.users.set("inst2", { id: "usr_inst_2", role: "INSTALLER", firstName: "Kim" });
  s.backend.seed("user", [{ id: "usr_inst_2", role: "INSTALLER", firstName: "Kim", lastName: "Lee", email: "kim@example.test", phone: "+61400000102" }]);
  s.backend.seed("customer", [{ id: "cus_1", firstName: "Dan", email: "dan@example.test", phone: "+61400000301", address: "7 Gum Tree Ct, Castle Hill NSW 2154", leadId: "ld_1" }]);
  s.backend.seed("lead", [{ id: "ld_1", customerName: "Dan", customerId: "cus_1", address: "7 Gum Tree Ct, Castle Hill NSW 2154", status: "WON", assignedToId: "usr_inst_1" }]);
  return { ...s, app: createApp(s.c) };
}
const settle = () => new Promise((r) => setTimeout(r, 20));

describe("who sees what", () => {
  it("the assigned installer and the customer see the project; another installer doesn't", async () => {
    const w = world();
    expect((await get(w.app, "/v1/ai/projects/customer/cus_1", "inst")).status).toBe(200);
    expect((await get(w.app, "/v1/ai/projects/customer/cus_1", "cust")).status).toBe(200);
    expect((await get(w.app, "/v1/ai/projects/customer/cus_1", "inst2")).status).toBe(403);
    expect((await get(w.app, "/v1/ai/projects/customer/cus_1", "admin")).status).toBe(200);
    const mine = await get<{ ref: { id: string } }[]>(w.app, "/v1/ai/projects", "cust");
    expect(mine.body.data.map((p) => p.ref.id)).toEqual(["cus_1"]);
    const files = await get<{ id: string }[]>(w.app, "/v1/ai/projects/customer/cus_1/files", "cust");
    expect(files.body.data.map((f) => f.id).sort()).toEqual(["doc_1", "doc_2", "doc_3"]);
  });

  it("the customer sees what the installer sent, without anyone's email address", async () => {
    const w = world();
    const r = await w.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], subject: "Meter photo", body: "Here is your meter photo.", files: [{ type: "document", id: "doc_1" }], reason: "photos" },
      principal: { kind: "installer", id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null },
      auth: { token: "inst" },
    });
    expect(r.status).toBe("executed");
    await settle();
    const hist = await get<{ title: string; messageId: string | null; actor: { name: string } }[]>(w.app, "/v1/ai/projects/customer/cus_1/history", "cust");
    const line = hist.body.data.find((l) => l.messageId)!;
    expect(line.title).toMatch(/Sent to Dan .* by email with 1 file/);
    const copy = await get<{ body: string; to: { address?: string } }>(w.app, `/v1/ai/messages/${line.messageId}`, "cust");
    expect(copy.body.data.body).toBe("Here is your meter photo.");
    expect(copy.body.data.to.address).toBeUndefined();
    const staffCopy = await get<{ to: { address?: string } }>(w.app, `/v1/ai/messages/${line.messageId}`, "admin");
    expect(staffCopy.body.data.to.address).toBe("dan@example.test");
    expect((await get(w.app, `/v1/ai/messages/${line.messageId}`, "inst2")).status).toBe(403);
  });

  it("staff reassign the job: the new installer sees the whole history, the old one loses access", async () => {
    const w = world();
    await w.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], body: "Install booked for Tuesday.", reason: "booking" },
      principal: { kind: "installer", id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null },
      auth: { token: "inst" },
    });
    const r = await w.c.actions.run({
      name: "start_workflow",
      input: { template: "reassign_installer", inputs: { project: { type: "customer", id: "cus_1" }, installer: { type: "user", id: "usr_inst_2" }, reason: "Sam is unwell this week" } },
      principal: { kind: "staff", id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null },
      auth: { token: "admin" },
    });
    expect((r.result as { results: { step: string; status: string }[] }).results.map((s) => s.status)).toEqual(["executed", "executed", "executed"]);
    await settle();
    expect((await w.backend.get("lead", "ld_1")).data!.assignedToId).toBe("usr_inst_2");
    expect((await get(w.app, "/v1/ai/projects/customer/cus_1", "inst")).status).toBe(403);
    const p = await get<{ installers: { id: string }[]; installerHistory: { installer: { id: string }; to: string | null }[] }>(w.app, "/v1/ai/projects/customer/cus_1", "inst2");
    expect(p.status).toBe(200);
    expect(p.body.data.installers.map((i) => i.id)).toEqual(["usr_inst_2"]);
    expect(p.body.data.installerHistory.map((h) => [h.installer.id, h.to === null])).toEqual([
      ["usr_inst_2", true],
      ["usr_inst_1", false],
    ]);
    const hist = await get<{ title: string }[]>(w.app, "/v1/ai/projects/customer/cus_1/history", "inst2");
    const titles = hist.body.data.map((l) => l.title).join(" | ");
    expect(titles).toContain("assigned");
    expect(titles).toContain("Sent to Dan"); // Sam's earlier message, now visible to Kim
    expect(w.messaging.sent.some((m) => m.to === "kim@example.test" && /New job assigned/.test(m.subject ?? ""))).toBe(true);
    expect(w.messaging.sent.some((m) => m.to === "dan@example.test" && /installer has changed/.test(m.subject ?? ""))).toBe(true);
  });

  it("customers and installers can ask for a change; only staff can make it", async () => {
    const w = world();
    const ask = await w.app.request("/v1/ai/projects/customer/cus_1/installer-change", { method: "POST", headers: H("cust"), body: JSON.stringify({ reason: "Installer hasn't returned calls" }) });
    expect(ask.status).toBe(202);
    expect((await w.store.listInbox({ kind: "question" }))[0]!.title).toMatch(/different installer/);
    const direct = await w.app.request("/v1/actions/assign_installer", {
      method: "POST",
      headers: H("inst"),
      body: JSON.stringify({ input: { project: { type: "customer", id: "cus_1" }, installer: { type: "user", id: "usr_inst_2" }, reason: "Handing over" } }),
    });
    expect(((await direct.json()) as Res<{ status: string }>).data.status).toBe("proposed");
    const stranger = await w.app.request("/v1/actions/assign_installer", {
      method: "POST",
      headers: H("inst2"),
      body: JSON.stringify({ input: { project: { type: "customer", id: "cus_1" }, installer: { type: "user", id: "usr_inst_2" }, reason: "Give it to me" } }),
    });
    expect(((await stranger.json()) as Res<{ status: string }>).data.status).toBe("denied");
  });

  it("staff-only lines never reach customers", async () => {
    const w = world();
    await w.store.putTimeline({ id: "tl_x", at: new Date().toISOString(), kind: "approval", title: "EasyLink declined an AI proposal", actor: { kind: "staff", id: "usr_admin" }, records: [{ type: "customer", id: "cus_1" }], audience: "staff" });
    const cust = await get<{ title: string }[]>(w.app, "/v1/ai/projects/customer/cus_1/history", "cust");
    expect(cust.body.data.some((l) => l.title.includes("declined"))).toBe(false);
    const adm = await get<{ title: string }[]>(w.app, "/v1/ai/projects/customer/cus_1/history", "admin");
    expect(adm.body.data.some((l) => l.title.includes("declined"))).toBe(true);
  });

  it("records when a file is opened, in the portal or from an emailed link", async () => {
    process.env.PUBLIC_API_URL = "https://ai.example.test";
    const w = world();
    const open = await get<{ url: string }>(w.app, "/v1/ai/files/doc_1/link", "cust");
    expect(open.status).toBe(200);
    expect((await get(w.app, "/v1/ai/files/doc_1/link", "inst2")).status).toBe(403);
    await w.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], body: "Your files", files: [{ type: "document", id: "doc_2" }], reason: "files" },
      principal: { kind: "staff", id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null },
      auth: { token: "admin" },
    });
    const link = w.messaging.sent.at(-1)!.links![0]!;
    expect(link).toMatch(/^https:\/\/ai\.example\.test\/f\//);
    const hop = await w.app.request(new URL(link).pathname);
    expect(hop.status).toBe(302);
    await settle();
    const hist = await get<{ title: string }[]>(w.app, "/v1/ai/projects/customer/cus_1/history", "cust");
    expect(hist.body.data.filter((l) => l.title.startsWith("Opened")).length).toBe(2);
    delete process.env.PUBLIC_API_URL;
  });
});

describe("everything for or about the customer", () => {
  it("customers see designs, quotes and messages but never installer notes or tasks", async () => {
    const w = world();
    w.backend.seed("note", [{ id: "nt_1", customerId: "cus_1", content: "Customer's dog is anxious", installerId: "usr_inst_1", createdAt: "2026-10-10T00:00:00Z" }]);
    w.backend.seed("task", [{ id: "tk_1", customerId: "cus_1", title: "Order isolator", assignedToId: "usr_inst_1", createdAt: "2026-10-10T00:00:00Z" }]);
    w.backend.seed("design", [{ id: "dsn_1", customerId: "cus_1", name: "6.6 kW north roof", status: "APPROVED", createdAt: "2026-10-01T00:00:00Z" }]);
    const cust = await get<{ items: { kind: string }[] }>(w.app, "/v1/ai/projects/customer/cus_1/items", "cust");
    const ck = cust.body.data.items.map((i) => i.kind);
    expect(ck).toContain("design");
    expect(ck).not.toContain("note");
    expect(ck).not.toContain("task");
    const inst = await get<{ items: { kind: string }[] }>(w.app, "/v1/ai/projects/customer/cus_1/items", "inst");
    expect(inst.body.data.items.map((i) => i.kind)).toEqual(expect.arrayContaining(["note", "task", "design"]));
  });
});

describe("with the backend's /projects endpoints (BACKEND_PROJECTS_API=1)", () => {
  it("asks the backend with the caller's own token, and assigns through it", async () => {
    process.env.BACKEND_PROJECTS_API = "1";
    try {
      const w = world();
      const posted: unknown[] = [];
      w.backend.routes.push((method, path, body, token) => {
        if (method === "GET" && path.startsWith("/projects?")) return { ok: true, status: 200, data: token === "cust" ? [{ customerId: "cus_1" }] : [] };
        if (method === "GET" && path === "/projects/cus_1/items")
          return token === "cust"
            ? { ok: true, status: 200, data: [{ key: "invoice:1", kind: "invoice", id: "1", title: "Invoice INV-1", subtitle: "", at: "2026-10-02T00:00:00Z", status: "PAID", amount: "$9,990.00", byUserId: null, url: null, data: {} }] }
            : { ok: false, status: 403, data: null };
        if (method === "GET" && path === "/projects/cus_1/assignments") return { ok: true, status: 200, data: [{ id: "a1", leadId: "ld_1", customerId: "cus_1", installerId: "usr_inst_1", startedAt: "2026-09-01T00:00:00Z", endedAt: null, reason: "First" }] };
        if (method === "POST" && path === "/projects/cus_1/assignments") {
          posted.push(body);
          return { ok: true, status: 201, data: { assignment: { id: "a2", leadId: "ld_1", startedAt: "2026-10-21T00:00:00Z" }, ended: ["usr_inst_1"] } };
        }
        return undefined;
      });
      const items = await get<{ items: { kind: string; amount: string }[] }>(w.app, "/v1/ai/projects/customer/cus_1/items", "cust");
      expect(items.status).toBe(200);
      expect(items.body.data.items[0]).toMatchObject({ kind: "invoice", amount: "$9,990.00" });
      expect(w.backend.calls.find((x) => x.path === "/projects/cus_1/items")?.token).toBe("cust");
      // Someone else's account is staff-only.
      expect((await get(w.app, "/v1/ai/people/usr_inst_1/items", "cust")).status).toBe(403);

      const res = await w.c.relations.assign({ customerId: "cus_1", leadId: "ld_1", installerId: "usr_inst_2", by: "staff_1", reason: "Customer asked", replace: true, now: "2026-10-21T00:00:00Z" });
      expect(posted[0]).toEqual({ installerId: "usr_inst_2", leadId: "ld_1", mode: "REPLACE", reason: "Customer asked" });
      expect(res.closed.map((c) => c.installerId)).toEqual(["usr_inst_1"]);
    } finally {
      delete process.env.BACKEND_PROJECTS_API;
    }
  });
});
