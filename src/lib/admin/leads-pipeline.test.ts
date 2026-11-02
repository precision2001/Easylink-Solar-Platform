import { describe, expect, it } from "vitest";
import { ago, compactAud, describeDue, initials, leadUrgency, sourceKind, suburbOf, type PipelineLead } from "./leads-pipeline";

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

const lead = (over: Partial<PipelineLead> = {}): PipelineLead => ({
  id: "l1",
  customerName: "Elham Rahimi",
  customerEmail: null,
  customerPhone: null,
  address: null,
  source: "Design platform",
  status: "NEW",
  stage: "NEW_LEAD",
  estimatedValue: null,
  createdAt: "2026-11-01T00:00:00Z",
  owner: null,
  lostReason: null,
  nextAction: { id: "t1", kind: "CALLBACK", title: "Call back", dueAt: "2026-11-03T00:00:00Z", overdue: false },
  respondBy: null,
  responseOverdue: false,
  ...over,
});

describe("leadUrgency", () => {
  it("is late with no next action, an overdue one, or a missed first response", () => {
    expect(leadUrgency(lead({ nextAction: null }), NOW)).toBe("late");
    expect(leadUrgency(lead({ nextAction: { ...lead().nextAction!, overdue: true } }), NOW)).toBe("late");
    expect(leadUrgency(lead({ responseOverdue: true }), NOW)).toBe("late");
  });

  it("is soon when due today and calm otherwise", () => {
    expect(leadUrgency(lead({ nextAction: { ...lead().nextAction!, dueAt: "2026-11-02T04:00:00Z" } }), NOW)).toBe("soon");
    expect(leadUrgency(lead(), NOW)).toBe("normal");
    expect(leadUrgency(lead({ status: "LOST", nextAction: null }), NOW)).toBe("normal");
  });
});

describe("sourceKind", () => {
  it("groups sources into short labels", () => {
    expect(sourceKind("Design platform — /designs").label).toBe("Design");
    expect(sourceKind("Contact form").label).toBe("Contact form");
    expect(sourceKind("Customer referral").label).toBe("Referral");
    expect(sourceKind("Dialler").icon).toBe("phone");
    expect(sourceKind(null).label).toBe("Other");
  });
});

describe("ago and compactAud", () => {
  it("says how long ago", () => {
    expect(ago("2026-11-01T23:59:40Z", NOW)).toBe("Just now");
    expect(ago("2026-11-01T23:35:00Z", NOW)).toBe("25 min ago");
    expect(ago("2026-11-01T21:00:00Z", NOW)).toBe("3 h ago");
    expect(ago("2026-10-31T00:00:00Z", NOW)).toBe("2 days ago");
    expect(ago("2026-10-01T00:00:00Z", NOW)).toBe("1 Oct");
  });

  it("shortens dollar totals", () => {
    expect(compactAud(0)).toBe("");
    expect(compactAud(48_200)).toBe("$48k");
    expect(compactAud(1_200_000)).toBe("$1.2m");
    expect(compactAud(2_000_000)).toBe("$2m");
  });
});
