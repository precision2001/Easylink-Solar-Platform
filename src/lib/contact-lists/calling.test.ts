import { describe, expect, it } from "vitest";

import { money } from "@/lib/designer/simulation";

import {
  CONTACTS,
  FILTERS,
  INTERESTS,
  OUTCOMES,
  applyFilter,
  buildContacts,
  dealValue,
  dncrLabel,
  fileStem,
  isCallable,
  isWarmOutcome,
  nextInQueue,
  priceOptions,
  toEmail,
} from "./calling";

const rows = buildContacts();

describe("who may legally be called", () => {
  it("allows a contact with a clear mobile", () => {
    expect(isCallable(CONTACTS[0])).toBe(true);
  });

  it("falls back to the landline when the mobile is on the register", () => {
    // Olivia is listed on her mobile but her landline is clear, so she is
    // still reachable — the block is per line, not per person.
    const olivia = CONTACTS[2];
    expect(olivia.dncrMobile).toBe(true);
    expect(olivia.dncrLandline).toBe(false);
    expect(isCallable(olivia)).toBe(true);
  });

  it("blocks a contact whose only line is on the register", () => {
    // Noah has no mobile and his landline is listed.
    expect(isCallable(CONTACTS[3])).toBe(false);
    // Henry has only a mobile, and it is listed.
    expect(isCallable(CONTACTS[6])).toBe(false);
  });

  it("blocks a contact with no number at all", () => {
    expect(
      isCallable({
        name: "x",
        mobile: "",
        landline: "",
        suburb: "",
        postcode: "",
        dncrMobile: false,
        dncrLandline: false,
        outcome: "",
      }),
    ).toBe(false);
  });

  it("blocks a contact listed on both lines", () => {
    expect(
      isCallable({
        name: "x",
        mobile: "0491 570 000",
        landline: "02 5550 0000",
        suburb: "",
        postcode: "",
        dncrMobile: true,
        dncrLandline: true,
        outcome: "",
      }),
    ).toBe(false);
  });

  it("names which lines are listed", () => {
    expect(dncrLabel(CONTACTS[0])).toBe("Clear");
    expect(dncrLabel(CONTACTS[2])).toBe("Mobile");
    expect(dncrLabel(CONTACTS[3])).toBe("Landline");
    expect(
      dncrLabel({ ...CONTACTS[0], dncrMobile: true, dncrLandline: true }),
    ).toBe("Mobile + landline");
  });

  it("leaves exactly two of the eight examples uncallable", () => {
    expect(rows.filter((r) => !r.callable).map((r) => r.name)).toEqual([
      "Noah Wilson",
      "Henry Kelly",
    ]);
  });
});

describe("the contact table", () => {
  it("shows all eight examples", () => {
    expect(rows).toHaveLength(8);
  });

  it("splits them across the two source lists", () => {
    expect(rows.filter((r) => r.list === "ARD NSW")).toHaveLength(6);
    expect(rows.filter((r) => r.list === "Expo leads Oct").map((r) => r.name)).toEqual([
      "Henry Kelly",
      "Amelia Wright",
    ]);
  });

  it("dashes a missing number rather than leaving it blank", () => {
    expect(rows[1].landlineText).toBe("—");
    expect(rows[3].mobileText).toBe("—");
    expect(rows[0].mobileText).toBe("0491 570 006");
  });

  it("labels an uncontacted lead", () => {
    expect(rows[0].outcomeLabel).toBe("Not called");
    expect(rows[4].outcomeLabel).toBe("Call back");
  });

  it("derives an email from the name", () => {
    expect(toEmail("Mia Thompson")).toBe("mia.thompson@example.com");
    expect(toEmail("Charlotte Singh")).toBe("charlotte.singh@example.com");
  });

  it("marks booked and interested as warm", () => {
    expect(isWarmOutcome("Appointment booked")).toBe(true);
    expect(isWarmOutcome("Interested")).toBe(true);
    expect(isWarmOutcome("Call back")).toBe(false);
    expect(isWarmOutcome("")).toBe(false);
  });
});

describe("filters", () => {
  it("offers four", () => {
    expect(FILTERS.map(([k]) => k)).toEqual(["all", "callable", "dncr", "callback"]);
  });

  it("shows everyone by default", () => {
    expect(applyFilter(rows, "all")).toHaveLength(8);
  });

  it("narrows to the six who can be called", () => {
    expect(applyFilter(rows, "callable")).toHaveLength(6);
  });

  it("narrows to the three with a line on the register", () => {
    // Olivia and Henry on the mobile, Noah on the landline.
    expect(applyFilter(rows, "dncr").map((r) => r.name)).toEqual([
      "Olivia Patel",
      "Noah Wilson",
      "Henry Kelly",
    ]);
  });

  it("narrows to the one callback due", () => {
    expect(applyFilter(rows, "callback").map((r) => r.name)).toEqual(["Ava Chen"]);
  });
});

