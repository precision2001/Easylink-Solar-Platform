import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

/**
 * An installer's own Platform Designer — the branded page they put on their
 * website, which sends every design straight into their EasyLink account as a
 * lead.
 *
 * `allowedOrigins` is the security boundary: the public config endpoint only
 * answers for a website on this list, so a site with the wrong origin simply
 * will not render. The backend normalises each entry to a bare origin
 * (scheme + host + port), which is exactly what a browser sends, so what
 * comes back here may differ from what was typed in.
 *
 * `whiteLabel` is read-only on purpose. Whether the page carries "Powered by
 * EasyLink Solar" is EasyLink's commercial decision about the installer's
 * plan, not a switch the installer flips, so it is shown but never sent.
 */

export type InstallerPartnerSite = {
  id: string;
  /** Appears in the public URL — /p/<key>. Fixed once created. */
  key: string;
  companyName: string;
  websiteUrl: string | null;
  allowedOrigins: string[];
  brandPrimary: string;
  brandOnPrimary: string;
  brandAccent: string | null;
  logoUrl: string | null;
  /** EasyLink's plan decision, not the installer's. Read-only here. */
  whiteLabel: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const BASE = "/api/installers/partner-sites";

export async function fetchPartnerSites(
  init?: RequestInit,
): Promise<InstallerPartnerSite[]> {
  const res = await fetchWithInstallerSession(BASE, {
    cache: "no-store",
    ...init,
  });
  const json = (await res.json()) as ApiEnvelope<InstallerPartnerSite[]>;
  if (!res.ok) {
    throw new Error(json.message || "Failed to load your partner sites");
  }
  return Array.isArray(json.data) ? json.data : [];
}

export type CreatePartnerSiteInput = {
  key: string;
  companyName: string;
  allowedOrigins: string[];
  websiteUrl?: string;
  brandPrimary?: string;
  brandOnPrimary?: string;
  brandAccent?: string;
  logoUrl?: string;
};

export async function createPartnerSite(input: CreatePartnerSiteInput) {
  const res = await fetchWithInstallerSession(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<InstallerPartnerSite>;
  if (!res.ok || !json.data) {
    // The backend says "link name already taken" on a duplicate key, which is
    // the one error an installer can actually act on — keep its wording.
    throw new Error(json.message || "Failed to create the partner site");
  }
  return json.data;
}

/**
 * `key` is absent: changing it would break every embed already published.
 *
 * The three removable fields take `null` as well as a value, because the
 * backend tells "leave alone" (field absent) from "take it off" (null).
 */
export type UpdatePartnerSiteInput = Partial<
  Omit<CreatePartnerSiteInput, "key" | "websiteUrl" | "brandAccent" | "logoUrl">
> & {
  active?: boolean;
  websiteUrl?: string | null;
  brandAccent?: string | null;
  logoUrl?: string | null;
};

export async function updatePartnerSite(
  id: string,
  input: UpdatePartnerSiteInput,
) {
  const res = await fetchWithInstallerSession(
    `${BASE}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerPartnerSite>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Failed to save your changes");
  }
  return json.data;
}

/**
 * Switches the site off rather than deleting it, so leads already captured
 * through it keep pointing at a real record. The embed stops working either
 * way, and the installer can switch it back on from the same screen.
 */
export async function deactivatePartnerSite(id: string) {
  const res = await fetchWithInstallerSession(
    `${BASE}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  const json = (await res.json()) as ApiEnvelope<InstallerPartnerSite>;
  if (!res.ok || !json.data) {
    throw new Error(json.message || "Failed to switch the site off");
  }
  return json.data;
}
