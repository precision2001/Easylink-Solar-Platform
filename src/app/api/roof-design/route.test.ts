import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const req = (headers: Record<string, string>, body: unknown = { lat: -33.8, lng: 151 }) =>
  new Request("http://localhost/api/roof-design", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

afterEach(() => {
  delete process.env.ROOF_DESIGN_API_KEYS;
});

describe("POST /api/roof-design", () => {
  it("is off for outside systems until keys are configured", async () => {
    expect((await POST(req({}))).status).toBe(503);
  });

  it("needs a valid key", async () => {
    process.env.ROOF_DESIGN_API_KEYS = "key-aaaaaaaaaaaaaaaa,key-bbbbbbbbbbbbbbbb";
    expect((await POST(req({}))).status).toBe(401);
    expect((await POST(req({ "x-api-key": "key-cccccccccccccccc" }))).status).toBe(401);
  });

  it("asks for a location", async () => {
    process.env.ROOF_DESIGN_API_KEYS = "key-aaaaaaaaaaaaaaaa";
    const r = await POST(req({ authorization: "Bearer key-aaaaaaaaaaaaaaaa" }, { foo: 1 }));
    expect(r.status).toBe(400);
  });
});

describe("POST /api/roof-design callers", () => {
  it("lets the platform's own pages call without a key", async () => {
    const r = await POST(req({ origin: "http://localhost", host: "localhost" }, { foo: 1 }));
    expect(r.status).toBe(400); // past the gate, asked for a location
  });

  it("lets a listed outside website call from the browser, with CORS", async () => {
    process.env.ROOF_DESIGN_API_ORIGINS = "https://partner.example.com.au";
    const r = await POST(req({ origin: "https://partner.example.com.au" }, { foo: 1 }));
    expect(r.status).toBe(400);
    expect(r.headers.get("access-control-allow-origin")).toBe("https://partner.example.com.au");
    const other = await POST(req({ origin: "https://other.example.com" }, { foo: 1 }));
    expect([401, 503]).toContain(other.status);
    delete process.env.ROOF_DESIGN_API_ORIGINS;
  });
});
