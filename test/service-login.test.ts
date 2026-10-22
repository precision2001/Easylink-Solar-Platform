import { describe, expect, it } from "vitest";
import { HttpBackend, SERVICE_ACCOUNT, serviceLogin } from "../src/backend/client.js";

const jwt = (expSec: number) => `x.${Buffer.from(JSON.stringify({ exp: expSec })).toString("base64url")}.y`;

describe("AI service account", () => {
  it("reads email and password from the secret, or treats anything else as a fixed token", () => {
    expect(serviceLogin('{"email":"ai@easylinksolar.com.au","password":"pw"}')).toEqual({ email: "ai@easylinksolar.com.au", password: "pw" });
    expect(serviceLogin("eyJhbGciOi.abc.def")).toBeNull();
    expect(serviceLogin('{"email":""}')).toBeNull();
  });

  it("signs in, reuses the token until it nearly expires, and signs in again after a 401", async () => {
    const calls: { url: string; auth?: string; body?: string }[] = [];
    let issued = 0;
    let reject = false;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      calls.push({ url, auth, body: init.body as string | undefined });
      if (url.endsWith("/auth/login")) {
        issued += 1;
        return new Response(JSON.stringify({ success: true, data: { accessToken: `${jwt(Math.floor(Date.now() / 1000) + 900)}#${issued}`, refreshToken: "r" } }), { status: 200 });
      }
      if (reject) {
        reject = false;
        return new Response(JSON.stringify({ message: "expired" }), { status: 401 });
      }
      return new Response(JSON.stringify({ success: true, data: [{ id: "u1" }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const b = new HttpBackend("https://api.example/api/v1", fetchImpl, { email: "ai@x", password: "pw" });

    await b.call("GET", "/users", null, { token: SERVICE_ACCOUNT });
    await b.call("GET", "/users", null, { token: SERVICE_ACCOUNT });
    expect(calls.filter((c) => c.url.endsWith("/auth/login"))).toHaveLength(1);
    expect(JSON.parse(calls[0]!.body!)).toEqual({ email: "ai@x", password: "pw" });
    expect(calls[1]!.auth).toMatch(/^Bearer x\..+#1$/);

    reject = true;
    const r = await b.call("GET", "/users", null, { token: SERVICE_ACCOUNT });
    expect(r.ok).toBe(true);
    expect(calls.filter((c) => c.url.endsWith("/auth/login"))).toHaveLength(2);
    expect(calls.at(-1)!.auth).toMatch(/#2$/);

    // A person's own token passes straight through.
    await b.call("GET", "/users/me", null, { token: "their-token" });
    expect(calls.at(-1)!.auth).toBe("Bearer their-token");
  });
});
