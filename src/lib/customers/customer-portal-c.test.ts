import { describe, expect, it, vi } from "vitest";
import { conversationTimeLabel, messagePreviewText } from "./message-preview";
import { documentKindLabel } from "./document-kind";
import {
  MAINTENANCE_REQUEST_HEADING,
  buildMaintenanceLeadPayload,
  submitMaintenanceRequest,
  validateMaintenanceRequest,
  type MaintenanceRequestForm,
} from "./maintenance-request";

const form: MaintenanceRequestForm = {
  firstName: " Elham ",
  lastName: "Tavakoli",
  phone: "0412 345 678",
  email: "elham@example.com",
  address: "12 Wattle St, Parramatta NSW 2150",
  plan: "annual",
  timing: "month",
  notes: "Lots of bird droppings on the north side.",
  consent: true,
};

describe("messagePreviewText", () => {
  it("turns attachments into words and strips formatting", () => {
    expect(messagePreviewText("![roof](https://x/y.png) here is **the** photo")).toBe("Photo here is the photo");
    expect(messagePreviewText("See [quote.pdf](https://x/q.pdf)")).toBe("See quote.pdf");
  });
  it("uses the call label and truncates long text", () => {
    expect(messagePreviewText("[video-call] Missed call")).toBe("Missed call");
    expect(messagePreviewText("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`);
    expect(messagePreviewText(null)).toBe("");
  });
});

describe("conversationTimeLabel", () => {
  const now = new Date("2026-11-04T03:00:00Z"); // 2pm Sydney
  it("shows time today, weekday this week, date otherwise", () => {
    expect(conversationTimeLabel("2026-11-04T01:05:00Z", now)).toMatch(/12:05/);
    expect(conversationTimeLabel("2026-11-02T01:05:00Z", now)).toBe("Mon");
    expect(conversationTimeLabel("2026-10-12T01:05:00Z", now)).toBe("12 Oct");
    expect(conversationTimeLabel("nope", now)).toBe("");
  });
});

describe("documentKindLabel", () => {
  it("names common types", () => {
    expect(documentKindLabel({ mimeType: "application/pdf", fileName: "x" })).toBe("PDF");
    expect(documentKindLabel({ mimeType: "", fileName: "roof.JPG" })).toBe("Image");
    expect(documentKindLabel({ mimeType: "application/zip", fileName: "a.zip" })).toBe("ZIP");
    expect(documentKindLabel({})).toBe("File");
  });
});

describe("maintenance request", () => {
  it("validates required fields and consent", () => {
    expect(validateMaintenanceRequest(form)).toEqual({});
    const errs = validateMaintenanceRequest({ ...form, firstName: "", email: "bad", phone: "12", consent: false });
    expect(Object.keys(errs).sort()).toEqual(["consent", "email", "firstName", "phone"]);
  });

  it("builds the contact-form payload with the request heading", () => {
    const p = buildMaintenanceLeadPayload(form);
    expect(p).toMatchObject({ firstName: "Elham", lastName: "Tavakoli", email: "elham@example.com", mobile: "0412 345 678" });
    expect(Object.keys(p).sort()).toEqual(["address", "email", "firstName", "lastName", "message", "mobile"]);
    expect(p.message.startsWith(MAINTENANCE_REQUEST_HEADING)).toBe(true);
    expect(p.message).toContain("Plan of interest: Yearly care");
    expect(p.message).toContain("Preferred timing: Within the next month");
    expect(p.message).toContain("bird droppings");
  });

  it("posts to /api/contact and surfaces errors", async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Thanks" }), { status: 200 }));
    await expect(submitMaintenanceRequest(form, ok)).resolves.toBe("Thanks");
    expect(ok.mock.calls[0][0]).toBe("/api/contact");
    const bad = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Invalid email address" }), { status: 400 }));
    await expect(submitMaintenanceRequest(form, bad)).rejects.toThrow("Invalid email address");
  });
});
