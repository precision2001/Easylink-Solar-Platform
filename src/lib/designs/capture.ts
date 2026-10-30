import type { DesignProposalState } from "@/lib/store/designProposalSlice";
import { proposalToDesignInput } from "@/lib/customers/custom-design";
import { getAttribution, type DesignAttribution } from "@/lib/designs/attribution";
import type { CustomerAuthProfile } from "@/lib/customers/profile";

/** Body of POST /api/public/designs/capture (forwarded to the backend). */
export type DesignCapturePayload = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  marketingConsent: boolean;
  design: ReturnType<typeof proposalToDesignInput>;
  estimatedValue?: number;
  attribution?: DesignAttribution;
};

/** "Ada King Lovelace" -> Ada / King Lovelace. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = full.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

/**
 * react-phone-input-2 gives digits with the country code ("61491570006").
 * Send E.164 so the backend reads the country rather than guessing.
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function priceFrom(label: string | undefined): number | undefined {
  const value = Number.parseFloat((label ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function buildDesignCapturePayload(
  proposal: DesignProposalState,
  attribution: DesignAttribution | undefined,
): DesignCapturePayload {
  const { firstName, lastName } = splitName(proposal.customer.name);
  const estimatedValue = priceFrom(proposal.pricing.totalSystemPrice);
  return {
    firstName,
    lastName,
    email: proposal.customer.email.trim(),
    mobile: toE164(proposal.customer.phoneNumber),
    marketingConsent: proposal.customer.marketingConsent === true,
    design: proposalToDesignInput(proposal),
    ...(estimatedValue ? { estimatedValue } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

/**
 * The signed-in customer from the session cookie, or null. Unlike
 * fetchCustomerProfile this never redirects to sign-in on a 401, because
 * here "not signed in" just means "save as a visitor".
 */
export async function probeSignedInCustomer(): Promise<CustomerAuthProfile | null> {
  try {
    const res = await fetch("/api/customers/profile", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { data?: CustomerAuthProfile } | null;
    return json?.data?.id ? json.data : null;
  } catch {
    return null;
  }
}

/** Saves a signed-out visitor's design; the portal link arrives by email. */
export async function submitDesignCapture(proposal: DesignProposalState): Promise<{
  message: string;
  emailSent: boolean;
}> {
  const response = await fetch("/api/public/designs/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDesignCapturePayload(proposal, getAttribution())),
  });
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    emailSent?: boolean;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.message || "We couldn't save your design. Please try again.");
  }
  return {
    message: payload?.message || "Design saved. Check your email.",
    emailSent: payload?.emailSent !== false,
  };
}
