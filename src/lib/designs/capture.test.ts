import { describe, expect, it } from "vitest";
import { nextAttribution, readTags } from "./attribution";
import { buildDesignCapturePayload, splitName, toE164 } from "./capture";
import { DESIGN_PROPOSAL_DEFAULTS } from "@/lib/store/designProposalSlice";

const NOW = new Date("2026-10-31T00:00:00Z");
const base = { referrer: "", origin: "https://www.easylinksolar.com.au", path: "/designs", now: NOW };

describe("readTags", () => {
  it("reads UTM tags, click ids, referral and partner codes", () => {
    expect(
      readTags("?utm_source=google&utm_medium=cpc&utm_campaign=nsw&gclid=abc&ref=ABCD23&partner=rs-12"),
    ).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "nsw",
      gclid: "abc",
      ref: "ABCD23",
      partner: "rs-12",
    });
  });

  it("returns null for an untagged visit", () => {
    expect(readTags("?designId=1")).toBeNull();
  });
});

describe("nextAttribution", () => {
  it("records landing page and an external referrer", () => {
    expect(
      nextAttribution({ ...base, stored: null, search: "", referrer: "https://www.google.com/" }),
    ).toEqual({
      landingPage: "/designs",
      referrer: "https://www.google.com/",
      firstSeenAt: NOW.toISOString(),
    });
  });

  it("ignores our own site as a referrer", () => {
    const next = nextAttribution({
      ...base,
      stored: null,
      search: "",
      referrer: "https://www.easylinksolar.com.au/blog",
    });
    expect(next.referrer).toBeUndefined();
  });

  it("keeps stored tags on an untagged return visit", () => {
    const stored = { utmSource: "meta", firstSeenAt: "2026-10-20T00:00:00Z" };
    expect(nextAttribution({ ...base, stored, search: "" })).toBe(stored);
  });

  it("lets a new tagged visit replace older tags", () => {
    const stored = { utmSource: "meta", firstSeenAt: "2026-10-20T00:00:00Z" };
    expect(nextAttribution({ ...base, stored, search: "?utm_source=google" }).utmSource).toBe("google");
  });

  it("expires stored tags after 90 days", () => {
    const stored = { utmSource: "meta", firstSeenAt: "2026-06-01T00:00:00Z" };
    expect(nextAttribution({ ...base, stored, search: "" }).utmSource).toBeUndefined();
  });
});

describe("capture payload", () => {
  it("splits names and formats phones as E.164", () => {
    expect(splitName("  Ada King Lovelace ")).toEqual({ firstName: "Ada", lastName: "King Lovelace" });
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
    expect(toE164("61491570006")).toBe("+61491570006");
  });

  it("maps the wizard state, defaulting consent to no", () => {
    const proposal = {
      ...DESIGN_PROPOSAL_DEFAULTS,
      customer: {
        ...DESIGN_PROPOSAL_DEFAULTS.customer,
        name: "Ada Lovelace",
        email: " ada@example.com ",
        phoneNumber: "61491570006",
      },
      pricing: { ...DESIGN_PROPOSAL_DEFAULTS.pricing, totalSystemPrice: "$9,450" },
    };
    const payload = buildDesignCapturePayload(proposal, { utmSource: "google" });
    expect(payload).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      mobile: "+61491570006",
      marketingConsent: false,
      estimatedValue: 9450,
      attribution: { utmSource: "google" },
    });
    expect(payload.design.wizardData).toBe(proposal);
  });

  it("sends consent only when the box was ticked", () => {
    const proposal = {
      ...DESIGN_PROPOSAL_DEFAULTS,
      customer: { ...DESIGN_PROPOSAL_DEFAULTS.customer, marketingConsent: true },
    };
    expect(buildDesignCapturePayload(proposal, undefined).marketingConsent).toBe(true);
  });
});
