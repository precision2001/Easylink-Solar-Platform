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

const traced = JSON.stringify({
  walls_deg: 27,
  no_roof: false,
  buildings: [
    {
      name: "House",
      main: true,
      flat: false,
      outline: [[100, 100], [500, 100], [500, 400], [100, 400]],
      points: [
        { id: "A", x: 100, y: 100 }, { id: "B", x: 500, y: 100 }, { id: "C", x: 500, y: 400 }, { id: "D", x: 100, y: 400 },
        { id: "R1", x: 250, y: 250 }, { id: "R2", x: 350, y: 250 }, { id: "R2", x: 9, y: 9 },
      ],
      lines: [
        { from: "A", to: "R1", kind: "hip", seen: "clear" },
        { from: "R1", to: "R2", kind: "ridge", seen: "clear" },
        { from: "C", to: "R2", kind: "hip", seen: "faint" },
        { from: "A", to: "NOPE", kind: "hip" },
      ],
      faces: [
        { name: "North", facing: "N", points: ["A", "B", "R2", "R1"] },
        { name: "East", facing: "E", points: ["B", "C", "R2"] },
        { name: "South", facing: "S", points: ["C", "D", "R1", "R2"] },
        { name: "West", facing: "W", points: ["D", "A", "R1"] },
      ],
      obstructions: [{ kind: "vent", ring: [[300, 300], [310, 300], [310, 310], [300, 310]] }],
    },
  ],
  notes: "Hip roof.",
});

describe("the full trace (visible lines and intersection points first)", () => {
  it("builds faces from shared intersection points, keeps lines and obstructions", () => {
    const r = cleanFaces(JSON.parse(traced), body);
    expect(r.buildings).toHaveLength(1);
    const b = r.buildings[0]!;
    expect(b.points.map((p) => p.id)).toEqual(["A", "B", "C", "D", "R1", "R2"]); // a repeated id is dropped
    expect(b.lines).toHaveLength(3); // a line to an unknown point is dropped
    expect(b.lines[2]?.seen).toBe("faint");
    expect(b.faces[0]?.ring).toEqual([[100, 100], [500, 100], [350, 250], [250, 250]]);
    // Neighbouring faces share the very same corner.
    expect(b.faces[1]?.ring[2]).toEqual(b.faces[0]?.ring[2]);
    expect(b.obstructions[0]?.kind).toBe("vent");
    expect(r.faces).toHaveLength(4);
    expect(r.noRoof).toBe(false);
  });

  it("reads 'no roof' (bare ground, a yard)", () => {
    const r = cleanFaces({ no_roof: true, buildings: [] }, body);
    expect(r.noRoof).toBe(true);
    expect(r.faces).toEqual([]);
  });

  it("puts every rule in the instructions", async () => {
    const { ROOF_FACES_SYSTEM } = await import("../src/roof/faces.js");
    for (const rule of ["VISIBLE LINES AND VISIBLE INTERSECTION POINTS FIRST", "BORDERS", "FLAT OR LOW-PITCH", "faint", "SHADOWS POINT TO ROOF LINES", "OBSTRUCTIONS", "no_roof", "site"]) {
      expect(ROOF_FACES_SYSTEM).toContain(rule);
    }
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
    expect(decisions[0]?.reasoningSummary).toContain("2 faces");
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

  it("sends the boosted-contrast view as a second image, with the lot and the scope", async () => {
    const { c } = setup([{ text: traced }]);
    const app = createApp(c);
    const r = await app.request("/v1/roof/faces", {
      method: "POST",
      headers: KEY,
      body: JSON.stringify({ ...body, contrastBase64: IMG, lot: [[0, 0], [640, 0], [640, 640]], scope: "site" }),
    });
    const { data } = (await r.json()) as { data: { id: string } };
    const calls = (c.model as unknown as { calls: { messages: { images?: unknown[]; text?: string }[] }[] }).calls;
    expect(calls[0]?.messages[0]?.images).toHaveLength(1);
    expect(calls[0]?.messages[0]?.text).toContain("EVERY building");
    expect(calls[0]?.messages[0]?.text).toContain("land lot");
    const got = (await (await app.request(`/v1/roof/faces/${data.id}`, { headers: KEY })).json()) as { data: { buildings: { lines: unknown[] }[] } };
    expect(got.data.buildings[0]?.lines).toHaveLength(3);
  });

  it("sends a second aerial photo of the same frame (NSW), stored with the reading, with its note", async () => {
    const { c } = setup([{ text: traced }, { text: traced }]);
    const app = createApp(c);
    await app.request("/v1/roof/faces", {
      method: "POST",
      headers: KEY,
      body: JSON.stringify({ ...body, contrastBase64: IMG, secondImageBase64: IMG, secondImageNote: "NSW Spatial Services, flown 2022-05-01, 7 cm", review: 0 }),
    });
    const calls = (c.model as unknown as { calls: { messages: { images?: unknown[]; text?: string }[] }[] }).calls;
    expect(calls[0]?.messages[0]?.images).toHaveLength(2);
    expect(calls[0]?.messages[0]?.text).toContain("third image is another aerial photo of the same frame (NSW Spatial Services, flown 2022-05-01, 7 cm)");
    expect(calls[0]?.messages[0]?.text).toContain("follow the first");
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
