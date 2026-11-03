import { describe, expect, it } from "vitest";

import { parseContact, parseFeaturedQuote, parseLeaderQuotes, toBlogDetailContent } from "./blogs";

describe("toBlogDetailContent", () => {
  it("renders no quotes or media contact unless the post supplies them", () => {
    const content = toBlogDetailContent({
      slug: "post",
      title: "A post",
      content: { body: ["Lead", "Body"] },
    });
    expect(content.featuredQuote).toBeUndefined();
    expect(content.leaderQuotes).toEqual([]);
    expect(content.contact).toBeUndefined();
    expect(content.attributionRole).toBe("");
    expect(content.readTimeLabel).toBe("");
    expect(JSON.stringify(content)).not.toMatch(/Clean Energy Council|Wickham|Iberdrola/);
  });

  it("uses the post's own quotes and contact", () => {
    const content = toBlogDetailContent({
      slug: "post",
      title: "A post",
      content: {
        featuredQuote: { quote: "We said this.", name: "Jo Citizen", role: "Director" },
        leaderQuotes: [{ paragraphs: ["Quote"], attribution: "Sam, CEO" }, { paragraphs: [] }],
        contact: { name: "Media team", emailHref: "mailto:media@example.com" },
      },
    });
    expect(content.featuredQuote?.name).toBe("Jo Citizen");
    expect(content.leaderQuotes).toEqual([{ attribution: "Sam, CEO", paragraphs: ["Quote"] }]);
    expect(content.contact?.emailHref).toBe("mailto:media@example.com");
    expect(content.contact?.phone).toBe("");
  });
});

describe("blog block parsers", () => {
  it("rejects incomplete blocks", () => {
    expect(parseFeaturedQuote({ quote: "No name" })).toBeUndefined();
    expect(parseFeaturedQuote("nope")).toBeUndefined();
    expect(parseLeaderQuotes({})).toEqual([]);
    expect(parseContact({ name: "No way to reach" })).toBeUndefined();
  });
});
