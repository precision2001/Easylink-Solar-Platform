import { z } from "zod";
import type { ModelClient } from "../ai/model.js";

/**
 * Roof faces read from a zoom-21 satellite image by the smart model
 * (Claude Opus 5.5, Sydney). The EasyLink Roof Designer (website,
 * src/lib/roof-design) asks for this as one more reading of a roof and scores
 * it on the same priority tests as its other readings — Google's segments,
 * then the image both ways — after moving its lines onto the edges seen in the
 * image. The AI never has the last word on a line: the image does.
 *
 * Checked on three roofs drawn by hand (8 Nov 2026, Opus 5.5, effort high):
 * every face found (4/4, 6/6, 10/10), faces overlapping the drawn ones 75–93%
 * on the simpler two, corners typically 0.2–0.4 m out (worst 1.4 m on a
 * ten-face roof) — inside the ±1.2 m the line check corrects.
 */

export const ROOF_FACES_SYSTEM = `You map residential roofs in Sydney, Australia for solar panel layout, from zoom-21 satellite images (north is up).
A FACE is one continuous sloped plane of roofing. Bound each face by the lines you can SEE in the image: eaves (roof edge), hips, ridges, valleys, and steps between levels. Rules:
- Find every face of the main house roof under the centre of the image, including narrow strips and small triangles. Light or dark strips between faces are separate faces.
- Never merge two faces across a hip, valley or ridge. Never include neighbouring buildings, patios, carports, verandahs or flat roofs that are not part of the main tiled/sheet roof.
- Hips usually run at 45 degrees to the walls in plan. Corners sit exactly where two visible lines meet; adjacent faces share corner points exactly.
- Faces turned north and west are usually lighter in Sydney; shading helps tell faces apart.
- Coordinates are image pixels: x from the left edge, y from the top edge.
Answer with JSON only: {"walls_deg": <compass bearing of the main wall direction>, "faces":[{"name":"...","facing":"N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW or a bearing in degrees","ring":[[x,y],...]}], "notes":"..."}`;

export const RoofFacesRequest = z.object({
  /** The image, base64 (PNG, JPEG or WebP), at most about 3.75 MB once decoded. */
  imageBase64: z.string().min(100).max(5_000_000),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  widthPx: z.number().int().min(64).max(4096),
  heightPx: z.number().int().min(64).max(4096),
  /** Ground size of one pixel, when known (shown to the model; used to drop slivers). */
  metresPerPixel: z.number().positive().max(1).optional(),
  /** Free text for the model, e.g. the address or "terrace: stay between the party walls". */
  hint: z.string().max(500).optional(),
});
export type RoofFacesRequest = z.infer<typeof RoofFacesRequest>;

export type RoofFaceReading = {
  name: string;
  /** Compass bearing the face slopes down towards (0 = north), when the model gave one. */
  bearingDeg: number | null;
  /** Corners in image pixels. */
  ring: [number, number][];
};

export type RoofFacesResult = {
  faces: RoofFaceReading[];
  wallsDeg: number | null;
  notes: string;
  usage: { inputTokens: number; outputTokens: number };
};

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** "NNE" → 22.5, "135" → 135, anything else → null. */
export function bearingOf(facing: unknown): number | null {
  if (typeof facing === "number" && Number.isFinite(facing)) return ((facing % 360) + 360) % 360;
  if (typeof facing !== "string") return null;
  const t = facing.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
  const i = COMPASS.indexOf(t);
  if (i >= 0) return i * 22.5;
  const n = Number(t);
  return t !== "" && Number.isFinite(n) ? ((n % 360) + 360) % 360 : null;
}

/** The JSON object in a model reply (it may come wrapped in a code fence or a sentence). */
export function jsonIn(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function areaPx(ring: [number, number][]): number {
  let a = 0;
  ring.forEach(([x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length] ?? ring[0]!;
    a += x1 * y2 - x2 * y1;
  });
  return Math.abs(a) / 2;
}

/**
 * Faces from a model reply, cleaned: corners inside the image, at least three
 * distinct corners, no slivers (under 0.5 m², or 500 px² when the scale is
 * unknown), at most 40 faces of 40 corners.
 */
export function cleanFaces(raw: unknown, req: Pick<RoofFacesRequest, "widthPx" | "heightPx" | "metresPerPixel">): Omit<RoofFacesResult, "usage"> {
  const obj = (raw && typeof raw === "object" ? raw : {}) as { faces?: unknown; walls_deg?: unknown; notes?: unknown };
  const list = Array.isArray(obj.faces) ? obj.faces.slice(0, 40) : [];
  const minArea = req.metresPerPixel ? 0.5 / (req.metresPerPixel * req.metresPerPixel) : 500;
  const faces: RoofFaceReading[] = [];
  for (const f of list) {
    const ringIn = (f as { ring?: unknown })?.ring;
    if (!Array.isArray(ringIn)) continue;
    const ring: [number, number][] = [];
    for (const p of ringIn.slice(0, 40)) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const x = Number(p[0]);
      const y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const q: [number, number] = [Math.min(req.widthPx, Math.max(0, x)), Math.min(req.heightPx, Math.max(0, y))];
      const last = ring[ring.length - 1];
      if (!last || last[0] !== q[0] || last[1] !== q[1]) ring.push(q);
    }
    const first = ring[0];
    const lastPt = ring[ring.length - 1];
    if (ring.length > 1 && first && lastPt && first[0] === lastPt[0] && first[1] === lastPt[1]) ring.pop();
    if (ring.length < 3 || areaPx(ring) < minArea) continue;
    const name = typeof (f as { name?: unknown }).name === "string" ? String((f as { name: string }).name).slice(0, 80) : `Face ${faces.length + 1}`;
    faces.push({ name, bearingDeg: bearingOf((f as { facing?: unknown }).facing), ring });
  }
  return {
    faces,
    wallsDeg: bearingOf(obj.walls_deg),
    notes: typeof obj.notes === "string" ? obj.notes.slice(0, 1000) : "",
  };
}

/** Ask the smart model for the faces of the roof in the image. */
export async function readRoofFaces(model: ModelClient, req: RoofFacesRequest): Promise<RoofFacesResult> {
  const scale = req.metresPerPixel ? `, about ${(req.metresPerPixel * 100).toFixed(1)} cm per pixel` : "";
  const turn = await model.converse({
    tier: "smart",
    effort: "high",
    maxTokens: 6000,
    system: ROOF_FACES_SYSTEM,
    messages: [
      {
        role: "user",
        image: { format: req.format, bytes: Buffer.from(req.imageBase64, "base64") },
        text: `This image is ${req.widthPx} x ${req.heightPx} pixels${scale}. Map every face of the main house roof.${req.hint ? ` ${req.hint}` : ""} JSON only.`,
      },
    ],
  });
  return { ...cleanFaces(jsonIn(turn.text), req), usage: turn.usage };
}
