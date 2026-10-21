import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { newJob } from "../src/jobs/service.js";
import { batteryStcs, solarStcs } from "../src/jobs/stc.js";
import { setup } from "./helpers.js";

const prev = process.env.AI_MODE;
beforeAll(() => {
  process.env.AI_MODE = "local";
});
afterAll(() => {
  process.env.AI_MODE = prev;
});

function world() {
  const s = setup();
  s.backend.users.set("cust", { id: "usr_cust_1", role: "CUSTOMER", email: "dan@example.test" });
  s.backend.users.set("inst2", { id: "usr_inst_2", role: "INSTALLER" });
  s.backend.seed("user", [
    { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers", phone: "+61400000101", lat: -33.815, lng: 151.0011, rating: 4.8, reviewCount: 40, reliability: 0.95, saaExpiry: "2099-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
    { id: "usr_inst_2", role: "INSTALLER", firstName: "Kim", lastName: "Lee", lat: -33.7, lng: 151.1, rating: 4.9, reviewCount: 3, reliability: 0.9, saaExpiry: "2020-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
  ]);
  const app = createApp(s.c);
  const call = async (method: string, path: string, token: string, body?: unknown) => {
    const r = await app.request(path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json()) as { data: any; message: string } };
  };
  const step = (token: string, action: string, input: Record<string, unknown> = {}) => call("POST", `/v1/ai/jobs/ld_1/steps/${action}`, token, input);
  return { ...s, app, call, step };
}

async function newDanJob(w: ReturnType<typeof world>) {
  const j = newJob({
    leadId: "ld_1",
    customerId: "cus_1",
    customerName: "Dan",
    customerEmail: "dan@example.test",
    customerPhone: "+61400000301",
    seller: { name: "Rivers Electrical", abn: "12 345 678 901" },
    site: { address: "Castle Hill NSW 2154", postcode: "2154", state: "NSW", lat: -33.7296, lng: 151.0053, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
    selection: { designId: null, title: "Solar + battery", kw: 6.6, panels: { model: "Panel", count: 3, watts: 440 }, inverter: { model: "Hybrid 5", kw: 5 }, battery: { model: "Battery", usableKwh: 12.8 }, accessories: [], price: 17990, annualOutputKwh: 9100, savingsPerYear: 2600 },
    dnsp: "Endeavour Energy",
  });
  await w.c.store.putRecord("job", j as never);
}

describe("STC estimates", () => {
  it("follow the CER method", () => {
    expect(solarStcs(6.6, 1.382, "2026-10-21")).toBe(45);
    expect(batteryStcs(12.8, "2026-10-21")).toBe(87);
    expect(batteryStcs(13.5, "2026-03-01")).toBe(113);
    // Above 14 kWh the factor tapers to 60%.
    expect(batteryStcs(20, "2026-10-21")).toBe(Math.floor(14 * 6.8 + 6 * 6.8 * 0.6));
  });
});

describe("the job journey", () => {
  it("matches only eligible installers and lets the offered installer accept", async () => {
    const w = world();
    await newDanJob(w);
    const m = await w.step("admin", "match");
    expect(m.body.data.offer.installerId).toBe("usr_inst_1");
    expect(m.body.data.ranking.find((r: any) => r.installerId === "usr_inst_2").reasons).toContain("SAA accreditation not current");
    expect((await w.step("inst2", "accept_offer")).status).toBe(403);
    expect((await w.step("inst", "accept_offer")).status).toBe(200);
    expect((await w.call("GET", "/v1/ai/jobs/ld_1", "inst2")).status).toBe(403);
  });

  it("an offered installer sees the suburb and system, not who or where, until they accept", async () => {
    const w = world();
    await newDanJob(w);
    await w.step("admin", "match");
    const before = await w.call("GET", "/v1/ai/jobs/ld_1", "inst");
    expect(before.body.data.job.customerName).toBe("Customer in Castle Hill NSW 2154");
    expect(before.body.data.job.customerPhone).toBeUndefined();
    await w.step("inst", "accept_offer");
    const after = await w.call("GET", "/v1/ai/jobs/ld_1", "inst");
    expect(after.body.data.job.customerName).toBe("Dan");
  });

  it("runs from confirmation to a paid deposit with the right people doing each step", async () => {
    const w = world();
    await newDanJob(w);
    await w.step("admin", "match");
    await w.step("inst", "accept_offer");
    expect((await w.step("inst", "confirm_selection")).status).toBe(403);
    expect((await w.step("cust", "confirm_selection", { transcript: "go ahead" })).status).toBe(200);
    await w.step("cust", "upload_photo", { label: "Meter" });
    expect((await w.step("inst", "accept_job")).status).toBe(409);
    await w.step("cust", "upload_photo", { label: "Switchboard" });
    const acc = await w.step("inst", "accept_job");
    const sig = acc.body.data.signatureId;
    expect((await w.step("inst", "request_code", { signatureId: sig })).status).toBe(403);
    const code = await w.step("cust", "request_code", { signatureId: sig });
    expect(w.messaging.sent.some((m) => m.channel === "sms" && m.body.includes(code.body.data.devCode))).toBe(true);
    expect((await w.step("cust", "sign", { signatureId: sig, code: "000000" === code.body.data.devCode ? "111111" : "000000" })).status).toBe(400);
    expect((await w.step("cust", "sign", { signatureId: sig, code: code.body.data.devCode })).status).toBe(200);

    // The deposit invoice is drafted for the installer; the customer can't see a draft.
    let view = await w.call("GET", "/v1/ai/jobs/ld_1", "cust");
    expect(view.body.data.invoices).toHaveLength(0);
    const inst = await w.call("GET", "/v1/ai/jobs/ld_1", "inst");
    const dep = inst.body.data.invoices[0];
    expect(dep.kind).toBe("deposit");
    expect(dep.totals.total).toBe(1799);
    expect(dep.totals.gst).toBeCloseTo(163.55, 2);
    await w.step("inst", "send_invoice", { invoiceId: dep.id });
    expect((await w.step("inst", "update_invoice", { invoiceId: dep.id, notes: "x" })).status).toBe(409);
    expect((await w.step("cust", "pay_invoice", { invoiceId: dep.id })).status).toBe(200);
    view = await w.call("GET", "/v1/ai/jobs/ld_1", "cust");
    expect(view.body.data.milestones.find((m: any) => m.key === "deposit_paid").done).toBe(true);
    expect(view.body.data.job.windows).toHaveLength(3);
    // Customers never see the installer's equipment costs.
    expect(view.body.data.job.order.lines).toHaveLength(0);
    // The signed agreement and the invoice are in Everything.
    const items = await w.call("GET", "/v1/ai/projects/customer/cus_1/items", "cust");
    expect(items.body.data.items.map((i: any) => i.kind)).toEqual(expect.arrayContaining(["invoice", "document"]));
  });

  it("won't finish an install with steps missing, and blocks serials from another order", async () => {
    const w = world();
    await newDanJob(w);
    const j = (await w.c.store.getRecord("job", "ld_1")) as any;
    for (const k of ["installer_assigned", "selection_confirmed", "site_photos_ok", "job_accepted", "agreement_signed", "deposit_paid", "install_date_set", "connection_applied", "connection_approved", "bills_received", "quote_final", "equipment_paid", "delivered"]) j.milestones[k] = { at: "2026-10-01T00:00:00Z", by: "x" };
    j.installerId = "usr_inst_1";
    j.order.serials = [{ kind: "panel", serial: "P1" }, { kind: "inverter", serial: "I1" }, { kind: "battery", serial: "B1" }];
    j.connection.approval = { number: "A1", exportLimitKw: 5, at: "2026-10-01T00:00:00Z" };
    await w.c.store.putRecord("job", j);
    expect((await w.step("inst", "check_in", { day: 1, lat: -33.9, lng: 151.2 })).status).toBe(409);
    expect((await w.step("inst", "check_in", { day: 1 })).status).toBe(400);
    expect((await w.step("inst", "check_in", { day: 1, lat: -33.7297, lng: 151.0054 })).status).toBe(200);
    expect((await w.step("inst", "complete_install")).body.message).toMatch(/Still to do/);
    expect((await w.step("inst", "scan_serial", { serial: "ZZ9" })).status).toBe(409);
    expect((await w.step("inst", "record_tests", { insulationMOhm: 200, earthOk: true, exportLimitKw: 6 })).status).toBe(409);
  });

  it("EasyLink AI can draft an invoice for the installer, who still sends it", async () => {
    const w = world();
    await newDanJob(w);
    await w.step("admin", "match");
    await w.step("inst", "accept_offer");
    const r = await w.call("POST", "/v1/actions/draft_invoice", "inst", { input: { job: "ld_1", kind: "variation", lines: [{ description: "Switchboard upgrade to RCBOs", qty: 1, unitExGst: 800, gst: true }] } });
    expect(r.status).toBeLessThan(300);
    const inst = await w.call("GET", "/v1/ai/jobs/ld_1", "inst");
    const inv = inst.body.data.invoices.find((i: any) => i.createdVia === "ai");
    expect(inv).toMatchObject({ status: "draft", kind: "variation" });
    expect(inv.totals.total).toBe(880);
  });

  it("accepts a bank transfer screenshot as payment, flagged for staff to confirm", async () => {
    const w = world();
    await newDanJob(w);
    const j = (await w.c.store.getRecord("job", "ld_1")) as any;
    for (const k of ["installer_assigned", "selection_confirmed", "site_photos_ok", "job_accepted", "agreement_signed"]) j.milestones[k] = { at: "2026-10-01T00:00:00Z", by: "x" };
    j.installerId = "usr_inst_1";
    await w.c.store.putRecord("job", j);
    const inv = (await w.step("inst", "draft_invoice", { kind: "deposit" })).body.data.invoice;
    await w.step("inst", "send_invoice", { invoiceId: inv.id });
    expect((await w.step("cust", "submit_payment_proof", { invoiceId: inv.id })).status).toBe(400);
    expect((await w.step("cust", "submit_payment_proof", { invoiceId: inv.id, fileId: "jf_1", ref: "CBA 1234" })).status).toBe(200);
    const v = await w.call("GET", "/v1/ai/jobs/ld_1", "admin");
    expect(v.body.data.milestones.find((m: any) => m.key === "deposit_paid").done).toBe(true);
    expect(v.body.data.invoices[0].payments[0].verified).toBe(false);
    await w.step("admin", "verify_payment", { invoiceId: inv.id });
    expect((await w.call("GET", "/v1/ai/jobs/ld_1", "admin")).body.data.invoices[0].payments[0].verified).toBe(true);
  });

  it("a rejected photo goes back with the reason", async () => {
    const w = world();
    await newDanJob(w);
    await w.step("admin", "match");
    await w.step("inst", "accept_offer");
    await w.step("cust", "upload_photo", { label: "Meter" });
    expect((await w.step("inst", "reject_photo", { label: "Meter" })).status).toBe(400);
    await w.step("inst", "reject_photo", { label: "Meter", reason: "The meter number is blurred. Stand closer and avoid the glare." });
    expect(w.messaging.sent.some((m) => m.body.includes("meter number is blurred"))).toBe(true);
    const v = await w.call("GET", "/v1/ai/jobs/ld_1", "cust");
    expect(v.body.data.job.photos.items[0]).toMatchObject({ ok: false, note: expect.stringContaining("blurred") });
  });

  it("after three unanswered offers the job goes to EasyLink staff and the customer is told", async () => {
    const w = world();
    w.backend.seed("user", [
      { id: "usr_inst_3", role: "INSTALLER", firstName: "Ava", lat: -33.75, lng: 151.0, rating: 4.5, reviewCount: 10, reliability: 0.9, saaExpiry: "2099-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
      { id: "usr_inst_4", role: "INSTALLER", firstName: "Ben", lat: -33.76, lng: 151.0, rating: 4.4, reviewCount: 10, reliability: 0.9, saaExpiry: "2099-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
      { id: "usr_inst_5", role: "INSTALLER", firstName: "Cy", lat: -33.77, lng: 151.0, rating: 4.3, reviewCount: 10, reliability: 0.9, saaExpiry: "2099-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
    ]);
    await newDanJob(w);
    await w.step("admin", "match");
    for (let i = 0; i < 3; i++) {
      for (const o of (await w.c.store.listRecords("offer")) as any[]) if (o.status === "open") await w.c.store.putRecord("offer", { ...o, expiresAt: "2020-01-01T00:00:00Z" });
      await w.call("GET", "/v1/ai/jobs/ld_1", "admin");
    }
    const offers = (await w.c.store.listRecords("offer")) as any[];
    expect(offers.filter((o) => o.status === "expired")).toHaveLength(3);
    expect(offers.some((o) => o.status === "open")).toBe(false);
    expect((await w.c.store.listInbox({ status: "open" })).some((i) => /Place Dan's job/.test(i.title + JSON.stringify(i.input)))).toBe(true);
    expect(w.messaging.sent.some((m) => m.body.includes("lining up the right installer"))).toBe(true);
  });
});
