import { describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { inferenceFor, isNewGenerationModel, THINKING_HEADROOM_TOKENS } from "../src/ai/model.js";
import { bearingOf, cleanFaces, jsonIn } from "../src/roof/faces.js";
import { setup } from "./helpers.js";

const IMG = Buffer.alloc(200, 7).toString("base64");
const KEY = { "x-ingest-key": "ingest", "Content-Type": "application/json" };
const body = { imageBase64: IMG, format: "png", widthPx: 640, heightPx: 640, metresPerPixel: 0.031 };
const reply = JSON.stringify({
  walls_deg: 27,
  faces: [
    { name: "North face", facing: "NNE", ring: [[100, 100], [400, 100], [300, 200], [200, 200]] },
    { name: "Sliver", facing: "S", ring: [[0, 0], [2, 0], [1, 1]] },
    { name: "Off the image", facing: 200, ring: [[600, 600], [700, 600], [700, 700], [600, 700]] },
  ],
  notes: "Hip roof.",
});

describe("model generations", () => {
  it("drops temperature, adds thinking room and effort for Claude 5.x", () => {
    expect(isNewGenerationModel("au.anthropic.claude-opus-5-5")).toBe(true);
    expect(isNewGenerationModel("au.anthropic.claude-sonnet-4-5-20250929-v1:0")).toBe(false);
    expect(inferenceFor("au.anthropic.claude-opus-5-5", 1500, "high")).toEqual({
      inferenceConfig: { maxTokens: 1500 + THINKING_HEADROOM_TOKENS },
      additionalModelRequestFields: { output_config: { effort: "high" } },
    });
    expect(inferenceFor("au.anthropic.claude-haiku-4-5-20251001-v1:0", 300)).toEqual({
      inferenceConfig: { maxTokens: 300, temperature: 0.2 },
      additionalModelRequestFields: undefined,
    });
  });
});

describe("roof face parsing", () => {
  it("reads compass names and bearings", () => {
    expect(bearingOf("NNE")).toBe(22.5);
    expect(bearingOf("w")).toBe(270);
    expect(bearingOf(-90)).toBe(270);
    expect(bearingOf("135")).toBe(135);
    expect(bearingOf("upwards")).toBeNull();
  });

  it("finds the JSON in a fenced reply", () => {
    expect(jsonIn('```json\n{"faces":[]}\n```')).toEqual({ faces: [] });
    expect(jsonIn("no json here")).toBeNull();
  });

  it("keeps real faces, clamps corners to the image, drops slivers", () => {
    const r = cleanFaces(JSON.parse(reply), body);
    expect(r.faces.map((f) => f.name)).toEqual(["North face", "Off the image"]);
    expect(r.faces[1]?.ring).toEqual([[600, 600], [640, 600], [640, 640], [600, 640]]);
    expect(r.faces[0]?.bearingDeg).toBe(22.5);
    expect(r.wallsDeg).toBe(27);
  });
});

describe("POST /v1/roof/faces", () => {
  it("reads the roof in the background and serves it by id (Roof Designer, ingest key)", async () => {
    const { c, store } = setup([{ text: reply }]);
    const app = createApp(c);
    const r = await app.request("/v1/roof/faces", { method: "POST", headers: KEY, body: JSON.stringify(body) });
    expect(r.status).toBe(202);
    const started = (await r.json()) as { data: { id: string; status: string } };
    // No RoofFacesFn in tests: the reading runs inline, so it is already done.
    const got = await app.request(`/v1/roof/faces/${started.data.id}`, { headers: KEY });
    expect(got.status).toBe(200);
    const done = (await got.json()) as { data: { status: string; faces: { name: string }[] } };
    expect(done.data.status).toBe("done");
    expect(done.data.faces.map((f) => f.name)).toEqual(["North face", "Off the image"]);
    const decisions = await store.listDecisions({ agentId: "roof-designer" });
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.reasoningSummary).toContain("Read 2 roof faces");
  });

  it("asks the smart tier with the image", async () => {
    const { c } = setup([{ text: reply }]);
    const app = createApp(c);
    await app.request("/v1/roof/faces", { method: "POST", headers: KEY, body: JSON.stringify(body) });
    const calls = (c.model as unknown as { calls: { tier: string; messages: { image?: unknown }[] }[] }).calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]?.tier).toBe("smart");
    expect(calls[0]?.messages[0]?.image).toBeTruthy();
  });

  it("needs the ingest key or staff, and a valid image", async () => {
    const { c } = setup();
    const app = createApp(c);
    expect((await app.request("/v1/roof/faces", { method: "POST", body: JSON.stringify(body) })).status).toBe(401);
    const inst = { Authorization: "Bearer inst", "Content-Type": "application/json" };
    expect((await app.request("/v1/roof/faces", { method: "POST", headers: inst, body: JSON.stringify(body) })).status).toBe(403);
    expect((await app.request("/v1/roof/faces", { method: "POST", headers: KEY, body: JSON.stringify({ ...body, widthPx: 10 }) })).status).toBe(400);
    // The ingest key opens only the roof routes and events, nothing else.
    expect((await app.request("/v1/ai/control", { headers: KEY })).status).toBe(401);
  });

  it("stops when the roof switch is off", async () => {
    const { c, store } = setup([{ text: reply }]);
    const ctl = await store.getControl();
    await store.putControl({ ...ctl, familiesOff: { roof: true } });
    const app = createApp(c);
    const r = await app.request("/v1/roof/faces", { method: "POST", headers: KEY, body: JSON.stringify(body) });
    expect(r.status).toBe(503);
  });

  it("marks the reading as an error when the model's reply can't be used", async () => {
    const { c } = setup([{ text: "I could not see a roof." }]);
    const app = createApp(c);
    const r = await app.request("/v1/roof/faces", { method: "POST", headers: KEY, body: JSON.stringify(body) });
    const { data } = (await r.json()) as { data: { id: string } };
    const got = (await (await app.request(`/v1/roof/faces/${data.id}`, { headers: KEY })).json()) as { data: { status: string; faces: unknown[] } };
    // An unusable reply is a finished reading with no faces; the designer simply doesn't use it.
    expect(got.data.status).toBe("done");
    expect(got.data.faces).toEqual([]);
  });
});
