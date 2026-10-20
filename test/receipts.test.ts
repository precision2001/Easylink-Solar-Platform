import { describe, expect, it } from "vitest";
import { applyReceipt, parseReceipt } from "../src/history/receipts.js";
import { setup } from "./helpers.js";

describe("delivery receipts", () => {
  it("reads SES and SMS receipts", () => {
    expect(parseReceipt({ eventType: "Delivery", mail: { messageId: "ses-1" } })).toEqual({ providerId: "ses-1", status: "delivered", reason: undefined });
    expect(parseReceipt({ eventType: "Bounce", mail: { messageId: "ses-2" }, bounce: { bounceType: "Permanent", bouncedRecipients: [{ diagnosticCode: "550 no such user" }] } })).toMatchObject({ status: "bounced", reason: "Permanent 550 no such user" });
    expect(parseReceipt({ messageId: "sms-1", messageStatus: "DELIVERED" })).toMatchObject({ status: "delivered" });
    expect(parseReceipt({ messageId: "sms-2", messageStatus: "CARRIER_BLOCKED" })).toMatchObject({ status: "failed" });
    expect(parseReceipt({ eventType: "Send", mail: { messageId: "x" } })).toBeNull();
  });

  it("updates the message copy and adds a history line", async () => {
    const s = setup();
    await s.c.actions.run({
      name: "send_message",
      input: { to: { record: { type: "customer", id: "cus_1" } }, channel: ["email"], body: "Hello", reason: "test" },
      principal: { kind: "staff", id: "usr_admin", roles: ["ADMIN"], on_behalf_of: null },
      auth: { token: "admin" },
    });
    const providerId = (await s.store.listRecords("message_by_provider"))[0]!.id as string;
    const copy = await applyReceipt(s.c, { providerId, status: "bounced", reason: "Permanent" });
    expect(copy!.status).toBe("bounced");
    await new Promise((r) => setTimeout(r, 20));
    const lines = await s.store.listTimeline({ type: "customer", id: "cus_1" }, 20);
    expect(lines.some((l) => l.title.startsWith("Message bounced"))).toBe(true);
    // A later "delivered" doesn't undo a bounce.
    expect((await applyReceipt(s.c, { providerId, status: "delivered" }))!.status).toBe("bounced");
  });
});
