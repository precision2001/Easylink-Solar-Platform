import { beforeAll, describe, expect, it } from "vitest";
import { bookingLinkFor, makeLinkToken, readLinkToken } from "@/lib/booking/link-token";

beforeAll(() => {
  process.env.BOOKING_LINK_SECRET = "test-secret-0123456789abcdef";
  process.env.NEXT_PUBLIC_SITE_URL = "https://easylinksolar.com.au";
});

const ID = "62f21dc0-d65f-4b88-a1b3-d1610abe3f28";

describe("booking link tokens", () => {
  it("round-trips a lead, an installer and a booking", () => {
    for (const type of ["lead", "installer", "booking"] as const) {
      expect(readLinkToken(makeLinkToken({ type, id: ID }))).toEqual({ type, id: ID });
    }
    expect(readLinkToken(makeLinkToken({ type: "lead", id: "cuid_abc123" }))).toEqual({ type: "lead", id: "cuid_abc123" });
  });

  it("is short for a UUID", () => {
    expect(makeLinkToken({ type: "lead", id: ID }).length).toBeLessThanOrEqual(38);
  });

  it("rejects edited or foreign tokens", () => {
    const t = makeLinkToken({ type: "lead", id: ID });
    expect(readLinkToken(t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(readLinkToken("I" + t.slice(1))).toBeNull();
    expect(readLinkToken("")).toBeNull();
    expect(readLinkToken(null)).toBeNull();
    process.env.BOOKING_LINK_SECRET = "another-secret-0123456789";
    expect(readLinkToken(t)).toBeNull();
    process.env.BOOKING_LINK_SECRET = "test-secret-0123456789abcdef";
  });

  it("builds the links", () => {
    expect(bookingLinkFor({ type: "lead", id: ID })).toMatch(/^https:\/\/easylinksolar\.com\.au\/b\/L/);
    expect(bookingLinkFor({ type: "installer", id: ID })).toMatch(/^https:\/\/easylinksolar\.com\.au\/book\?i=I/);
    expect(bookingLinkFor({ type: "booking", id: ID })).toMatch(/^https:\/\/easylinksolar\.com\.au\/book\/manage\/B/);
  });
});
