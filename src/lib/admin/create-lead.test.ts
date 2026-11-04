import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_NEW_LEAD,
  createAdminLead,
  newLeadPayload,
  validateNewLead,
} from "./create-lead";

describe("validateNewLead", () => {
  it("requires a name", () => {
    expect(validateNewLead(EMPTY_NEW_LEAD).name).toBeDefined();
    expect(validateNewLead({ ...EMPTY_NEW_LEAD, name: "   " }).name).toBeDefined();
    expect(validateNewLead({ ...EMPTY_NEW_LEAD, name: "Mia Chen" })).toEqual({});
  });

  it("checks email and mobile only when given", () => {
    const base = { ...EMPTY_NEW_LEAD, name: "Mia Chen" };
    expect(validateNewLead({ ...base, email: "mia@" }).email).toBeDefined();
    expect(validateNewLead({ ...base, email: "mia@example.com.au" }).email).toBeUndefined();
    expect(validateNewLead({ ...base, mobile: "0412" }).mobile).toBeDefined();
    expect(validateNewLead({ ...base, mobile: "0412 345 678" }).mobile).toBeUndefined();
  });
});

describe("newLeadPayload", () => {
  it("trims values and leaves blank optional fields out", () => {
    expect(
      newLeadPayload({
        ...EMPTY_NEW_LEAD,
        name: "  Mia Chen ",
        mobile: " 0412 345 678 ",
        source: "Walk-in",
        notes: "  ",
      }),
    ).toEqual({
      customerName: "Mia Chen",
      customerPhone: "0412 345 678",
      customerEmail: undefined,
      address: undefined,
      source: "Walk-in",
      notes: undefined,
    });
  });
});

describe("createAdminLead", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts to the admin leads proxy and returns the lead", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "lead-1" } }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(createAdminLead({ customerName: "Mia", source: "Referral" })).resolves.toEqual({ id: "lead-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/leads",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces the backend's message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, message: "Invalid email" }), { status: 400 }),
      ),
    );
    await expect(createAdminLead({ customerName: "Mia", source: "Other" })).rejects.toThrow("Invalid email");
  });
});
