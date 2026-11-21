import { buildBackendUrl } from "@/lib/customers/backend";
import type { BookingKind, Busy } from "@/lib/booking/rules";
import { BOOKING_TZ } from "@/lib/booking/rules";

/**
 * Server-only bridge from the public booking link to the EasyLink backend.
 *
 * The visitor isn't signed in, so the web server calls the backend as the
 * EasyLink AI service account (the same account the phone AI books with:
 * BOOKING_SERVICE_EMAIL / BOOKING_SERVICE_PASSWORD). Bookings go through
 * /ai-bookings, so they follow Operations Portal > AI bookings: the EasyLink
 * container holds them until staff nominate an installer.
 *
 * Nothing from here is sent to the browser except what each route picks out.
 */

export class BookingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function bookingServiceConfigured(): boolean {
  return !!(process.env.BACKEND_API_BASE_URL && process.env.BOOKING_SERVICE_EMAIL && process.env.BOOKING_SERVICE_PASSWORD);
}

let session: { token: string; exp: number; userId: string | null } | null = null;
let signingIn: Promise<void> | null = null;

async function raw(method: string, path: string, body: unknown, token: string | null): Promise<{ status: number; json: Record<string, unknown> }> {
  const base = process.env.BACKEND_API_BASE_URL;
  if (!base) throw new BookingError("Booking is not set up yet.", 503);
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "easylink-booking-link" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(buildBackendUrl(base, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new BookingError("We couldn't reach EasyLink just now. Please try again.", 502);
  }
  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  return { status: res.status, json };
}

async function signIn(): Promise<void> {
  const email = process.env.BOOKING_SERVICE_EMAIL;
  const password = process.env.BOOKING_SERVICE_PASSWORD;
  if (!email || !password) throw new BookingError("Booking is not set up yet.", 503);
  const { status, json } = await raw("POST", "/auth/login", { email, password }, null);
  const data = ((json.data as Record<string, unknown>) ?? json) as Record<string, unknown>;
  const token = (data.accessToken as string) || ((data.tokens as Record<string, unknown> | undefined)?.accessToken as string);
  if (status !== 200 || !token) throw new BookingError("Booking is unavailable right now. Please call us.", 503);
  session = { token, exp: Date.now() + 10 * 60_000, userId: ((data.user as Record<string, unknown> | undefined)?.id as string) ?? null };
}

async function token(): Promise<string> {
  if (!session || session.exp < Date.now() + 30_000) {
    signingIn ??= signIn().finally(() => {
      signingIn = null;
    });
    await signingIn;
  }
  return session!.token;
}

/** Call the backend as the service account; returns `data` (or the body). */
export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  let r = await raw(method, path, body, await token());
  if (r.status === 401) {
    session = null;
    r = await raw(method, path, body, await token());
  }
  if (r.status >= 400) {
    const msg = typeof r.json.message === "string" ? r.json.message : `EasyLink returned ${r.status}`;
    throw new BookingError(msg, r.status >= 500 ? 502 : r.status);
  }
  return ((r.json.data ?? r.json) as T);
}

const qs = (p: Record<string, string | number | undefined | null>) =>
  new URLSearchParams(Object.entries(p).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])).toString();

