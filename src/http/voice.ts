import { createHash, randomInt } from "node:crypto";
import type { Context, Hono } from "hono";
import { z } from "zod";
import type { Container } from "../container.js";
import type { Principal } from "../core/envelope.js";
import { JobError, type JobService } from "../jobs/service.js";
import type { Job } from "../jobs/model.js";
import { principalFromUser, type Env } from "./app.js";

/**
 * Phone calls (the LiveKit voice agent). The agent authenticates with the voice key,
 * then acts for the caller:
 *   POST /voice/calls                                  a call started: who is this number?
 *   POST /voice/calls/:callId/code                     text a 6-digit code to the number on file
 *   POST /voice/calls/:callId/verify                   check the code the caller reads back
 *   GET  /voice/calls/:callId/jobs/:jobId              the job, short enough to read out
 *   POST /voice/calls/:callId/jobs/:jobId/steps/:a     do a step the caller may do by phone
 *   POST /voice/calls/:callId/jobs/:jobId/link         text a link (pay, photos, bill, documents)
 *   POST /voice/calls/:callId/end                      transcript and recording location, into job history
 *
 * Caller ID can be spoofed, so nothing about a job is said or done until the caller
 * reads back a code texted to the number on file.
 */

/** Steps that make sense on a call. Uploads, payments and on-site work stay in the portal. */
export const VOICE_STEPS: Record<"customer" | "installer", string[]> = {
  customer: ["confirm_selection", "request_code", "sign", "pick_window"],
  installer: [
    "accept_offer", "decline_offer", "accept_job", "request_photos", "propose_windows",
    "submit_connection", "record_approval", "request_bills", "confirm_quote",
    "book_delivery", "mark_delivered", "send_invoice", "send_site_docs", "send_stc_pack",
    "send_handover", "resolve_issue", "request_code",
  ],
};

const PORTAL = process.env.PORTAL_BASE_URL ?? "https://www.easylinksolar.com.au";
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? "sales@easylinksolar.com.au";

type VoiceCall = {
  id: string;
  phone: string;
  known: boolean;
  kind: "customer" | "installer" | null;
  principal: Principal | null;
  user: Record<string, unknown>;
  firstName: string;
  verified: boolean;
  codeHash?: string;
  codeExpires?: string;
  codesSent: number;
  attempts: number;
  jobIds: string[];
  startedAt: string;
  endedAt?: string;
  transcriptKey?: string;
  recordingKey?: string;
  summary?: string;
};

