import type { Backend, BackendAuth } from "../backend/client.js";
import type { RecordRef } from "../core/envelope.js";
import type { MessageCopy, Store } from "../store/types.js";

/**
 * Everything that is for or about an entity (spec 8.7): documents and photos,
 * designs and proposals, bookings, payments and quotes, tasks, notes and every
 * message sent. Each kind of item comes from where it already lives (the
 * backend, or the AI store for message copies) and says who may see it.
 *
 * Adding a new kind (invoices, warranties, STC claims) is one entry here.
 */
export type Viewer = "staff" | "installer" | "customer";

export type Item = {
  key: string;
  kind: string;
  id: string;
  title: string;
  subtitle: string;
  at: string | null;
  status: string | null;
  amount: string | null;
  /** How the portal opens it. */
  open: { type: "file" | "message" | "none"; id?: string };
  /** For or about which records (for access). */
  records: RecordRef[];
  by: string | null;
};

type Scope = { customers: string[]; leads: string[]; users: string[] };
type Ctx = { backend: Backend; store: Store; svc: BackendAuth; scope: Scope };

type Source = {
  kind: string;
  label: string;
  /** Who sees this kind on a project. Installers see project items only when assigned; customers only their own. */
  audience: Viewer[];
  load: (ctx: Ctx) => Promise<Item[]>;
};

const s = (v: unknown) => (v == null ? "" : String(v));
const money = (amount: unknown, currency = "AUD") =>
  amount == null || amount === "" ? null : new Intl.NumberFormat("en-AU", { style: "currency", currency: s(currency).toUpperCase() || "AUD" }).format(Number(amount));
const when = (d: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (d[k]) return s(d[k]);
  return null;
};
const pretty = (v: unknown) => s(v).replace(/_/g, " ").toLowerCase();

async function listBy(ctx: Ctx, type: string, extra: Record<string, unknown> = {}) {
  const rows: Record<string, unknown>[] = [];
  for (const id of ctx.scope.customers) rows.push(...((((await ctx.backend.list(type, { customerId: id, ...extra }, ctx.svc)).data ?? []) as Record<string, unknown>[])));
  for (const id of ctx.scope.leads) rows.push(...((((await ctx.backend.list(type, { leadId: id, ...extra }, ctx.svc)).data ?? []) as Record<string, unknown>[])));
  // Keep only rows that really are about these records (a backend may ignore an unknown filter).
  const mine = rows.filter(
    (r) =>
      (r.customerId != null && ctx.scope.customers.includes(s(r.customerId))) ||
      (r.leadId != null && ctx.scope.leads.includes(s(r.leadId))) ||
      (r.customerId == null && r.leadId == null),
  );
  return mine.filter((r, i) => mine.findIndex((x) => s(x.id) === s(r.id)) === i);
}

const refsOf = (r: Record<string, unknown>): RecordRef[] => [
  ...(r.customerId ? [{ type: "customer", id: s(r.customerId) }] : []),
  ...(r.leadId ? [{ type: "lead", id: s(r.leadId) }] : []),
];

