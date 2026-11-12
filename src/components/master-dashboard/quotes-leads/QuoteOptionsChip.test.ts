import { describe, expect, it } from "vitest";
import { quoteChipLabel } from "./QuoteOptionsChip";

describe("quoteChipLabel", () => {
  it("says how many options and the lowest total", () => {
    expect(quoteChipLabel({ count: 3, fromCents: 2490000 })).toBe("3 options · from $24,900");
  });
  it("shows one quote's total", () => {
    expect(quoteChipLabel({ count: 1, fromCents: 1999950 })).toBe("Quote · $20,000");
    expect(quoteChipLabel({ count: 1, fromCents: null })).toBe("1 quote");
  });
});
