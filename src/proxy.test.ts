import { describe, expect, it } from "vitest";

import { isPublicCustomersLanding } from "./proxy";

describe("isPublicCustomersLanding", () => {
  it("lets the bare customers marketing page through", () => {
    expect(isPublicCustomersLanding("/customers")).toBe(true);
    expect(isPublicCustomersLanding("/customers/")).toBe(true);
  });

  it("keeps everything beneath /customers protected", () => {
    expect(isPublicCustomersLanding("/customers/dashboard")).toBe(false);
    expect(isPublicCustomersLanding("/customers/profile")).toBe(false);
    expect(isPublicCustomersLanding("/customers//")).toBe(false);
    expect(isPublicCustomersLanding("/customersx")).toBe(false);
  });
});
