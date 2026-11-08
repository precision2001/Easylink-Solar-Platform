import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

/**
 * Whether EasyLink can send texts yet. Screens that offer Email / SMS / Both
 * use it to switch SMS on, mark it as test mode, or explain why it's off.
 */

export type SmsState = "live" | "sandbox" | "pending" | "off";

export type SmsStatus = {
  state: SmsState;
  enabled: boolean;
  provider: string;
  senderId: string;
  message: string;
};

export const SMS_OFF: SmsStatus = {
  state: "off",
  enabled: false,
  provider: "",
  senderId: "",
  message: "SMS is switched off. Messages go by email.",
};

export const SMS_SANDBOX_NOTE = "Test mode: only verified test numbers receive texts";
export const NO_MOBILE_NOTE = "No mobile on file";

const STATES: SmsState[] = ["live", "sandbox", "pending", "off"];

/** Reads the backend's answer; anything odd counts as off. */
export function parseSmsStatus(data: unknown): SmsStatus {
  if (!data || typeof data !== "object") return SMS_OFF;
  const d = data as Record<string, unknown>;
  const state = STATES.includes(d.state as SmsState) ? (d.state as SmsState) : "off";
  const message = typeof d.message === "string" && d.message.trim() ? d.message.trim() : state === "off" ? SMS_OFF.message : "";
  return {
    state,
    enabled: typeof d.enabled === "boolean" ? d.enabled : state === "live" || state === "sandbox",
    provider: typeof d.provider === "string" ? d.provider : "",
    senderId: typeof d.senderId === "string" ? d.senderId : "",
    message,
  };
}

/** SMS can be chosen when texting is live or in test mode. */
export function smsSelectable(status: Pick<SmsStatus, "state">): boolean {
  return status.state === "live" || status.state === "sandbox";
}

/** Australian mobile: 04xx xxx xxx or +61 4xx xxx xxx. */
export function isAuMobile(phone: string | null | undefined): boolean {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return /^(?:\+?614|04)\d{8}$/.test(digits);
}

/** Why SMS can't be picked, or null when it can. */
export function smsBlockedReason(status: SmsStatus, phone: string | null | undefined): string | null {
  if (!smsSelectable(status)) return status.message || SMS_OFF.message;
  if (!isAuMobile(phone)) return NO_MOBILE_NOTE;
  return null;
}

export async function fetchSmsStatus(portal: "admin" | "installer"): Promise<SmsStatus> {
  try {
    const url = portal === "admin" ? "/api/admin/communications/sms-status" : "/api/installers/communications/sms-status";
    const res = await (portal === "installer" ? fetchWithInstallerSession(url, { cache: "no-store" }) : fetch(url, { cache: "no-store" }));
    const body = (await res.json().catch(() => null)) as { success?: boolean; data?: unknown } | null;
    if (!res.ok || !body || body.success === false) return SMS_OFF;
    return parseSmsStatus(body.data);
  } catch {
    return SMS_OFF;
  }
}
