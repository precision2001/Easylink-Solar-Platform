import { buildContainer } from "../src/container.js";
import { FakeBackend } from "../src/backend/client.js";
import { FakeMessaging, FakeFileLinks } from "../src/actions/ports.js";
import { FakeModel } from "../src/ai/model.js";
import { MemoryBus } from "../src/bus/bus.js";
import { MemoryStore } from "../src/store/memory.js";
import type { FileBytes } from "../src/files/classify.js";

export function setup(script: ConstructorParameters<typeof FakeModel>[0] = []) {
  const backend = new FakeBackend();
  const messaging = new FakeMessaging();
  const model = new FakeModel(script);
  const store = new MemoryStore();
  const bus = new MemoryBus();
  const bytes: FileBytes = { load: async () => ({ format: "jpeg", bytes: new Uint8Array([1, 2, 3]) }) };
  const c = buildContainer({ backend, messaging, model, store, bus, files: new FakeFileLinks(), bytes, serviceToken: "svc", ingestKey: "ingest", now: () => WEEKDAY_AFTERNOON });
  backend.users.set("svc", { id: "usr_ai", role: "ADMIN" });
  backend.users.set("admin", { id: "usr_admin", role: "ADMIN" });
  backend.users.set("inst", { id: "usr_inst_1", role: "INSTALLER" });
  backend.users.set("cust", { id: "usr_cust_1", role: "CUSTOMER" });
  backend.seed("user", [{ id: "usr_inst_1", role: "INSTALLER", firstName: "Sam", email: "sam@example.test", phone: "+61400000101", address: "Parramatta NSW 2150" }]);
  backend.seed("customer", [
    { id: "cus_1", firstName: "Dan", email: "dan@example.test", phone: "+61400000301", address: "Castle Hill NSW 2154", installerId: "usr_inst_1" },
  ]);
  backend.seed("lead", [
    { id: "ld_1", customerName: "Priya", customerPhone: "+61400000201", address: "Blacktown NSW 2148", status: "NEW", assignedToId: "usr_inst_1" },
    { id: "ld_2", customerName: "Other", customerPhone: "+61400000209", address: "Geelong VIC 3220", status: "NEW", assignedToId: "usr_inst_2" },
  ]);
  backend.seed("document", [
    { id: "doc_1", customerId: "cus_1", fileName: "a.jpg", s3Key: "c/a.jpg", aiLabels: [{ label: "meter", confidence: 0.95 }], createdAt: "2026-10-10T00:00:00Z" },
    { id: "doc_2", customerId: "cus_1", fileName: "b.jpg", s3Key: "c/b.jpg", aiLabels: [{ label: "switchboard", confidence: 0.9 }], createdAt: "2026-10-10T00:01:00Z" },
    { id: "doc_3", customerId: "cus_1", fileName: "c.jpg", s3Key: "c/c.jpg", aiLabels: [{ label: "meter", confidence: 0.4 }], createdAt: "2026-10-11T00:00:00Z" },
  ]);
  return { c, backend, messaging, model, store, bus };
}

export const agent = (id: string) => ({ kind: "agent" as const, id, roles: [id], on_behalf_of: null });
/** A weekday, 2pm Sydney time. */
export const WEEKDAY_AFTERNOON = new Date("2026-10-21T03:00:00Z");
