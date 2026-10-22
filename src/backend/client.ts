import { backendHasProjects, getRecordType } from "../core/records.js";

/**
 * Where the AI's names for fields differ from the backend's. Partner kinds are
 * lower case here and an enum there; a document's AI fields are written through
 * PATCH /installer-customer-documents/:id/ai.
 */
const ADAPTERS: Record<string, { updatePath?: (id: string) => string; toBackend?: (f: Record<string, unknown>) => Record<string, unknown>; fromBackend?: (r: Record<string, unknown>) => Record<string, unknown> }> = {
  partner: {
    toBackend: (f) => (f.kind ? { ...f, kind: String(f.kind).toUpperCase() } : f),
    fromBackend: (r) => (r.kind ? { ...r, kind: String(r.kind).toLowerCase() } : r),
  },
  document: {
    updatePath: (id) => `/installer-customer-documents/${encodeURIComponent(id)}/ai`,
    toBackend: (f) => {
      const out: Record<string, unknown> = {};
      if (f.aiLabels !== undefined) out.aiLabels = f.aiLabels;
      if (f.extracted !== undefined) out.aiExtracted = f.extracted;
      if (f.issues !== undefined) out.aiIssues = f.issues;
      for (const k of ["reviewState", "leadId", "s3Key"]) if (f[k] !== undefined) out[k] = f[k];
      return out;
    },
    fromBackend: (r) => ({ ...r, extracted: r.extracted ?? r.aiExtracted, issues: r.issues ?? r.aiIssues }),
  },
};
const adapter = (type: string) => (backendHasProjects() ? ADAPTERS[type] : undefined);

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

/** Stands in for the AI service account's token; HttpBackend swaps in a live one. */
export const SERVICE_ACCOUNT = "service-account";

/** AI_SERVICE_TOKEN may hold {"email","password"} for the AI's backend user instead of a fixed token. */
export function serviceLogin(raw = process.env.AI_SERVICE_TOKEN ?? ""): { email: string; password: string } | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const v = JSON.parse(t) as { email?: unknown; password?: unknown };
    return typeof v.email === "string" && typeof v.password === "string" && v.email && v.password ? { email: v.email.trim(), password: v.password } : null;
  } catch {
    return null;
  }
}

export class HttpBackend implements Backend {
  /** The service account's current access token (backend tokens are short-lived, so it signs in again before expiry). */
  private svc: { token: string; exp: number } | null = null;
  private signingIn: Promise<string> | null = null;

  constructor(
    private baseUrl = process.env.BACKEND_API_BASE_URL ?? "",
    private fetchImpl: typeof fetch = fetch,
    private login = serviceLogin(),
  ) {
    if (!this.baseUrl) throw new Error("BACKEND_API_BASE_URL is not set");
  }

  private async serviceToken(force = false): Promise<string> {
    if (!force && this.svc && this.svc.exp > Date.now() + 60_000) return this.svc.token;
    if (!this.login) throw new Error("AI service account login is not configured");
    this.signingIn ??= (async () => {
      const res = await this.fetchImpl(this.url("/auth/login"), {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(this.login),
      });
      const json = (await res.json().catch(() => ({}))) as Envelope & { accessToken?: string };
      const data = (json.data ?? json) as { accessToken?: string };
      if (!res.ok || typeof data.accessToken !== "string") throw new Error(`AI service account sign-in failed (${res.status}): ${json.message ?? "no token"}`);
      // Use the token's own expiry when it has one; otherwise assume 10 minutes.
      let exp = Date.now() + 10 * 60_000;
      try {
        const payload = JSON.parse(Buffer.from(data.accessToken.split(".")[1] ?? "", "base64url").toString()) as { exp?: number };
        if (payload.exp) exp = payload.exp * 1000;
      } catch {
        /* not a JWT */
      }
      this.svc = { token: data.accessToken, exp };
      return data.accessToken;
    })().finally(() => {
      this.signingIn = null;
    });
    return this.signingIn;
  }

