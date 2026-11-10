import { z } from "zod";
import type { ChatMessage, ModelClient } from "../ai/model.js";
import { lineEvidence } from "./lineEvidence.js";
import { checkByCloseups, confirmPoints, enlargeRegion, mapBuildings } from "./refine.js";
import { placeIntersections } from "./intersections.js";
import { decodePng, encodePng, traceOverlay } from "./overlay.js";

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

export const ROOF_FACES_SYSTEM = `You trace roofs in Sydney, Australia for solar panel layout, from zoom-21 satellite images (north is up). EasyLink's roof rules, in priority order — follow every one:

1. INTERSECTION POINTS FIRST — THE INTERSECTION RULE (the first rule, above all others). Find and place the intersection points of the roof before anything else. Corners are calculated, never placed by eye: for each point, follow every line that meets there along its CLEAR length, away from the blurred corner — an eave from inside the tiles outwards (the shadow beside the house is not roof; skip the thin gutter line: the edge is where the tiles start), a hip, ridge or valley where the two faces' tiles meet — and put the point where those lines, extended straight, cross. If an edge can't be followed, put the point on the last pixel that is clearly tile and mark its lines "seen":"faint" for a site check. (After you answer, every line is measured along its length and every point is recalculated as the crossing of the fitted lines, then checked on a close-up and confirmed on its own before the lines are joined.)
2. VISIBLE LINES (rule 1 continued). Before naming any face, find every roof line you can SEE: eaves (roof edges), hips, ridges, valleys, steps between levels, the edges of raised boxes and parapets. Mark every point where two or more of those lines meet, or where a line meets the roof's border: these are the intersection points. Each intersection point is ONE point shared by every line that meets there — give it one id and reuse it. Lines run straight from intersection point to intersection point; trace them on the line seen in the image, not where geometry says they should be.
3. BORDERS. Trace the border (outline) of every roof along its eaves, with straight walls and a corner wherever two eaves meet. Then every face gets its own border made of those lines. The border takes in roof surface only: never a courtyard, light well, void, balcony, terrace, pool, ground or the gap beside a lower roof, even where the roof wraps around it; step the border in around them.
4. FACES FROM THE LINES. A face is one continuous plane bounded by the lines in rule 1. Find every face, including narrow strips and small triangles (a light or dark strip between faces is its own face). Never merge faces across a hip, valley or ridge. Adjacent faces share their corner points exactly.
5. FLAT OR LOW-PITCH ROOFS (white or grey metal sheet, under about 5 degrees). There are no hips. A flat roof is ONE face unless a visible line runs between two intersection points: split ONLY where the image shows that line. No visible line connecting two intersection points means no split. Sections of a flat roof are the closed shapes the visible lines make (steps across the roof, raised boxes, folds).
6. PITCHED ROOFS (tiles or pitched metal). A hip, valley or ridge the roof's shape requires stays even where it shows only faintly (two faces lit alike) — mark it "seen":"faint" so it is checked on site. Never drop it: a panel must never sit across one. Hips usually run at 45 degrees to the walls in plan; a hip end and a gable end look different (a gable end has no hip lines and a straight eave across the end) — read which one the image shows.
7. SHADOWS POINT TO ROOF LINES. A shadow on a roof means something higher stands beside it, on the sun side (north). Trace the edge that casts the shadow. If that edge meets the border or another roof line at an intersection point, it IS a roof line (a step, a raised box, a parapet): trace the whole section with all its corners. Only a shadow whose casting edge connects to no other line is an obstruction (vent, whirlybird, air-conditioner, antenna). A shadow cast by something off the roof (a tree, a neighbour's wall) is "shading", not a line.
8. OBSTRUCTIONS. Mark every vent, whirlybird, flue, antenna, skylight, air-conditioner, rooftop plant and existing solar panel as an obstruction with its true shape.
9. WHAT IS AND ISN'T THE ROOF. Never include neighbouring buildings, or roofs across the land lot line when a lot is given. A terrace or attached house is only the strip between its party walls. Patios, carports and verandahs at a lower level are separate roofs, not part of the main roof. Bare ground, yards, building sites and car parks are NOT roofs: if there is no building roof where asked, say so with "no_roof": true.
10. WHICH BUILDINGS. When the request says "site", trace EVERY building on the land lot, each with its own border, lines, points, faces and obstructions. Otherwise trace the building under the centre of the image only.

WORKED EXAMPLES (traced by EasyLink's owner; follow the same reading):
A. Flat metal townhouse row (66 Frances St, Lidcombe): a long rectangle of white sheet roof, 5 units. Each unit has a RAISED BOX against the left eave: its top edge casts a dark wedge shadow onto the roof below (the wedge starts wide at the eave and tapers to a point about 6 m in); its other sides are thin light lines best seen in the contrast image. Correct trace: each box is its own section with all 4 corners (top-left on the eave, top-right where the wedge ends, bottom-right, bottom-left on the eave; where a box's bottom meets a line across the roof, that corner is shared). Only TWO lines cross the full width (eave to eave), each just below one of the first two wedges, along the thin light line where the roof steps down. The other wedges do NOT continue across the roof. Result: 3 main sections + 4 boxes = 7 faces, 18 intersection points. Wrong reading (do not do this): drawing every wedge as a full-width step line.
B. Pitched hip roof with a wing (12 Fursorb St, Marayong): main hip roof whose ridge F-G runs between two hip junctions; from G hips go to the north, east and south corners. The ridge's west end F is a junction of five lines: the ridge, a valley down-left to the wing's inner corner K, a line straight down to the eave beside a lower box, and two lines west into the wing. The north-west wing has a stepped north eave and two narrow strips between parallel lines (each strip its own face). The south-west wing ends in a HIP end (hips from both outer corners meet at K), not a gable. Correct trace: 13 marked intersection points, 14 interior lines, 11 faces including the narrow strips. Wrong readings: merging the narrow strips into the faces beside them; a gable at the wing's end.

C. Hip roof with a front wing, house under construction (53 Turffontein Ave, Box Hill): a main hip roof (ridge between two hip junctions; hips from the top junction to the north and east corners, from the lower junction to the west corner) and a smaller FRONT WING at the south-west with its own hip end. The wing's ridge is a short continuation of the main ridge after a JOG: the main ridge ends at a junction, a hip runs from there down to a second junction, and the wing's ridge continues from that second junction. A VALLEY runs from that second junction to the inner corner of the eave where the wing steps in, and a narrow strip face lies between the valley and the wing's hip. The wing's hip end has hips from its two outer corners meeting at the wing ridge's end. Correct trace: 10 intersection points, 6 eaves (the eave steps in twice at the wing), 6 faces — the main roof's north hip end, west face and long east face (which runs down past the wing), the face between the main ridge and the valley, the narrow strip, and the wing's hip end. Wrong reading (do not do this): one simple hip roof with four faces drawn across the wing.

The second image, when given, is the same view with local contrast boosted: faint lines on white or metal roofs (box edges, light step lines) show clearly there. Use it to find lines; give coordinates in the first image's pixels (the two images line up exactly).
Coordinates are image pixels: x from the left edge, y from the top edge. Be precise: about 3 cm per pixel, and lines must land within 3 pixels of the line in the image.

Answer with JSON only:
{"walls_deg": <compass bearing of the main wall direction>,
 "no_roof": false,
 "buildings": [{
   "name": "...", "main": true, "flat": false,
   "outline": [[x,y],...],
   "points": [{"id":"P1","x":0,"y":0}],
   "lines": [{"from":"P1","to":"P2","kind":"eave|hip|ridge|valley|step|box|parapet|fold","seen":"clear|faint"}],
   "faces": [{"name":"...","facing":"N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW|flat or a bearing in degrees","points":["P1","P2","P3"]}],
   "obstructions": [{"kind":"vent|whirlybird|flue|antenna|skylight|aircon|plant|panels|shading","ring":[[x,y],...]}]
 }],
 "notes": "..."}`;

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
  /** The same view with local contrast boosted (same size and format), for faint lines on white or metal roofs. */
  contrastBase64: z.string().min(100).max(5_000_000).optional(),
  /**
   * A second aerial photo of the same frame from another source (NSW Spatial
   * Services), moved onto the first so the same pixel is the same spot, and
   * a short note of what it is (source, capture date, pixel size).
   */
  secondImageBase64: z.string().min(100).max(5_000_000).optional(),
  secondImageNote: z.string().max(300).optional(),
  /** The land lot in image pixels: nothing outside it is traced. */
  lot: z.array(z.tuple([z.number(), z.number()])).min(3).max(400).optional(),
  /** "house": the building at the centre (default); "site": every building on the lot. */
  scope: z.enum(["house", "site"]).default("house"),
  /** Rounds of self-check: Opus sees its trace drawn on the photo and corrects it (0 = none). */
  review: z.number().int().min(0).max(3).default(2),
  /**
   * After the self-check: every point placed on a 4× close-up of itself, then
   * each line snapped onto the photo's edge within 30 cm (owner, 10 Nov 2026).
   */
  refine: z.boolean().optional(),
});
export type RoofFacesRequest = z.infer<typeof RoofFacesRequest>;