function rows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    for (const k of ["leads", "items", "data", "appointments", "rows"]) {
      const v = (data as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

// ---------------------------------------------------------------- leads

export type Lead = {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string | null;
  notes: string | null;
  status?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export const digits = (phone: string | null | undefined) => {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("61")) d = "0" + d.slice(2);
  return d;
};

/** "+61 400 111 222" → "0400111222"; anything else as typed. */
export const nationalPhone = (phone: string) => {
  const d = digits(phone);
  return d.length === 10 && d.startsWith("0") ? d : phone.trim();
};

export async function getLead(id: string): Promise<Lead | null> {
  try {
    return await api<Lead>("GET", `/leads/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof BookingError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

/** The newest lead matching this mobile (last 9 digits) or email. */
export async function findLead(phone?: string | null, email?: string | null): Promise<Lead | null> {
  const tail = digits(phone).slice(-9);
  const mail = (email ?? "").trim().toLowerCase();
  for (const term of [tail.length === 9 ? tail : null, mail || null]) {
    if (!term) continue;
    let found = rows<Lead>(await api("GET", `/leads?${qs({ limit: 10, search: term })}`));
    if (term === tail) found = found.filter((l) => digits(l.customerPhone).endsWith(tail));
    else found = found.filter((l) => (l.customerEmail ?? "").trim().toLowerCase() === mail);
    if (found.length) {
      found.sort((a, b) => (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""));
      return found[0];
    }
  }
  return null;
}

export function stampNow(): string {
  return new Date().toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: BOOKING_TZ });
}

export async function appendNote(lead: Lead, text: string): Promise<void> {
  const old = (lead.notes ?? "").trim();
  const note = `[${stampNow()} Booking link] ${text.trim()}`;
  await api("PATCH", `/leads/${lead.id}`, { notes: (old ? old + "\n\n" + note : note).slice(0, 20000) });
}

export type NewCustomer = { name: string; phone: string; email: string; address: string; smsOk: boolean };

/** Find the caller's lead or create one. Fills gaps only; never overwrites details staff hold. */
export async function findOrCreateLead(c: NewCustomer, sourceLabel: string): Promise<{ lead: Lead; created: boolean }> {
  const existing = await findLead(c.phone, c.email);
  if (existing) {
    const patch: Record<string, string> = {};
    if (!existing.customerEmail && c.email) patch.customerEmail = c.email;
    if (!existing.address && c.address) patch.address = c.address;
    if (!existing.customerPhone && c.phone) patch.customerPhone = nationalPhone(c.phone);
    if (Object.keys(patch).length) await api("PATCH", `/leads/${existing.id}`, patch);
    return { lead: { ...existing, ...patch }, created: false };
  }
  const body = {
    customerName: c.name,
    customerPhone: nationalPhone(c.phone),
    customerEmail: c.email,
    address: c.address,
    source: sourceLabel,
    // They gave these details to book; no marketing consent is assumed.
    consentCalls: true,
    consentSms: c.smsOk,
    consentEmail: false,
  };
  const created = await api<Lead>("POST", "/leads", body);
  return { lead: { ...created, notes: created.notes ?? null }, created: true };
}

// ---------------------------------------------------------------- bookings

/** Busy times of whoever would receive a booking of this kind for this lead. */
export async function busyTimes(kind: BookingKind, leadId: string | null, fromIso: string, toIso: string): Promise<Busy[]> {
  const list = rows<{ startAt: string; endAt: string; kind?: string | null; aiKind?: string | null }>(
    await api("GET", `/ai-bookings/busy?${qs({ kind, leadId, from: fromIso, to: toIso })}`),
  );
  return list.map((b) => ({ startAt: b.startAt, endAt: b.endAt, kind: b.kind ?? b.aiKind ?? null }));
}

export type BookedAppointment = { id: string; startAt: string; endAt: string; assignedTo?: string | null };

export async function createBooking(kind: BookingKind, leadId: string, startIso: string, endIso: string, notes: string | null): Promise<BookedAppointment> {
  const body: Record<string, string> = { kind, leadId, startAt: startIso, endAt: endIso };
  if (notes) body.notes = notes.slice(0, 2000);
  try {
    const out = await api<Record<string, unknown>>("POST", "/ai-bookings", body);
    const appt = ((out.appointment as Record<string, unknown>) ?? out) as Record<string, unknown>;
    return {
      id: String(appt.id ?? out.id ?? ""),
      startAt: String(appt.startAt ?? startIso),
      endAt: String(appt.endAt ?? endIso),
      assignedTo: (out.assignedTo as string) ?? null,
    };
  } catch (e) {
    if (e instanceof BookingError && /taken|clash|overlap|busy/i.test(e.message)) {
      throw new BookingError("Sorry, that time was just taken. Please pick another.", 409);
    }
    throw e;
  }
}

export type Appointment = { id: string; startAt: string; endAt: string; status: string; leadId?: string | null; title?: string; aiKind?: string | null; kind?: string | null };

export async function getAppointment(id: string): Promise<Appointment | null> {
  try {
    const a = await api<Record<string, unknown>>("GET", `/appointments/${encodeURIComponent(id)}`);
    const appt = ((a.appointment as Record<string, unknown>) ?? a) as Record<string, unknown>;
    if (!appt.id) return null;
    return {
      id: String(appt.id),
      startAt: String(appt.startAt),
      endAt: String(appt.endAt),
      status: String(appt.status ?? "SCHEDULED"),
      leadId: (appt.leadId as string) ?? ((appt.lead as Record<string, unknown> | undefined)?.id as string) ?? null,
      title: (appt.title as string) ?? undefined,
      aiKind: (appt.aiKind as string) ?? null,
    };
  } catch (e) {
    if (e instanceof BookingError && (e.status === 404 || e.status === 400 || e.status === 403)) return null;
    throw e;
  }
}

export async function cancelAppointment(id: string): Promise<void> {
  await api("PATCH", `/appointments/${encodeURIComponent(id)}`, { status: "CANCELLED" });
}

/** Give the lead (and its open bookings) to an installer, as the container's Nominate does. */
export async function nominateToInstaller(leadId: string, installerId: string, note: string): Promise<void> {
  await api("POST", "/easylink-pool/nominate", { leadIds: [leadId], installerId, note });
}
