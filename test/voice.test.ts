import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { normalisePhone } from "../src/http/voice.js";
import { newJob } from "../src/jobs/service.js";
import { setup } from "./helpers.js";

const prev = process.env.AI_MODE;
beforeAll(() => {
  process.env.AI_MODE = "local";
});
afterAll(() => {
  process.env.AI_MODE = prev;
});

async function world() {
  const s = setup();
  s.backend.seed("user", [
    { id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", lastName: "Rivers", phone: "+61400000101", lat: -33.815, lng: 151.0011, rating: 4.8, reviewCount: 40, reliability: 0.95, saaExpiry: "2099-01-01", batteryEndorsed: true, serviceRadiusKm: 60 },
    { id: "usr_admin_9", role: "ADMIN", firstName: "Ops", phone: "+61400000999" },
  ]);
  const app = createApp(s.c);
  const j = newJob({
    leadId: "ld_1", customerId: "cus_1", customerName: "Dan Okafor", customerEmail: "dan@example.test", customerPhone: "+61400000301",
    seller: { name: "Rivers Electrical", abn: "12 345 678 901" },
    site: { address: "7 Gum Tree Ct, Castle Hill NSW 2154", postcode: "2154", state: "NSW", lat: -33.7296, lng: 151.0053, phases: 1, zoneRating: 1.382, zoneConfirmed: true },
    selection: { designId: null, title: "Solar + battery", kw: 6.6, panels: { model: "Panel", count: 15, watts: 440 }, inverter: { model: "Hybrid 5", kw: 5 }, battery: { model: "Battery", usableKwh: 12.8 }, accessories: [], price: 17990, annualOutputKwh: 9100, savingsPerYear: 2600 },
    dnsp: "Endeavour Energy",
  });
  await s.c.store.putRecord("job", j as never);
  const portal = (token: string, action: string, input: Record<string, unknown> = {}) =>
    app.request(`/v1/ai/jobs/ld_1/steps/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const voice = async (method: string, path: string, body?: unknown, key = "voice-local") => {
    const r = await app.request(path, { method, headers: { "x-voice-key": key, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json()) as { data: any; message: string } };
  };
  const lastCode = () => /code is (\d{6})/.exec(s.messaging.sent.filter((m) => m.channel === "sms").at(-1)?.body ?? "")?.[1] ?? "";
  return { ...s, app, portal, voice, lastCode };
}

describe("phone numbers", () => {
  it("normalise Australian formats", () => {
    expect(normalisePhone("0400 000 301")).toBe("+61400000301");
    expect(normalisePhone("61400000301")).toBe("+61400000301");
    expect(normalisePhone("sip:+61400000301@sip.crazytel.net.au")).toBe("+61400000301");
    expect(normalisePhone("(02) 9876 5432")).toBe("+61298765432");
  });
});

describe("voice calls", () => {
  it("need the voice key", async () => {
    const w = await world();
    expect((await w.voice("POST", "/voice/calls", { callId: "c1", from: "0400000301" }, "wrong")).status).toBe(401);
  });

  it("say nothing about a job until the caller reads back the texted code", async () => {
    const w = await world();
    const start = await w.voice("POST", "/voice/calls", { callId: "c1", from: "0400 000 301" });
    expect(start.body.data).toEqual({ known: true, kind: "customer", verified: false });
    expect((await w.voice("GET", "/voice/calls/c1/jobs/ld_1")).status).toBe(403);
    expect((await w.voice("POST", "/voice/calls/c1/code")).body.data.sentTo).toBe("number ending 301");
    const bad = await w.voice("POST", "/voice/calls/c1/verify", { code: "000000" === w.lastCode() ? "111111" : "000000" });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toContain("4 tries left");
    const ok = await w.voice("POST", "/voice/calls/c1/verify", { code: w.lastCode().split("").join(" ") });
    expect(ok.status).toBe(200);
    expect(ok.body.data.firstName).toBe("Dan");
    expect(ok.body.data.jobs[0].address).toBe("7 Gum Tree Ct, Castle Hill NSW 2154");
  });

  it("don't recognise unknown or staff numbers", async () => {
    const w = await world();
    expect((await w.voice("POST", "/voice/calls", { callId: "c2", from: "0499999999" })).body.data.known).toBe(false);
    expect((await w.voice("POST", "/voice/calls", { callId: "c3", from: "+61400000999" })).body.data.known).toBe(false);
    expect((await w.voice("POST", "/voice/calls/c3/code")).status).toBe(403);
  });

  it("let a verified customer confirm their selection by phone, and keep their words", async () => {
    const w = await world();
    await w.portal("admin", "match");
    await w.portal("inst", "accept_offer");
    await w.voice("POST", "/voice/calls", { callId: "c4", from: "+61400000301" });
    await w.voice("POST", "/voice/calls/c4/code");
    await w.voice("POST", "/voice/calls/c4/verify", { code: w.lastCode() });
    const r = await w.voice("POST", "/voice/calls/c4/jobs/ld_1/steps/confirm_selection", { transcript: "Yes, 15 panels, the Hybrid 5 and the 12.8 battery." });
    expect(r.status).toBe(200);
    expect(r.body.data.job.yourNextSteps).not.toContain("Confirm your panels, battery and extras");
    const job = (await w.c.store.getRecord("job", "ld_1")) as any;
    expect(job.confirmation.transcript).toMatch(/^On a phone call \(\+61400000301\): Yes, 15 panels/);
    // Payments and uploads stay in the portal.
    expect((await w.voice("POST", "/voice/calls/c4/jobs/ld_1/steps/pay_invoice", {})).status).toBe(400);
    const link = await w.voice("POST", "/voice/calls/c4/jobs/ld_1/link", { what: "photos" });
    expect(link.status).toBe(200);
    expect(w.messaging.sent.at(-1)?.body).toContain("/customers/project");
  });

  it("let a verified installer accept an offer by phone, and log the call on the job", async () => {
    const w = await world();
    await w.portal("admin", "match");
    await w.voice("POST", "/voice/calls", { callId: "c5", from: "0400000101" });
    await w.voice("POST", "/voice/calls/c5/code");
    const v = await w.voice("POST", "/voice/calls/c5/verify", { code: w.lastCode() });
    expect(v.body.data.kind).toBe("installer");
    expect(v.body.data.jobs[0].address).toBe("2154 area");
    expect(v.body.data.jobs[0].openOffer).not.toBeNull();
    expect((await w.voice("POST", "/voice/calls/c5/jobs/ld_1/steps/accept_offer", {})).status).toBe(200);
    expect((await w.voice("POST", "/voice/calls/c5/end", { durationSec: 95, jobId: "ld_1", summary: "Sam accepted the job.", recordingKey: "calls/2026-10-22/c5.ogg" })).status).toBe(200);
    expect(w.bus.published.some((e: any) => e.data?.title === "Phone call with Sam (2 min)")).toBe(true);
    await w.voice("POST", "/voice/calls", { callId: "c7", from: "0499999999" });
    await w.voice("POST", "/voice/calls/c7/end", { messages: ["Wants a quote for a 10 kW system, after 3pm"] });
    expect(w.messaging.sent.at(-1)).toMatchObject({ channel: "email", subject: "Call back +61499999999" });
    const call = (await w.c.store.getRecord("voice_call", "c5")) as any;
    expect(call.recordingKey).toBe("calls/2026-10-22/c5.ogg");
    expect(call.endedAt).toBeTruthy();
  });

  it("email the code when a text can't be sent", async () => {
    const w = await world();
    w.messaging.sendSms = async () => {
      throw new Error('ConflictException: Reason="DESTINATION_PHONE_NUMBER_NOT_VERIFIED"');
    };
    await w.voice("POST", "/voice/calls", { callId: "c9", from: "0400000301" });
    const r = await w.voice("POST", "/voice/calls/c9/code");
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ channel: "email", sentTo: "email d•••@example.test" });
    const mail = w.messaging.sent.filter((m) => m.channel === "email").at(-1) as { to: string; subject: string; body: string };
    expect(mail.to).toBe("dan@example.test");
    const code = /code is (\d{6})/.exec(mail.body)?.[1] ?? "";
    expect(code).toMatch(/^\d{6}$/);
    expect((await w.voice("POST", "/voice/calls/c9/verify", { code })).status).toBe(200);
  });

  it("save the call on the customer's record in the backend when it ends", async () => {
    const w = await world();
    await w.voice("POST", "/voice/calls", { callId: "pstn-c10", from: "0400000301" });
    const r = await w.voice("POST", "/voice/calls/pstn-c10/end", {
      durationSec: 61.4,
      startedAt: "2026-10-27T01:00:00.000Z",
      recordingKey: "calls/2026-10-27/pstn-c10.ogg",
      messages: ["Wants a battery quote"],
      turns: [
        { who: "agent", text: "Hi, EasyLink AI" },
        { who: "system", tool_result: "ok" },
        { who: "caller", text: "Battery quote please" },
      ],
    });
    expect(r.status).toBe(200);
    const sent = w.backend.calls.find((x) => x.method === "POST" && x.path === "/call-records/ai");
    expect(sent?.body).toMatchObject({
      roomName: "pstn-c10",
      from: "+61400000301",
      durationSec: 61,
      verified: false,
      recordingKey: "calls/2026-10-27/pstn-c10.ogg",
      messages: ["Wants a battery quote"],
      transcript: [
        { who: "agent", text: "Hi, EasyLink AI" },
        { who: "caller", text: "Battery quote please" },
      ],
    });
  });

  it("hand the call to a person who accepts, and note it on the call record", async () => {
    const w = await world();
    let status = "RINGING";
    w.backend.routes.push((method, path, body) => {
      if (method === "POST" && path === "/live-calls/transfers") return { ok: true, status: 201, data: { transferId: "tr_1", offered: true, status: "RINGING", ringSeconds: 30, sent: body } };
      if (method === "GET" && path === "/live-calls/transfers/tr_1") return { ok: true, status: 200, data: { status, acceptedBy: status === "ACCEPTED" ? "Sujay" : null } };
      return undefined;
    });
    await w.voice("POST", "/voice/calls", { callId: "pstn-t1", from: "0400000301" });
    const offer = await w.voice("POST", "/voice/calls/pstn-t1/transfer", { summary: "Wants to book a site visit", reason: "Ready to book" });
    expect(offer.body.data).toEqual({ offered: true, status: "RINGING", ringSeconds: 30 });
    expect(w.backend.calls.find((x) => x.path === "/live-calls/transfers")?.body).toMatchObject({ roomName: "pstn-t1", callerNumber: "+61400000301", summary: "Wants to book a site visit" });
    expect((await w.voice("GET", "/voice/calls/pstn-t1/transfer")).body.data.status).toBe("RINGING");
    status = "ACCEPTED";
    expect((await w.voice("GET", "/voice/calls/pstn-t1/transfer")).body.data).toEqual({ status: "ACCEPTED", acceptedBy: "Sujay" });
    await w.voice("POST", "/voice/calls/pstn-t1/end", { summary: "Caller wants a site visit." });
    expect(w.backend.calls.some((x) => x.path.endsWith("/cancel"))).toBe(false);
    expect((w.backend.calls.find((x) => x.path === "/call-records/ai")?.body as { summary: string }).summary).toBe("Caller wants a site visit. Handed to Sujay, who took over the call.");
  });

  it("cancel the transfer when the caller hangs up while waiting, so they're called back", async () => {
    const w = await world();
    w.backend.routes.push((method, path) => {
      if (method === "POST" && path === "/live-calls/transfers") return { ok: true, status: 201, data: { transferId: "tr_2", offered: true, status: "RINGING", ringSeconds: 30 } };
      if (method === "POST" && path === "/live-calls/transfers/tr_2/cancel") return { ok: true, status: 200, data: { status: "CANCELLED" } };
      return undefined;
    });
    await w.voice("POST", "/voice/calls", { callId: "pstn-t2", from: "0400000301" });
    await w.voice("POST", "/voice/calls/pstn-t2/transfer", { summary: "Question about rebates" });
    await w.voice("POST", "/voice/calls/pstn-t2/end", {});
    expect(w.backend.calls.find((x) => x.path === "/live-calls/transfers/tr_2/cancel")?.body).toEqual({ reason: "the caller hung up while waiting" });
  });

  it("say so when the backend can't take a transfer", async () => {
    const w = await world();
    w.backend.routes.push((method, path) => (path === "/live-calls/transfers" ? { ok: false, status: 404, data: null, message: "Not found" } : undefined));
    await w.voice("POST", "/voice/calls", { callId: "pstn-t3", from: "0400000301" });
    const r = await w.voice("POST", "/voice/calls/pstn-t3/transfer", { summary: "x" });
    expect(r.status).toBe(404);
  });

  it("stop after five wrong codes", async () => {
    const w = await world();
    await w.voice("POST", "/voice/calls", { callId: "c6", from: "+61400000301" });
    await w.voice("POST", "/voice/calls/c6/code");
    const wrong = w.lastCode() === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await w.voice("POST", "/voice/calls/c6/verify", { code: wrong });
    expect((await w.voice("POST", "/voice/calls/c6/verify", { code: w.lastCode() })).status).toBe(429);
  });
});
