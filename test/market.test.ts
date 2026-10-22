import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { setup } from "./helpers.js";

const prev = process.env.AI_MODE;
beforeAll(() => {
  process.env.AI_MODE = "local";
});
afterAll(() => {
  process.env.AI_MODE = prev;
});

const SYSTEM = { panels: { model: "AXITEC 440 W", watts: 440, count: 15 }, inverter: { model: "FOXESS 5 kW hybrid", kw: 5, hybrid: true }, battery: { model: "10 kWh stackable", usableKwh: 10 }, extras: [] };
const SOLAR_ITEMS = [
  { category: "panel", model: "AXITEC 440 W panel", qty: 15, watts: 440 },
  { category: "inverter", model: "FOXESS 5 kW hybrid", qty: 1, kw: 5, hybrid: true },
  { category: "battery", model: "10 kWh stackable battery", qty: 1, usableKwh: 10 },
];

function world() {
  const s = setup();
  s.backend.users.set("inst2", { id: "usr_inst_2", role: "INSTALLER" });
  s.backend.seed("user", [
    { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers", companyName: "Rivers Electrical", email: "sam@example.test", phone: "+61400000101", saaExpiry: "2099-01-01", batteryEndorsed: true, servicePostcodes: "2145-2160", membership: "elite" },
    { id: "usr_inst_2", role: "INSTALLER", firstName: "Kim", lastName: "Lee", companyName: "Lee Solar Co", email: "kim@example.test", saaExpiry: "2099-01-01", batteryEndorsed: true, membership: "starter" },
  ]);
  const app = createApp(s.c);
  const call = async (method: string, path: string, token: string | null, b?: unknown, headers: Record<string, string> = {}) => {
    const r = await app.request(path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...headers }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: (await r.json()) as { data: any; message: string } };
  };
  const site = (extra: Record<string, unknown> = {}) => ({
    customer: { name: "Priya Shah", phone: "+61400000201", email: "priya@example.test", street: "4 Wattle St" },
    suburb: "Castle Hill", state: "NSW", postcode: "2154", system: SYSTEM, contractValue: 21990, siteFee: 1500,
    confirmed: { payment: true, depositPaid: 2000, installation: true, windowFrom: "2026-11-10", windowTo: "2026-11-20" },
    visibility: { area: "everyone", eliteHeadStartHours: 0 },
    ...extra,
  });
  const deal = (extra: Record<string, unknown> = {}) => ({
    type: "solar_battery", title: "6.6 kW + 10 kWh battery, installed", items: SOLAR_ITEMS, price: 14990, wasPrice: 16990, badge: "Spring deal",
    serviceAreas: "2145-2155, 2112", quantity: 5, stockSource: "easylink", buildingTypes: ["house", "townhouse"], ...extra,
  });
  const buyer = (extra: Record<string, unknown> = {}) => ({
    customer: { name: "Mei Chen", phone: "0412 345 678", email: "mei@example.test", street: "9 Banksia Ave", suburb: "Baulkham Hills", state: "NSW", postcode: "2153" },
    owner: true, consent: true, terms: true, building: "house", ...extra,
  });
  const web = { "x-ingest-key": "ingest" };
  return { ...s, app, call, site, deal, buyer, web };
}

