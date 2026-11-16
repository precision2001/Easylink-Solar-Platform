import { describe, expect, it } from "vitest";
import { toAuE164 } from "./phone";

describe("toAuE164", () => {
  it("reads the ways agents type numbers", () => {
    expect(toAuE164("0412 345 678")).toBe("+61412345678");
    expect(toAuE164("(02) 9163 8128")).toBe("+61291638128");
    expect(toAuE164("61412345678")).toBe("+61412345678");
    expect(toAuE164("+61 412 345 678")).toBe("+61412345678");
  });

  it("refuses what Connect cannot dial", () => {
    expect(toAuE164("")).toBeNull();
    expect(toAuE164("1300 123 456")).toBeNull();
    expect(toAuE164("+1 415 555 0100")).toBeNull();
    expect(toAuE164("0412 345")).toBeNull();
    expect(toAuE164("412345678")).toBeNull();
  });
});
