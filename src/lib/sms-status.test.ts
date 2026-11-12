import { describe, expect, it } from "vitest";
import { NO_MOBILE_NOTE, SMS_OFF, isAuMobile, parseSmsStatus, smsBlockedReason, smsSelectable } from "./sms-status";

const pending = { state: "pending", enabled: false, provider: "twilio", senderId: "EASYLINK", message: "SMS starts once the EASYLINK sender ID is approved. Messages go by email until then." };

describe("sms status", () => {
  it("reads the backend answer and falls back to off", () => {
    expect(parseSmsStatus(pending).state).toBe("pending");
    expect(parseSmsStatus({ state: "weird" })).toEqual({ ...SMS_OFF, provider: "", senderId: "" });
    expect(parseSmsStatus(null)).toBe(SMS_OFF);
    expect(parseSmsStatus({ state: "live" }).enabled).toBe(true);
  });
  it("only lets SMS be picked when live or in test mode", () => {
    expect(smsSelectable({ state: "live" })).toBe(true);
    expect(smsSelectable({ state: "sandbox" })).toBe(true);
    expect(smsSelectable({ state: "pending" })).toBe(false);
    expect(smsSelectable({ state: "off" })).toBe(false);
  });
  it("recognises Australian mobiles", () => {
    expect(isAuMobile("0405 148 237")).toBe(true);
    expect(isAuMobile("+61405148237")).toBe(true);
    expect(isAuMobile("(02) 9555 1234")).toBe(false);
    expect(isAuMobile(null)).toBe(false);
  });
  it("explains why SMS is off", () => {
    const live = parseSmsStatus({ state: "live", message: "" });
    expect(smsBlockedReason(parseSmsStatus(pending), "0405148237")).toBe(pending.message);
    expect(smsBlockedReason(live, "02 9555 1234")).toBe(NO_MOBILE_NOTE);
    expect(smsBlockedReason(live, "0405148237")).toBeNull();
  });
});
