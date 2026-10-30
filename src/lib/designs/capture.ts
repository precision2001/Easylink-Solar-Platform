import type { DesignProposalState } from "@/lib/store/designProposalSlice";
import { proposalToDesignInput } from "@/lib/customers/custom-design";
import { getAttribution, type DesignAttribution } from "@/lib/designs/attribution";

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

/** Saves a signed-out visitor's design; the portal link arrives by email. */
export async function submitDesignCapture(proposal: DesignProposalState): Promise<{
  message: string;
}> {
  const response = await fetch("/api/public/designs/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDesignCapturePayload(proposal, getAttribution())),
  });
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  if (!response.ok) {
    throw new Error(payload?.message || "We couldn't save your design. Please try again.");
  }
  return { message: payload?.message || "Design saved. Check your email." };
}
