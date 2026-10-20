import type { Backend } from "../backend/client.js";
import { backendHasProjects } from "../core/records.js";
import type { Principal, RecordRef } from "../core/envelope.js";
import { isStaff } from "../policy/policy.js";
import type { Store } from "../store/types.js";

/**
 * Who may see what (spec 8.8). Visibility follows relationships, not screens:
 *   - EasyLink staff see everything.
 *   - An installer sees everything about the customers and leads CURRENTLY
 *     assigned to them, including what earlier installers and EasyLink did.
 *   - A customer sees everything about their own project, including everything
 *     from every installer who has been assigned to it.
 * Internal lines (AI reasoning, policy refusals) stay staff-only, and contact
 * details of other people are never shown to customers or installers.
 *
 * With BACKEND_PROJECTS_API=1 the backend's `installer_assignments` table and
 * /projects endpoints are the source of truth. Before that, assignments are
 * kept here with their history and the lead's `assignedToId` is kept in step.
 */
export type Assignment = {
  id: string;
  customerId: string | null;
  leadId: string | null;
  installerId: string;
  installerName?: string;
  from: string;
  to: string | null;
  assignedBy: string;
  reason: string;
};

export type Scope = { all: true } | { all: false; customers: Set<string>; leads: Set<string>; self: string };

export class Relations {
  constructor(private deps: { store: Store; backend: Backend; serviceToken: string }) {}

  private get svc() {
    return { token: this.deps.serviceToken };
  }

  async assignments(): Promise<Assignment[]> {
    return (await this.deps.store.listRecords("assignment")) as unknown as Assignment[];
  }

  /** The backend's assignment rows for a customer, in this file's shape. */
  private async backendHistory(customerId: string): Promise<Assignment[]> {
    const r = await this.deps.backend.call<Record<string, unknown>[]>("GET", `/projects/${encodeURIComponent(customerId)}/assignments`, null, this.svc);
    return ((r.data ?? []) as Record<string, unknown>[]).map((a) => ({
      id: String(a.id),
      customerId: a.customerId ? String(a.customerId) : customerId,
      leadId: a.leadId ? String(a.leadId) : null,
      installerId: String(a.installerId),
      from: a.startedAt ? String(a.startedAt) : "",
      to: a.endedAt ? String(a.endedAt) : null,
      assignedBy: String(a.assignedById ?? ""),
      reason: String(a.reason ?? ""),
    }));
  }

  /** Assignments for one customer or lead, newest first. */
  async history(ref: RecordRef): Promise<Assignment[]> {
    const ids = await this.linkedIds(ref);
    if (backendHasProjects()) {
      const rows: Assignment[] = [];
      for (const id of ids.customers) rows.push(...(await this.backendHistory(id)));
      return rows.filter((a, i) => rows.findIndex((x) => x.id === a.id) === i).sort((a, b) => b.from.localeCompare(a.from));
    }
    return (await this.assignments())
      .filter((a) => (a.customerId && ids.customers.has(a.customerId)) || (a.leadId && ids.leads.has(a.leadId)))
      .sort((a, b) => b.from.localeCompare(a.from));
  }

  /** Installers assigned now: from assignments, else from the backend's own fields. */
  async currentInstallers(ref: RecordRef): Promise<string[]> {
    const h = await this.history(ref);
    if (h.length) return Array.from(new Set(h.filter((a) => !a.to).map((a) => a.installerId)));
    const ids = await this.linkedIds(ref);
    const out = new Set<string>();
    for (const id of ids.leads) {
      const l = await this.deps.backend.get("lead", id, this.svc);
      if (l.data?.assignedToId) out.add(String(l.data.assignedToId));
    }
    for (const id of ids.customers) {
      const c = await this.deps.backend.get("customer", id, this.svc);
      const v = c.data?.installerId ?? c.data?.assignedInstallerId;
      if (v) out.add(String(v));
    }
    return [...out];
  }

  /** A customer and its lead are one project: either id finds the other. */
  async linkedIds(ref: RecordRef): Promise<{ customers: Set<string>; leads: Set<string> }> {
    const customers = new Set<string>();
    const leads = new Set<string>();
    if (ref.type === "customer") {
      customers.add(ref.id);
      const c = await this.deps.backend.get("customer", ref.id, this.svc);
      if (c.data?.leadId) leads.add(String(c.data.leadId));
    } else if (ref.type === "lead") {
      leads.add(ref.id);
      const l = await this.deps.backend.get("lead", ref.id, this.svc);
      if (l.data?.customerId) customers.add(String(l.data.customerId));
    }
    return { customers, leads };
  }

  /** The customer record(s) a signed-in customer owns. */
  async customerIdsForUser(user: Record<string, unknown>): Promise<string[]> {
    if (user.customerId) return [String(user.customerId)];
    const email = String(user.email ?? "").toLowerCase();
    const r = await this.deps.backend.list("customer", email ? { search: email } : { search: String(user.id ?? "") }, this.svc);
    return ((r.data ?? []) as Record<string, unknown>[])
      .filter((c) => (email && String(c.email ?? "").toLowerCase() === email) || String(c.userId ?? "") === String(user.id ?? ""))
      .map((c) => String(c.id));
  }

