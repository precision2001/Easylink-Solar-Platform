export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;

export type ListContact = {
  /** Set for people on a Contact list. */
  contactId?: string;
  leadId: string | null;
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
};

export type Overview = {
  states: { key: string; state: string; name: string; total: number; callable: number }[];
  noState: { total: number; callable: number };
  /** The signed-in user's Contact lists (uploads are managed on the Contact lists page). */
  lists: { key: string; id: string; name: string; total: number; callable: number; createdAt: string }[];
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
  contacts: (listId: string) => call<{ total: number; contacts: ListContact[] }>(`/contacts/${listId}?pageSize=30`),
  next: (key: string) => call<ListContact | null>(`/next/${encodeURIComponent(key)}`),
};