  private url(path: string) {
    return `${this.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  async call<T>(method: string, path: string, body: unknown, auth: BackendAuth, retried = false): Promise<BackendResponse<T>> {
    const asService = auth.token === SERVICE_ACCOUNT;
    const token = asService ? await this.serviceToken() : auth.token;
    const res = await this.fetchImpl(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
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
    // The service account's token expired early or was revoked: sign in again once.
    if (asService && res.status === 401 && !retried) {
      await this.serviceToken(true);
      return this.call<T>(method, path, body, auth, true);
    }
    const env = (json && typeof json === "object" ? json : {}) as Envelope;
    const data = ("data" in env ? env.data : json) as T;
    return { ok: res.ok, status: res.status, data: res.ok ? data : null, message: env.message };
  }

  list(type: string, filter: Record<string, unknown>, auth: BackendAuth) {
    const def = getRecordType(type);
    const qs = new URLSearchParams();
    const a = adapter(type);
    const f = a?.toBackend && filter.kind ? a.toBackend(filter) : filter;
    for (const [k, v] of Object.entries(f)) if (v != null && def.search.includes(k)) qs.set(k, String(v));
    const q = qs.toString();
    return this.call<unknown>("GET", `${def.path}${q ? `?${q}` : ""}`, null, auth).then((r) => ({
      ...r,
      data: normaliseList(r.data).map((row) => (a?.fromBackend && row && typeof row === "object" ? a.fromBackend(row as Record<string, unknown>) : row)),
    }));
  }
  private one(type: string, r: BackendResponse<Record<string, unknown>>) {
    const a = adapter(type);
    return a?.fromBackend && r.data ? { ...r, data: a.fromBackend(r.data) } : r;
  }
  async get(type: string, id: string, auth: BackendAuth) {
    return this.one(type, await this.call<Record<string, unknown>>("GET", `${getRecordType(type).path}/${encodeURIComponent(id)}`, null, auth));
  }
  async create(type: string, fields: Record<string, unknown>, auth: BackendAuth) {
    const a = adapter(type);
    return this.one(type, await this.call<Record<string, unknown>>("POST", getRecordType(type).path, a?.toBackend ? a.toBackend(fields) : fields, auth));
  }
  async update(type: string, id: string, fields: Record<string, unknown>, auth: BackendAuth) {
    const a = adapter(type);
    const path = a?.updatePath ? a.updatePath(id) : `${getRecordType(type).path}/${encodeURIComponent(id)}`;
    return this.one(type, await this.call<Record<string, unknown>>("PATCH", path, a?.toBackend ? a.toBackend(fields) : fields, auth));
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
  /** Extra endpoints for tests (e.g. the /projects routes from the backend patch). */
  routes: ((method: string, path: string, body: unknown, token: string) => BackendResponse | undefined)[] = [];
  async call<T>(method: string, path: string, body: unknown, auth: BackendAuth) {
    this.calls.push({ method, path, body, token: auth.token });
    for (const r of this.routes) {
      const hit = r(method, path, body, auth.token);
      if (hit) return hit as BackendResponse<T>;
    }
    // Mirrors the backend's POST /leads/:id/assign.
    const m = path.match(/^\/leads\/([^/]+)\/assign$/);
    if (m && method === "POST") {
      const b = body as { installerId?: string; assignedToId?: string };
      await this.update("lead", decodeURIComponent(m[1]!), { assignedToId: b.assignedToId ?? b.installerId });
      return { ok: true, status: 200, data: { assigned: true } as T };
    }
    return { ok: true, status: 200, data: { queued: true } as T };
  }
  async whoAmI(auth: BackendAuth) {
    const u = this.users.get(auth.token);
    return u ? { ok: true, status: 200, data: u } : { ok: false, status: 401, data: null, message: "Unauthorized" };
  }
}
