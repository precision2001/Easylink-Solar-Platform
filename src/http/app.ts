import { Hono, type Context } from "hono";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ACTIONS } from "../core/actions.js";
import { isRegisteredType } from "../core/catalogue.js";
import { makeEvent, newId, RecordRef, type Principal } from "../core/envelope.js";
import { RECORD_TYPES } from "../core/records.js";
import { AGENTS } from "../ai/agents.js";
import { LEVEL_LABEL, defaultLevel, suggestPromotion } from "../policy/autonomy.js";
import { isStaff } from "../policy/policy.js";
import { generateScreenWithRepair, validateScreen } from "../screens/spec.js";
import { WORKFLOWS } from "../actions/workflows.js";
import type { Container } from "../container.js";
import type { ActionName } from "../core/actions.js";
import type { AutonomyLevel } from "../store/types.js";

type Env = { Variables: { principal: Principal; token: string | null } };

/** Backend roles → principal kinds. Anything unknown is treated as a customer (least access). */
export function principalFromUser(u: Record<string, unknown>): Principal {
  const role = String(u.role ?? u.userType ?? "").toUpperCase();
  const kind: Principal["kind"] = ["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"].includes(role)
    ? "staff"
    : role === "INSTALLER"
      ? "installer"
      : "customer";
  return { kind, id: String(u.id ?? u._id ?? ""), roles: role ? [role] : [], on_behalf_of: null };
}

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createApp(c: Container) {
  const app = new Hono<Env>();
  const whoCache = new Map<string, { p: Principal; exp: number }>();

  app.get("/health", (ctx) => ctx.json({ ok: true, service: "easylink-ai-platform" }));

  // Auth: a portal bearer token (resolved through the existing backend), or the
  // ingest key for anonymous website events forwarded by the Next.js server.
  app.use("/v1/*", async (ctx, next) => {
    const h = ctx.req.header("authorization") ?? "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
    const ingest = ctx.req.header("x-ingest-key");
    if (token) {
      const key = createHash("sha256").update(token).digest("hex");
      const hit = whoCache.get(key);
      let p = hit && hit.exp > Date.now() ? hit.p : null;
      if (!p) {
        const r = await c.backend.whoAmI({ token });
        if (!r.ok || !r.data) return ctx.json({ success: false, message: "Unauthorised" }, 401);
        const user = (r.data.user as Record<string, unknown> | undefined) ?? r.data;
        p = principalFromUser(user);
        whoCache.set(key, { p, exp: Date.now() + 60_000 });
      }
      ctx.set("principal", p);
      ctx.set("token", token);
      return next();
    }
    if (ingest && c.ingestKey && safeEq(ingest, c.ingestKey) && ctx.req.path === "/v1/events") {
      const anon = ctx.req.header("x-visitor-id") ?? "anonymous";
      ctx.set("principal", { kind: "visitor", id: anon.slice(0, 64), roles: [], on_behalf_of: null });
      ctx.set("token", null);
      return next();
    }
    return ctx.json({ success: false, message: "Unauthorised" }, 401);
  });

  const staffOnly = async (ctx: Context<Env>, next: () => Promise<void>) => {
    if (!isStaff(ctx.get("principal"))) return ctx.json({ success: false, message: "Staff only" }, 403);
    await next();
  };
  const ok = <T>(ctx: Context<Env>, data: T, status = 200) => ctx.json({ success: true, message: "OK", data }, status as 200);

  // ---------- events ----------
  const InEvent = z.object({
    type: z.string(),
    subject: RecordRef.optional(),
    links: z.array(RecordRef).default([]),
    data: z.record(z.unknown()).default({}),
    correlation_id: z.string().optional(),
    pii: z.array(z.string()).default([]),
  });
  app.post("/v1/events", async (ctx) => {
    const body = await ctx.req.json().catch(() => null);
    const list = z.array(InEvent).max(50).safeParse(Array.isArray(body) ? body : body?.events ?? [body]);
    if (!list.success) return ctx.json({ success: false, message: "Invalid events", errors: list.error.flatten() }, 400);
    const p = ctx.get("principal");
    const accepted: string[] = [];
    const quarantined: string[] = [];
    const events = [];
    for (const e of list.data) {
      // Browsers may only send interaction events; record changes come from the Action API.
      if (p.kind === "visitor" || p.kind === "customer" || p.kind === "installer") {
        const entity = e.type.split(".")[0] ?? "";
        if (!["page", "form", "field", "cta", "price", "help", "ui", "widget", "search", "design", "cart"].includes(entity)) {
          quarantined.push(e.type);
          continue;
        }
      }
      const evt = makeEvent({
        type: e.type,
        source: p.kind === "visitor" ? "web" : `portal:${p.kind}`,
        principal: p,
        subject: e.subject ?? { type: p.kind === "visitor" ? "visitor" : "user", id: p.id },
        links: e.links,
        data: e.data,
        correlation_id: e.correlation_id,
        pii: e.pii,
      });
      if (!isRegisteredType(evt.type)) {
        await c.store.quarantine(evt, `Unregistered event type ${evt.type}`);
        quarantined.push(e.type);
        continue;
      }
      await c.store.recordEvent(evt);
      events.push(evt);
      accepted.push(evt.event_id);
    }
    if (events.length) await c.bus.publish(events);
    return ok(ctx, { accepted, quarantined }, 202);
  });

  // ---------- actions ----------
  app.get("/v1/actions", (ctx) =>
    ok(
      ctx,
      Object.values(ACTIONS).map((a) => ({ name: a.name, kind: a.kind, family: a.family, sensitivity: a.sensitivity, description: a.description })),
    ),
  );
  app.post("/v1/actions/:name", async (ctx) => {
    const body = (await ctx.req.json().catch(() => ({}))) as { input?: unknown; dry_run?: boolean };
    const r = await c.actions.run({
      name: (ctx.req.param("name") ?? ""),
      input: body.input ?? {},
      principal: ctx.get("principal"),
      auth: ctx.get("token") ? { token: ctx.get("token")! } : undefined,
      idempotencyKey: ctx.req.header("idempotency-key") ?? undefined,
      dryRun: !!body.dry_run,
    });
    const status = { executed: 200, proposed: 202, dry_run: 200, shadow: 200, denied: 403, blocked: 403, invalid: 400, error: 502 }[r.status];
    return ctx.json({ success: r.status === "executed" || r.status === "proposed" || r.status === "dry_run", message: r.message ?? r.status, data: r }, status as 200);
  });

  // ---------- AI control centre ----------
  app.get("/v1/ai/control", staffOnly, async (ctx) => {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [control, rules, decisions, inbox, decisions30, quarantine] = await Promise.all([
      c.store.getControl(),
      c.store.listAutonomyRules(),
      c.store.listDecisions({ sinceIso: since, limit: 5000 }),
      c.store.listInbox({ status: "open", limit: 500 }),
      c.store.listDecisions({ sinceIso: since30, limit: 20000 }),
      c.store.listQuarantine(20),
    ]);
    const agents = Object.values(AGENTS).map((a) => {
      const mine = decisions.filter((d) => d.agentId === a.id);
      const writes = a.actions.filter((x) => ACTIONS[x].kind !== "read");
      const levels = writes.map((x) => rules.find((r) => r.agentId === a.id && r.action === x && !Object.keys(r.condition).length)?.level ?? defaultLevel(x));
      const top = (["L3", "L2", "L1", "L0"] as AutonomyLevel[]).find((l) => levels.includes(l)) ?? "L1";
      const m30 = decisions30.filter((d) => d.agentId === a.id && d.outcome === "proposed");
      return {
        id: a.id,
        name: a.name,
        paused: !!control.pausedAgents[a.id],
        level: control.globalRecommendOnly && (top === "L2" || top === "L3") ? "L1" : top,
        label: LEVEL_LABEL[control.globalRecommendOnly && (top === "L2" || top === "L3") ? "L1" : top],
        decisions24h: mine.length,
        executed24h: mine.filter((d) => d.outcome === "executed").length,
        proposed24h: mine.filter((d) => d.outcome === "proposed").length,
        escalated24h: mine.filter((d) => d.outcome === "escalated").length,
        costAud24h: Math.round(mine.reduce((s, d) => s + d.costAud, 0) * 100) / 100,
        openInbox: inbox.filter((i) => i.agentId === a.id).length,
        proposals30d: m30.length,
        triggers: a.triggers,
        actions: a.actions,
      };
    });
    const families = [...new Set(Object.values(ACTIONS).map((a) => a.family))].map((f) => ({ family: f, off: !!control.familiesOff[f] }));
    const kpis = {
      decisions24h: decisions.length,
      autoResolvedPct: decisions.length ? Math.round((decisions.filter((d) => d.outcome === "executed" || d.outcome === "no_action").length / decisions.length) * 100) : 0,
      openInbox: inbox.length,
      overdueInbox: inbox.filter((i) => i.dueAt < new Date().toISOString()).length,
      costAud24h: Math.round(decisions.reduce((s, d) => s + d.costAud, 0) * 100) / 100,
      quarantined: quarantine.length,
    };
    return ok(ctx, { control, agents, families, rules, kpis, quarantine });
  });

  app.put("/v1/ai/control/global", staffOnly, async (ctx) => {
    const { recommendOnly } = z.object({ recommendOnly: z.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, globalRecommendOnly: recommendOnly, updatedBy: ctx.get("principal").id, updatedAt: new Date().toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), recommendOnly ? "ai.paused" : "ai.resumed", { scope: "global" });
    return ok(ctx, next);
  });
  app.post("/v1/ai/control/agents/:id/pause", staffOnly, async (ctx) => {
    const id = (ctx.req.param("id") ?? "");
    if (!AGENTS[id]) return ctx.json({ success: false, message: "Unknown agent" }, 404);
    const { paused } = z.object({ paused: z.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, pausedAgents: { ...cur.pausedAgents, [id]: paused }, updatedBy: ctx.get("principal").id, updatedAt: new Date().toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), paused ? "ai.paused" : "ai.resumed", { agent: id });
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/switches/:family", staffOnly, async (ctx) => {
    const family = (ctx.req.param("family") ?? "");
    const { off } = z.object({ off: z.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, familiesOff: { ...cur.familiesOff, [family]: off }, updatedBy: ctx.get("principal").id, updatedAt: new Date().toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), off ? "ai.paused" : "ai.resumed", { family });
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/budget", staffOnly, async (ctx) => {
    const { dailyBudgetAud } = z.object({ dailyBudgetAud: z.number().min(0).nullable() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, dailyBudgetAud, updatedBy: ctx.get("principal").id, updatedAt: new Date().toISOString() };
    await c.store.putControl(next);
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/autonomy", staffOnly, async (ctx) => {
    const body = z
      .object({
        agentId: z.string(),
        action: z.string(),
        condition: z.record(z.string()).default({}),
        level: z.enum(["L0", "L1", "L2", "L3"]),
        reason: z.string().min(3),
      })
      .parse(await ctx.req.json());
    if (!AGENTS[body.agentId] || !(body.action in ACTIONS)) return ctx.json({ success: false, message: "Unknown agent or action" }, 400);
    const rule = { ...body, action: body.action as ActionName, setBy: ctx.get("principal").id, setAt: new Date().toISOString() };
    await c.store.putAutonomyRule(rule);
    await audit(c, ctx.get("principal"), "ai.autonomy_changed", rule);
    return ok(ctx, rule);
  });
  app.get("/v1/ai/control/promotions", staffOnly, async (ctx) => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [inbox, rules] = await Promise.all([c.store.listInbox({ limit: 10000 }), c.store.listAutonomyRules()]);
    const out = [];
    for (const a of Object.values(AGENTS)) {
      for (const action of a.actions.filter((x) => ACTIONS[x].kind !== "read")) {
        const mine = inbox.filter((i) => i.kind === "proposal" && i.agentId === a.id && i.action === action && i.createdAt >= since && i.status !== "open");
        if (!mine.length) continue;
        const level = rules.find((r) => r.agentId === a.id && r.action === action && !Object.keys(r.condition).length)?.level ?? defaultLevel(action);
        const s = suggestPromotion({
          level,
          proposals: mine.length,
          approvedUnchanged: mine.filter((i) => i.resolution === "approved_unchanged").length,
          complianceRejections: mine.filter((i) => i.status === "rejected" && /compliance|consent|privacy/i.test(i.resolution ?? "")).length,
          reversals: 0,
        });
        if (s) out.push({ agentId: a.id, action, from: level, to: s, proposals: mine.length });
      }
    }
    return ok(ctx, out);
  });

  // ---------- inbox ----------
  app.get("/v1/ai/inbox", staffOnly, async (ctx) => {
    const status = (ctx.req.query("status") ?? "open") as "open";
    const kind = ctx.req.query("kind") as "proposal" | undefined;
    const items = await c.store.listInbox({ status, kind, limit: Number(ctx.req.query("limit") ?? 100) });
    items.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return ok(ctx, items);
  });
  app.post("/v1/ai/inbox/:id/approve", staffOnly, async (ctx) => {
    const body = (await ctx.req.json().catch(() => ({}))) as { input?: Record<string, unknown> };
    try {
      return ok(ctx, await c.actions.approve((ctx.req.param("id") ?? ""), ctx.get("principal"), body.input));
    } catch (e) {
      return ctx.json({ success: false, message: (e as Error).message }, 409);
    }
  });
  app.post("/v1/ai/inbox/:id/reject", staffOnly, async (ctx) => {
    const { reason } = z.object({ reason: z.string().min(2) }).parse(await ctx.req.json());
    try {
      return ok(ctx, await c.actions.reject((ctx.req.param("id") ?? ""), ctx.get("principal"), reason));
    } catch (e) {
      return ctx.json({ success: false, message: (e as Error).message }, 404);
    }
  });
  app.post("/v1/ai/inbox/:id/resolve", staffOnly, async (ctx) => {
    const { note } = z.object({ note: z.string().default("") }).parse(await ctx.req.json().catch(() => ({})));
    const item = await c.store.getInbox((ctx.req.param("id") ?? ""));
    if (!item) return ctx.json({ success: false, message: "Not found" }, 404);
    const p = ctx.get("principal");
    const next = { ...item, status: item.kind === "question" ? ("answered" as const) : ("resolved" as const), resolvedBy: p.id, resolvedAt: new Date().toISOString(), resolution: note || "resolved" };
    await c.store.putInbox(next);
    // Confirming a low-confidence fact or label is a correction signal for the AI.
    await audit(c, p, "ai.corrected", { inbox_id: item.id, kind: item.kind, note }, item.subject ?? undefined);
    return ok(ctx, next);
  });

  // ---------- record panel (shown on existing lead / customer pages) ----------
  app.get("/v1/ai/records/:type/:id/panel", async (ctx) => {
    const type = (ctx.req.param("type") ?? "");
    const id = (ctx.req.param("id") ?? "");
    if (!RECORD_TYPES[type]) return ctx.json({ success: false, message: "Unknown record type" }, 404);
    const p = ctx.get("principal");
    const ref = { type, id };
    // Access check goes through the normal get_record action (backend RBAC + policy).
    const rec = await c.actions.run({ name: "get_record", input: { record: ref }, principal: p, auth: { token: ctx.get("token")! } });
    if (rec.status !== "executed") return ctx.json({ success: false, message: rec.message ?? "Not allowed", data: rec }, rec.status === "denied" ? 403 : 404);
    const [summary, facts, decisions, actions, inbox] = await Promise.all([
      c.store.getSummary(ref),
      c.store.listFacts(ref),
      isStaff(p) ? c.store.listDecisions({ subject: ref, limit: 20 }) : Promise.resolve([]),
      isStaff(p) ? c.store.listActionLog({ subject: ref, limit: 30 }) : Promise.resolve([]),
      isStaff(p) ? c.store.listInbox({ status: "open", limit: 500 }) : Promise.resolve([]),
    ]);
    let files: unknown[] = [];
    if (type === "customer" || type === "lead") {
      const f = await c.actions.run({ name: "list_files", input: { record: ref, latest_only: false }, principal: p, auth: { token: ctx.get("token")! } });
      files = (f.result as unknown[]) ?? [];
    }
    return ok(ctx, {
      summary: summary ?? null,
      facts: isStaff(p) ? facts : facts.filter((f) => f.confirmed),
      decisions,
      actions,
      inbox: inbox.filter((i) => i.subject?.type === type && i.subject.id === id),
      files,
      workflows: Object.values(WORKFLOWS).map((w) => ({ id: w.id, title: w.title, description: w.description })),
    });
  });

  // ---------- generated screens ----------
  app.post("/v1/ai/screens", async (ctx) => {
    const { request } = z.object({ request: z.string().min(5).max(1000) }).parse(await ctx.req.json());
    const p = ctx.get("principal");
    if (p.kind === "visitor") return ctx.json({ success: false, message: "Sign in first" }, 403);
    const r = await generateScreenWithRepair(c.model, request, p);
    const evtType = r.ok ? "screen.generated" : "screen.rejected_binding";
    await audit(c, p, evtType, { request, errors: r.ok ? [] : r.errors });
    if (!r.ok) return ctx.json({ success: false, message: "Could not build a valid screen", errors: r.errors }, 422);
    const rec = { id: newId("scr_"), title: r.spec.title, ownerId: p.id, spec: r.spec as unknown as Record<string, unknown>, pinned: false, sharedRoles: [], version: 1, createdAt: new Date().toISOString() };
    await c.store.putScreen(rec);
    return ok(ctx, rec, 201);
  });
  app.get("/v1/ai/screens", async (ctx) => ok(ctx, await c.store.listScreens(ctx.get("principal").id)));
  app.post("/v1/ai/screens/:id/pin", async (ctx) => {
    const p = ctx.get("principal");
    const screens = await c.store.listScreens(p.id);
    const s = screens.find((x) => x.id === (ctx.req.param("id") ?? ""));
    if (!s) return ctx.json({ success: false, message: "Not found" }, 404);
    const { pinned } = z.object({ pinned: z.boolean() }).parse(await ctx.req.json());
    const next = { ...s, pinned };
    await c.store.putScreen(next);
    if (pinned) await audit(c, p, "screen.pinned", { screen_id: s.id });
    return ok(ctx, next);
  });
  /** Re-validate a spec against the current viewer before rendering (permissions may have changed). */
  app.post("/v1/ai/screens/validate", async (ctx) => {
    const r = validateScreen(await ctx.req.json(), ctx.get("principal"));
    return r.ok ? ok(ctx, r.spec) : ctx.json({ success: false, message: "Invalid", errors: r.errors }, 422);
  });

  // ---------- activity feed ----------
  app.get("/v1/ai/activity", staffOnly, async (ctx) => {
    const limit = Math.min(Number(ctx.req.query("limit") ?? 50), 200);
    const [decisions, events] = await Promise.all([c.store.listDecisions({ limit }), c.store.recentEvents(limit)]);
    return ok(ctx, { decisions, events: events.map((e) => ({ id: e.event_id, type: e.type, at: e.occurred_at, subject: e.subject, principal: { kind: e.principal.kind, id: e.principal.id } })) });
  });

  app.onError((err, ctx) => {
    if (err instanceof z.ZodError) return ctx.json({ success: false, message: "Invalid request", errors: err.flatten() }, 400);
    console.error(err);
    return ctx.json({ success: false, message: "Internal error" }, 500);
  });

  return app;
}

async function audit(c: Container, p: Principal, type: string, data: Record<string, unknown>, subject?: { type: string; id: string }) {
  const evt = makeEvent({ type, source: "ai-control", principal: p, subject: subject ?? { type: "ai_control", id: "global" }, data });
  await c.store.recordEvent(evt);
  await c.bus.publish([evt]);
}
