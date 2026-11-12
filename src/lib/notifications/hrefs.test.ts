import { describe, expect, it } from "vitest";
import { EQUIPMENT_VALIDITY, dashboardNotificationHref } from "./hrefs";

describe("notification links", () => {
  it("sends equipment validity notices to each portal's validity page", () => {
    expect(dashboardNotificationHref("admin", null, "cec:sg-sbr:expiring-60:2026-12-30", EQUIPMENT_VALIDITY)).toBe("/master/equipment-validity");
    expect(dashboardNotificationHref("installer", null, "cec:sg-sbr:expiring-60:2026-12-30", EQUIPMENT_VALIDITY)).toBe("/installers/dashboard/equipment-validity");
    expect(dashboardNotificationHref("customer", null, null, EQUIPMENT_VALIDITY)).toBeNull();
  });

  it("keeps lead links and tolerates notices with no record", () => {
    expect(dashboardNotificationHref("installer", "LEAD", "abc", "LEAD_ASSIGNED")).toBe("/installers/dashboard/home?leadId=abc");
    expect(dashboardNotificationHref("installer", null, null)).toBeNull();
    expect(dashboardNotificationHref("installer", "", "")).toBeNull();
  });
});
