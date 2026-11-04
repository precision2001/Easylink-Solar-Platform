import { describe, expect, it } from "vitest";
import {
  formatAccountDate,
  normalizePhone,
  profileDiff,
  splitPersonName,
} from "./profile";

describe("splitPersonName", () => {
  it("splits on the first word", () => {
    expect(splitPersonName("Ryan Ben")).toEqual({
      firstName: "Ryan",
      lastName: "Ben",
    });
  });

  it("keeps multi-word surnames", () => {
    expect(splitPersonName("Ana Van Der Berg")).toEqual({
      firstName: "Ana",
      lastName: "Van Der Berg",
    });
  });

  it("leaves the surname untouched for a single word", () => {
    expect(splitPersonName("Cher")).toEqual({ firstName: "Cher" });
  });

  it("returns nothing for blank input", () => {
    expect(splitPersonName("   ")).toEqual({});
  });
});

describe("normalizePhone", () => {
  it("adds the plus to a bare international number", () => {
    expect(normalizePhone("61417119222")).toBe("+61417119222");
  });

  it("leaves an already-normalised number alone", () => {
    expect(normalizePhone("+61 417 119 217")).toBe("+61 417 119 217");
  });

  it("does not mangle something that is not a bare number", () => {
    expect(normalizePhone("(02) 9123 4567")).toBe("(02) 9123 4567");
  });

  it("returns empty for blank input", () => {
    expect(normalizePhone("  ")).toBe("");
  });
});

describe("profileDiff", () => {
  const current = {
    firstName: "Ryan",
    lastName: "Ben",
    phone: "+61417119217",
  };

  it("returns nothing when nothing changed", () => {
    expect(
      profileDiff(current, { name: "Ryan Ben", phoneNumber: "+61417119217" }),
    ).toEqual({});
  });

  it("picks up a changed phone number", () => {
    expect(
      profileDiff(current, { name: "Ryan Ben", phoneNumber: "61417119222" }),
    ).toEqual({ phone: "+61417119222" });
  });

  it("picks up a changed name", () => {
    expect(profileDiff(current, { name: "Ryan Benson" })).toEqual({
      lastName: "Benson",
    });
  });

  it("picks up both parts of a fully changed name", () => {
    expect(profileDiff(current, { name: "Sam Taylor" })).toEqual({
      firstName: "Sam",
      lastName: "Taylor",
    });
  });

  it("ignores blank input rather than clearing the record", () => {
    expect(profileDiff(current, { name: "", phoneNumber: "" })).toEqual({});
  });

  it("treats a bare and normalised number as the same value", () => {
    // The wizard yields digits; the record holds E.164. Without normalising,
    // every save would look like a change.
    expect(
      profileDiff(current, { name: "Ryan Ben", phoneNumber: "61417119217" }),
    ).toEqual({});
  });
});

describe("formatAccountDate", () => {
  it("formats an ISO timestamp as an Australian short date", () => {
    expect(formatAccountDate("2026-01-15T03:12:00.000Z")).toBe("15 Jan 2026");
  });

  it("uses Sydney time, not UTC, for the calendar day", () => {
    // 20:00 UTC on 14 Jan is 07:00 on 15 Jan in Sydney (AEDT).
    expect(formatAccountDate("2026-01-14T20:00:00.000Z")).toBe("15 Jan 2026");
  });

  it("returns null for missing or invalid values", () => {
    expect(formatAccountDate(undefined)).toBeNull();
    expect(formatAccountDate(null)).toBeNull();
    expect(formatAccountDate("")).toBeNull();
    expect(formatAccountDate("not a date")).toBeNull();
  });
});
