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

process.env.AI_MODE ??= "local";
const c = buildContainer();
await seedDemo(c);
const app = createApp(c);
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`EasyLink AI platform (local) on http://localhost:${port}`);
