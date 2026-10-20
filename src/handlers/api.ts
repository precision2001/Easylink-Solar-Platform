import { handle } from "hono/aws-lambda";
import { buildContainer } from "../container.js";
import { loadSecrets } from "./secrets.js";

await loadSecrets();
import { createApp } from "../http/app.js";

/** API Gateway (HTTP API) → Hono app. */
export const handler = handle(createApp(buildContainer()));
