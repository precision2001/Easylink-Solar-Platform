import type { Context, Hono } from "hono";
import { z } from "zod";
import { Relations, type Scope } from "../access/relations.js";
import type { Container } from "../container.js";
import { makeEvent, RecordRef, type Principal } from "../core/envelope.js";
import { absoluteUrl } from "../files/classify.js";
import { isStaff } from "../policy/policy.js";
import type { MessageCopy, TimelineItem } from "../store/types.js";
import type { Env } from "./app.js";

/**
 * Projects, files and history for every portal (spec 8.8). One set of routes;
 * what comes back depends on who is asking:
 *   staff → everything; installer → projects assigned to them now;
 *   customer → their own project, including everything from its installers.
 * Other people's email addresses and numbers are removed for non-staff.
 */
const SITE = () => process.env.PUBLIC_SITE_URL ?? "";

export function registerProjectRoutes(app: Hono<Env>, c: Container) {
  const svc = () => ({ token: c.serviceToken });
  const ok = <T>(ctx: Context<Env>, data: T, status = 200) => ctx.json({ success: true, message: "OK", data }, status as 200);
  const scopeOf = (ctx: Context<Env>) => c.relations.scope(ctx.get("principal"), ctx.get("user") ?? {});
  const staff = (ctx: Context<Env>) => isStaff(ctx.get("principal"));

  /** The project (customer or lead) a request is about, if the caller may see it. */
  const project = async (ctx: Context<Env>): Promise<{ ref: RecordRef; scope: Scope } | Response> => {
    const ref = { type: ctx.req.param("type") ?? "", id: ctx.req.param("id") ?? "" };
    if (!["customer", "lead"].includes(ref.type)) return ctx.json({ success: false, message: "A project is a customer or a lead" }, 400);
    const scope = await scopeOf(ctx);
    if (!Relations.covers(scope, ref)) return ctx.json({ success: false, message: "Not your project" }, 403);
    return { ref, scope };
  };

  const userName = async (id: string) => {
    const u = await c.backend.get("user", id, svc());
    return u.data ? [u.data.firstName, u.data.lastName].filter(Boolean).join(" ") || String(u.data.name ?? id) : id;
  };

  // ---------- the projects I can see ----------
  app.get("/v1/ai/projects", async (ctx) => {
    const scope = await scopeOf(ctx);
    const q = ctx.req.query("search") ?? "";
    let customers: Record<string, unknown>[] = [];
    let leads: Record<string, unknown>[] = [];
    if (scope.all) {
      customers = ((await c.backend.list("customer", q ? { search: q } : {}, svc())).data ?? []) as Record<string, unknown>[];
      leads = ((await c.backend.list("lead", q ? { search: q } : {}, svc())).data ?? []) as Record<string, unknown>[];
      customers = customers.slice(0, 50);
      leads = leads.filter((l) => !customers.some((cu) => String(cu.leadId ?? "") === String(l.id))).slice(0, 50);
    } else {
      for (const id of scope.customers) {
        const r = await c.backend.get("customer", id, svc());
        if (r.data) customers.push(r.data);
      }
      for (const id of scope.leads) {
        if (customers.some((cu) => String(cu.leadId ?? "") === id)) continue;
        const r = await c.backend.get("lead", id, svc());
        if (r.data) leads.push(r.data);
      }
    }
    const row = async (type: "customer" | "lead", d: Record<string, unknown>) => {
      const ref = { type, id: String(d.id) };
      const installers = await c.relations.currentInstallers(ref);
      return {
        ref,
        name: type === "customer" ? [d.firstName, d.lastName].filter(Boolean).join(" ") || String(d.name ?? d.id) : String(d.customerName ?? d.id),
        address: String(d.address ?? ""),
        status: String(d.status ?? d.projectPhase ?? ""),
        installers: await Promise.all(installers.map(async (id) => ({ id, name: await userName(id) }))),
      };
    };
    return ok(ctx, [...(await Promise.all(customers.map((d) => row("customer", d)))), ...(await Promise.all(leads.map((d) => row("lead", d))))]);
  });

  // ---------- one project: who's on it, and what I can do ----------
  app.get("/v1/ai/projects/:type/:id", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const r = await c.backend.get(pj.ref.type, pj.ref.id, svc());
    if (!r.ok || !r.data) return ctx.json({ success: false, message: "Not found" }, 404);
    const d = r.data;
    const history = await c.relations.history(pj.ref);
    const current = await c.relations.currentInstallers(pj.ref);
    const p = ctx.get("principal");
    return ok(ctx, {
      ref: pj.ref,
      name: pj.ref.type === "customer" ? [d.firstName, d.lastName].filter(Boolean).join(" ") : String(d.customerName ?? ""),
      address: String(d.address ?? ""),
      status: String(d.status ?? d.projectPhase ?? ""),
      // Contact details only for staff and the project's own installer.
      contact: staff(ctx) || (p.kind === "installer" && current.includes(p.id)) ? { email: d.email ?? d.customerEmail ?? null, phone: d.phone ?? d.customerPhone ?? null } : null,
      installers: await Promise.all(current.map(async (id) => ({ id, name: await userName(id) }))),
      installerHistory: await Promise.all(
        history.map(async (a) => ({ installer: { id: a.installerId, name: a.installerName ?? (await userName(a.installerId)) }, from: a.from || null, to: a.to, reason: a.reason, assignedBy: staff(ctx) ? a.assignedBy : undefined })),
      ),
      can: {
        assignInstaller: staff(ctx),
        requestInstallerChange: !staff(ctx) && (p.kind === "customer" || p.kind === "installer"),
        seeContacts: staff(ctx),
      },
    });
  });

  // ---------- every file on the project ----------
  app.get("/v1/ai/projects/:type/:id/files", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const ids = await c.relations.linkedIds(pj.ref);
    const rows: Record<string, unknown>[] = [];
    for (const id of ids.customers) rows.push(...(((await c.backend.list("document", { customerId: id }, svc())).data ?? []) as Record<string, unknown>[]));
    for (const id of ids.leads) rows.push(...(((await c.backend.list("document", { leadId: id }, svc())).data ?? []) as Record<string, unknown>[]));
    const uniq = rows.filter((r, i) => rows.findIndex((x) => String(x.id) === String(r.id)) === i);
    const profiles = new Map((await c.store.getFileLabels(uniq.map((r) => String(r.id)))).map((l) => [l.documentId, l]));
    const names = new Map<string, string>();
    const nameOf = async (id: string | undefined) => {
      if (!id) return null;
      if (!names.has(id)) names.set(id, await userName(id));
      return names.get(id)!;
    };
    const out = await Promise.all(
      uniq.map(async (f) => {
        const pr = profiles.get(String(f.id));
        const by = String(f.installerId ?? f.uploadedById ?? "");
        return {
          id: String(f.id),
          name: String(f.fileName ?? f.name ?? f.id),
          mimeType: f.mimeType ?? null,
          sizeBytes: f.sizeBytes ?? null,
          createdAt: f.createdAt ?? null,
          uploadedBy: by ? { id: by, name: await nameOf(by) } : null,
          label: pr?.labels[0]?.label ?? (f.category as string | undefined) ?? null,
          confidence: pr?.labels[0]?.confidence ?? null,
          reviewState: pr?.reviewState ?? "pending",
          issues: pr?.issues ?? [],
          // Who it went to: names and roles, never addresses.
          deliveredTo: (pr?.deliveredTo ?? []).map((d) => ({ role: d.role, channels: d.channels, at: d.at, attached: d.attached })),
        };
      }),
    );
    out.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return ok(ctx, out);
  });

  // ---------- everything that happened, oldest assignment to latest delivery ----------
  app.get("/v1/ai/projects/:type/:id/history", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const ids = await c.relations.linkedIds(pj.ref);
    const lines: TimelineItem[] = [];
    for (const id of ids.customers) lines.push(...(await c.store.listTimeline({ type: "customer", id }, 500)));
    for (const id of ids.leads) lines.push(...(await c.store.listTimeline({ type: "lead", id }, 500)));
    const seen = new Set<string>();
    const p = ctx.get("principal");
    const shown = lines
      .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
      .filter((l) => staff(ctx) || l.audience === "related")
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((l) => ({
        id: l.id,
        at: l.at,
        kind: l.kind,
        title: l.title,
        detail: l.detail ?? null,
        actor: { kind: l.actor.kind, name: l.actor.kind === p.kind && l.actor.id === p.id ? "You" : l.actor.name ?? actorLabel(l.actor.kind), mine: l.actor.id === p.id },
        files: l.files ?? [],
        messageId: l.messageId ?? null,
      }));
    return ok(ctx, shown);
  });

  // ---------- a copy of a message that was sent ----------
  app.get("/v1/ai/messages/:id", async (ctx) => {
    const m = (await c.store.getRecord("message", ctx.req.param("id") ?? "")) as unknown as MessageCopy | undefined;
    if (!m) return ctx.json({ success: false, message: "Not found" }, 404);
    const scope = await scopeOf(ctx);
    const p = ctx.get("principal");
    const mine = m.from.id === p.id || (m.to.record.type === "user" && m.to.record.id === p.id);
    if (!mine && !m.records.some((r) => Relations.covers(scope, r))) return ctx.json({ success: false, message: "Not yours" }, 403);
    return ok(ctx, {
      ...m,
      to: { ...m.to, address: staff(ctx) ? m.to.address : undefined },
      from: { ...m.from, name: m.from.id === p.id ? "You" : await userName(m.from.id).catch(() => actorLabel(m.from.kind)) },
      providerIds: staff(ctx) ? m.providerIds : undefined,
    });
  });

  // ---------- open a file (recorded in history) ----------
  app.get("/v1/ai/files/:id/link", async (ctx) => {
    const id = ctx.req.param("id") ?? "";
    const doc = await c.backend.get("document", id, svc());
    if (!doc.ok || !doc.data) return ctx.json({ success: false, message: "Not found" }, 404);
    const scope = await scopeOf(ctx);
    const p = ctx.get("principal");
    const own = String(doc.data.installerId ?? doc.data.uploadedById ?? "") === p.id;
    if (!own && !Relations.covers(scope, { type: "document", id }, { customerId: doc.data.customerId, leadId: doc.data.leadId })) {
      return ctx.json({ success: false, message: "Not your file" }, 403);
    }
    const url = doc.data.s3Key ? await c.files.signedUrl(String(doc.data.s3Key), 900) : absoluteUrl(String(doc.data.url ?? ""), SITE());
    const evt = makeEvent({ type: "file.downloaded", source: "portal", principal: p, subject: { type: "document", id }, data: { fileName: doc.data.fileName ?? null } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ok(ctx, { url, expiresInSeconds: 900 });
  });

  // ---------- ask EasyLink for a different installer (customers and installers) ----------
  app.post("/v1/ai/projects/:type/:id/installer-change", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const { reason } = z.object({ reason: z.string().min(3).max(1000) }).parse(await ctx.req.json());
    const p = ctx.get("principal");
    const r = await c.actions.run({
      name: "request_approval",
      input: { question: `${actorLabel(p.kind)} asks for a different installer: ${reason}`, about: pj.ref },
      principal: p,
      auth: { token: ctx.get("token")! },
      user: ctx.get("user"),
    });
    const evt = makeEvent({ type: "installer.change_requested", source: "portal", principal: p, subject: pj.ref, data: { reason } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ok(ctx, { status: r.status, inbox_id: (r.result as { inbox_id?: string } | undefined)?.inbox_id ?? null }, 202);
  });

  // ---------- installers staff can assign ----------
  app.get("/v1/ai/installers", async (ctx) => {
    if (!staff(ctx)) return ctx.json({ success: false, message: "Staff only" }, 403);
    const r = await c.backend.list("user", { role: "INSTALLER", search: ctx.req.query("search") ?? "" }, svc());
    return ok(
      ctx,
      ((r.data ?? []) as Record<string, unknown>[])
        .filter((u) => String(u.role ?? "").toUpperCase() === "INSTALLER")
        .map((u) => ({ id: String(u.id), name: [u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.name ?? u.id), area: u.address ?? u.serviceArea ?? null })),
    );
  });

  // ---------- tracked links in emails and SMS: record the open, then go to the file ----------
  app.get("/f/:token", async (ctx) => {
    const link = await c.store.getRecord("share_link", ctx.req.param("token") ?? "");
    if (!link || String(link.expiresAt) < new Date().toISOString()) return ctx.text("This link has expired. Ask EasyLink Solar for a new one.", 410);
    const to = link.to as RecordRef;
    const who: Principal = { kind: "integration", id: `${to.type}:${to.id}`, roles: [], on_behalf_of: null };
    const evt = makeEvent({ type: "file.downloaded", source: "email-link", principal: who, subject: link.file as RecordRef, links: [to], data: { fileName: link.fileName ?? null, message_copy_id: link.copyId, by_name: "recipient" } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ctx.redirect(String(link.direct), 302);
  });
}

function actorLabel(kind: string) {
  return { staff: "EasyLink", agent: "EasyLink AI", system: "EasyLink", integration: "EasyLink", installer: "Installer", customer: "Customer", visitor: "Visitor" }[kind] ?? kind;
}

export { RecordRef };
