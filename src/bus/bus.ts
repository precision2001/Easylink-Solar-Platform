import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import type { EventEnvelope } from "../core/envelope.js";

export interface EventBus {
  publish(events: EventEnvelope[]): Promise<void>;
}

/** Local bus: calls subscribers in-process (development and tests). */
export class MemoryBus implements EventBus {
  published: EventEnvelope[] = [];
  private subs: ((e: EventEnvelope) => Promise<void> | void)[] = [];
  subscribe(fn: (e: EventEnvelope) => Promise<void> | void) {
    this.subs.push(fn);
  }
  async publish(events: EventEnvelope[]) {
    this.published.push(...events);
    for (const e of events) for (const s of this.subs) await s(e);
  }
}

/** Production bus: EventBridge `easylink-core` in ap-southeast-2 (spec 3). */
export class EventBridgeBus implements EventBus {
  constructor(
    private busName = process.env.EVENT_BUS_NAME ?? "easylink-core",
    private client = new EventBridgeClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" }),
  ) {}
  async publish(events: EventEnvelope[]) {
    for (let i = 0; i < events.length; i += 10) {
      const batch = events.slice(i, i + 10);
      const res = await this.client.send(
        new PutEventsCommand({
          Entries: batch.map((e) => ({
            EventBusName: this.busName,
            Source: `easylink.${e.source}`,
            DetailType: e.type,
            Detail: JSON.stringify(e),
            Time: new Date(e.occurred_at),
          })),
        }),
      );
      if (res.FailedEntryCount) throw new Error(`EventBridge rejected ${res.FailedEntryCount} events`);
    }
  }
}