export type RoofFaceReading = {
  name: string;
  /** Compass bearing the face slopes down towards (0 = north), when the model gave one. */
  bearingDeg: number | null;
  /** Corners in image pixels. */
  ring: [number, number][];
};

export type RoofPoint = { id: string; x: number; y: number };
export type RoofLine = { from: string; to: string; kind: string; seen: "clear" | "faint" };
export type RoofObstructionReading = { kind: string; ring: [number, number][] };
export type RoofBuilding = {
  name: string;
  main: boolean;
  flat: boolean;
  outline: [number, number][];
  points: RoofPoint[];
  lines: RoofLine[];
  faces: RoofFaceReading[];
  obstructions: RoofObstructionReading[];
};

/** What the steps after the self-check did. */
export type RefineReport = { sections: number; calculated: number; marked: number; closeupFlags: number; notConfirmed: number };

export type RoofFacesResult = {
  /** Every face of every building (kept for readers that only use faces). */
  faces: RoofFaceReading[];
  buildings: RoofBuilding[];
  noRoof: boolean;
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

const MAX_BUILDINGS = 12;

/** A ring of [x, y] pixel points, clamped to the image, without repeats; null when unusable. */
function cleanRing(raw: unknown, W: number, H: number, max = 60): [number, number][] | null {
  if (!Array.isArray(raw)) return null;
  const ring: [number, number][] = [];
  for (const p of raw.slice(0, max)) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const q: [number, number] = [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y))];
    const last = ring[ring.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) ring.push(q);
  }
  const first = ring[0];
  const lastPt = ring[ring.length - 1];
  if (ring.length > 1 && first && lastPt && first[0] === lastPt[0] && first[1] === lastPt[1]) ring.pop();
  return ring.length >= 3 ? ring : null;
}

