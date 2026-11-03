/**
 * Operations "New lead": a lead captured by staff (phone call, walk-in,
 * referral…). Posts to the admin proxy for the backend's `POST /leads`
 * (`createLeadSchema`: only `customerName` is required, email must be valid).
 */

export const NEW_LEAD_SOURCES = [
  "Phone call",
  "Walk-in",
  "Referral",
  "Website",
  "Other",
] as const;

export type NewLeadSource = (typeof NEW_LEAD_SOURCES)[number];

export type NewLeadForm = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  source: NewLeadSource;
  notes: string;
};

export const EMPTY_NEW_LEAD: NewLeadForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  source: "Phone call",
  notes: "",
};

export type CreateLeadPayload = {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
  source: string;
  notes?: string;
};

export type NewLeadErrors = Partial<Record<"name" | "email" | "mobile", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field errors, empty when the form can be sent. */
export function validateNewLead(form: NewLeadForm): NewLeadErrors {
  const errors: NewLeadErrors = {};
  if (!form.name.trim()) errors.name = "Enter the customer's name.";
  const email = form.email.trim();
  if (email && !EMAIL.test(email)) errors.email = "Enter a valid email address.";
  const mobile = form.mobile.trim();
  if (mobile && mobile.replace(/\D/g, "").length < 8) {
    errors.mobile = "Enter a full phone number.";
  }
  return errors;
}

/** Trimmed body for `POST /api/admin/leads`; blank optional fields are left out. */
export function newLeadPayload(form: NewLeadForm): CreateLeadPayload {
  const opt = (v: string) => v.trim() || undefined;
  return {
    customerName: form.name.trim(),
    customerPhone: opt(form.mobile),
    customerEmail: opt(form.email),
    address: opt(form.address),
    source: form.source,
    notes: opt(form.notes),
  };
}

export async function createAdminLead(payload: CreateLeadPayload): Promise<{ id: string }> {
  const res = await fetch("/api/admin/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.message ?? "Could not create the lead.");
  }
  return body.data as { id: string };
}
