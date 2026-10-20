import { getRecordType } from "../core/records.js";

/**
 * Talks to the existing Express backend (`BACKEND_API_BASE_URL`, e.g. https://…/api/v1).
 * People's actions run with their own bearer token, so the backend's RBAC applies
 * exactly as it does in the portals. Agents use a dedicated service account token
 * (`AI_SERVICE_TOKEN`), which should be an admin user created for the AI platform.
 */
export type BackendAuth = { token: string };

export type BackendResponse<T = unknown> = { ok: boolean; status: number; data: T | null; message?: string };

export interface Backend {
  list(type: string, filter: Record<string, unknown>, auth: BackendAuth): Promise<BackendResponse<unknown[]>>;
  get(type: string, id: string, auth: BackendAuth): Promise<BackendResponse<Record<string, unknown>>>;
  create(type: string, fields: Record<string, unknown>, auth: BackendAuth): Promise<BackendResponse<Record<string, unknown>>>;
  update(type: string, id: string, fields: Record<string, unknown>, auth: BackendAuth): Promise<BackendResponse<Record<string, unknown>>>;
  /** Raw call for endpoints outside the record registry (communications, calls). */
  call<T = unknown>(method: string, path: string, body: unknown, auth: BackendAuth): Promise<BackendResponse<T>>;
  /** Resolve a bearer token to the user it belongs to (GET /users/me). */
  whoAmI(auth: BackendAuth): Promise<BackendResponse<Record<string, unknown>>>;
}

type Envelope = { success?: boolean; message?: string; data?: unknown };

export class HttpBackend implements Backend {
  constructor(
    private baseUrl = process.env.BACKEND_API_BASE_URL ?? "",
    private fetchImpl: typeof fetch = fetch,
  ) {
    if (!this.baseUrl) throw new Error("BACKEND_API_BASE_URL is not set");
  }

  private url(path: string) {
    return `${this.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  async call<T>(method: string, path: string, body: unknown, auth: BackendAuth): Promise<BackendResponse<T>> {
    const res = await this.fetchImpl(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
        ...(body != null ? { "Content-Type": "application/json" } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    let json: Envelope | unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const env = (json && typeof json === "object" ? json : {}) as Envelope;
    const data = ("data" in env ? env.data : json) as T;
    return { ok: res.ok, status: res.status, data: res.ok ? data : null, message: env.message };
  }

  list(type: string, filter: Record<string, unknown>, auth: BackendAuth) {
    const def = getRecordType(type);
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) if (v != null && def.search.includes(k)) qs.set(k, String(v));
    const q = qs.toString();
    return this.call<unknown>("GET", `${def.path}${q ? `?${q}` : ""}`, null, auth).then((r) => ({
      ...r,
      data: normaliseList(r.data),
    }));
  }
  get(type: string, id: string, auth: BackendAuth) {
    return this.call<Record<string, unknown>>("GET", `${getRecordType(type).path}/${encodeURIComponent(id)}`, null, auth);
  }
  create(type: string, fields: Record<string, unknown>, auth: BackendAuth) {
    return this.call<Record<string, unknown>>("POST", getRecordType(type).path, fields, auth);
  }
  update(type: string, id: string, fields: Record<string, unknown>, auth: BackendAuth) {
    return this.call<Record<string, unknown>>("PATCH", `${getRecordType(type).path}/${encodeURIComponent(id)}`, fields, auth);
  }
  whoAmI(auth: BackendAuth) {
    return this.call<Record<string, unknown>>("GET", "/users/me", null, auth);
  }
}

/** Lists come back as an array or wrapped ({ leads: [...] }, { items: [...] }). */
export function normaliseList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const v of Object.values(data as Record<string, unknown>)) if (Array.isArray(v)) return v;
  }
  return [];
}

/** In-memory backend for development and tests. */
export class FakeBackend implements Backend {
  records = new Map<string, Map<string, Record<string, unknown>>>();
  calls: { method: string; path: string; body: unknown; token: string }[] = [];
  users = new Map<string, Record<string, unknown>>(); // token -> user
  private seq = 1;

  seed(type: string, rows: Record<string, unknown>[]) {
    const m = this.records.get(type) ?? new Map();
    for (const r of rows) m.set(String(r.id), r);
    this.records.set(type, m);
  }
  private table(type: string) {
    if (!this.records.has(type)) this.records.set(type, new Map());
    return this.records.get(type)!;
  }
  async list(type: string, filter: Record<string, unknown>) {
    const rows = [...this.table(type).values()].filter((r) =>
      Object.entries(filter).every(([k, v]) =>
        k === "search"
          ? JSON.stringify(r).toLowerCase().includes(String(v).toLowerCase())
          : ["page", "limit"].includes(k) || String(r[k]) === String(v),
      ),
    );
    return { ok: true, status: 200, data: rows };
  }
  async get(type: string, id: string) {
    const r = this.table(type).get(id);
    return r ? { ok: true, status: 200, data: r } : { ok: false, status: 404, data: null, message: "Not found" };
  }
  async create(type: string, fields: Record<string, unknown>) {
    const id = String(fields.id ?? `${type}_${this.seq++}`);
    const row = { ...fields, id };
    this.table(type).set(id, row);
    return { ok: true, status: 201, data: row };
  }
  async update(type: string, id: string, fields: Record<string, unknown>) {
    const cur = this.table(type).get(id);
    if (!cur) return { ok: false, status: 404, data: null, message: "Not found" };
    const row = { ...cur, ...fields };
    this.table(type).set(id, row);
    return { ok: true, status: 200, data: row };
  }
  async call<T>(method: string, path: string, body: unknown, auth: BackendAuth) {
    this.calls.push({ method, path, body, token: auth.token });
    return { ok: true, status: 200, data: { queued: true } as T };
  }
  async whoAmI(auth: BackendAuth) {
    const u = this.users.get(auth.token);
    return u ? { ok: true, status: 200, data: u } : { ok: false, status: 401, data: null, message: "Unauthorized" };
  }
}