describe("Ready Sites", () => {
  it("need payment or installation confirmed before EasyLink can publish", async () => {
    const w = world();
    const made = await w.call("POST", "/v1/ai/market/sites", "admin", w.site({ confirmed: { payment: false, installation: false } }));
    expect(made.status).toBe(200);
    expect(made.body.data.ref).toMatch(/^RS-\d+$/);
    const pub = await w.call("POST", `/v1/ai/market/sites/${made.body.data.id}/publish`, "admin");
    expect(pub.status).toBe(400);
    expect(pub.body.message).toContain("Confirm payment, installation, or both");
    await w.call("PATCH", `/v1/ai/market/sites/${made.body.data.id}`, "admin", { confirmed: { installation: true } });
    expect((await w.call("POST", `/v1/ai/market/sites/${made.body.data.id}/publish`, "admin")).body.data.status).toBe("live");
  });

  it("show the public suburb, system and money, never the customer", async () => {
    const w = world();
    const s = (await w.call("POST", "/v1/ai/market/sites", "admin", w.site())).body.data;
    await w.call("POST", `/v1/ai/market/sites/${s.id}/publish`, "admin");
    const pub = await w.call("GET", "/public/market/sites", null);
    expect(pub.body.data).toHaveLength(1);
    expect(JSON.stringify(pub.body.data)).not.toMatch(/Priya|Wattle|0400000201|priya@/);
    expect(pub.body.data[0]).toMatchObject({ suburb: "Castle Hill", kw: 6.6, contractValue: 21990, siteFee: 1500 });
  });

  it("go to whoever buys first, and become an assigned job for them", async () => {
    const w = world();
    const s = (await w.call("POST", "/v1/ai/market/sites", "admin", w.site())).body.data;
    await w.call("POST", `/v1/ai/market/sites/${s.id}/publish`, "admin");
    const forSam = (await w.call("GET", "/v1/ai/market/sites", "inst")).body.data;
    expect(forSam.forSale[0]).toMatchObject({ ref: s.ref, inArea: true });
    expect(forSam.forSale[0].estimate.margin).toBeTypeOf("number");
    expect(forSam.forSale[0].customer).toBeUndefined();

    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/buy`, "inst", {})).body.message).toContain("Agree to the Ready Site terms");
    const [a, b] = await Promise.all([w.call("POST", `/v1/ai/market/sites/${s.id}/buy`, "inst", { agree: true }), w.call("POST", `/v1/ai/market/sites/${s.id}/buy`, "inst2", { agree: true })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = a.status === 200 ? a : b;
    const job = await w.c.store.getRecord("job", winner.body.data.jobId);
    expect(job).toMatchObject({ installerId: a.status === 200 ? "usr_inst_1" : "usr_inst_2", source: { kind: "ready_site", ref: s.ref } });
    expect((job as any).milestones.installer_assigned).toBeTruthy();
    expect(w.messaging.sent.some((m) => m.to === "+61400000201" && /will install your system/.test(m.body))).toBe(true);
    expect((await w.call("GET", "/public/market/sites", null)).body.data).toHaveLength(0);
  });

  it("from an installer go to EasyLink to check, and can't be bought by the seller", async () => {
    const w = world();
    const s = (await w.call("POST", "/v1/ai/market/sites", "inst", w.site())).body.data;
    expect(s.createdBy).toMatchObject({ kind: "installer", id: "usr_inst_1" });
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/publish`, "inst")).status).toBe(403);
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/submit`, "inst", {})).body.message).toContain("customer agreed");
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/submit`, "inst", { customerAgreed: true })).body.data.status).toBe("review");
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/approve`, "admin", {})).body.data.status).toBe("live");
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/buy`, "inst", { agree: true })).body.message).toContain("your own");
  });

  it("give Elite installers a head start", async () => {
    const w = world();
    const s = (await w.call("POST", "/v1/ai/market/sites", "admin", w.site({ visibility: { area: "everyone", eliteHeadStartHours: 24 } }))).body.data;
    await w.call("POST", `/v1/ai/market/sites/${s.id}/publish`, "admin");
    expect((await w.call("GET", "/v1/ai/market/sites", "inst")).body.data.forSale).toHaveLength(1);
    expect((await w.call("GET", "/v1/ai/market/sites", "inst2")).body.data.forSale).toHaveLength(0);
    expect((await w.call("POST", `/v1/ai/market/sites/${s.id}/buy`, "inst2", { agree: true })).status).toBe(403);
  });
});

