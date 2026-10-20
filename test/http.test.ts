import { describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { validateScreen } from "../src/screens/spec.js";
import { setup } from "./helpers.js";

const H = (token: string) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

describe("HTTP API", () => {
  it("requires auth and keeps the control centre staff-only", async () => {
    const { c } = setup();
    const app = createApp(c);
    expect((await app.request("/v1/ai/control")).status).toBe(401);
    expect((await app.request("/v1/ai/control", { headers: H("inst") })).status).toBe(403);
    const r = await app.request("/v1/ai/control", { headers: H("admin") });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { data: { agents: { id: string }[] } };
    expect(body.data.agents.map((a) => a.id)).toContain("concierge");
  });

  it("toggles global recommend-only and kill switches", async () => {
    const { c, store } = setup();
    const app = createApp(c);
    await app.request("/v1/ai/control/global", { method: "PUT", headers: H("admin"), body: JSON.stringify({ recommendOnly: true }) });
    await app.request("/v1/ai/control/switches/messages", { method: "PUT", headers: H("admin"), body: JSON.stringify({ off: true }) });
    const ctl = await store.getControl();
    expect(ctl.globalRecommendOnly).toBe(true);
    expect(ctl.familiesOff.messages).toBe(true);
  });

  it("lets a signed-in browser send interaction events but not record events", async () => {
    const { c, bus } = setup();
    const app = createApp(c);
    const r = await app.request("/v1/events", {
      method: "POST",
      headers: H("inst"),
      body: JSON.stringify([{ type: "page.viewed", data: { path: "/pricing" } }, { type: "lead.created", data: {} }]),
    });
    expect(r.status).toBe(202);
    const body = (await r.json()) as { data: { accepted: string[]; quarantined: string[] } };
    expect(body.data.accepted).toHaveLength(1);
    expect(body.data.quarantined).toEqual(["lead.created"]);
    expect(bus.published.some((e) => e.type === "page.viewed" && e.principal.kind === "installer")).toBe(true);
  });

  it("accepts record events relayed by the portal server (ingest key) as the signed-in person", async () => {
    const { c, bus } = setup();
    const app = createApp(c);
    const r = await app.request("/v1/events", {
      method: "POST",
      headers: { ...H("inst"), "x-ingest-key": "ingest" },
      body: JSON.stringify([{ type: "file.uploaded", subject: { type: "document", id: "doc_1" } }]),
    });
    expect(r.status).toBe(202);
    expect(bus.published.some((e) => e.type === "file.uploaded" && e.principal.id === "usr_inst_1")).toBe(true);
    const anon = await app.request("/v1/events", {
      method: "POST",
      headers: { "x-ingest-key": "ingest", "x-visitor-id": "v_1", "Content-Type": "application/json" },
      body: JSON.stringify([{ type: "page.viewed", data: { path: "/" } }]),
    });
    expect(anon.status).toBe(202);
    expect(bus.published.some((e) => e.principal.kind === "visitor" && e.principal.id === "v_1")).toBe(true);
  });

  it("runs actions as the signed-in person", async () => {
    const { c } = setup();
    const app = createApp(c);
    const r = await app.request("/v1/actions/search_records", { method: "POST", headers: H("inst"), body: JSON.stringify({ input: { type: "lead" } }) });
    const body = (await r.json()) as { data: { result: { id: string }[] } };
    expect(body.data.result.map((x) => x.id)).toEqual(["ld_1"]);
  });

  it("record panel shows AI summary, files and open inbox for staff", async () => {
    const { c, store } = setup();
    await store.putSummary({ subject: { type: "customer", id: "cus_1" }, headline: "Install booked", text: "", openItems: [], risks: [], version: 1, updatedAt: "" });
    const app = createApp(c);
    const r = await app.request("/v1/ai/records/customer/cus_1/panel", { headers: H("admin") });
    const body = (await r.json()) as { data: { summary: { headline: string }; files: unknown[] } };
    expect(body.data.summary.headline).toBe("Install booked");
    expect(body.data.files).toHaveLength(3);
  });
});

describe("generated screens", () => {
  const spec = {
    title: "New leads this week",
    components: [
      { id: "k", kind: "kpi", title: "New", binding: { action: "search_records", input: { type: "lead", filter: { status: "NEW" } } } },
      { id: "t", kind: "table", binding: { action: "search_records", input: { type: "lead" } }, columns: [{ field: "customerName", label: "Name" }] },
    ],
  };
  it("accepts approved components for staff and refuses lead data for customers", () => {
    expect(validateScreen(spec, { kind: "staff", id: "a", roles: ["ADMIN"], on_behalf_of: null }).ok).toBe(true);
    const r = validateScreen(spec, { kind: "customer", id: "c", roles: ["CUSTOMER"], on_behalf_of: null });
    expect(r.ok).toBe(false);
  });
  it("refuses unknown components and read actions as form submits", () => {
    expect(validateScreen({ title: "x y", components: [{ id: "s", kind: "script", code: "alert(1)" }] }, { kind: "staff", id: "a", roles: [], on_behalf_of: null }).ok).toBe(false);
    const form = { title: "Form", components: [{ id: "f", kind: "action_form", action: "search_records", fields: [] }] };
    expect(validateScreen(form, { kind: "staff", id: "a", roles: [], on_behalf_of: null }).ok).toBe(false);
  });
});
