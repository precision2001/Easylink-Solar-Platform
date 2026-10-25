"use client";

import { useCallback, useMemo } from "react";

/**
 * The Contact lists API, as the page uses it.
 *
 * One place for every call so the component deals in contacts rather than in
 * fetch plumbing, and so the shapes the backend returns are declared once. The
 * derived fields — `callable`, `blockedReason`, `dialNumber` — are computed on
 * the server on purpose: the calling rules are a legal obligation, and a second
 * copy in the browser is a second copy to get wrong.
 */

export type ContactOutcome =
  | "NO_ANSWER"
  | "VOICEMAIL_LEFT"
  | "CALL_BACK"
  | "INTERESTED"
  | "APPOINTMENT_BOOKED"
  | "NOT_INTERESTED"
  | "WRONG_NUMBER"
  | "ASKED_NOT_TO_BE_CALLED";

export interface ApiContact {
  id: string;
  fullName: string;
  mobile: string | null;
  mobileRaw: string | null;
  landline: string | null;
  landlineRaw: string | null;
  email: string | null;
  streetAddress: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  region: string | null;
  dncrMobile: boolean;
  dncrLandline: boolean;
  dncrWashedAt: string | null;
  lastOutcome: ContactOutcome | null;
  lastCalledAt: string | null;
  callbackDueAt: string | null;
  followUpKind: string | null;
  notes: string | null;
  consentSms: boolean;
  consentEmail: boolean;
  leadId: string | null;
  listId: string;
  listName: string | null;
  callable: boolean;
  blockedReason: string | null;
  dialNumber: string | null;
}

export interface ContactPage {
  contacts: ApiContact[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ContactSummary {
  total: number;
  callable: number;
  onRegister: number;
  callbacksDue: number;
  lists: number;
  listRows: {
    id: string;
    name: string;
    sourceFileName: string | null;
    createdAt: string;
    contactCount: number;
  }[];
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalRows: number;
  processedRows: number;
  addedRows: number;
  duplicateRows: number;
  noNumberRows: number;
  invalidRows: number;
  error: string | null;
  listId: string | null;
  listName: string | null;
  percent: number;
}

export interface SavedFormat {
  id: string;
  name: string;
  headingsKey: string;
  mapping: Record<string, string>;
  updatedAt: string;
}

/** What an agent learns about the contact's home. All optional. */
export interface ContactDiscovery {
  ownsProperty: string | null;
  propertyType: string | null;
  roof: string | null;
  storeys: string | null;
  powerSupply: string | null;
  quarterlyBill: number | null;
  retailer: string | null;
  existingSolarKw: string | null;
  existingSolarAge: string | null;
  hasBattery: string | null;
  shading: string | null;
  electricVehicle: string | null;
  decisionMakers: string | null;
  timeframe: string | null;
  payingBy: string | null;
  bestTimeToCall: string | null;
  updatedAt?: string;
}

export type ContactFilter = "all" | "callable" | "dncr" | "callback";

const BASE = "/api/admin/contacts";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message ?? "The server could not complete that.");
  }
  return json.data as T;
}

function body(data: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) };
}

