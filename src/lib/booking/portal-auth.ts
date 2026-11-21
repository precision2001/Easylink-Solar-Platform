import { backendAuthedFetch, type BackendPortal } from "@/lib/server/backend-authed-fetch";

export type Me = { id: string; email: string | null; role: string | null; firstName: string | null; lastName: string | null; phone: string | null };

/** The person signed in to `portal`, from the backend, or null. */
export async function whoAmI(portal: BackendPortal): Promise<Me | null> {
  const res = await backendAuthedFetch(portal, "/users/me");
  if (!res.ok) return null;
  const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const d = ((j?.data as Record<string, unknown>) ?? j ?? {}) as Record<string, unknown>;
  const u = ((d.user as Record<string, unknown>) ?? d) as Record<string, unknown>;
  if (!u.id) return null;
  return {
    id: String(u.id),
    email: (u.email as string) ?? null,
    role: (u.role as string) ?? null,
    firstName: (u.firstName as string) ?? null,
    lastName: (u.lastName as string) ?? null,
    phone: ((u.phone ?? u.phoneNumber ?? u.mobile) as string) ?? null,
  };
}

type LeadRow = { id: string; customerName?: string | null; address?: string | null; customerPhone?: string | null; status?: string | null };

/** Leads the signed-in person can see (the backend applies their permissions). */
export async function searchPortalLeads(portal: BackendPortal, search: string): Promise<LeadRow[]> {
  const q = new URLSearchParams({ limit: "8", search });
  const res = await backendAuthedFetch(portal, `/leads?${q}`);
  if (!res.ok) return [];
  const j = (await res.json().catch(() => null)) as unknown;
  const d = (j && typeof j === "object" && "data" in j ? (j as { data: unknown }).data : j) as unknown;
  const list = Array.isArray(d) ? d : d && typeof d === "object" ? ((d as Record<string, unknown>).leads ?? (d as Record<string, unknown>).items ?? []) : [];
  return (Array.isArray(list) ? list : []).filter((x): x is LeadRow => !!x && typeof x === "object" && "id" in x);
}

/** True when the signed-in person may open this lead. */
export async function canSeeLead(portal: BackendPortal, leadId: string): Promise<boolean> {
  const res = await backendAuthedFetch(portal, `/leads/${encodeURIComponent(leadId)}`);
  return res.ok;
}

export const suburbOf = (address: string | null | undefined) => {
  const parts = (address ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2].replace(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b.*$/i, "").trim() || parts[parts.length - 2] : null;
};
