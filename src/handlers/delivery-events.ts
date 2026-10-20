import type { SNSEvent } from "aws-lambda";
import { buildContainer } from "../container.js";
import { applyReceipt, parseReceipt } from "../history/receipts.js";
import { loadSecrets } from "./secrets.js";

await loadSecrets();
const c = buildContainer();

/** SNS topic easylink-delivery-receipts → message status + history line. */
export async function handler(e: SNSEvent) {
  for (const rec of e.Records) {
    try {
      const r = parseReceipt(JSON.parse(rec.Sns.Message));
      if (r) await applyReceipt(c, r);
    } catch (err) {
      console.error("delivery receipt", err);
    }
  }
}
