import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";
import type { DesignShareResult } from "@/lib/designs/send-to-customer";

export type InstallerDesignProduct = {
  id: string;
  quantity: number;
  totalPrice: number;
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    category: string;
    description?: string | null;
    wattage?: number | null;
    price: number;
    sku?: string | null;
    specs?: unknown;
  } | null;
};

export type InstallerCustomerDesign = {
  /** When the design last went to the customer (sign-in link by email / SMS). */
  sharedWithCustomerAt?: string | null;
  sharedChannels?: string | null;
  /** Returned by a save that sent the design to the customer. */
  sentToCustomer?: DesignShareResult | null;
  id: string;
  userId: string;
  title: string;
  address?: string | null;
  roofArea?: number | null;
  annualSunlight?: number | null;
  panelCount?: number | null;
  estimatedSavings?: number | null;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  solarData?: unknown;
  wizardData?: unknown;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  products?: InstallerDesignProduct[];
  lead?: {
    id: string;
    status?: string | null;
  } | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export function buildInstallerDesignsUrl(params: {
  page?: number;
  limit?: number;
  status?: InstallerCustomerDesign["status"];
  search?: string;
  customerId?: string;
  customerEmail?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.customerId) sp.set("customerId", params.customerId);
  if (params.customerEmail?.trim()) {
    sp.set("customerEmail", params.customerEmail.trim());
  }
  const qs = sp.toString();
  return `/api/installers/designs${qs ? `?${qs}` : ""}`;
}

export async function fetchInstallerDesigns(
  params: Parameters<typeof buildInstallerDesignsUrl>[0] = {},
  init?: RequestInit,
): Promise<InstallerCustomerDesign[]> {
  const res = await fetchWithInstallerSession(buildInstallerDesignsUrl(params), {
    cache: "no-store",
    ...init,
  });
  const json = (await res.json()) as ApiEnvelope<InstallerCustomerDesign[]>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load designs");
  }
  return Array.isArray(json.data) ? json.data : [];
}

/** One design by id, for an installer opening the Designer on a customer's existing design. */
export async function fetchInstallerDesignById(
  id: string,
  init?: RequestInit,
): Promise<InstallerCustomerDesign | null> {
  const res = await fetchWithInstallerSession(`/api/installers/designs/${id}`, {
    cache: "no-store",
    ...init,
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<InstallerCustomerDesign>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load design");
  }
  return json.data ?? null;
}

export async function updateInstallerDesign(
  id: string,
  body: {
    wizardData?: unknown;
    title?: string;
    address?: string | null;
    panelCount?: number | null;
    estimatedSavings?: number | null;
    status?: InstallerCustomerDesign["status"];
  },
  init?: RequestInit,
): Promise<InstallerCustomerDesign> {
  const res = await fetchWithInstallerSession(`/api/installers/designs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });
  const json = (await res.json()) as ApiEnvelope<InstallerCustomerDesign>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to update design");
  }
  if (!json.data) {
    throw new Error("Failed to update design");
  }
  return json.data;
}

/**
 * Adds a real catalogue product to a design, or updates its quantity if
 * already attached — the backend upserts on (designId, productId).
 */
export async function addProductToInstallerDesign(
  designId: string,
  input: { productId: string; quantity: number },
  init?: RequestInit,
): Promise<InstallerDesignProduct> {
  const res = await fetchWithInstallerSession(
    `/api/installers/designs/${designId}/products`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      ...init,
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerDesignProduct>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to add product to design");
  }
  if (!json.data) {
    throw new Error("Failed to add product to design");
  }
  return json.data;
}

export async function removeProductFromInstallerDesign(
  designId: string,
  productId: string,
  init?: RequestInit,
): Promise<void> {
  const res = await fetchWithInstallerSession(
    `/api/installers/designs/${designId}/products/${productId}`,
    { method: "DELETE", cache: "no-store", ...init },
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<unknown>;
    throw new Error(json.message || "Failed to remove product from design");
  }
}
