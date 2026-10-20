import type { Container } from "../container.js";
import { makeEvent } from "../core/envelope.js";
import type { MessageCopy } from "../store/types.js";

/**
 * Delivery receipts → history. SES (configuration set event destination) and
 * AWS End User Messaging SMS (event destination) publish to one SNS topic; each
 * receipt updates the stored message copy and adds a history line.
 */
type Receipt = { providerId: string; status: MessageCopy["status"]; reason?: string };

export function parseReceipt(raw: unknown): Receipt | null {
  const j = raw as Record<string, unknown>;
  // SES event publishing
  const sesType = String(j.eventType ?? j.notificationType ?? "");
  const mail = j.mail as { messageId?: string } | undefined;
  if (mail?.messageId) {
    const map: Record<string, MessageCopy["status"]> = { Delivery: "delivered", Open: "opened", Click: "opened", Bounce: "bounced", Complaint: "failed", Reject: "failed", RenderingFailure: "failed" };
    const status = map[sesType];
    if (!status) return null;
    const bounce = j.bounce as { bounceType?: string; bouncedRecipients?: { diagnosticCode?: string }[] } | undefined;
    return { providerId: mail.messageId, status, reason: bounce ? `${bounce.bounceType ?? ""} ${bounce.bouncedRecipients?.[0]?.diagnosticCode ?? ""}`.trim() : undefined };
  }
  // End User Messaging SMS
  if (typeof j.messageId === "string" && typeof j.messageStatus === "string") {
    const s = j.messageStatus.toUpperCase();
    const status: MessageCopy["status"] | null = s === "DELIVERED" ? "delivered" : ["FAILED", "UNREACHABLE", "BLOCKED", "CARRIER_BLOCKED", "INVALID", "TTL_EXPIRED", "SPAM"].includes(s) ? "failed" : null;
    return status ? { providerId: j.messageId, status, reason: status === "failed" ? s.toLowerCase() : undefined } : null;
  }
  return null;
}

const RANK: Record<MessageCopy["status"], number> = { sent: 0, delivered: 1, opened: 2, bounced: 3, failed: 3 };

export async function applyReceipt(c: Container, r: Receipt) {
  const link = await c.store.getRecord("message_by_provider", r.providerId);
  if (!link) return null;
  const copy = (await c.store.getRecord("message", String(link.copyId))) as unknown as MessageCopy | undefined;
  if (!copy) return null;
  // Opens after delivery are worth a line once; never move a bounce back to delivered.
  if (RANK[r.status] < RANK[copy.status] || (r.status === copy.status && r.status !== "sent")) return copy;
  const at = new Date().toISOString();
  const next = { ...copy, status: r.status, statusAt: at };
  await c.store.putRecord("message", next as unknown as Record<string, unknown> & { id: string });
  const evt = makeEvent({
    type: `message.${r.status === "bounced" ? "bounced" : r.status === "failed" ? "failed" : r.status}`,
    source: "delivery-receipts",
    principal: { kind: "integration", id: "delivery-receipts", roles: [], on_behalf_of: null },
    subject: copy.to.record,
    data: { message_copy_id: copy.id, to_name: copy.to.name, records: copy.records, reason: r.reason ?? null },
  });
  await c.store.recordEvent(evt);
  await c.bus.publish([evt]);
  return next;
}

