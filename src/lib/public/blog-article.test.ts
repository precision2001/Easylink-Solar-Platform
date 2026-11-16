import { describe, expect, it } from "vitest";

import { parseBlogArticle, parseCardExtras, safeHref } from "./blog-article";

describe("parseBlogArticle", () => {
  it("keeps valid blocks and drops malformed ones", () => {
    const article = parseBlogArticle(
      {
        blocks: [
          { type: "lead", text: "Lead" },
          { type: "p", text: "" },
          { type: "script", text: "<x>" },
          { type: "steps", items: [{ label: "A", value: 2 }, { label: "B", value: 1 }], highlight: 9 },
          { type: "compare", rows: [{ label: "X", a: 10, b: 5 }, { label: "bad", a: "1", b: 2 }] },
          { type: "cta", title: "Go", label: "Start", href: "javascript:alert(1)" },
        ],
        keyStats: [{ label: "L", value: "V", tone: "navy" }, { label: "no value" }],
        sources: [{ title: "Ok", url: "https://example.com" }, { title: "Bad", url: "http://x" }],
      },
      [],
    );
    expect(article.blocks.map((b) => b.type)).toEqual(["lead", "steps", "compare", "cta"]);
    const steps = article.blocks[1];
    expect(steps.type === "steps" && steps.highlight).toBe(-1);
    const compare = article.blocks[2];
    expect(compare.type === "compare" && compare.rows.length).toBe(1);
    const cta = article.blocks[3];
    expect(cta.type === "cta" && cta.href).toBe("/designs");
    expect(article.keyStats).toEqual([{ label: "L", value: "V", note: "", tone: "navy" }]);
    expect(article.sources).toHaveLength(1);
  });

  it("falls back to the plain body when there are no blocks", () => {
    const article = parseBlogArticle({}, ["First", "Second"]);
    expect(article.blocks).toEqual([{ type: "lead", text: "First" }, { type: "p", text: "Second" }]);
  });

  it("reads card extras", () => {
    expect(parseCardExtras({ featured: true, card: { stat: "−$1,254", statLabel: "x" } })).toEqual({
      cardStat: "−$1,254",
      cardStatLabel: "x",
      featured: true,
    });
    expect(parseCardExtras(null)).toEqual({ cardStat: "", cardStatLabel: "", featured: false });
  });

  it("only allows same-site or https links", () => {
    expect(safeHref("/ready-deals")).toBe("/ready-deals");
    expect(safeHref("//evil.com")).toBe("/designs");
    expect(safeHref("https://easylinksolar.com.au")).toBe("https://easylinksolar.com.au");
  });
});
