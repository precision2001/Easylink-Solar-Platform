import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKING_LINK_SETTINGS as D,
  earliestStart,
  freeTimes,
  isFreeTime,
  normaliseSettings,
  sayWhen,
  sydneyDayKey,
  sydneyTime,
} from "@/lib/booking/rules";

// Saturday 21 Nov 2026, 6:30 pm Sydney (AEDT, UTC+11).
const NOW = new Date("2026-11-21T07:30:00Z");

describe("Sydney time", () => {
  it("converts wall time in daylight saving and standard time", () => {
    expect(sydneyTime(2026, 11, 24, 10 * 60).toISOString()).toBe("2026-11-23T23:00:00.000Z");
    expect(sydneyTime(2026, 6, 10, 10 * 60).toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(sydneyDayKey(new Date("2026-11-23T23:00:00Z"))).toBe("2026-11-24");
  });
  it("says times in Sydney", () => {
    expect(sayWhen("2026-11-23T23:00:00Z")).toBe("Tuesday 24 November, 10:00 am");
  });
});

describe("earliest booking", () => {
  it("next business day skips the weekend", () => {
    // Saturday evening → Monday 23 Nov.
    expect(sydneyDayKey(earliestStart("NEXT_BUSINESS_DAY", NOW))).toBe("2026-11-23");
  });
  it("two business days", () => {
    expect(sydneyDayKey(earliestStart("TWO_BUSINESS_DAYS", NOW))).toBe("2026-11-24");
  });
});

describe("free times", () => {
  it("offers weekday site visits on the hour from the next business day", () => {
    const days = freeTimes(D, "SITE_VISIT", [], NOW, "2026-11-21", "2026-11-24");
    expect(days.map((d) => d.date)).toEqual(["2026-11-23", "2026-11-24"]);
    expect(days[0].times.map((t) => t.label)).toEqual(["8:00 am", "9:00 am", "10:00 am", "11:00 am", "12:00 pm", "1:00 pm", "2:00 pm", "3:00 pm", "4:00 pm"]);
  });

  it("is closed Sundays and NSW public holidays", () => {
    const days = freeTimes({ ...D, horizonDays: 60 }, "SITE_VISIT", [], NOW, "2026-12-24", "2026-12-29");
    // 25 Fri, 26 Sat, 27 Sun, 28 Mon (additional day) closed.
    expect(days.map((d) => d.date)).toEqual(["2026-12-24", "2026-12-29"]);
  });

  it("offers Saturday mornings for site visits only", () => {
    expect(freeTimes(D, "SITE_VISIT", [], NOW, "2026-11-28", "2026-11-28")[0].times.map((t) => t.label)).toEqual([
      "9:00 am",
      "10:00 am",
      "11:00 am",
      "12:00 pm",
    ]);
    expect(freeTimes(D, "CALLBACK", [], NOW, "2026-11-28", "2026-11-28")).toEqual([]);
  });

  it("keeps a travel gap around an existing visit", () => {
    const busy = [{ startAt: sydneyTime(2026, 11, 24, 10 * 60).toISOString(), endAt: sydneyTime(2026, 11, 24, 11 * 60).toISOString(), kind: "SITE_VISIT" }];
    const labels = freeTimes(D, "SITE_VISIT", busy, NOW, "2026-11-24", "2026-11-24")[0].times.map((t) => t.label);
    expect(labels).not.toContain("9:00 am");
    expect(labels).not.toContain("10:00 am");
    expect(labels).not.toContain("11:00 am");
    expect(labels).toContain("12:00 pm");
  });

  it("a call back doesn't block visits beyond its own time", () => {
    const busy = [{ startAt: sydneyTime(2026, 11, 24, 10 * 60).toISOString(), endAt: sydneyTime(2026, 11, 24, 10 * 60 + 15).toISOString(), kind: "CALLBACK" }];
    const labels = freeTimes(D, "SITE_VISIT", busy, NOW, "2026-11-24", "2026-11-24")[0].times.map((t) => t.label);
    expect(labels).toContain("9:00 am");
    expect(labels).not.toContain("10:00 am");
    expect(labels).toContain("11:00 am");
  });

  it("stops at the daily visit limit", () => {
    const busy = [8, 10, 12, 14].map((hh) => ({
      startAt: sydneyTime(2026, 11, 24, hh * 60).toISOString(),
      endAt: sydneyTime(2026, 11, 24, hh * 60 + 60).toISOString(),
      kind: "SITE_VISIT",
    }));
    expect(freeTimes(D, "SITE_VISIT", busy, NOW, "2026-11-24", "2026-11-24")).toEqual([]);
  });

  it("nothing when the link is off or the kind is disabled", () => {
    expect(freeTimes({ ...D, live: false }, "SITE_VISIT", [], NOW, "2026-11-23", "2026-11-30")).toEqual([]);
    expect(freeTimes(D, "SERVICE", [], NOW, "2026-11-23", "2026-11-30")).toEqual([]);
  });

  it("stops at the horizon", () => {
    const days = freeTimes(D, "CALLBACK", [], NOW, "2026-12-15", "2027-01-31");
    expect(days[days.length - 1].date <= "2026-12-19").toBe(true);
  });

  it("checks one start time", () => {
    expect(isFreeTime(D, "SITE_VISIT", [], NOW, sydneyTime(2026, 11, 24, 10 * 60).toISOString())).toBe(true);
    expect(isFreeTime(D, "SITE_VISIT", [], NOW, sydneyTime(2026, 11, 24, 10 * 60 + 30).toISOString())).toBe(false);
    expect(isFreeTime(D, "SITE_VISIT", [], NOW, sydneyTime(2026, 11, 22, 10 * 60).toISOString())).toBe(false);
    expect(isFreeTime(D, "SITE_VISIT", [], NOW, "nonsense")).toBe(false);
  });
});

describe("settings", () => {
  it("fills gaps from the defaults and clamps numbers", () => {
    const s = normaliseSettings({ live: false, gapMinutes: 9999, kinds: { CALLBACK: { enabled: false } } });
    expect(s.live).toBe(false);
    expect(s.gapMinutes).toBe(120);
    expect(s.kinds.CALLBACK.enabled).toBe(false);
    expect(s.kinds.CALLBACK.minutes).toBe(15);
    expect(s.kinds.SITE_VISIT).toEqual(D.kinds.SITE_VISIT);
    expect(normaliseSettings(null)).toEqual(D);
  });
});
