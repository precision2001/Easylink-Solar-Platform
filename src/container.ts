import { ActionService } from "./actions/service.js";
import { AwsMessaging, FakeMessaging, FakeFileLinks, S3FileLinks, type Messaging, type FileLinks } from "./actions/ports.js";
import { AiRuntime } from "./ai/runtime.js";
import { BedrockModel, FakeModel, type ModelClient } from "./ai/model.js";
import { FakeBackend, HttpBackend, type Backend } from "./backend/client.js";
import { EventBridgeBus, MemoryBus, type EventBus } from "./bus/bus.js";
import { FileClassifier, AnyFileBytes, type FileBytes } from "./files/classify.js";
import { DynamoStore } from "./store/dynamo.js";
import { MemoryStore } from "./store/memory.js";
import type { Store } from "./store/types.js";
import { OverlayBackend } from "./backend/overlay.js";
import { Relations } from "./access/relations.js";
import { TimelineWriter } from "./history/timeline.js";
import { BraveWebSearch, ContactFinder, FakeWebSearch, type WebSearch } from "./contacts/finder.js";

export type Container = {
  store: Store;
  bus: EventBus;
  backend: Backend;
  messaging: Messaging;
  files: FileLinks;
  model: ModelClient;
  actions: ActionService;
  runtime: AiRuntime;
  classifier: FileClassifier;
  contacts: ContactFinder | null;
  relations: Relations;
  timeline: TimelineWriter;
  serviceToken: string;
  /** Shared secret the Next.js server uses to forward visitor events. */
  ingestKey: string;
};

export function buildContainer(
  over: Partial<Pick<Container, "store" | "bus" | "backend" | "messaging" | "files" | "model">> & { bytes?: FileBytes; web?: WebSearch; serviceToken?: string; ingestKey?: string; now?: () => Date } = {},
): Container {
  const local = process.env.AI_MODE === "local";
  const store = over.store ?? (local ? new MemoryStore() : new DynamoStore(process.env.AI_TABLE ?? "easylink-ai"));
  const bus = over.bus ?? (local ? new MemoryBus() : new EventBridgeBus());
  // Partners (and any type marked storedIn "ai") come from the AI store until the backend has them.
  const backend = new OverlayBackend(over.backend ?? (local ? new FakeBackend() : new HttpBackend()), store);
  const messaging = over.messaging ?? (local ? new FakeMessaging() : new AwsMessaging());
  const files = over.files ?? (local ? new FakeFileLinks() : new S3FileLinks());
  const model = over.model ?? (local ? new FakeModel() : new BedrockModel());
  const serviceToken = over.serviceToken ?? process.env.AI_SERVICE_TOKEN ?? (local ? "svc-local" : "");
  const ingestKey = over.ingestKey ?? process.env.EVENT_INGEST_KEY ?? (local ? "ingest-local" : "");
  if (!serviceToken) throw new Error("AI_SERVICE_TOKEN is not set");
  const bytes = over.bytes ?? new AnyFileBytes();
  const web = over.web ?? (process.env.SEARCH_API_KEY ? new BraveWebSearch() : local ? new FakeWebSearch() : undefined);
  const contacts = web ? new ContactFinder({ web, model, backend, store, serviceToken, now: over.now }) : null;
  const relations = new Relations({ store, backend, serviceToken });
  const actions = new ActionService({ store, bus, backend, messaging, files, serviceToken, bytes, contacts: contacts ?? undefined, relations, now: over.now });
  const classifier = new FileClassifier({ model, backend, actions, store, bytes, serviceToken });
  const runtime = new AiRuntime({ store, actions, model, classifier, now: over.now });
  const timeline = new TimelineWriter({ store, backend, serviceToken });
  // In local mode the bus delivers straight to history and the AI runtime (EventBridge → SQS → Lambda in AWS).
  if (bus instanceof MemoryBus) {
    bus.subscribe((e) => timeline.index(e).then(() => undefined, (err) => console.error("timeline", err)));
    bus.subscribe((e) => void runtime.handle(e));
  }
  return { store, bus, backend, messaging, files, model, actions, runtime, classifier, contacts, relations, timeline, serviceToken, ingestKey };
}