describe("the calling queue", () => {
  it("steps to the next callable contact", () => {
    expect(nextInQueue(rows, 0)).toBe(1);
  });

  it("skips over contacts who cannot be called", () => {
    // After Olivia (2) comes Ava (4) — Noah (3) is on the register.
    expect(nextInQueue(rows, 2)).toBe(4);
  });

  it("wraps around at the end of the list", () => {
    // Amelia (7) is the last callable one, so the queue returns to Mia (0).
    expect(nextInQueue(rows, 7)).toBe(0);
  });

  it("returns -1 when nobody can be called", () => {
    const blocked = buildContacts([
      { ...CONTACTS[3] },
    ]);
    expect(nextInQueue(blocked, 0)).toBe(-1);
  });

  it("offers every outcome a caller needs to log", () => {
    expect(OUTCOMES).toHaveLength(8);
    expect(OUTCOMES).toContain("Asked not to be called");
  });
});

describe("the four options quoted on the call", () => {
  const opts = priceOptions();

  it("quotes four", () => {
    expect(opts.map((o) => o.n)).toEqual([
      "Essential",
      "Bill-Buster",
      "Electrify-Ready",
      "Maximum",
    ]);
  });

  it("prices each one off the shared engine", () => {
    expect(opts.map((o) => [o.kw, o.ratio, money(o.price)])).toEqual([
      [6.6, 132, "$5,550"],
      [11, 111, "$15,628"],
      [12.76, 129, "$29,624"],
      [12.76, 129, "$37,743"],
    ]);
  });

  it("saves more each step up", () => {
    const yearly = opts.map((o) => o.yearly);
    for (let i = 1; i < yearly.length; i++) {
      expect(yearly[i]).toBeGreaterThan(yearly[i - 1]);
    }
    expect(opts.map((o) => money(o.yearly))).toEqual(["$1,701", "$2,904", "$3,859", "$4,460"]);
  });

  it("reports payback on the system alone", () => {
    // The extras save on fuel and hot water, not on the power bill, so
    // counting them in the payback would flatter it.
    expect(opts.map((o) => o.payback.toFixed(1))).toEqual(["3.3", "5.4", "6.1", "7.1"]);
  });

  it("keeps every option inside the 133% certificate limit", () => {
    for (const o of opts) expect(o.ratio).toBeLessThanOrEqual(133);
  });

  it("leads with Bill-Buster", () => {
    expect(opts.filter((o) => o.recommended).map((o) => o.n)).toEqual(["Bill-Buster"]);
  });

  it("charges for the extras only where they are fitted", () => {
    const electrify = opts[2];
    const maximum = opts[3];
    // Same array and extras; the whole gap is the bigger battery.
    expect(electrify.kw).toBe(maximum.kw);
    expect(maximum.price).toBeGreaterThan(electrify.price);
  });

  it("re-prices against a different bill", () => {
    const small = priceOptions(400);
    // A smaller bill does not change the hardware, so the price holds...
    expect(money(small[0].price)).toBe("$5,550");
    // ...but there is less grid power to avoid, so the saving falls.
    expect(small[0].yearly).toBeLessThan(opts[0].yearly);
  });
});

describe("the deal panel", () => {
  it("values the lead's current system", () => {
    const d = dealValue(29);
    expect(d.kw).toBe(12.76);
    expect(d.ratio).toBe(129);
    expect(money(d.price)).toBe("$23,524");
    expect(money(d.weighted)).toBe("$5,881");
    expect(d.oversized).toBe(false);
  });

  it("flags an array that would lose the rebate", () => {
    // 31 panels on a 9.9 kW inverter is 138%.
    const over = dealValue(31);
    expect(over.ratio).toBe(138);
    expect(over.oversized).toBe(true);
  });

  it("sits right on the limit at 133%", () => {
    const at = dealValue(30);
    expect(at.ratio).toBe(133);
    expect(at.oversized).toBe(false);
  });

  it("weights revenue by the stage probability", () => {
    const d = dealValue(29);
    expect(d.weighted).toBeCloseTo(d.price * 0.25, 6);
  });

  it("offers the interests a lead can be tagged with", () => {
    expect(INTERESTS).toHaveLength(9);
    expect(INTERESTS[0]).toBe("Solar");
  });
});

describe("saved roof images", () => {
  it("names files after the contact", () => {
    expect(fileStem("Mia Thompson")).toBe("mia-thompson");
    expect(fileStem("O'Brien-Smith")).toBe("o-brien-smith");
  });

  it("falls back when there is no name", () => {
    expect(fileStem("")).toBe("customer");
  });
});
