import { describe, expect, it } from "vitest";

import { LOCATION_REQUIRED_MESSAGE, locationStepError } from "./locationStep";

const pin = { lat: -33.89, lng: 151.27 };

describe("locationStepError", () => {
  it("passes with a confirmed address and a map pin", () => {
    expect(
      locationStepError({ address: "1 Example St, Bondi NSW", location: pin, addressConfirmed: true }),
    ).toBeNull();
  });

  it("blocks an empty address", () => {
    expect(locationStepError({ address: "   ", location: pin, addressConfirmed: true })).toBe(
      LOCATION_REQUIRED_MESSAGE,
    );
  });

  it("blocks when there are no map coordinates", () => {
    expect(
      locationStepError({ address: "1 Example St", location: null, addressConfirmed: true }),
    ).toBe(LOCATION_REQUIRED_MESSAGE);
  });

  it("blocks non-finite coordinates", () => {
    expect(
      locationStepError({
        address: "1 Example St",
        location: { lat: Number.NaN, lng: 151 },
        addressConfirmed: true,
      }),
    ).toBe(LOCATION_REQUIRED_MESSAGE);
  });

  it("blocks a typed address that wasn't picked, even with an old pin", () => {
    expect(
      locationStepError({ address: "1 Example St", location: pin, addressConfirmed: false }),
    ).toBe(LOCATION_REQUIRED_MESSAGE);
  });
});