const str = (v: unknown, max: number, dflt: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : dflt);

/**
 * The reading from a model reply, cleaned: buildings with their outline,
 * intersection points, lines, faces (built from the shared points) and
 * obstructions; corners inside the image; no slivers (under 0.5 m², or 500 px²
 * when the scale is unknown). A reply in the older shape (top-level faces with
 * rings) is read as one building.
 */
export function cleanFaces(raw: unknown, req: Pick<RoofFacesRequest, "widthPx" | "heightPx" | "metresPerPixel">): Omit<RoofFacesResult, "usage"> {
  const W = req.widthPx;
  const H = req.heightPx;
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const minArea = req.metresPerPixel ? 0.5 / (req.metresPerPixel * req.metresPerPixel) : 500;
  const facesOf = (list: unknown, pts: Map<string, [number, number]>): RoofFaceReading[] => {
    const out: RoofFaceReading[] = [];
    for (const f of Array.isArray(list) ? list.slice(0, 60) : []) {
      const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
      let ring: [number, number][] | null = null;
      if (Array.isArray(o.points)) {
        const r = (o.points as unknown[]).map((id) => pts.get(String(id))).filter((p): p is [number, number] => Boolean(p));
        ring = cleanRing(r, W, H);
      }
      if (!ring) ring = cleanRing(o.ring, W, H);
      if (!ring || areaPx(ring) < minArea) continue;
      out.push({ name: str(o.name, 80, `Face ${out.length + 1}`), bearingDeg: bearingOf(o.facing), ring });
    }
    return out;
  };
  const buildings: RoofBuilding[] = [];
  for (const bRaw of Array.isArray(obj.buildings) ? obj.buildings.slice(0, MAX_BUILDINGS) : []) {
    const b = (bRaw && typeof bRaw === "object" ? bRaw : {}) as Record<string, unknown>;
    const points: RoofPoint[] = [];
    const pts = new Map<string, [number, number]>();
    for (const pRaw of Array.isArray(b.points) ? b.points.slice(0, 300) : []) {
      const p = (pRaw && typeof pRaw === "object" ? pRaw : {}) as Record<string, unknown>;
      const id = String(p.id ?? "");
      const x = Number(p.x);
      const y = Number(p.y);
      if (!id || pts.has(id) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      const q: [number, number] = [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y))];
      pts.set(id, q);
      points.push({ id, x: q[0], y: q[1] });
    }
    const lines: RoofLine[] = [];
    for (const lRaw of Array.isArray(b.lines) ? b.lines.slice(0, 400) : []) {
      const l = (lRaw && typeof lRaw === "object" ? lRaw : {}) as Record<string, unknown>;
      const from = String(l.from ?? "");
      const to = String(l.to ?? "");
      if (!pts.has(from) || !pts.has(to) || from === to) continue;
      lines.push({ from, to, kind: str(l.kind, 20, "line"), seen: l.seen === "faint" ? "faint" : "clear" });
    }
    const faces = facesOf(b.faces, pts);
    const outline = cleanRing(b.outline, W, H, 120);
    const obstructions: RoofObstructionReading[] = [];
    for (const oRaw of Array.isArray(b.obstructions) ? b.obstructions.slice(0, 80) : []) {
      const o = (oRaw && typeof oRaw === "object" ? oRaw : {}) as Record<string, unknown>;
      const ring = cleanRing(o.ring, W, H, 40);
      if (ring) obstructions.push({ kind: str(o.kind, 20, "obstruction"), ring });
    }
    if (!outline && faces.length === 0) continue;
    buildings.push({
      name: str(b.name, 80, `Building ${buildings.length + 1}`),
      main: b.main === true,
      flat: b.flat === true,
      outline: outline ?? [],
      points,
      lines,
      faces,
      obstructions,
    });
  }
  // The older reply shape: faces with rings at the top level.
  if (buildings.length === 0 && Array.isArray(obj.faces)) {
    const faces = facesOf(obj.faces, new Map());
    if (faces.length) buildings.push({ name: "Main roof", main: true, flat: false, outline: [], points: [], lines: [], faces, obstructions: [] });
  }
  if (buildings.length && !buildings.some((b) => b.main)) buildings[0]!.main = true;
  return {
    faces: buildings.flatMap((b) => b.faces).slice(0, 120),
    buildings,
    noRoof: obj.no_roof === true && buildings.length === 0,
    wallsDeg: bearingOf(obj.walls_deg),
    notes: typeof obj.notes === "string" ? obj.notes.slice(0, 1000) : "",
  };
}

