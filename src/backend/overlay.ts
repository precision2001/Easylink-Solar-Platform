import { newId } from "../core/envelope.js";
import { RECORD_TYPES } from "../core/records.js";
import type { Store } from "../store/types.js";
import type { Backend, BackendAuth, BackendResponse } from "./client.js";

/**
 * Serves record types marked `storedIn: "ai"` (partners) from the AI store and
 * everything else from the existing backend. When the backend gains a table for
 * a type, flip its `storedIn` and nothing else changes.
 *
 * Access for AI-held types: anyone signed in may read (installers need the
 * retailer's details to send to it); only staff and system may write. The
 * backend's /users/me decides who is staff.
 */
export class OverlayBackend implements Backend {
  constructor(readonly inner: Backend, private store: Store) {}

  private local(type: string) {
    return RECORD_TYPES[type]?.storedIn === "ai";
  }
  private async canWrite(auth: BackendAuth) {
    const r = await this.inner.whoAmI(auth);
    const u = (r.data?.user as Record<string, unknown> | undefined) ?? r.data ?? {};
    return r.ok && ["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"].includes(String(u.role ?? "").toUpperCase());
  }
  private async signedIn(auth: BackendAuth) {
    return (await this.inner.whoAmI(auth)).ok;
  }
  private denied<T>(): BackendResponse<T> {
    return { ok: false, status: 403, data: null, message: "Not allowed" };
  }

  async list(type: string, filter: Record<string, unknown>, auth: BackendAuth) {
    if (!this.local(type)) return this.inner.list(type, filter, auth);
    if (!(await this.signedIn(auth))) return this.denied<unknown[]>();
    const rows = (await this.store.listRecords(type)).filter((r) =>
      Object.entries(filter).every(([k, v]) =>
        k === "search" ? JSON.stringify(r).toLowerCase().includes(String(v).toLowerCase()) : ["page", "limit"].includes(k) || String(r[k]) === String(v),
      ),
    );
    return { ok: true, status: 200, data: rows };
  }
  async get(type: string, id: string, auth: BackendAuth) {
    if (!this.local(type)) return this.inner.get(type, id, auth);
    if (!(await this.signedIn(auth))) return this.denied<Record<string, unknown>>();
    const r = await this.store.getRecord(type, id);
    return r ? { ok: true, status: 200, data: r } : { ok: false, status: 404, data: null, message: "Not found" };
  }
  async create(type: string, fields: Record<string, unknown>, auth: BackendAuth) {
    if (!this.local(type)) return this.inner.create(type, fields, auth);
    if (!(await this.canWrite(auth))) return this.denied<Record<string, unknown>>();
    const row = { ...fields, id: String(fields.id ?? newId(`${type.slice(0, 3)}_`)), createdAt: new Date().toISOString() };
    await this.store.putRecord(type, row);
    return { ok: true, status: 201, data: row };
  }
  async update(type: string, id: string, fields: Record<string, unknown>, auth: BackendAuth) {
    if (!this.local(type)) return this.inner.update(type, id, fields, auth);
    if (!(await this.canWrite(auth))) return this.denied<Record<string, unknown>>();
    const cur = await this.store.getRecord(type, id);
    if (!cur) return { ok: false, status: 404, data: null, message: "Not found" };
    const row = { ...cur, ...fields, id, updatedAt: new Date().toISOString() };
    await this.store.putRecord(type, row);
    return { ok: true, status: 200, data: row };
  }
  call<T>(method: string, path: string, body: unknown, auth: BackendAuth) {
    return this.inner.call<T>(method, path, body, auth);
  }
  whoAmI(auth: BackendAuth) {
    return this.inner.whoAmI(auth);
  }
}
