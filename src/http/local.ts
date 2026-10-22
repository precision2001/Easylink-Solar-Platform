/**
 * Local development server: `AI_MODE=local npm run dev`.
 * Runs the whole AI platform in memory with a seeded fake backend so the
 * portal screens can be developed without AWS. Tokens:
 *   admin-local      → staff (master portal)
 *   installer-local  → installer usr_inst_1
 */
import { serve } from "@hono/node-server";
import { buildContainer } from "../container.js";
import { createApp } from "./app.js";
import { seedDemo } from "./seed.js";
import { FakeModel } from "../ai/model.js";
import type { FakeMessaging } from "../actions/ports.js";

process.env.AI_MODE ??= "local";
/** Local model stand-in: answers screen requests with a fixed demo screen, everything else with no action. */
const model = new FakeModel();
model.converse = async (args) => ({
  text: args.system.includes("screen spec")
    ? JSON.stringify({
        title: "New leads this week",
        description: "Leads by status, and the ones nobody has contacted yet.",
        components: [
          { id: "k1", kind: "kpi", title: "Open leads", span: 4, binding: { action: "search_records", input: { type: "lead" } } },
          { id: "k2", kind: "kpi", title: "Not contacted", span: 4, binding: { action: "search_records", input: { type: "lead", filter: { status: "NEW" } } } },
          { id: "k3", kind: "kpi", title: "Total kW quoted", span: 4, measure: "sum", field: "systemSize", binding: { action: "search_records", input: { type: "lead" } } },
          { id: "c1", kind: "chart", title: "Leads by status", span: 6, chart: "bar", x: "status", binding: { action: "search_records", input: { type: "lead" } } },
          {
            id: "t1",
            kind: "table",
            title: "Leads",
            span: 6,
            binding: { action: "search_records", input: { type: "lead" } },
            columns: [
              { field: "customerName", label: "Name" },
              { field: "address", label: "Address" },
              { field: "status", label: "Status" },
              { field: "systemSize", label: "kW" },
            ],
          },
        ],
      })
    : "No action needed.",
  toolUses: [],
  stopReason: "end_turn",
  usage: { inputTokens: 0, outputTokens: 0 },
});
const c = buildContainer({ model });
await seedDemo(c);
const app = createApp(c);
// Local only: texts and emails the platform "sent", so simulated calls can read the codes.
app.get("/local/outbox", (ctx) => ctx.json((c.messaging as FakeMessaging).sent.slice(-30)));
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`EasyLink AI platform (local) on http://localhost:${port}`);