export function useContactsApi() {
  const fetchContacts = useCallback(
    (opts: {
      search?: string;
      filter?: ContactFilter;
      listId?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (opts.search?.trim()) q.set("search", opts.search.trim());
      if (opts.filter && opts.filter !== "all") q.set("filter", opts.filter);
      if (opts.listId) q.set("listId", opts.listId);
      if (opts.page) q.set("page", String(opts.page));
      if (opts.pageSize) q.set("pageSize", String(opts.pageSize));
      const qs = q.toString();
      return call<ContactPage>(qs ? `?${qs}` : "");
    },
    [],
  );

  const fetchSummary = useCallback(() => call<ContactSummary>("/summary"), []);

  const createContact = useCallback(
    (input: {
      fullName: string;
      mobile?: string | null;
      landline?: string | null;
      email?: string | null;
      suburb?: string | null;
      postcode?: string | null;
      state?: string | null;
      listId?: string | null;
      listName?: string | null;
    }) => call<ApiContact>("", { method: "POST", ...body(input) }),
    [],
  );

  const fetchNext = useCallback(
    (afterContactId?: string, listId?: string) => {
      const q = new URLSearchParams();
      if (afterContactId) q.set("afterContactId", afterContactId);
      if (listId) q.set("listId", listId);
      const qs = q.toString();
      return call<ApiContact | null>(`/next${qs ? `?${qs}` : ""}`);
    },
    [],
  );

  const updateContact = useCallback(
    (id: string, patch: Record<string, unknown>) =>
      call<ApiContact>(`/${id}`, { method: "PATCH", ...body(patch) }),
    [],
  );

  const saveOutcome = useCallback(
    (
      id: string,
      input: {
        outcome: ContactOutcome;
        notes?: string | null;
        followUpKind?: string | null;
        callbackDueAt?: string | null;
      },
    ) => call<ApiContact>(`/${id}/outcome`, { method: "POST", ...body(input) }),
    [],
  );

  const convertToLead = useCallback(
    (id: string) =>
      call<{ lead: { id: string; customerName: string }; created: boolean }>(
        `/${id}/convert-to-lead`,
        { method: "POST", ...body({}) },
      ),
    [],
  );

  const fetchDiscovery = useCallback(
    (id: string) => call<ContactDiscovery | null>(`/${id}/discovery`),
    [],
  );

  const saveDiscovery = useCallback(
    (id: string, input: Partial<ContactDiscovery>) =>
      call<ContactDiscovery>(`/${id}/discovery`, { method: "PATCH", ...body(input) }),
    [],
  );

  /* ---------------------------------------------------------- importing */

  const matchHeadings = useCallback(
    (headings: string[]) =>
      call<{
        mapping: Record<string, string>;
        matchedFormat: { id: string; name: string } | null;
      }>("/imports/match", { method: "POST", ...body({ headings }) }),
    [],
  );

  const createImport = useCallback(
    (input: {
      fileName: string;
      listName: string;
      mapping: Record<string, string>;
      totalRows: number;
      rememberAs?: string | null;
      headings?: string[];
    }) =>
      call<{ importId: string; listId: string; listName: string }>("/imports", {
        method: "POST",
        ...body(input),
      }),
    [],
  );

  const sendImportRows = useCallback(
    (importId: string, rows: Record<string, unknown>[]) =>
      call<ImportJob>(`/imports/${importId}/rows`, { method: "POST", ...body({ rows }) }),
    [],
  );

  const finishImport = useCallback(
    (importId: string, error?: string | null) =>
      call<ImportJob>(`/imports/${importId}/finish`, {
        method: "POST",
        ...body({ error: error ?? null }),
      }),
    [],
  );

  /* ------------------------------------------------------------ formats */

  const fetchFormats = useCallback(() => call<SavedFormat[]>("/formats"), []);

  const forgetFormat = useCallback(
    (id: string) => call<{ id: string }>(`/formats/${id}`, { method: "DELETE" }),
    [],
  );

  /**
   * Memoised, and that matters: callers put this object in `useCallback` and
   * `useEffect` dependency lists. Returning a fresh object literal each render
   * made those dependencies change every render, so the effects re-ran every
   * render — an unbounded request loop that exhausted the API rate limit within
   * seconds of opening the page.
   */
  return useMemo(
    () => ({
      fetchContacts,
      fetchSummary,
      fetchNext,
      updateContact,
      saveOutcome,
      convertToLead,
      matchHeadings,
      createImport,
      sendImportRows,
      finishImport,
      fetchFormats,
      forgetFormat,
      createContact,
      fetchDiscovery,
      saveDiscovery,
    }),
    [
      fetchContacts,
      fetchSummary,
      fetchNext,
      updateContact,
      saveOutcome,
      convertToLead,
      matchHeadings,
      createImport,
      sendImportRows,
      finishImport,
      fetchFormats,
      forgetFormat,
      createContact,
      fetchDiscovery,
      saveDiscovery,
    ],
  );
}

/** Human labels for the stored outcome values, matching the mock's buttons. */
export const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  NO_ANSWER: "No answer",
  VOICEMAIL_LEFT: "Left voicemail",
  CALL_BACK: "Call back",
  INTERESTED: "Interested",
  APPOINTMENT_BOOKED: "Appointment booked",
  NOT_INTERESTED: "Not interested",
  WRONG_NUMBER: "Wrong number",
  ASKED_NOT_TO_BE_CALLED: "Asked not to be called",
};

export const OUTCOME_ORDER: ContactOutcome[] = [
  "NO_ANSWER",
  "VOICEMAIL_LEFT",
  "CALL_BACK",
  "INTERESTED",
  "APPOINTMENT_BOOKED",
  "NOT_INTERESTED",
  "WRONG_NUMBER",
  "ASKED_NOT_TO_BE_CALLED",
];

/** "+61491570006" back to the "0491 570 006" an agent reads out. */
export function formatAuNumber(e164: string | null, raw?: string | null): string {
  if (!e164) return raw ?? "—";
  const m = /^\+61(\d{9})$/.exec(e164);
  if (!m) return e164;
  const n = m[1]!;
  return n.startsWith("4")
    ? `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
    : `0${n.slice(0, 1)} ${n.slice(1, 5)} ${n.slice(5)}`;
}
