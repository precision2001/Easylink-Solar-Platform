/**
 * Record registry (spec 4). Maps each record type the AI may work with to the
 * existing Express backend's REST endpoints, so the current database stays the
 * source of truth. Field rules drive policy (owner), redaction (pii) and what
 * agents may change (aiWritable).
 */
export type BackendPortal = "admin" | "installer" | "customer";

export type RecordTypeDef = {
  type: string;
  idPrefix?: string;
  /** Backend collection path, e.g. "/leads". */
  path: string;
  /** Which portal token the backend expects for this collection. */
  portal: BackendPortal;
  /** Fields the backend accepts as list filters (forwarded as query string). */
  search: string[];
  /** Fields holding personal information. */
  pii: string[];
  /** Fields agents may change without a human (spec 4.2 x-ai-writable). */
  aiWritable: string[];
  /** Path on the record naming the owning installer user id, if any. */
  ownerInstallerPath?: string;
  /** Path on the record naming the owning customer user id, if any. */
  ownerCustomerPath?: string;
  supports: { list: boolean; get: boolean; create: boolean; update: boolean; delete: boolean };
  /** Event emitted when this type is created / updated through the Action API. */
  events: { created: string; updated: string };
};

export const RECORD_TYPES: Record<string, RecordTypeDef> = {
  lead: {
    type: "lead",
    path: "/leads",
    portal: "installer",
    search: ["status", "search", "assignedToId", "page", "limit"],
    pii: ["customerName", "customerEmail", "customerPhone", "address"],
    aiWritable: ["notes", "status", "projectPhase"],
    ownerInstallerPath: "assignedToId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "lead.created", updated: "lead.updated" },
  },
  customer: {
    type: "customer",
    path: "/customers",
    portal: "installer",
    search: ["search", "leadLinkedOnly", "page", "limit"],
    pii: ["firstName", "lastName", "email", "phone", "address"],
    aiWritable: [],
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "customer.created", updated: "customer.updated" },
  },
  design: {
    type: "design",
    path: "/designs",
    portal: "installer",
    search: ["leadId", "customerId", "status"],
    pii: [],
    aiWritable: ["notes"],
    supports: { list: false, get: true, create: false, update: true, delete: false },
    events: { created: "design.saved", updated: "design.updated" },
  },
  product: {
    type: "product",
    path: "/products",
    portal: "installer",
    search: ["search", "category", "page", "limit"],
    pii: [],
    aiWritable: [],
    supports: { list: true, get: true, create: false, update: false, delete: false },
    events: { created: "record.purged", updated: "record.purged" },
  },
  appointment: {
    type: "appointment",
    path: "/appointments",
    portal: "installer",
    search: ["from", "to", "leadId", "customerId"],
    pii: ["location"],
    aiWritable: ["notes"],
    ownerInstallerPath: "installerId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "appointment.booked", updated: "appointment.moved" },
  },
  task: {
    type: "task",
    path: "/installer-tasks",
    portal: "installer",
    search: ["leadId", "customerId", "status"],
    pii: [],
    aiWritable: ["title", "description", "dueDate", "status", "priority"],
    ownerInstallerPath: "assignedToId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "task.created", updated: "task.updated" },
  },
  note: {
    type: "note",
    path: "/installer-notes",
    portal: "installer",
    search: ["leadId", "customerId"],
    pii: [],
    aiWritable: ["content"],
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "note.created", updated: "note.updated" },
  },
  /** Portal users (installers, staff, customers). Confirm `/users/:id` exists for admin tokens in the backend. */
  user: {
    type: "user",
    path: "/users",
    portal: "admin",
    search: ["role", "search"],
    pii: ["firstName", "lastName", "email", "phone"],
    aiWritable: [],
    supports: { list: true, get: true, create: false, update: false, delete: false },
    events: { created: "record.purged", updated: "record.purged" },
  },
  document: {
    type: "document",
    path: "/installer-customer-documents",
    portal: "installer",
    search: ["customerId", "leadId", "category"],
    pii: [],
    aiWritable: ["category", "tags", "aiLabels", "extracted", "reviewState"],
    ownerCustomerPath: "customerId",
    supports: { list: true, get: true, create: false, update: true, delete: false },
    events: { created: "file.uploaded", updated: "file.classified" },
  },
};

export function getRecordType(type: string): RecordTypeDef {
  const def = RECORD_TYPES[type];
  if (!def) throw new Error(`Unknown record type: ${type}`);
  return def;
}

export function readPath(obj: unknown, path: string | undefined): unknown {
  if (!path || obj == null || typeof obj !== "object") return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}
