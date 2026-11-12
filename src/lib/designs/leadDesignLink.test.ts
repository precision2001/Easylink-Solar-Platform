import { describe, expect, it } from "vitest";
import { leadDesignHref, leadPrefillFrom } from "./leadDesignLink";

describe("lead → Solar Design link", () => {
  it("carries the lead's details and reads them back", () => {
    const href = leadDesignHref({
      id: "c_1",
      customerName: "Mary Anne Smith",
      customerEmail: "mary@example.com",
      customerPhone: "+61 400 000 000",
      address: " 264 Wangee Rd, Greenacre NSW 2190 ",
      roofDesign: { lat: -33.9183, lng: 151.0466 },
    });
    expect(href.startsWith("/designs?")).toBe(true);
    const p = leadPrefillFrom(new URL(href, "https://x.test").searchParams)!;
    expect(p).toEqual({
      leadId: "c_1",
      name: "Mary Anne Smith",
      email: "mary@example.com",
      phone: "+61 400 000 000",
      address: "264 Wangee Rd, Greenacre NSW 2190",
      pin: { lat: -33.9183, lng: 151.0466 },
    });
  });

  it("leaves out what the lead doesn't have", () => {
    const href = leadDesignHref({ id: "c_2", customerName: "Raj", customerEmail: null, customerPhone: null, address: null, roofDesign: null });
    const p = leadPrefillFrom(new URL(href, "https://x.test").searchParams)!;
    expect(p).toMatchObject({ leadId: "c_2", name: "Raj", email: "", phone: "", address: "", pin: null });
  });

  it("is null without a lead", () => {
    expect(leadPrefillFrom(new URLSearchParams("customerId=1"))).toBeNull();
  });
});