describe("Ready Deals", () => {
  it("check the 133% rule and need EasyLink's approval before going live", async () => {
    const w = world();
    const over = await w.call("POST", "/v1/ai/market/deals/check", "inst", w.deal({ items: [{ category: "panel", model: "440 W", qty: 20, watts: 440 }, { category: "inverter", model: "5 kW", qty: 1, kw: 5 }] }));
    expect(over.body.data.problems.join(" ")).toContain("133%");
    const d = (await w.call("POST", "/v1/ai/market/deals", "inst", w.deal())).body.data;
    expect(d).toMatchObject({ status: "draft", kw: 6.6, installerName: "Rivers Electrical" });
    expect(d.stcs.total).toBeGreaterThan(100);
    expect((await w.call("POST", `/v1/ai/market/deals/${d.id}/submit`, "inst")).body.data.status).toBe("review");
    expect((await w.call("GET", "/public/market/deals", null)).body.data).toHaveLength(0);
    expect((await w.call("POST", `/v1/ai/market/deals/${d.id}/approve`, "inst")).status).toBe(403);
    expect((await w.call("POST", `/v1/ai/market/deals/${d.id}/reject`, "admin", {})).body.message).toContain("Say what needs changing");
    expect((await w.call("POST", `/v1/ai/market/deals/${d.id}/approve`, "admin")).body.data.status).toBe("live");
    const pub = (await w.call("GET", "/public/market/deals?postcode=2153", null)).body.data;
    expect(pub).toHaveLength(1);
    expect(pub[0].deposit).toBe(7495);
    expect((await w.call("GET", "/public/market/deals?postcode=3000", null)).body.data).toHaveLength(0);
  });

  it("are bought on the website: 50% now, the job with the installer, the other 50% before installation", async () => {
    const w = world();
    const d = (await w.call("POST", "/v1/ai/market/deals", "inst", w.deal())).body.data;
    await w.call("POST", `/v1/ai/market/deals/${d.id}/submit`, "inst");
    await w.call("POST", `/v1/ai/market/deals/${d.id}/approve`, "admin");

    expect((await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer())).status).toBe(401);
    const far = await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer({ customer: { ...w.buyer().customer, postcode: "3000" } }), w.web);
    expect(far.body.message).toContain("doesn't install in 3000");
    expect((await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer({ terms: false }), w.web)).body.message).toContain("terms and refund policy");

    const bought = await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer(), w.web);
    expect(bought.status).toBe(200);
    expect(bought.body.data.deposit.amount).toBe(7495);
    expect(bought.body.data.balance).toBe(7495);
    const jobId = bought.body.data.jobId;
    let job = (await w.c.store.getRecord("job", jobId)) as any;
    expect(job).toMatchObject({ installerId: "usr_inst_1", payPlan: "half_before_install", source: { kind: "ready_deal", ref: d.ref } });
    expect(job.milestones.selection_confirmed).toBeTruthy();
    expect(w.messaging.sent.some((m) => m.channel === "email" && m.to === "mei@example.test" && /Refunds:/.test(m.body))).toBe(true);

    expect((await w.call("POST", `/public/market/orders/${bought.body.data.orderId}/pay`, null, { token: "wrong" }, w.web)).status).toBe(404);
    const paid = await w.call("POST", `/public/market/orders/${bought.body.data.orderId}/pay`, null, { token: bought.body.data.payToken }, w.web);
    expect(paid.body.data.paid).toBe(true);
    job = (await w.c.store.getRecord("job", jobId)) as any;
    expect(job.milestones.deposit_paid).toBeTruthy();

    const orders = (await w.call("GET", "/v1/ai/market/orders", "inst")).body.data;
    expect(orders[0]).toMatchObject({ dealRef: d.ref, status: "active", stage: "Call the customer" });
    expect(orders[0].payToken).toBeUndefined();
    expect((await w.call("GET", "/v1/ai/market/orders", "inst2")).body.data).toHaveLength(0);

    // Installer checks the site and accepts; customer signs; dates; then the balance is due before installation.
    job.milestones.site_photos_ok = { at: new Date().toISOString(), by: "usr_inst_1" };
    await w.c.store.putRecord("job", job);
    const step = (token: string, action: string, input: Record<string, unknown> = {}) => w.call("POST", `/v1/ai/jobs/${jobId}/steps/${action}`, token, input);
    expect((await step("inst", "accept_job")).status).toBe(200);
    const sigs = (await w.c.store.listRecords("signature")).filter((x: any) => x.jobId === jobId) as any[];
    const agreement = sigs.find((x) => x.kind === "agreement");
    const cust = { kind: "customer" as const, id: String(job.customerId), roles: ["CUSTOMER"], on_behalf_of: null };
    const { JobService } = await import("../src/jobs/service.js");
    const js = new JobService(w.c);
    const meta = { user: { customerId: job.customerId } };
    const code = (await js.act(jobId, "request_code", { signatureId: agreement.id }, cust, meta)) as any;
    await js.act(jobId, "sign", { signatureId: agreement.id, code: code.devCode }, cust, meta);
    job = (await w.c.store.getRecord("job", jobId)) as any;
    expect(job.windows.length).toBeGreaterThan(0);
    expect((await w.c.store.listRecords("invoice")).filter((i: any) => i.jobId === jobId && i.kind === "deposit")).toHaveLength(1);
    await js.act(jobId, "pick_window", { windowId: job.windows[0].id }, cust, meta);
    const balance = (await w.c.store.listRecords("invoice")).find((i: any) => i.jobId === jobId && i.kind === "final") as any;
    expect(balance).toMatchObject({ status: "sent" });
    expect(Math.round(balance.totals.total)).toBe(7495);

    job = (await w.c.store.getRecord("job", jobId)) as any;
    for (const k of ["delivered", "connection_approved"]) job.milestones[k] = { at: new Date().toISOString(), by: "test" };
    await w.c.store.putRecord("job", job);
    expect((await step("inst", "check_in", { day: 1, lat: -33.76, lng: 150.99 })).body.message).toContain("balance must be paid");
    await js.act(jobId, "pay_invoice", { invoiceId: balance.id }, cust, meta);
    expect((await step("inst", "check_in", { day: 1, lat: -33.76, lng: 150.99 })).status).toBe(200);
    job = (await w.c.store.getRecord("job", jobId)) as any;
    expect(job.site.lat).toBe(-33.76);
  });

  it("can't be oversold, and EasyLink can cancel and refund an order", async () => {
    const w = world();
    const d = (await w.call("POST", "/v1/ai/market/deals", "inst", w.deal({ quantity: 1 }))).body.data;
    await w.call("POST", `/v1/ai/market/deals/${d.id}/submit`, "inst");
    await w.call("POST", `/v1/ai/market/deals/${d.id}/approve`, "admin");
    const first = await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer(), w.web);
    await w.call("POST", `/public/market/orders/${first.body.data.orderId}/pay`, null, { token: first.body.data.payToken }, w.web);
    const second = await w.call("POST", `/public/market/deals/${d.id}/buy`, null, w.buyer({ customer: { ...w.buyer().customer, email: "b@example.test" } }), w.web);
    expect(second.status).toBe(409);
    expect((await w.call("GET", "/public/market/deals", null)).body.data).toHaveLength(0);

    expect((await w.call("POST", `/v1/ai/market/orders/${first.body.data.orderId}/cancel`, "inst", { reason: "x" })).status).toBe(403);
    const c = await w.call("POST", `/v1/ai/market/orders/${first.body.data.orderId}/cancel`, "admin", { reason: "Changed their mind within the cooling-off period" });
    expect(c.body.data).toMatchObject({ status: "refunded", cancel: { refund: 7495 } });
    expect((await w.call("GET", "/public/market/deals", null)).body.data).toHaveLength(1);
    expect((await w.c.store.listRecords("invoice")).some((i: any) => i.kind === "credit")).toBe(true);
  });

  it("respect the membership's live-deal limit", async () => {
    const w = world();
    for (let i = 0; i < 3; i++) {
      const d = (await w.call("POST", "/v1/ai/market/deals", "inst2", w.deal({ title: `Deal ${i}` }))).body.data;
      await w.call("POST", `/v1/ai/market/deals/${d.id}/submit`, "inst2");
      const r = await w.call("POST", `/v1/ai/market/deals/${d.id}/approve`, "admin");
      if (i < 2) expect(r.status).toBe(200);
      else expect(r.body.message).toContain("starter membership allows");
    }
  });
});
