import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";
import type { CustomerProjectPhaseState } from "@/lib/installers/project-phase";

export const INSTALLER_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export type InstallerLeadStatus = (typeof INSTALLER_LEAD_STATUSES)[number];

export type InstallerLeadAssignee = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type InstallerLeadSummary = {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  status: string;
  /** Sales stage (NEW_LEAD … PAYMENT_COMPLETED); the backend defaults it to NEW_LEAD. */
  stage?: string | null;
  projectPhase?: string | null;
  notes?: string | null;
  estimatedValue?: number | null;
  assignedToId?: string | null;
  assignedTo?: InstallerLeadAssignee | null;
  createdAt?: string;
  updatedAt?: string;
  design?: { id: string; title?: string | null; status?: string | null } | null;
};

export type AssignableUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
};

export type LeadListResult = {
  leads: InstallerLeadSummary[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function formatPersonName(
  u: Pick<
    InstallerLeadAssignee | AssignableUser,
    "firstName" | "lastName" | "email"
  >,
) {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  if (n) return n;
  return u.email ?? "Unknown";
}

export function buildLeadsListUrl(params: {
  page: number;
  limit: number;
  status?: InstallerLeadStatus | "";
  search?: string;
  /** Only applied for admin on backend; safe to send for installer (ignored). */
  assignedToId?: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.assignedToId?.trim()) {
    sp.set("assignedToId", params.assignedToId.trim());
  }
  const qs = sp.toString();
  return `/api/installers/leads${qs ? `?${qs}` : ""}`;
}

const inflightLeadFetches = new Map<string, Promise<LeadListResult>>();
const recentLeadResults = new Map<
  string,
  { at: number; result: LeadListResult }
>();
const RECENT_LEAD_RESULT_MS = 5_000;

const inflightAssignableFetches = new Map<
  string,
  Promise<AssignableUser[]>
>();
const recentAssignableResults = new Map<
  string,
  { at: number; result: AssignableUser[] }
>();
const ASSIGNABLE_URL = "/api/installers/users/assignable-for-leads";

export function invalidateInstallerLeadsListCache(
  params: Parameters<typeof buildLeadsListUrl>[0],
) {
  recentLeadResults.delete(buildLeadsListUrl(params));
}

export function invalidateAssignableUsersForLeadsCache() {
  recentAssignableResults.delete(ASSIGNABLE_URL);
}

/** Test-only helper to reset module-level leads fetch dedupe state. */
export function resetInstallerLeadsListCacheForTests() {
  inflightLeadFetches.clear();
  recentLeadResults.clear();
  inflightAssignableFetches.clear();
  recentAssignableResults.clear();
}

export async function fetchInstallerLeads(
  params: Parameters<typeof buildLeadsListUrl>[0],
  init?: RequestInit,
): Promise<LeadListResult> {
  const url = buildLeadsListUrl(params);
  const inflight = inflightLeadFetches.get(url);
  if (inflight) return inflight;

  const cached = recentLeadResults.get(url);
  if (cached && Date.now() - cached.at < RECENT_LEAD_RESULT_MS) {
    return cached.result;
  }

  let promise!: Promise<LeadListResult>;
  promise = (async () => {
    try {
      const res = await fetchWithInstallerSession(url, {
        cache: "no-store",
        ...init,
      });
      const json = (await res.json()) as ApiEnvelope<InstallerLeadSummary[]>;
      if (!res.ok) {
        throw new Error(json.message || "Failed to load leads");
      }
      const result = {
        leads: Array.isArray(json.data) ? json.data : [],
        meta: json.meta?.pagination,
      };
      recentLeadResults.set(url, { at: Date.now(), result });
      return result;
    } finally {
      if (inflightLeadFetches.get(url) === promise) {
        inflightLeadFetches.delete(url);
      }
    }
  })();

  inflightLeadFetches.set(url, promise);
  return promise;
}

export async function fetchInstallerLeadDetail(
  id: string,
): Promise<InstallerLeadSummary> {
  const res = await fetchWithInstallerSession(
    `/api/installers/leads/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerLeadSummary>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load lead");
  }
  if (!json.data) {
    throw new Error("Lead not found");
  }
  return json.data;
}

export async function fetchInstallerLeadForCustomer(
  customerId: string,
): Promise<CustomerProjectPhaseState> {
  const res = await fetchWithInstallerSession(
    `/api/installers/leads/by-customer/${encodeURIComponent(customerId)}`,
    { cache: "no-store" },
  );
  const json = (await res.json()) as ApiEnvelope<{
    id: string;
    status: string;
    projectPhase: string;
    suggestedProjectPhase: string;
  }>;
  if (!res.ok) {
    throw new Error(json.message || "No lead found for this customer");
  }
  if (!json.data) {
    throw new Error("No lead found for this customer");
  }
  return {
    leadId: json.data.id,
    projectPhase: json.data.projectPhase as CustomerProjectPhaseState["projectPhase"],
    suggestedProjectPhase: json.data.suggestedProjectPhase as CustomerProjectPhaseState["suggestedProjectPhase"],
    leadStatus: json.data.status,
  };
}

export async function patchInstallerLead(
  id: string,
  body: Partial<{
    status: InstallerLeadStatus;
    notes: string;
    customerName: string;
    projectPhase: string;
  }>,
) {
  const res = await fetchWithInstallerSession(
    `/api/installers/leads/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerLeadSummary>;
  if (!res.ok) {
    throw new Error(json.message || "Update failed");
  }
  return json.data;
}

export async function assignInstallerLead(id: string, assignedToId: string) {
  const res = await fetchWithInstallerSession(
    `/api/installers/leads/${encodeURIComponent(id)}/assign`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerLeadSummary>;
  if (!res.ok) {
    throw new Error(json.message || "Assign failed");
  }
  return json.data;
}

export async function fetchAssignableUsersForLeads(): Promise<AssignableUser[]> {
  const inflight = inflightAssignableFetches.get(ASSIGNABLE_URL);
  if (inflight) return inflight;

  const cached = recentAssignableResults.get(ASSIGNABLE_URL);
  if (cached && Date.now() - cached.at < RECENT_LEAD_RESULT_MS) {
    return cached.result;
  }

  let promise!: Promise<AssignableUser[]>;
  promise = (async () => {
    try {
      const res = await fetchWithInstallerSession(ASSIGNABLE_URL, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiEnvelope<AssignableUser[]>;
      if (!res.ok) {
        throw new Error(json.message || "Failed to load users");
      }
      const result = Array.isArray(json.data) ? json.data : [];
      recentAssignableResults.set(ASSIGNABLE_URL, {
        at: Date.now(),
        result,
      });
      return result;
    } finally {
      if (inflightAssignableFetches.get(ASSIGNABLE_URL) === promise) {
        inflightAssignableFetches.delete(ASSIGNABLE_URL);
      }
    }
  })();

  inflightAssignableFetches.set(ASSIGNABLE_URL, promise);
  return promise;
}