  /** Everything this person may see. */
  async scope(p: Principal, user: Record<string, unknown> = {}, token?: string): Promise<Scope> {
    if (isStaff(p) || p.kind === "system" || p.kind === "agent") return { all: true };
    const customers = new Set<string>();
    const leads = new Set<string>();
    // The backend decides, with the person's own token.
    if (backendHasProjects() && token && (p.kind === "customer" || p.kind === "installer")) {
      const r = await this.deps.backend.call<Record<string, unknown>[]>("GET", "/projects?limit=200", null, { token });
      for (const row of (r.data ?? []) as Record<string, unknown>[]) customers.add(String(row.customerId));
      for (const id of [...customers]) (await this.linkedIds({ type: "customer", id })).leads.forEach((x) => leads.add(x));
      return { all: false, customers, leads, self: p.id };
    }
    if (p.kind === "customer") {
      for (const id of await this.customerIdsForUser({ id: p.id, ...user })) {
        customers.add(id);
        const l = await this.linkedIds({ type: "customer", id });
        l.leads.forEach((x) => leads.add(x));
      }
    } else if (p.kind === "installer") {
      const mine = (await this.assignments()).filter((a) => a.installerId === p.id && !a.to);
      const reassigned = new Set((await this.assignments()).filter((a) => a.installerId === p.id && a.to).flatMap((a) => [a.customerId, a.leadId]).filter(Boolean) as string[]);
      for (const a of mine) {
        if (a.customerId) customers.add(a.customerId);
        if (a.leadId) leads.add(a.leadId);
      }
      // Leads the backend assigns to them (until every assignment goes through here).
      const r = await this.deps.backend.list("lead", { assignedToId: p.id }, this.svc);
      for (const l of (r.data ?? []) as Record<string, unknown>[]) {
        if (reassigned.has(String(l.id))) continue;
        leads.add(String(l.id));
        if (l.customerId) customers.add(String(l.customerId));
      }
      // A customer whose lead is theirs is theirs too.
      for (const leadId of [...leads]) {
        const l = await this.linkedIds({ type: "lead", id: leadId });
        l.customers.forEach((x) => customers.add(x));
      }
    }
    return { all: false, customers, leads, self: p.id };
  }

  static covers(scope: Scope, ref: RecordRef, extra?: { customerId?: unknown; leadId?: unknown }): boolean {
    if (scope.all) return true;
    if (ref.type === "customer") return scope.customers.has(ref.id);
    if (ref.type === "lead") return scope.leads.has(ref.id);
    if (ref.type === "user") return ref.id === scope.self;
    const c = extra?.customerId != null ? String(extra.customerId) : null;
    const l = extra?.leadId != null ? String(extra.leadId) : null;
    return (!!c && scope.customers.has(c)) || (!!l && scope.leads.has(l));
  }

  /** Record a new assignment (closing the current one) and keep the backend's lead in step. */
  async assign(args: { customerId: string | null; leadId: string | null; installerId: string; installerName?: string; by: string; reason: string; replace: boolean; now: string }) {
    if (backendHasProjects()) {
      const customerId = args.customerId ?? [...(await this.linkedIds({ type: "lead", id: args.leadId! })).customers][0];
      if (!customerId) throw new Error("This lead has no customer yet, so the installer can't be recorded on a project.");
      const before = await this.backendHistory(customerId);
      const r = await this.deps.backend.call<{ assignment: Record<string, unknown>; ended: string[] }>(
        "POST",
        `/projects/${encodeURIComponent(customerId)}/assignments`,
        { installerId: args.installerId, ...(args.leadId ? { leadId: args.leadId } : {}), mode: args.replace ? "REPLACE" : "ADD", reason: args.reason },
        this.svc,
      );
      if (!r.ok || !r.data) throw new Error(r.message ?? `The backend refused the assignment (${r.status}).`);
      const a = r.data.assignment;
      const current: Assignment = { id: String(a.id), customerId, leadId: a.leadId ? String(a.leadId) : args.leadId, installerId: args.installerId, installerName: args.installerName, from: String(a.startedAt ?? args.now), to: null, assignedBy: args.by, reason: args.reason };
      const closed = before.filter((b) => !b.to && (r.data!.ended ?? []).includes(b.installerId)).map((b) => ({ ...b, to: args.now }));
      return { current, closed };
    }
    const prior = await this.history(args.customerId ? { type: "customer", id: args.customerId } : { type: "lead", id: args.leadId! });
    const closed: Assignment[] = [];
    if (args.replace) {
      for (const a of prior.filter((x) => !x.to && x.installerId !== args.installerId)) {
        const done = { ...a, to: args.now };
        await this.deps.store.putRecord("assignment", done as unknown as Record<string, unknown> & { id: string });
        closed.push(done);
      }
    }
    // Before the first recorded assignment, write down who had it according to the backend.
    if (!prior.length && args.replace) {
      for (const id of await this.currentInstallers(args.customerId ? { type: "customer", id: args.customerId } : { type: "lead", id: args.leadId! })) {
        if (id === args.installerId) continue;
        const done: Assignment = { id: `asg_${id}_${args.customerId ?? args.leadId}_before`, customerId: args.customerId, leadId: args.leadId, installerId: id, from: "", to: args.now, assignedBy: "backend", reason: "Assigned before history was kept" };
        await this.deps.store.putRecord("assignment", done as unknown as Record<string, unknown> & { id: string });
        closed.push(done);
      }
    }
    const current: Assignment = {
      id: `asg_${args.installerId}_${args.customerId ?? args.leadId}_${args.now}`,
      customerId: args.customerId,
      leadId: args.leadId,
      installerId: args.installerId,
      installerName: args.installerName,
      from: args.now,
      to: null,
      assignedBy: args.by,
      reason: args.reason,
    };
    await this.deps.store.putRecord("assignment", current as unknown as Record<string, unknown> & { id: string });
    return { current, closed };
  }
}
