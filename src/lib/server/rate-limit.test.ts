import { describe, expect, it } from "vitest";

import { clientIpFrom, createRateLimiter, isSameOriginRequest } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 100).allowed).toBe(true);
    expect(rl.check("a", 200).allowed).toBe(true);
    const blocked = rl.check("a", 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(700);
  });

  it("keeps keys independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(false);
  });

  it("frees slots as the window slides", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    rl.check("a", 0);
    rl.check("a", 500);
    expect(rl.check("a", 999).allowed).toBe(false);
    expect(rl.check("a", 1001).allowed).toBe(true);
    expect(rl.check("a", 1002).allowed).toBe(false);
  });

  it("does not count blocked attempts", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    rl.check("a", 0);
    for (let i = 1; i < 10; i++) rl.check("a", i * 50);
    expect(rl.check("a", 1001).allowed).toBe(true);
  });

  it("evicts the oldest keys past maxKeys", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    rl.check("a", 0);
    rl.check("b", 0);
    rl.check("c", 0);
    // "a" was evicted, so it's allowed again.
    expect(rl.check("a", 1).allowed).toBe(true);
  });
});

describe("isSameOriginRequest", () => {
  const url = "https://easylinksolar.com.au/api/proposal/send-email";

  it("accepts a matching Origin", () => {
    const h = new Headers({ host: "easylinksolar.com.au", origin: "https://easylinksolar.com.au" });
    expect(isSameOriginRequest(h, url)).toBe(true);
  });

  it("falls back to Referer", () => {
    const h = new Headers({ host: "localhost:3131", referer: "http://localhost:3131/designs" });
    expect(isSameOriginRequest(h, "http://localhost:3131/api/x")).toBe(true);
  });

  it("rejects another site", () => {
    const h = new Headers({ host: "easylinksolar.com.au", origin: "https://evil.example" });
    expect(isSameOriginRequest(h, url)).toBe(false);
  });

  it("rejects a lookalike subdomain", () => {
    const h = new Headers({
      host: "easylinksolar.com.au",
      origin: "https://easylinksolar.com.au.evil.example",
    });
    expect(isSameOriginRequest(h, url)).toBe(false);
  });

  it("rejects requests with no Origin or Referer", () => {
    expect(isSameOriginRequest(new Headers({ host: "easylinksolar.com.au" }), url)).toBe(false);
  });

  it("rejects an opaque null origin", () => {
    const h = new Headers({ host: "easylinksolar.com.au", origin: "null" });
    expect(isSameOriginRequest(h, url)).toBe(false);
  });
});

describe("clientIpFrom", () => {
  it("uses X-Real-IP and ignores x-forwarded-for", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": " 1.2.3.4 ", "x-forwarded-for": "9.9.9.9" }))).toBe(
      "1.2.3.4",
    );
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "9.9.9.9" }))).toBe("unknown");
  });
});
