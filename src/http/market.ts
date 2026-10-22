import type { Context, Hono } from "hono";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Container } from "../container.js";
import { JobError, type JobService } from "../jobs/service.js";
import { MarketService } from "../market/service.js";
import type { Env } from "./app.js";

/**
 * EasyLink Marketplace.
 *   Portals (signed in):
 *     GET/POST       /v1/ai/market/sites               list (staff: all; installer: for sale + mine) / create
 *     PATCH          /v1/ai/market/sites/:id            edit
 *     POST           /v1/ai/market/sites/:id/:action    submit | approve | publish | reject | withdraw | view | buy
 *     GET/POST       /v1/ai/market/deals               list (staff: all; installer: mine) / create
 *     POST           /v1/ai/market/deals/check          price, STCs and rule checks while editing
 *     PATCH          /v1/ai/market/deals/:id            edit
 *     POST           /v1/ai/market/deals/:id/:action    submit | approve | reject | pause | resume | end
 *     GET            /v1/ai/market/orders              Ready Deal orders (staff: all; installer: theirs)
 *     POST           /v1/ai/market/orders/:id/cancel    staff: cancel and refund under the standard policy
 *     GET            /v1/ai/jobs/:id/order              the Ready Deal order behind a job (customer portal)
 *   Website (public; POSTs only through the website server, which sends the ingest key):
 *     GET  /public/market/deals?postcode&type&building&maxPrice&minKw
 *     GET  /public/market/deals/:id
 *     GET  /public/market/sites
 *     POST /public/market/deals/:id/buy
 *     POST /public/market/orders/:id/pay
 */
export function registerMarketRoutes(app: Hono<Env>, c: Container, jobs: JobService) {
  const m = new MarketService(c, jobs);
  const body = async (ctx: Context<Env>) => z.record(z.unknown()).parse(await ctx.req.json().catch(() => ({})));
  const ok = (ctx: Context<Env>, data: unknown) => ctx.json({ success: true, message: "OK", data });
  const fail = (ctx: Context<Env>, e: unknown) => {
    if (e instanceof JobError) return ctx.json({ success: false, message: e.message }, e.status as 400);
    if (e instanceof z.ZodError) return ctx.json({ success: false, message: "Check the details and try again", errors: e.issues }, 400);
    console.error("market", e);
    return ctx.json({ success: false, message: "Something went wrong" }, 500);
  };
  const run = (fn: (ctx: Context<Env>) => Promise<unknown>) => async (ctx: Context<Env>) => {
    try {
      return ok(ctx, await fn(ctx));
    } catch (e) {
      return fail(ctx, e);
    }
  };
  const p = (ctx: Context<Env>) => ctx.get("principal");
  const id = (ctx: Context<Env>) => ctx.req.param("id") ?? "";

  app.get("/v1/ai/market/sites", run(async (ctx) => m.sites(p(ctx))));
  app.post("/v1/ai/market/sites", run(async (ctx) => m.createSite(p(ctx), await body(ctx))));
  app.patch("/v1/ai/market/sites/:id", run(async (ctx) => m.updateSite(p(ctx), id(ctx), await body(ctx))));
  app.post("/v1/ai/market/sites/:id/:action", run(async (ctx) => m.siteAction(p(ctx), id(ctx), ctx.req.param("action") ?? "", await body(ctx))));

  app.get("/v1/ai/market/deals", run(async (ctx) => m.deals(p(ctx))));
  app.post("/v1/ai/market/deals/check", run(async (ctx) => m.dealCheck(await body(ctx))));
  app.post("/v1/ai/market/deals", run(async (ctx) => m.createDeal(p(ctx), await body(ctx))));
  app.patch("/v1/ai/market/deals/:id", run(async (ctx) => m.updateDeal(p(ctx), id(ctx), await body(ctx))));
  app.post("/v1/ai/market/deals/:id/:action", run(async (ctx) => m.dealAction(p(ctx), id(ctx), ctx.req.param("action") ?? "", await body(ctx))));

  app.get("/v1/ai/market/orders", run(async (ctx) => m.orders(p(ctx))));
  app.post("/v1/ai/market/orders/:id/cancel", run(async (ctx) => m.cancelOrder(p(ctx), id(ctx), await body(ctx))));
  app.get(
    "/v1/ai/jobs/:id/order",
    run(async (ctx) => {
      const j = await jobs.get(id(ctx));
      if (!j || !(await jobs.canSee(j, p(ctx), { token: ctx.get("token"), user: ctx.get("user") }))) throw new JobError("Not found", 404);
      return m.orderForJob(j.id);
    }),
  );

  // ---------- website ----------
  const fromWebsite = (ctx: Context<Env>) => {
    const k = ctx.req.header("x-ingest-key") ?? "";
    const want = c.ingestKey ?? "";
    const h = (s: string) => createHash("sha256").update(s).digest("hex");
    if (!want || h(k) !== h(want)) throw new JobError("Unauthorised", 401);
  };
  const q = (ctx: Context<Env>, k: string) => ctx.req.query(k) || undefined;
  app.get(
    "/public/market/deals",
    run(async (ctx) =>
      m.publicDeals({ postcode: q(ctx, "postcode"), type: q(ctx, "type"), building: q(ctx, "building"), maxPrice: Number(q(ctx, "maxPrice")) || undefined, minKw: Number(q(ctx, "minKw")) || undefined }),
    ),
  );
  app.get(
    "/public/market/deals/:id",
    run(async (ctx) => {
      const d = (await m.publicDeals({})).find((x) => x.id === id(ctx) || x.ref === id(ctx));
      if (!d) throw new JobError("This deal has ended.", 404);
      return d;
    }),
  );
  app.get("/public/market/sites", run(async () => m.publicSites()));
  app.post(
    "/public/market/deals/:id/buy",
    run(async (ctx) => {
      fromWebsite(ctx);
      return m.buyDeal(id(ctx), await body(ctx));
    }),
  );
  app.post(
    "/public/market/orders/:id/pay",
    run(async (ctx) => {
      fromWebsite(ctx);
      const b = await body(ctx);
      return m.payOrder(id(ctx), String(b.token ?? ""));
    }),
  );
  return m;
}
