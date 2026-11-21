import { readLinkToken } from "@/lib/booking/link-token";
import { api, getLead, type Lead } from "@/lib/booking/service";

/** Who a booking-link visit is for: a known lead, an installer's own link, or the public. */
export type ResolvedTarget =
  | { type: "public" }
  | { type: "lead"; lead: Lead }
  | { type: "installer"; installerId: string; installerName: string | null };

export type TargetError = { error: string; status: number };

export async function resolveTarget(leadToken: string | null, installerToken: string | null): Promise<ResolvedTarget | TargetError> {
  if (leadToken) {
    const t = readLinkToken(leadToken);
    if (!t || t.type !== "lead") return { error: "This booking link isn't valid. Please use the link from your message, or call us.", status: 404 };
    const lead = await getLead(t.id);
    if (!lead) return { error: "We couldn't find your details. Please book with the public link or call us.", status: 404 };
    return { type: "lead", lead };
  }
  if (installerToken) {
    const t = readLinkToken(installerToken);
    if (!t || t.type !== "installer") return { error: "This booking link isn't valid.", status: 404 };
    return { type: "installer", installerId: t.id, installerName: await installerName(t.id) };
  }
  return { type: "public" };
}

const nameCache = new Map<string, { at: number; name: string | null }>();

/** The installer's business name, from the container's installer list (cached 10 min). */
export async function installerName(id: string): Promise<string | null> {
  const hit = nameCache.get(id);
  if (hit && Date.now() - hit.at < 600_000) return hit.name;
  let name: string | null = null;
  try {
    const list = await api<unknown>("GET", "/easylink-pool/installers");
    const arr = Array.isArray(list) ? list : [];
    const found = arr.find((x) => x && typeof x === "object" && (x as { id?: string }).id === id) as { name?: string } | undefined;
    name = found?.name?.trim() || null;
  } catch {
    name = null;
  }
  nameCache.set(id, { at: Date.now(), name });
  return name;
}

export const firstName = (full: string | null | undefined) => {
  const f = (full ?? "").trim().split(/\s+/)[0] ?? "";
  return f && !/^(phone|web|website)$/i.test(f) ? f : "";
};

/** "s****@gmail.com" — enough for the customer to recognise, not enough to harvest. */
export function maskEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim();
  const at = e.indexOf("@");
  if (at < 1) return null;
  return `${e[0]}${"*".repeat(Math.min(4, at - 1))}${e.slice(at)}`;
}

export function phoneEnding(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 6 ? d.slice(-3) : null;
}
