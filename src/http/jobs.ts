import type { Context, Hono } from "hono";
import { z } from "zod";
import type { Container } from "../container.js";
import { JobError, JobService, viewerOf } from "../jobs/service.js";
import { newId } from "../core/envelope.js";
import { checkFile } from "../files/safety.js";
import type { Env } from "./app.js";

/**
 * The job journey for every portal (EasyLink Job Journey doc).
 *   GET  /v1/ai/jobs                       jobs I can see (staff: all; installer: mine + offers; customer: mine)
 *   GET  /v1/ai/jobs/:id                   the job as I may see it, with my next steps
 *   POST /v1/ai/jobs/:id/steps/:action     do a step (who may is checked per step)
 *   GET  /v1/ai/jobs/:id/ranking           staff: installer ranking for matching
 *   GET  /v1/ai/documents/invoice/:id      the tax invoice as a printable document
 *   GET  /v1/ai/documents/signature/:id    a document to sign, or its signed copy
 */
export function registerJobRoutes(app: Hono<Env>, c: Container) {
  const jobs = new JobService(c);
  const meta = (ctx: Context<Env>) => ({
    ip: ctx.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? ctx.req.header("x-real-ip") ?? "unknown",
    userAgent: ctx.req.header("user-agent") ?? "",
    token: ctx.get("token"),
    user: ctx.get("user"),
  });
  const fail = (ctx: Context<Env>, e: unknown) => {
    if (e instanceof JobError) return ctx.json({ success: false, message: e.message }, e.status as 400);
    if (e instanceof z.ZodError) return ctx.json({ success: false, message: "Check the details and try again", errors: e.issues }, 400);
    console.error("jobs", e);
    return ctx.json({ success: false, message: "Something went wrong" }, 500);
  };

  app.get("/v1/ai/jobs", async (ctx) => {
    const p = ctx.get("principal");
    const list = await jobs.list(p, meta(ctx));
    const offers = await jobs.offers();
    return ctx.json({
      success: true,
      message: "OK",
      data: list.map((j) => {
        const open = offers.find((o) => o.jobId === j.id && o.status === "open");
        return {
          id: j.id,
          customerName: j.customerName,
          address: j.site.address,
          installerName: j.installerName ?? null,
          system: `${j.selection.kw.toFixed(1)} kW${j.selection.battery ? ` + ${j.selection.battery.usableKwh} kWh` : ""}`,
          stage: Math.max(1, ...Object.keys(j.milestones).map((k) => ({ design_selected: 1, installer_assigned: 2, selection_confirmed: 3, site_photos_ok: 3, job_accepted: 3, agreement_signed: 3, deposit_paid: 4, install_date_set: 4, connection_applied: 5, connection_approved: 5, bills_received: 6, quote_final: 6, equipment_paid: 6, delivered: 6, install_started: 7, installed: 7, site_docs_sent: 7, final_paid: 8, stc_pack_signed: 8, handover_sent: 8, stc_lodged: 8, monitoring_clear: 9 })[k] ?? 1)),
          installDates: j.installDates ?? null,
          updatedAt: j.updatedAt,
          offer: open && (viewerOf(p).who === "staff" || open.installerId === p.id) ? { id: open.id, expiresAt: open.expiresAt, installerName: open.installerName } : null,
        };
      }),
    });
  });

  app.get("/v1/ai/jobs/:id", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    if (!(await jobs.canSee(j, p, meta(ctx)))) return ctx.json({ success: false, message: "Not your job" }, 403);
    return ctx.json({ success: true, message: "OK", data: await jobs.view(j, p) });
  });

  app.get("/v1/ai/jobs/:id/ranking", async (ctx) => {
    if (viewerOf(ctx.get("principal")).who !== "staff") return ctx.json({ success: false, message: "Staff only" }, 403);
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    return ctx.json({ success: true, message: "OK", data: await jobs.rank(j) });
  });

  app.post("/v1/ai/jobs/:id/steps/:action", async (ctx) => {
    try {
      const input = z.record(z.unknown()).parse(await ctx.req.json().catch(() => ({})));
      const data = await jobs.act(ctx.req.param("id") ?? "", ctx.req.param("action") ?? "", input, ctx.get("principal"), meta(ctx));
      return ctx.json({ success: true, message: "OK", data });
    } catch (e) {
      return fail(ctx, e);
    }
  });

  // Photos and bills people upload on a job (checked like every other file, stored encrypted in S3).
  app.post("/v1/ai/jobs/:id/uploads", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    if (!(await jobs.canSee(j, p, meta(ctx)))) return ctx.json({ success: false, message: "Not your job" }, 403);
    const form = await ctx.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return ctx.json({ success: false, message: "Choose a file" }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const verdict = checkFile({ name: file.name, sizeBytes: bytes.length, mimeType: file.type, bytes });
    if (!verdict.ok) return ctx.json({ success: false, message: verdict.reason }, 400);
    const id = newId("jf_");
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const key = `jobs/${j.id}/${id}-${safe}`;
    await c.files.put(key, bytes, file.type || "application/octet-stream");
    const row = { id, jobId: j.id, key, name: file.name.slice(0, 200), mimeType: file.type, sizeBytes: bytes.length, purpose: String(form?.get("purpose") ?? "photo").slice(0, 20), label: String(form?.get("label") ?? "").slice(0, 60), by: p.id, at: new Date().toISOString() };
    await c.store.putRecord("job_file", row);
    return ctx.json({ success: true, message: "OK", data: { fileId: id, name: row.name } });
  });

  app.get("/v1/ai/jobs/:id/files/:fileId/link", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    const f = await c.store.getRecord("job_file", ctx.req.param("fileId") ?? "");
    if (!j || !f || f.jobId !== j.id) return ctx.json({ success: false, message: "Not found" }, 404);
    if (!(await jobs.canSee(j, p, meta(ctx)))) return ctx.json({ success: false, message: "Not your job" }, 403);
    return ctx.json({ success: true, message: "OK", data: { url: await c.files.signedUrl(String(f.key), 900) } });
  });

  const doc = async (ctx: Context<Env>, html: string, jobId: string) => {
    const j = await jobs.get(jobId);
    if (!j || !(await jobs.canSee(j, ctx.get("principal"), meta(ctx)))) return ctx.json({ success: false, message: "Not yours" }, 403);
    return ctx.json({ success: true, message: "OK", data: { html } });
  };
  app.get("/v1/ai/documents/invoice/:id", async (ctx) => {
    const d = await jobs.invoiceDoc(ctx.req.param("id") ?? "");
    if (!d) return ctx.json({ success: false, message: "Not found" }, 404);
    if (viewerOf(ctx.get("principal")).who === "customer" && d.inv.status === "draft") return ctx.json({ success: false, message: "Not found" }, 404);
    return doc(ctx, d.html, d.inv.jobId);
  });
  app.get("/v1/ai/documents/signature/:id", async (ctx) => {
    const d = await jobs.signatureHtml(ctx.req.param("id") ?? "");
    if (!d) return ctx.json({ success: false, message: "Not found" }, 404);
    return doc(ctx, d.html, d.s.jobId);
  });

  return jobs;
}
