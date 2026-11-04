import { afterEach, describe, expect, it, vi } from "vitest";
import {
  initialPortalLinkState,
  isPortalLinkToken,
  postPortalLink,
} from "./portal-link-client";

const TOKEN = "a".repeat(64);

describe("isPortalLinkToken", () => {
  it("accepts 64 lowercase hex characters", () => {
    expect(isPortalLinkToken(TOKEN)).toBe(true);
    expect(isPortalLinkToken("0123456789abcdef".repeat(4))).toBe(true);
  });

  it("rejects short, uppercase or non-hex tokens", () => {
    expect(isPortalLinkToken("")).toBe(false);
    expect(isPortalLinkToken("a".repeat(63))).toBe(false);
    expect(isPortalLinkToken("A".repeat(64))).toBe(false);
    expect(isPortalLinkToken("g".repeat(64))).toBe(false);
  });
});

describe("initialPortalLinkState", () => {
  it("is ready for a well-formed token", () => {
    expect(initialPortalLinkState(TOKEN)).toEqual({ kind: "ready" });
  });

  it("explains a truncated link", () => {
    expect(initialPortalLinkState("abc")).toEqual({
      kind: "error",
      message: "This link is incomplete.",
    });
  });

  it("asks for an email when there is no token", () => {
    expect(initialPortalLinkState("")).toEqual({ kind: "error", message: "" });
  });
});

describe("postPortalLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts JSON with credentials and returns status and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Sent" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await postPortalLink({ action: "request", email: "a@b.com.au" });

    expect(result).toEqual({ ok: true, status: 200, json: { message: "Sent" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/customers/portal-link");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual({ action: "request", email: "a@b.com.au" });
  });

  it("tolerates a non-JSON error body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Bad gateway", { status: 502 })),
    );
    const result = await postPortalLink({ action: "redeem", token: TOKEN });
    expect(result).toEqual({ ok: false, status: 502, json: {} });
  });
});
