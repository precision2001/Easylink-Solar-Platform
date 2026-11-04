import type { CustomerUser } from "@/lib/store/customerAuthSlice";

/**
 * Browser helpers for the passwordless "email me a sign-in link" flow
 * (`/api/customers/portal-link`). Shared by the sign-in page, which requests a
 * link, and the /portal-link landing page, which redeems one.
 */

export type PortalLinkResponse = {
  message?: string;
  user?: CustomerUser;
  accessToken?: string;
};

/** Emailed tokens are 32 random bytes, hex encoded. */
export function isPortalLinkToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

export type PortalLinkState =
  | { kind: "ready" }
  | { kind: "opening" }
  | { kind: "error"; message: string; sending?: boolean }
  | { kind: "sent"; message: string };

/** What the landing page shows first, from the `?token=` it was opened with. */
export function initialPortalLinkState(token: string): PortalLinkState {
  if (isPortalLinkToken(token)) return { kind: "ready" };
  if (token) return { kind: "error", message: "This link is incomplete." };
  return { kind: "error", message: "" };
}

export const PORTAL_LINK_SENT_FALLBACK =
  "If that email has an EasyLink account, a sign-in link is on its way.";

export async function postPortalLink(
  body: { action: "redeem"; token: string } | { action: "request"; email: string },
): Promise<{ ok: boolean; status: number; json: PortalLinkResponse }> {
  const res = await fetch("/api/customers/portal-link", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as PortalLinkResponse;
  return { ok: res.ok, status: res.status, json };
}
