import { buildContainer } from "../container.js";
import { loadSecrets } from "./secrets.js";
import { processRoofReading } from "../roof/readings.js";

await loadSecrets();
const c = buildContainer();

/** RoofFacesFn: invoked (async) by the API with { id } — reads one roof with the smart model. */
export const handler = async (event: { id?: string }) => {
  if (!event?.id) return { ok: false };
  const r = await processRoofReading(c, String(event.id));
  return { ok: r?.status === "done", status: r?.status ?? "missing" };
};
