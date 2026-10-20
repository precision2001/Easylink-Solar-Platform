import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../src/policy/policy.js";
import { resolveAutonomy } from "../src/policy/autonomy.js";
import { DEFAULT_CONTROL } from "../src/store/types.js";
import { withinTelemarketingHours, stateFromAddress } from "../src/compliance/au.js";
import { agent } from "./helpers.js";

const recipient = { resolvedFromRecord: true, type: "customer", consent: {}, optedOut: false, dncrRegistered: false, address: "Castle Hill NSW 2154" };

describe("AU compliance", () => {
  it("knows state from address and telemarketing hours", () => {
    expect(stateFromAddress("88 Ocean Rd, Geelong VIC 3220")).toBe("VIC");
    expect(withinTelemarketingHours(new Date("2026-10-21T03:00:00Z"), "NSW").ok).toBe(true); // Wed 2pm
    expect(withinTelemarketingHours(new Date("2026-10-25T03:00:00Z"), "NSW").ok).toBe(false); // Sunday
    expect(withinTelemarketingHours(new Date("2026-10-21T10:30:00Z"), "NSW").ok).toBe(false); // 9:30pm
  });
});

describe("policy", () => {
  it("denies messages to raw addresses and to people who opted out", () => {
    expect(evaluatePolicy({ principal: agent("sales"), action: "send_message", recipient: { ...recipient, resolvedFromRecord: false }, channels: ["sms"] }).decision).toBe("deny");
    expect(evaluatePolicy({ principal: agent("sales"), action: "send_message", recipient: { ...recipient, optedOut: true }, channels: ["email"] }).policies).toContain("respect_opt_out");
  });
  it("needs marketing consent (Spam Act) and SMS quiet hours for agents", () => {
    const r = evaluatePolicy({ principal: agent("sales"), action: "send_message", purpose: "marketing", recipient, channels: ["email"], now: new Date("2026-10-21T03:00:00Z") });
    expect(r.policies).toContain("spam_act_consent");
    const night = evaluatePolicy({ principal: agent("care"), action: "send_message", purpose: "transactional", recipient, channels: ["sms"], now: new Date("2026-10-21T12:00:00Z") });
    expect(night.policies).toContain("sms_quiet_hours");
  });
  it("blocks marketing calls outside ACMA hours and to DNCR numbers", () => {
    const sunday = evaluatePolicy({ principal: agent("sales"), action: "place_call", purpose: "marketing", recipient, now: new Date("2026-10-25T03:00:00Z") });
    expect(sunday.policies).toContain("acma_calling_hours");
    const dncr = evaluatePolicy({ principal: agent("sales"), action: "place_call", purpose: "marketing", recipient: { ...recipient, dncrRegistered: true }, now: new Date("2026-10-21T03:00:00Z") });
    expect(dncr.policies).toContain("dncr");
  });
  it("keeps installers to their own records", () => {
    const r = evaluatePolicy({
      principal: { kind: "installer", id: "usr_inst_1", roles: ["INSTALLER"], on_behalf_of: null },
      action: "get_record",
      resource: { ref: { type: "lead", id: "ld_2" }, data: { assignedToId: "usr_inst_2" } },
    });
    expect(r.decision).toBe("deny");
  });
  it("forces a person for non-AI-writable fields and WON/LOST", () => {
    const r = evaluatePolicy({ principal: agent("sales"), action: "update_record", resource: { ref: { type: "lead", id: "ld_1" }, data: {} }, changedFields: ["status"], fields: { status: "WON" } });
    expect(r.decision).toBe("allow");
    expect(r.requireHuman).toBe(true);
  });
});

describe("autonomy", () => {
  it("defaults to Recommends for writes and respects kill switches and global recommend-only", () => {
    const base = { agentId: "sales", context: {}, rules: [], control: DEFAULT_CONTROL };
    expect(resolveAutonomy({ ...base, action: "send_message" }).outcome).toBe("propose");
    expect(resolveAutonomy({ ...base, action: "search_records" }).outcome).toBe("execute");
    expect(resolveAutonomy({ ...base, action: "send_message", control: { ...DEFAULT_CONTROL, familiesOff: { messages: true } } }).outcome).toBe("blocked");
    const rule = { agentId: "sales", action: "create_task" as const, condition: {}, level: "L2" as const, setBy: "x", setAt: "", reason: "r" };
    expect(resolveAutonomy({ ...base, action: "create_task", rules: [rule], control: { ...DEFAULT_CONTROL, globalRecommendOnly: true } }).outcome).toBe("propose");
  });
});
