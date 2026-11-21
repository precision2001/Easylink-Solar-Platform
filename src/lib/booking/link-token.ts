import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed booking-link tokens (server only).
 *
 *   L… a customer's personal link: bookings attach to that lead.
 *   I… an installer's link: new customers and their bookings go to that installer.
 *   B… one booking, for the customer's "change or cancel" link.
 *
 * The id is packed (16 bytes for a UUID) and signed with BOOKING_LINK_SECRET,
 * so a link can't be edited to reach another lead. Tokens don't expire: a
 * link in an old email still works, and nothing about the customer is in it.
 */
export type LinkTarget = { type: "lead" | "installer" | "booking"; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const s = process.env.BOOKING_LINK_SECRET;
  if (!s || s.length < 16) throw new Error("BOOKING_LINK_SECRET is not set.");
  return s;
}

export function bookingLinksConfigured(): boolean {
  const s = process.env.BOOKING_LINK_SECRET;
  return !!s && s.length >= 16;
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 12);

function pack(id: string): string {
  if (UUID.test(id)) return "u" + Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url");
  return "s" + Buffer.from(id, "utf8").toString("base64url");
}

function unpack(s: string): string | null {
  try {
    if (s.startsWith("u")) {
      const hex = Buffer.from(s.slice(1), "base64url").toString("hex");
      if (hex.length !== 32) return null;
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    if (s.startsWith("s")) return Buffer.from(s.slice(1), "base64url").toString("utf8") || null;
  } catch {
    // fall through
  }
  return null;
}

export function makeLinkToken(target: LinkTarget): string {
  const body = { lead: "L", installer: "I", booking: "B" }[target.type] + pack(target.id);
  return `${body}.${sign(body)}`;
}

export function readLinkToken(token: string | null | undefined): LinkTarget | null {
  if (!token || token.length > 200) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 2) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let want: string;
  try {
    want = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const id = unpack(body.slice(1));
  if (!id) return null;
  if (body[0] === "L") return { type: "lead", id };
  if (body[0] === "I") return { type: "installer", id };
  if (body[0] === "B") return { type: "booking", id };
  return null;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://easylinksolar.com.au").replace(/\/+$/, "");
}

/** /b/<token> for a lead, /book?i=<token> for an installer, /book/manage/<token> for a booking. */
export function bookingLinkFor(target: LinkTarget): string {
  const t = makeLinkToken(target);
  if (target.type === "lead") return `${siteUrl()}/b/${t}`;
  if (target.type === "installer") return `${siteUrl()}/book?i=${t}`;
  return `${siteUrl()}/book/manage/${t}`;
}
