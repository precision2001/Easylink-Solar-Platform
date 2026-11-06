/**
 * Operations portal → Quotes & Leads → "Solar Design": staff start a manual
 * design for a lead. The lead's contact details and address travel in the
 * link, so the Designs flow skips the intro, property, contact and address
 * screens and opens on the roof.
 */

export type LeadForDesign = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string | null;
  roofDesign?: { lat?: number | null; lng?: number | null } | null;
};

export function leadDesignHref(lead: LeadForDesign): string {
  const parts = lead.customerName.trim().split(/\s+/).filter(Boolean);
  const params = new URLSearchParams({ leadId: lead.id });
  if (parts[0]) params.set("firstName", parts[0]);
  if (parts.length > 1) params.set("lastName", parts.slice(1).join(" "));
  if (lead.customerEmail) params.set("email", lead.customerEmail);
  if (lead.customerPhone) params.set("phone", lead.customerPhone);
  if (lead.address?.trim()) params.set("address", lead.address.trim());
  const lat = lead.roofDesign?.lat;
  const lng = lead.roofDesign?.lng;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set("lat", lat.toFixed(7));
    params.set("lng", lng.toFixed(7));
  }
  return `/designs?${params}`;
}

export type LeadPrefill = {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pin: { lat: number; lng: number } | null;
};

/** Reads a lead link back; null when the page wasn't opened from a lead. */
export function leadPrefillFrom(params: { get(name: string): string | null }): LeadPrefill | null {
  const leadId = params.get("leadId");
  if (!leadId) return null;
  const lat = Number.parseFloat(params.get("lat") ?? "");
  const lng = Number.parseFloat(params.get("lng") ?? "");
  const pinOk = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return {
    leadId,
    name: `${params.get("firstName") ?? ""} ${params.get("lastName") ?? ""}`.trim(),
    email: params.get("email") ?? "",
    phone: params.get("phone") ?? "",
    address: (params.get("address") ?? "").trim(),
    pin: pinOk ? { lat, lng } : null,
  };
}

/** Saves the builder's design to the lead (staff only). Throws with the API's message. */
export async function saveLeadDesign(
  leadId: string,
  input: unknown,
): Promise<{ leadId: string; designId: string; updated: boolean; createdAccount: boolean }> {
  const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/design`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; data?: { leadId: string; designId: string; updated: boolean; createdAccount: boolean } };
  if (res.status === 401) throw new Error("Sign in to the Operations portal to save designs for leads.");
  if (!res.ok || !json.data) throw new Error(json.message || "Could not save the design to this lead.");
  return json.data;
}
