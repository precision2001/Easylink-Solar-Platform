import { describe, expect, it } from "vitest";

import { PREVIEW_SCREENS, previewNoticeFor } from "./previewScreens";

describe("previewNoticeFor", () => {
  it("labels a sample-data screen", () => {
    expect(previewNoticeFor("/installers/dashboard/payouts")).toContain("examples");
  });

  it("labels nested routes of a sample-data screen", () => {
    expect(previewNoticeFor("/installers/dashboard/payouts/2026-10")).toBe(
      PREVIEW_SCREENS["/installers/dashboard/payouts"],
    );
  });

  it("leaves screens with real data alone", () => {
    for (const live of [
      "/installers/dashboard/home",
      "/installers/dashboard/customers",
      "/installers/dashboard/messages",
      "/installers/dashboard/ready-sites",
      "/installers/dashboard/ready-deals",
      "/installers/dashboard/reports",
      "/installers/dashboard/jobs",
    ]) {
      expect(previewNoticeFor(live)).toBeUndefined();
    }
  });

  it("labels the overview and solar designer, which still show examples", () => {
    expect(previewNoticeFor("/installers/dashboard/overview")).toBeDefined();
    expect(previewNoticeFor("/installers/dashboard/solar-designer")).toBeDefined();
  });

  it("leaves the pipeline screens alone — both read real leads", () => {
    expect(previewNoticeFor("/installers/dashboard/pipeline")).toBeUndefined();
    expect(previewNoticeFor("/installers/dashboard/pipeline-status")).toBeUndefined();
  });

  it("handles no route", () => {
    expect(previewNoticeFor(null)).toBeUndefined();
  });
});
