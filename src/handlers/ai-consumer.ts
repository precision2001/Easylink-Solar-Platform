import type { EventBridgeEvent, SQSEvent, SQSBatchResponse } from "aws-lambda";
import { buildContainer } from "../container.js";
import { loadSecrets } from "./secrets.js";

await loadSecrets();

const c = buildContainer();

/**
 * EventBridge rule → SQS (buffer, DLQ) → this Lambda. Each message body is the
 * EventBridge event whose `detail` is our envelope. Failures are reported per
 * message so only those are retried.
 */
export async function handler(e: SQSEvent): Promise<SQSBatchResponse> {
  const failures: { itemIdentifier: string }[] = [];
  for (const rec of e.Records) {
    try {
      const eb = JSON.parse(rec.body) as EventBridgeEvent<string, unknown>;
      // History first (cheap, never skipped), then the AI.
      const { EventEnvelope } = await import("../core/envelope.js");
      const parsed = EventEnvelope.safeParse(eb.detail);
      if (parsed.success) await c.timeline.index(parsed.data);
      await c.runtime.handle(eb.detail);
    } catch (err) {
      console.error("ai-consumer failed", rec.messageId, err);
      failures.push({ itemIdentifier: rec.messageId });
    }
  }
  return { batchItemFailures: failures };
}