export const SOURCES: Source[] = [
  {
    kind: "document",
    label: "Documents and photos",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const rows = await listBy(ctx, "document");
      const extra = ctx.scope.users.length ? (((await ctx.backend.list("document", {}, ctx.svc)).data ?? []) as Record<string, unknown>[]).filter((d) => ctx.scope.users.includes(s(d.installerId ?? d.uploadedById))) : [];
      const all = [...rows, ...extra].filter((r, i, a) => a.findIndex((x) => s(x.id) === s(r.id)) === i);
      const profiles = new Map((await ctx.store.getFileLabels(all.map((r) => s(r.id)))).map((p) => [p.documentId, p]));
      return all.map((d) => {
        const p = profiles.get(s(d.id));
        const label = p?.labels[0]?.label ?? (d.aiLabels as { label: string }[] | undefined)?.[0]?.label ?? s(d.category);
        return {
          key: `document:${d.id}`,
          kind: "document",
          id: s(d.id),
          title: s(d.fileName ?? d.name ?? d.id),
          subtitle: [label ? pretty(label) : "not read yet", p?.deliveredTo?.length ? `sent to ${Array.from(new Set(p.deliveredTo.map((x) => x.role))).join(", ")}` : null].filter(Boolean).join(" · "),
          at: when(d, "createdAt"),
          status: p?.issues?.length ? "needs attention" : p?.reviewState === "needs_review" ? "being checked" : null,
          amount: null,
          open: { type: "file", id: s(d.id) },
          records: [...refsOf(d), ...(d.installerId ? [{ type: "user", id: s(d.installerId) }] : [])],
          by: s(d.installerId ?? d.uploadedById) || null,
        };
      });
    },
  },
  {
    kind: "design",
    label: "Designs and proposals",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) =>
      (await listBy(ctx, "design")).map((d) => ({
        key: `design:${d.id}`,
        kind: "design",
        id: s(d.id),
        title: s(d.name ?? d.title ?? `Design ${s(d.id).slice(-6)}`),
        subtitle: [d.systemSize ?? d.systemSizeKw ? `${d.systemSize ?? d.systemSizeKw} kW` : null, d.panelCount ? `${d.panelCount} panels` : null, d.inverter ? s(d.inverter) : null].filter(Boolean).join(" · ") || "Solar design",
        at: when(d, "updatedAt", "createdAt"),
        status: d.status ? pretty(d.status) : null,
        amount: money(d.price ?? d.totalPrice ?? d.salePrice),
        open: { type: "none" },
        records: refsOf(d),
        by: s(d.installerId ?? d.createdById) || null,
      })),
  },
  {
    kind: "appointment",
    label: "Bookings",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) =>
      (await listBy(ctx, "appointment")).map((a) => ({
        key: `appointment:${a.id}`,
        kind: "appointment",
        id: s(a.id),
        title: s(a.title ?? a.type ?? "Appointment"),
        subtitle: [when(a, "startTime", "startsAt", "date"), a.location ? s(a.location) : null].filter(Boolean).join(" · "),
        at: when(a, "startTime", "startsAt", "date", "createdAt"),
        status: a.status ? pretty(a.status) : null,
        amount: null,
        open: { type: "none" },
        records: [...refsOf(a), ...(a.installerId ? [{ type: "user", id: s(a.installerId) }] : [])],
        by: s(a.installerId) || null,
      })),
  },
  {
    kind: "payment",
    label: "Payments and quotes",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const rows = (((await ctx.backend.list("payment", { limit: 500 }, ctx.svc)).data ?? []) as Record<string, unknown>[]).filter(
        (p) => (p.customerId && ctx.scope.customers.includes(s(p.customerId))) || (p.installerId && ctx.scope.users.includes(s(p.installerId))),
      );
      return rows.map((p) => ({
        key: `payment:${p.id}`,
        kind: "payment",
        id: s(p.id),
        title: s(p.description) || (p.kind === "AD_QUOTE" ? "Quote" : p.kind === "PRODUCT_ORDER" ? "Order" : "Payment"),
        subtitle: [p.kind ? pretty(p.kind) : null, p.payoutStatus === "PAID_OUT" ? "paid out to installer" : null].filter(Boolean).join(" · "),
        at: when(p, "paidAt", "createdAt"),
        status: p.status ? pretty(p.status) : null,
        amount: money(p.amount, s(p.currency || "AUD")),
        open: { type: "none" },
        records: [...(p.customerId ? [{ type: "customer", id: s(p.customerId) }] : []), ...(p.installerId ? [{ type: "user", id: s(p.installerId) }] : [])],
        by: null,
      }));
    },
  },
  {
    kind: "task",
    label: "Tasks",
    audience: ["staff", "installer"],
    load: async (ctx) => {
      const rows = await listBy(ctx, "task");
      const own = ctx.scope.users.length ? (((await ctx.backend.list("task", {}, ctx.svc)).data ?? []) as Record<string, unknown>[]).filter((t) => ctx.scope.users.includes(s(t.assignedToId))) : [];
      return [...rows, ...own]
        .filter((r, i, a) => a.findIndex((x) => s(x.id) === s(r.id)) === i)
        .map((t) => ({
          key: `task:${t.id}`,
          kind: "task",
          id: s(t.id),
          title: s(t.title ?? "Task"),
          subtitle: [t.dueDate ? `due ${s(t.dueDate).slice(0, 10)}` : null, t.description ? s(t.description).slice(0, 80) : null].filter(Boolean).join(" · "),
          at: when(t, "updatedAt", "createdAt"),
          status: t.status ? pretty(t.status) : null,
          amount: null,
          open: { type: "none" },
          records: [...refsOf(t), ...(t.assignedToId ? [{ type: "user", id: s(t.assignedToId) }] : [])],
          by: s(t.createdById) || null,
        }));
    },
  },
  {
    // Installer notes are working notes: EasyLink staff and the installer assigned, never customers.
    kind: "note",
    label: "Installer notes",
    audience: ["staff", "installer"],
    load: async (ctx) =>
      (await listBy(ctx, "note")).map((n) => ({
        key: `note:${n.id}`,
        kind: "note",
        id: s(n.id),
        title: s(n.content ?? n.text ?? "").slice(0, 120) || "Note",
        subtitle: "",
        at: when(n, "updatedAt", "createdAt"),
        status: null,
        amount: null,
        open: { type: "none" },
        records: refsOf(n),
        by: s(n.installerId ?? n.createdById) || null,
      })),
  },
  {
    kind: "message",
    label: "Messages sent",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const wanted = new Set([...ctx.scope.customers.map((id) => `customer#${id}`), ...ctx.scope.leads.map((id) => `lead#${id}`), ...ctx.scope.users.map((id) => `user#${id}`)]);
      const copies = ((await ctx.store.listRecords("message")) as unknown as MessageCopy[]).filter(
        (m) => m.records.some((r) => wanted.has(`${r.type}#${r.id}`)) || (ctx.scope.users.includes(m.from.id)),
      );
      return copies.map((m) => ({
        key: `message:${m.id}`,
        kind: "message",
        id: m.id,
        title: m.subject || m.body.slice(0, 80),
        subtitle: `to ${m.to.name} (${m.to.role}) by ${m.channels.join(" + ")}${m.files.length ? ` · ${m.files.length} file${m.files.length > 1 ? "s" : ""}` : ""}`,
        at: m.at,
        status: m.status,
        amount: null,
        open: { type: "message", id: m.id },
        records: m.records,
        by: m.from.id,
      }));
    },
  },
];

/** Everything for or about these records that this viewer may see, newest first. */
export async function loadItems(args: { backend: Backend; store: Store; svc: BackendAuth; scope: Scope; viewer: Viewer }): Promise<{ items: Item[]; kinds: { kind: string; label: string; count: number }[] }> {
  const ctx: Ctx = { backend: args.backend, store: args.store, svc: args.svc, scope: args.scope };
  const out: Item[] = [];
  const kinds: { kind: string; label: string; count: number }[] = [];
  for (const src of SOURCES.filter((x) => x.audience.includes(args.viewer))) {
    const items = await src.load(ctx).catch((e) => {
      console.error(`items ${src.kind}`, e);
      return [] as Item[];
    });
    out.push(...items);
    if (items.length) kinds.push({ kind: src.kind, label: src.label, count: items.length });
  }
  out.sort((a, b) => s(b.at).localeCompare(s(a.at)));
  return { items: out, kinds };
}
