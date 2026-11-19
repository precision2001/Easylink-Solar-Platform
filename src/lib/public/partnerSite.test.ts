import { describe, expect, it } from "vitest";
import { designerHref, safeColour } from "@/lib/public/partnerSite";

/**
 * The partner embed renders an installer's own colours into a style
 * attribute, so the sanitiser is the thing worth testing directly: a value
 * that is not a plain hex colour must never reach the page.
 */

describe("partner brand colours", () => {
  it("accepts three- and six-digit hex, in either case", () => {
    expect(safeColour("#F68A0A", "#000")).toBe("#F68A0A");
    expect(safeColour("#abc", "#000")).toBe("#abc");
    expect(safeColour("#ABCDEF", "#000")).toBe("#ABCDEF");
  });

  it("trims surrounding whitespace", () => {
    expect(safeColour("  #F68A0A  ", "#000")).toBe("#F68A0A");
  });

  it("falls back for anything that is not a hex colour", () => {
    // These are the shapes that would otherwise inject CSS into an
    // installer's page.
    expect(safeColour("red; background: url(x)", "#F68A0A")).toBe("#F68A0A");
    expect(safeColour("javascript:alert(1)", "#F68A0A")).toBe("#F68A0A");
    expect(safeColour("rgb(255,0,0)", "#F68A0A")).toBe("#F68A0A");
    expect(safeColour("#12345", "#F68A0A")).toBe("#F68A0A");
    expect(safeColour("#GGGGGG", "#F68A0A")).toBe("#F68A0A");
  });

  it("falls back for a missing or non-string value", () => {
    expect(safeColour(undefined, "#F68A0A")).toBe("#F68A0A");
    expect(safeColour(null, "#F68A0A")).toBe("#F68A0A");
    expect(safeColour(42, "#F68A0A")).toBe("#F68A0A");
    expect(safeColour("", "#F68A0A")).toBe("#F68A0A");
  });
});

describe("designer link", () => {
  it("carries the partner key, which is what assigns the lead", () => {
    expect(designerHref("solarman")).toBe("/designs?partner=solarman");
  });

  it("escapes a key that would otherwise alter the query string", () => {
    expect(designerHref("a&b=c")).toBe("/designs?partner=a%26b%3Dc");
    expect(designerHref("a b")).toBe("/designs?partner=a%20b");
  });
});