/** Australian numbers in any common form → +61XXXXXXXXX. */
export function normalisePhone(raw: string): string {
  const d = String(raw ?? "").replace(/^sip:/i, "").replace(/@.*$/, "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("61")) return `+${d}`;
  if (d.startsWith("0")) return `+61${d.slice(1)}`;
  return d ? `+${d}` : "";
}
const variants = (e164: string) => (e164.startsWith("+61") ? [e164, `0${e164.slice(3)}`] : [e164]);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const safeEq = (a: string, b: string) => a.length === b.length && sha(a) === sha(b);
/** j•••@example.com: enough for the caller to recognise, not enough to read out someone's address. */
export function maskEmail(e: string): string {
  const [user, domain] = e.split("@");
  return `${(user ?? "").slice(0, 1)}•••@${domain ?? ""}`;
}

export function registerVoiceRoutes(app: Hono<Env>, c: Container, jobs: JobService, opts: { key?: string } = {}) {
  const key = opts.key ?? process.env.VOICE_KEY ?? (process.env.AI_MODE === "local" ? "voice-local" : "");
  const svc = { token: c.serviceToken };
  const meta = (call: VoiceCall) => ({ ip: "phone", userAgent: "EasyLink voice agent", token: null, user: call.user });

  app.use("/voice/*", async (ctx, next) => {
    const k = ctx.req.header("x-voice-key") ?? "";
    if (!key || !k || !safeEq(k, key)) return ctx.json({ success: false, message: "Unauthorised" }, 401);
    return next();
  });

  const load = async (id: string) => (await c.store.getRecord("voice_call", id)) as unknown as VoiceCall | undefined;
  const save = (v: VoiceCall) => c.store.putRecord("voice_call", v as unknown as Record<string, unknown> & { id: string });
  const fail = (ctx: Context<Env>, e: unknown) => {
    if (e instanceof JobError) return ctx.json({ success: false, message: e.message }, e.status as 400);
    if (e instanceof z.ZodError) return ctx.json({ success: false, message: "Check the details", errors: e.issues }, 400);
    console.error("voice", e);
    return ctx.json({ success: false, message: "Something went wrong" }, 500);
  };
  const verified = async (ctx: Context<Env>) => {
    const v = await load(ctx.req.param("callId") ?? "");
    if (!v) throw new JobError("Call not found", 404);
    if (!v.principal) throw new JobError("This number isn't on an EasyLink account", 403);
    if (!v.verified) throw new JobError("Verify the caller first: text a code and have them read it back", 403);
    return v;
  };
  const myJob = async (v: VoiceCall, jobId: string) => {
    const j = await jobs.get(jobId);
    if (!j || !(await jobs.canSee(j, v.principal!, meta(v)))) throw new JobError("Not one of this caller's jobs", 404);
    return j;
  };

  /** Who owns this number: an installer or customer user, else a customer record, else a job's customer phone. */
  async function identify(phone: string): Promise<Pick<VoiceCall, "known" | "kind" | "principal" | "user" | "firstName">> {
    const same = (x: unknown) => normalisePhone(String(x ?? "")) === phone;
    for (const q of variants(phone)) {
      const users = ((await c.backend.list("user", { search: q }, svc)).data ?? []) as Record<string, unknown>[];
      const u = users.find((x) => same(x.phone));
      if (u) {
        const p = principalFromUser(u);
        if (p.kind === "customer" || p.kind === "installer") return { known: true, kind: p.kind, principal: p, user: u, firstName: String(u.firstName ?? "") };
        return { known: false, kind: null, principal: null, user: {}, firstName: "" }; // staff numbers don't get phone access
      }
      const custs = ((await c.backend.list("customer", { search: q }, svc)).data ?? []) as Record<string, unknown>[];
      const cu = custs.find((x) => same(x.phone));
      if (cu) {
        const user = { id: String(cu.userId ?? `phone-${cu.id}`), customerId: String(cu.id), email: cu.email };
        return { known: true, kind: "customer", principal: { kind: "customer", id: user.id, roles: ["CUSTOMER"], on_behalf_of: null }, user, firstName: String(cu.firstName ?? "") };
      }
    }
    const j = ((await c.store.listRecords("job")) as unknown as Job[]).find((x) => x.customerId && same(x.customerPhone));
    if (j) {
      const user = { id: `phone-${j.customerId}`, customerId: String(j.customerId) };
      return { known: true, kind: "customer", principal: { kind: "customer", id: user.id, roles: ["CUSTOMER"], on_behalf_of: null }, user, firstName: j.customerName.split(" ")[0] ?? "" };
    }
    return { known: false, kind: null, principal: null, user: {}, firstName: "" };
  }

  /** The email on the caller's account: their user record, else a job for their customer record. */
  async function emailFor(v: VoiceCall): Promise<string | null> {
    const direct = String(v.user.email ?? "").trim();
    if (direct.includes("@")) return direct;
    const cid = String(v.user.customerId ?? "");
    const j = ((await c.store.listRecords("job")) as unknown as Job[]).find((x) => (cid && x.customerId === cid) || normalisePhone(String(x.customerPhone ?? "")) === v.phone);
    const e = String(j?.customerEmail ?? "").trim();
    return e.includes("@") ? e : null;
  }

  /** A job, short enough for the agent to read from. */
  async function brief(j: Job, v: VoiceCall) {
    const view = (await jobs.view(j, v.principal!)) as Record<string, any>;
    return {
      id: j.id,
      address: v.kind === "installer" && !j.installerId ? `${j.site.postcode} area` : j.site.address,
      system: `${j.selection.kw.toFixed(1)} kW solar${j.selection.battery ? ` + ${j.selection.battery.usableKwh} kWh battery` : ""}`,
      price: j.selection.price,
      installer: j.installerName ?? null,
      stage: view.stage,
      yourNextSteps: (view.next ?? []).map((n: any) => n.label),
      waitingOn: (view.waitingOn ?? []).map((n: any) => `${n.who}: ${n.label}`),
      installDates: j.installDates ?? null,
      dateOptions: j.windows.map((w) => ({ windowId: w.id, day1: w.day1, day2: w.day2 })),
      invoices: (view.invoices ?? []).map((i: any) => ({ invoiceId: i.id, number: i.number, kind: i.kind, total: i.totals?.total, status: i.status, dueDate: i.dueDate })),
      documents: (view.signatures ?? []).map((s: any) => ({ signatureId: s.id, title: s.title, status: s.status, signer: s.signer?.who })),
      openOffer: (view.offers ?? []).find((o: any) => o.status === "open") ? { expiresAt: (view.offers ?? []).find((o: any) => o.status === "open").expiresAt } : null,
      photosNeeded: j.photos.items.filter((p) => !p.ok).map((p) => (p.note ? `${p.label} (${p.note})` : p.label)),
      monitoringIssues: j.monitoring.issues.filter((i) => i.status === "open").map((i) => i.text),
    };
  }

  app.post("/voice/calls", async (ctx) => {
    try {
      const b = z.object({ callId: z.string().min(1).max(120), from: z.string().min(3).max(80) }).parse(await ctx.req.json());
      const phone = normalisePhone(b.from);
      const prev = await load(b.callId);
      if (prev) return ctx.json({ success: true, message: "OK", data: { known: prev.known, kind: prev.kind, verified: prev.verified } });
      const who = await identify(phone);
      const v: VoiceCall = { id: b.callId, phone, ...who, verified: false, codesSent: 0, attempts: 0, jobIds: [], startedAt: new Date().toISOString() };
      await save(v);
      // Before verification the agent learns only whether the number is known and as what.
      return ctx.json({ success: true, message: "OK", data: { known: v.known, kind: v.kind, verified: false } });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.post("/voice/calls/:callId/code", async (ctx) => {
    try {
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v) throw new JobError("Call not found", 404);
      if (!v.principal) throw new JobError("This number isn't on an EasyLink account", 403);
      if (v.codesSent >= 3) throw new JobError("Three codes have been sent on this call. Ask them to use the portal or call back later.", 429);
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      v.codeHash = sha(`${v.id}:${code}`);
      v.codeExpires = new Date(Date.now() + 10 * 60e3).toISOString();
      v.codesSent += 1;
      v.attempts = 0;
      await save(v);
      const text = `EasyLink Solar: your phone code is ${code}. Read it to our assistant on the call. It expires in 10 minutes. Don't share it with anyone else.`;
      // Text first. Until texts can reach every number (sender ID registration), fall back to the account's email.
      let smsError: unknown = null;
      if (process.env.VOICE_CODE_CHANNEL !== "email") {
        try {
          await c.messaging.sendSms({ to: v.phone, body: text });
          return ctx.json({ success: true, message: "OK", data: { channel: "sms", sentTo: `number ending ${v.phone.slice(-3)}` } });
        } catch (e) {
          smsError = e;
        }
      }
      const email = await emailFor(v);
      if (!email) {
        if (smsError) throw smsError;
        throw new JobError("There's no email address on this account to send a code to", 409);
      }
      await c.messaging.sendEmail({
        to: email,
        subject: `Your EasyLink phone code: ${code}`,
        body: `Hi${v.firstName ? ` ${v.firstName}` : ""},\n\nYour phone code is ${code}. Read it to our assistant on the call. It expires in 10 minutes.\n\nIf you're not on a call with EasyLink Solar right now, ignore this email and don't share the code with anyone.\n\nEasyLink Solar`,
      });
      return ctx.json({ success: true, message: "OK", data: { channel: "email", sentTo: `email ${maskEmail(email)}` } });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.post("/voice/calls/:callId/verify", async (ctx) => {
    try {
      const { code } = z.object({ code: z.string().max(20) }).parse(await ctx.req.json());
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v?.principal || !v.codeHash) throw new JobError("Send a code first", 409);
      if (v.attempts >= 5) throw new JobError("Too many wrong codes on this call", 429);
      if (!v.codeExpires || v.codeExpires < new Date().toISOString()) throw new JobError("That code has expired. Send a new one.", 410);
      const digits = code.replace(/\D/g, "");
      if (!safeEq(sha(`${v.id}:${digits}`), v.codeHash)) {
        v.attempts += 1;
        await save(v);
        throw new JobError(`That code doesn't match (${5 - v.attempts} tries left).`, 400);
      }
      v.verified = true;
      v.codeHash = undefined;
      const list = await jobs.list(v.principal, meta(v));
      v.jobIds = list.map((j) => j.id);
      await save(v);
      return ctx.json({ success: true, message: "OK", data: { firstName: v.firstName, kind: v.kind, jobs: await Promise.all(list.slice(0, 5).map((j) => brief(j, v))) } });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.get("/voice/calls/:callId/jobs/:jobId", async (ctx) => {
    try {
      const v = await verified(ctx);
      return ctx.json({ success: true, message: "OK", data: await brief(await myJob(v, ctx.req.param("jobId") ?? ""), v) });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.post("/voice/calls/:callId/jobs/:jobId/steps/:action", async (ctx) => {
    try {
      const v = await verified(ctx);
      const action = ctx.req.param("action") ?? "";
      if (!VOICE_STEPS[v.kind!].includes(action)) throw new JobError("That can't be done over the phone. Text them a link to the portal instead.", 400);
      const j = await myJob(v, ctx.req.param("jobId") ?? "");
      const input = z.record(z.unknown()).parse(await ctx.req.json().catch(() => ({})));
      // A spoken confirmation keeps the caller's words, marked as said on a call.
      if (action === "confirm_selection") input.transcript = `On a phone call (${v.phone}): ${String(input.transcript ?? "").slice(0, 1800)}`;
      const data = await jobs.act(j.id, action, input, v.principal!, meta(v));
      return ctx.json({ success: true, message: "OK", data: { result: data, job: await brief((await jobs.get(j.id))!, v) } });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.post("/voice/calls/:callId/jobs/:jobId/link", async (ctx) => {
    try {
      const v = await verified(ctx);
      const { what } = z.object({ what: z.enum(["pay", "photos", "bill", "documents", "sign", "job"]) }).parse(await ctx.req.json());
      const j = await myJob(v, ctx.req.param("jobId") ?? "");
      const url = v.kind === "installer" ? `${PORTAL}/installers/dashboard/jobs/${encodeURIComponent(j.id)}` : `${PORTAL}/customers/project`;
      const why = { pay: "to pay your invoice", photos: "to upload your photos", bill: "to upload your energy bill", documents: "to read your documents", sign: "to read and sign your document", job: "for your job" }[what];
      await c.messaging.sendSms({ to: v.phone, body: `EasyLink Solar: here's the link ${why}: ${url}` });
      return ctx.json({ success: true, message: "OK", data: { sent: true } });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  app.post("/voice/calls/:callId/end", async (ctx) => {
    try {
      const b = z.object({ durationSec: z.number().min(0).max(36000).optional(), transcriptKey: z.string().max(300).optional(), recordingKey: z.string().max(300).optional(), summary: z.string().max(1000).optional(), jobId: z.string().max(80).optional(), messages: z.array(z.string().max(600)).max(10).optional(), startedAt: z.string().max(40).optional(), turns: z.array(z.object({ who: z.string().max(20), text: z.string().max(4000).optional() }).passthrough()).max(2000).optional() }).parse(await ctx.req.json().catch(() => ({})));
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v) throw new JobError("Call not found", 404);
      Object.assign(v, { endedAt: new Date().toISOString(), transcriptKey: b.transcriptKey, recordingKey: b.recordingKey, summary: b.summary });
      await save(v);
      // Messages left for the team (questions the agent couldn't answer, callers who want a call back).
      if (b.messages?.length) {
        const who = v.verified ? `${v.firstName || v.kind} (verified ${v.kind})` : v.known ? `a ${v.kind} number, not verified` : "an unknown caller";
        await c.messaging.sendEmail({ to: STAFF_EMAIL, subject: `Call back ${v.phone}`, body: `A phone call from ${v.phone} — ${who} — left ${b.messages.length > 1 ? "these messages" : "this message"}:\n\n- ${b.messages.join("\n- ")}\n\nCall ID ${v.id}${b.recordingKey ? `\nRecording: ${b.recordingKey}` : ""}` }).catch((e) => console.error("voice staff email", e));
      }
      if (v.verified && v.principal && b.jobId && v.jobIds.includes(b.jobId)) {
        const mins = Math.max(1, Math.round((b.durationSec ?? 0) / 60));
        await jobs.noteCall(b.jobId, v.principal, `Phone call with ${v.firstName || v.kind} (${mins} min)`, [b.summary, b.recordingKey && `Recording: ${b.recordingKey}`, b.transcriptKey && `Transcript: ${b.transcriptKey}`].filter(Boolean).join("\n"));
      }
      // Save the call on the customer's record in the backend (phase 1 contact centre). Best effort:
      // a backend without /call-records yet answers 404 and nothing else is affected.
      const spoken = (b.turns ?? []).filter((t) => (t.who === "agent" || t.who === "caller") && t.text?.trim()).map((t) => ({ who: t.who as "agent" | "caller", text: String(t.text) }));
      await c.backend
        .call("POST", "/call-records/ai", {
          roomName: v.id,
          from: v.phone,
          startedAt: b.startedAt ?? v.startedAt,
          endedAt: v.endedAt,
          durationSec: b.durationSec !== undefined ? Math.round(b.durationSec) : undefined,
          verified: v.verified,
          summary: b.summary || undefined,
          recordingKey: b.recordingKey,
          transcript: spoken.length ? spoken : undefined,
          messages: b.messages?.length ? b.messages : undefined,
        }, svc)
        .catch((e) => console.error("voice call record", e));
      return ctx.json({ success: true, message: "OK", data: { saved: true } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
}