export const ROOF_REVIEW_TEXT = (list: string, unseen = "") => `The last image is YOUR trace drawn on the same photo: border magenta, clear lines yellow, faint lines orange dashed, intersection points cyan with their number. Check it against the photo, at full detail, one item at a time:
1. Every intersection point must sit exactly where its lines meet in the photo (a corner, the end of a hip, ridge or valley, a box corner, where a step line meets the border). Move any point that is off by more than 3 pixels. One shared point per junction: all its lines end there.
2. Every line must lie on a roof line you can see in the photo (either image). A line drawn across plain roof is wrong: move its points onto the real line, or remove it (a flat roof can have no split).
3. Add every visible roof line and intersection point you missed: box edges, step lines, hips, valleys, ridges, parapets, and the lines a shadow edge shows (rule 7).
4. The border must follow the roof edge on every side, inside the walls and gutters, with corners on the real corners.
5. Nothing that isn't roof may be inside the border or a face: courtyards, light wells, voids, balconies, terraces, pools, ground, gaps between buildings, a lower roof's dark gap, neighbours' roofs. Look along every side of the border: where it crosses or takes in something dark or open that isn't roof surface, move it back onto the roof's own edge (the parapet line), adding corners where the roof steps in. New panels will be laid on every face exactly as drawn, so a face over a courtyard puts panels over the courtyard.
6. Every part of the roof must be inside a face: look along the whole building for wings, lower roofs, porch and garage roofs, and each slope of a hip. A wing with its own hips or ridge gets its own faces, its own ridge and hips, and its corners on its own eaves; never one big face drawn across two roofs, and never a corner placed in the middle of another roof.
7. Faces must be rebuilt from the corrected points and lines.
${unseen ? `Lines NOT on any edge the photo shows (checked pixel by pixel along each line): ${unseen}. Each is wrong as drawn: move its points onto the edge the photo shows (the parapet line, the roof's own edge, the real hip, ridge or valley), or remove it if there is no such line. A border side must run along the roof's edge, never straight across roof or across a courtyard.
` : ""}Points by number: ${list}
Reply with the full corrected trace in the same JSON shape (all buildings, points, lines, faces, obstructions). JSON only.`;

const roundPts = (r: Omit<RoofFacesResult, "usage">) => r.buildings.flatMap((b) => b.points.map((p) => [p.x, p.y] as [number, number]));

/** How far the points moved between two readings: the mean distance from each new point to the nearest old one (px). */
export function traceShift(a: Omit<RoofFacesResult, "usage">, b: Omit<RoofFacesResult, "usage">): number {
  const A = roundPts(a);
  const B = roundPts(b);
  if (!A.length || !B.length) return Infinity;
  const d = B.map(([x, y]) => Math.min(...A.map(([u, v]) => Math.hypot(x - u, y - v))));
  return d.reduce((s, v) => s + v, 0) / d.length + Math.abs(A.length - B.length) * 5;
}

/** Ask the smart model for the faces of the roof in the image, then have it check its trace against the photo. */
/** Self-check rounds while lines aren't on edges the photo shows. */
export const REVIEW_MAX = 4;

export async function readRoofFaces(model: ModelClient, req: RoofFacesRequest, budgetMs = 360_000): Promise<RoofFacesResult & { reviews: number; refined?: RefineReport }> {
  const t0 = Date.now();
  const scale = req.metresPerPixel ? `, about ${(req.metresPerPixel * 100).toFixed(1)} cm per pixel` : "";
  const scope =
    req.scope === "site"
      ? "Trace EVERY building on the land lot (scope: site)."
      : "Trace the building under the centre of the image (scope: house).";
  const lot = req.lot?.length ? ` The land lot, in image pixels: ${JSON.stringify(req.lot.map(([x, y]) => [Math.round(x), Math.round(y)]))}. Trace nothing outside it.` : "";
  const contrast = req.contrastBase64 ? " The second image is the same view with local contrast boosted." : "";
  const second = req.secondImageBase64
    ? ` The ${req.contrastBase64 ? "third" : "second"} image is another aerial photo of the same frame${req.secondImageNote ? ` (${req.secondImageNote})` : ""}, lined up with the first. Use it to confirm lines, corners and edges that are faint, hidden by shade or blurred in the first; trace what the first photo shows, and if a building or roof part was added, removed or changed between the two, follow the first and say so in notes.`
    : "";
  const photo = Buffer.from(req.imageBase64, "base64");
  const messages: ChatMessage[] = [
    {
      role: "user",
      image: { format: req.format, bytes: photo },
      images: [
        ...(req.contrastBase64 ? [{ format: req.format, bytes: Buffer.from(req.contrastBase64, "base64") }] : []),
        ...(req.secondImageBase64 ? [{ format: req.format, bytes: Buffer.from(req.secondImageBase64, "base64") }] : []),
      ],
      text: `This image is ${req.widthPx} x ${req.heightPx} pixels${scale}.${contrast}${second} ${scope}${lot} First the visible lines and intersection points, then borders, then faces and obstructions.${req.hint ? ` ${req.hint}` : ""} JSON only.`,
    },
  ];
  const maxTokens = req.scope === "site" ? 24000 : 12000;
  let turn = await model.converse({ tier: "smart", effort: "high", maxTokens, system: ROOF_FACES_SYSTEM, messages });
  let result = cleanFaces(jsonIn(turn.text), req);
  const usage = { ...turn.usage };
  let reviews = 0;
  // The self-check: the trace drawn on the photo, back to Opus, until it stops moving
  // (under 2 px) and every line lies on an edge the photo shows (owner, 10 Nov 2026),
  // or the time budget for a reading runs out. Lines the photo doesn't show keep
  // the check going, up to REVIEW_MAX rounds.
  const unseenOf = (r: typeof result) => (lineEvidence(photo, r.buildings) ?? []).filter((l) => !l.seen);
  let unseen = unseenOf(result);
  const maxRounds = unseen.length ? Math.max(req.review, REVIEW_MAX) : req.review;
  while (reviews < maxRounds && req.format === "png" && result.buildings.length && Date.now() - t0 < budgetMs * 0.75) {
    const drawn = traceOverlay(photo, result.buildings);
    if (!drawn) break;
    const list = result.buildings
      .map((b, i) => `${b.name}: ` + b.points.map((p) => `${drawn.numbers[i]!.get(p.id)}=${p.id} (${Math.round(p.x)},${Math.round(p.y)})`).join(", "))
      .join("; ");
    const unseenText = unseen.map((l) => `${drawn.numbers[l.building]!.get(l.from)}-${drawn.numbers[l.building]!.get(l.to)}`).join(", ");
    messages.push({ role: "assistant", text: turn.text, toolUses: [] });
    messages.push({ role: "user", image: { format: "png", bytes: drawn.png }, text: ROOF_REVIEW_TEXT(list, unseenText) });
    turn = await model.converse({ tier: "smart", effort: "high", maxTokens, system: ROOF_FACES_SYSTEM, messages });
    usage.inputTokens += turn.usage.inputTokens;
    usage.outputTokens += turn.usage.outputTokens;
    const next = cleanFaces(jsonIn(turn.text), req);
    reviews += 1;
    if (!next.buildings.length && !next.noRoof) break; // a bad reply: keep the last good trace
    const moved = traceShift(result, next);
    result = next;
    unseen = unseenOf(result);
    // Settled: nothing moved since the last check (told which lines the photo doesn't show).
    if (moved < 2) break;
    // Past the usual rounds, carry on only while some line is still off the photo's edges.
    if (reviews >= req.review && !unseen.length) break;
  }
  // A missed section, then close-ups, then the bounded edge snap.
  const refined = { sections: 0, calculated: 0, marked: 0, closeupFlags: 0, notConfirmed: 0 };
  if (req.refine && req.format === "png" && result.buildings.length && Date.now() - t0 < budgetMs * 0.85) {
    try {
      const r = await findMissingSections(model, photo, result, req, maxTokens);
      usage.inputTokens += r.usage.inputTokens;
      usage.outputTokens += r.usage.outputTokens;
      if (r.result) {
        refined.sections = r.added;
        result = r.result;
      }
    } catch {
      /* keep the self-checked trace */
    }
  }
  // The intersection rule: points calculated from the measured lines (2), checked on close-ups (3), confirmed on their own (5).
  if (req.refine && req.format === "png" && result.buildings.length) {
    const mpp = req.metresPerPixel ?? 0;
    if (mpp > 0) {
      const r = placeIntersections(photo, result.buildings, mpp);
      refined.calculated = r.placed;
      refined.marked = r.marked;
    }
    if (Date.now() - t0 < budgetMs * 0.9) {
      try {
        const r = await checkByCloseups(model, photo, result.buildings, { jsonIn, maxSheets: 3 });
        usage.inputTokens += r.usage.inputTokens;
        usage.outputTokens += r.usage.outputTokens;
        refined.closeupFlags = r.flagged;
      } catch {
        /* the calculated points stand */
      }
    }
    if (Date.now() - t0 < budgetMs * 0.95) {
      try {
        const r = await confirmPoints(model, photo, result.buildings, { jsonIn });
        usage.inputTokens += r.usage.inputTokens;
        usage.outputTokens += r.usage.outputTokens;
        refined.notConfirmed = r.rejected;
        if (r.missing) result = { ...result, notes: [result.notes, `Points check: a corner may be missing (${r.missing}).`].filter(Boolean).join(" ") };
      } catch {
        /* unconfirmed points stay marked as calculated */
      }
    }
    result = { ...result, faces: result.buildings.flatMap((b) => b.faces) };
  }
  return { ...result, usage, reviews, refined };
}

export const MISSING_SECTION_TEXT = (list: string) => `This is an enlarged view of the roof with your trace drawn on it (border magenta, lines yellow/orange, points numbered). Check ONE thing: is any part of this roof NOT traced? Look along the whole building for a wing, a lower roof, a porch, garage or entry roof, a step in the ridge, or a hip or valley you haven't drawn (a section with its own hips or ridge needs its own faces, ridge, hips and corners on its own eaves).
If nothing is missing, reply with JSON only: {"missing": false}.
If something is missing, reply with the WHOLE corrected trace in the same JSON format as before, in THIS enlarged image's pixels, plus "missing": true and a short "notes" naming what you added. Keep every line that is right exactly where it is.
Points by number: ${list}`;

/**
 * Whether the trace misses a roof section (owner, 10 Nov 2026: 53 Turffontein
 * Ave's front wing was traced as part of the main roof three times). Opus sees
 * the roof alone, enlarged (the trace's extent plus a third), with its trace
 * drawn, and is asked only that. A new trace is kept when it adds faces and
 * keeps the old border's area; otherwise the old one stays.
 */
async function findMissingSections(
  model: ModelClient,
  photoPng: Buffer,
  result: Omit<RoofFacesResult, "usage">,
  req: RoofFacesRequest,
  maxTokens: number,
): Promise<{ result: Omit<RoofFacesResult, "usage"> | null; added: number; usage: { inputTokens: number; outputTokens: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const photo = decodePng(photoPng);
  const main = result.buildings.find((b) => b.main) ?? result.buildings[0];
  if (!photo || !main) return { result: null, added: 0, usage };
  const xs = [...main.outline.map((p) => p[0]), ...main.points.map((p) => p.x)];
  const ys = [...main.outline.map((p) => p[1]), ...main.points.map((p) => p.y)];
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const side = Math.min(Math.min(photo.width, photo.height), Math.round(Math.max(w, h) * 1.35 + 40));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const left = Math.round(Math.min(Math.max(0, cx - side / 2), photo.width - side));
  const top = Math.round(Math.min(Math.max(0, cy - side / 2), photo.height - side));
  const out = Math.min(1100, Math.max(side, Math.round(side * 2.5)));
  const k = side / out;
  const big = encodePng(enlargeRegion(photo, left, top, side, out));
  const bigTrace = mapBuildings([main], (x, y) => [(x - left) / k, (y - top) / k]);
  const drawn = traceOverlay(big, bigTrace);
  if (!drawn) return { result: null, added: 0, usage };
  const list = bigTrace[0]!.points.map((p) => `${drawn.numbers[0]!.get(p.id)}=${p.id} (${Math.round(p.x)},${Math.round(p.y)})`).join(", ");
  const turn = await model.converse({
    tier: "smart",
    effort: "high",
    maxTokens,
    system: ROOF_FACES_SYSTEM,
    messages: [{ role: "user", image: { format: "png", bytes: drawn.png }, text: MISSING_SECTION_TEXT(list) }],
  });
  usage.inputTokens += turn.usage.inputTokens;
  usage.outputTokens += turn.usage.outputTokens;
  const raw = jsonIn(turn.text) as { missing?: boolean } | null;
  if (!raw || raw.missing !== true) return { result: null, added: 0, usage };
  const next = cleanFaces(raw, { widthPx: out, heightPx: out, metresPerPixel: req.metresPerPixel ? req.metresPerPixel * k : undefined });
  const nb = next.buildings.find((b) => b.main) ?? next.buildings[0];
  if (!nb) return { result: null, added: 0, usage };
  const [back] = mapBuildings([nb], (x, y) => [left + x * k, top + y * k]);
  const area = (r: [number, number][]) => Math.abs(r.reduce((s2, p, i) => { const q = r[(i + 1) % r.length]!; return s2 + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const added = back!.faces.length - main.faces.length;
  // Kept only when it adds faces and keeps (about) the old border's area.
  if (added < 1 || (main.outline.length >= 3 && area(back!.outline) < area(main.outline) * 0.9)) return { result: null, added: 0, usage };
  const buildings = result.buildings.map((b) => (b === main ? { ...back!, main: true } : b));
  return { result: { ...result, buildings, faces: buildings.flatMap((b) => b.faces), notes: [result.notes, (raw as { notes?: string }).notes].filter(Boolean).join(" ") }, added, usage };
}
