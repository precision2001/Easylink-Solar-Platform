import { describe, expect, it } from "vitest";
import { describeShare, shareLabel } from "./send-to-customer";

describe("describeShare", () => {
  it("says what went and why anything didn't", () => {
    expect(describeShare({ email: "sent", sms: "sent", sharedAt: "x" })).toEqual({ tone: "success", text: "Sent to the customer's portal, with a link by email and SMS." });
    expect(describeShare({ email: "sent", sms: "unavailable", sharedAt: "x" })).toEqual({
      tone: "warning",
      text: "Sent to the customer's portal, with a link by email. No SMS: SMS isn't switched on yet.",
    });
    expect(describeShare({ email: "no-email", sms: "no-mobile", sharedAt: null })?.text).toBe(
      "The design is in the customer's portal, but no message went. No email: there's no email address for them. No SMS: there's no Australian mobile for them.",
    );
    expect(describeShare({ email: "not-asked", sms: "not-asked", sharedAt: null, skipped: "recently-sent" })?.tone).toBe("info");
    expect(describeShare(null)).toBeNull();
  });
});

describe("shareLabel", () => {
  const now = Date.parse("2026-11-10T10:00:00Z");
  it("shows when and how it was sent, and flags changes since", () => {
    expect(shareLabel({ sharedAt: null, sharedChannels: null, updatedAt: "2026-11-10T09:00:00Z" }, now)).toEqual({ text: "Not sent to the customer yet", stale: true });
    expect(shareLabel({ sharedAt: "2026-11-10T08:00:00Z", sharedChannels: "EMAIL,SMS", updatedAt: "2026-11-10T08:00:20Z" }, now)).toEqual({
      text: "Sent to customer 2 h ago by email + SMS",
      stale: false,
    });
    expect(shareLabel({ sharedAt: "2026-11-10T08:00:00Z", sharedChannels: "EMAIL", updatedAt: "2026-11-10T09:30:00Z" }, now).text).toBe("Changed since sent 2 h ago by email");
  });
});
