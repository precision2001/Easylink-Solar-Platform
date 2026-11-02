import { describe, expect, it } from "vitest";
import { describeDue, initials, suburbOf } from "./leads-pipeline";

// Monday 2 Nov 2026, 11:00 am Sydney (AEDT, UTC+11).
const NOW = new Date("2026-11-02T00:00:00Z");

describe("describeDue", () => {
  it("says how late an overdue task is", () => {
    expect(describeDue("2026-11-01T23:35:00Z", NOW)).toEqual({ text: "Overdue 25 min", tone: "late" });
    expect(describeDue("2026-10-31T00:00:00Z", NOW)).toEqual({ text: "Overdue 2 days", tone: "late" });
  });

  it("uses Sydney time for today and tomorrow", () => {
    expect(describeDue("2026-11-02T04:15:00Z", NOW)).toEqual({ text: "Today 3:15 pm", tone: "soon" });
    expect(describeDue("2026-11-02T23:00:00Z", NOW)).toEqual({ text: "Tomorrow 10:00 am", tone: "normal" });
  });

  it("names the day further out", () => {
    expect(describeDue("2026-11-05T22:00:00Z", NOW).text).toBe("Fri 6 Nov 9:00 am");
  });
});

describe("display helpers", () => {
  it("takes the suburb from an address", () => {
    expect(suburbOf("25 Gilbert Street, Colyton NSW, Australia")).toBe("Colyton NSW");
    expect(suburbOf("Wollongong")).toBe("Wollongong");
    expect(suburbOf(null)).toBe("");
  });

  it("makes owner initials", () => {
    expect(initials({ id: "1", firstName: "Sujay", lastName: "Kumar" })).toBe("SK");
  });
});
