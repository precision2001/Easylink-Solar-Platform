export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

export type ListContact = {
  leadId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  status: string;
  followUpDate: string | null;
  lastCallAt: string | null;
  lastOutcome: string | null;
  callable: boolean;
  notCallable: string | null;
  entryId?: string;
  entryStatus?: "PENDING" | "DONE" | "SKIPPED";
  attempts?: number;
};

export type Overview = {
  states: { key: string; state: string; name: string; total: number; callable: number }[];
  noState: { total: number; callable: number };
  lists: { key: string; id: string; name: string; state: string | null; total: number; pending: number; done: number; skipped: number; createdAt: string }[];
};

export type UploadResult = {
  listId: string;
  name: string;
  entries: number;
  created: number;
  matched: number;
  duplicates: number;
  skipped: { row: number; reason: string }[];
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/call-lists${path}`, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const detail = Array.isArray(json.errors) && json.errors.length ? `: ${json.errors.map((e: { message: string }) => e.message).join("; ")}` : "";
    throw new Error(`${json.message ?? `Request failed (${res.status})`}${detail}`);
  }
  return json.data as T;
}

export const callLists = {
  overview: () => call<Overview>(""),
  state: (state: string) => call<{ total: number; contacts: ListContact[] }>(`/state/${state}?callableOnly=true&pageSize=30`),
  list: (id: string) => call<{ total: number; entries: ListContact[] }>(`/${id}?pageSize=30`),
  next: (key: string) => call<ListContact | null>(`/next/${encodeURIComponent(key)}`),
  setEntry: (listId: string, entryId: string, status: "PENDING" | "SKIPPED" | "DONE") =>
    call(`/${listId}/entries/${entryId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  upload: (body: { name: string; state?: string; description?: string; rows: Record<string, string>[] }) =>
    call<UploadResult>("", { method: "POST", body: JSON.stringify(body) }),
  remove: (id: string) => call(`/${id}`, { method: "DELETE" }),
};

/** Minimal CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/** Column names people actually use, mapped to the upload fields. */
const HEADER_MAP: Record<string, string> = {
  name: "name", "full name": "name", fullname: "name", customer: "name", "customer name": "name", contact: "name",
  "first name": "firstName", firstname: "firstName", first: "firstName", "given name": "firstName",
  "last name": "lastName", lastname: "lastName", surname: "lastName", last: "lastName", "family name": "lastName",
  phone: "phone", mobile: "phone", "mobile phone": "phone", "phone number": "phone", telephone: "phone", tel: "phone", number: "phone",
  email: "email", "email address": "email", "e-mail": "email",
  address: "address", street: "address", "street address": "address", "address line 1": "address",
  suburb: "suburb", city: "suburb", town: "suburb", locality: "suburb",
  state: "state", postcode: "postcode", "post code": "postcode", zip: "postcode",
  notes: "notes", note: "notes", comments: "notes",
};

export function csvToRows(text: string): { rows: Record<string, string>[]; columns: string[]; ignored: string[] } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { rows: [], columns: [], ignored: [] };
  const keys = head.map((h) => HEADER_MAP[h.trim().toLowerCase()] ?? "");
  const rows = body.map((cells) => {
    const r: Record<string, string> = {};
    keys.forEach((k, i) => {
      const v = (cells[i] ?? "").trim();
      if (k && v && !r[k]) r[k] = v;
    });
    return r;
  });
  return {
    rows,
    columns: [...new Set(keys.filter(Boolean))],
    ignored: head.filter((_, i) => !keys[i]).map((h) => h.trim()).filter(Boolean),
  };
}
