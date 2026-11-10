import { newId } from "../core/envelope.js";
import { turnCostAud } from "../ai/model.js";
import type { Container } from "../container.js";
import { readRoofFaces, type RoofBuilding, type RoofFaceReading, type RoofFacesRequest } from "./faces.js";

/**
 * A roof reading runs in the background (event-based): the Roof Designer
 * hands over the image and gets an id straight away; RoofFacesFn reads the
 * roof with the smart model (no 29-second API limit, high effort); the
 * designer collects the result by id.
 *
 *   POST /v1/roof/faces       → { id, status: "pending" }
 *   (RoofFacesFn)               pending → done | error
 *   GET  /v1/roof/faces/:id   → { id, status, faces?, wallsDeg?, notes?, message? }
 */

export const ROOF_READING = "roof_reading";

export type RoofReadingStatus = "pending" | "done" | "error";

export type RoofReading = {
  id: string;
  status: RoofReadingStatus;
  s3Key: string;
  format: RoofFacesRequest["format"];
  widthPx: number;
  heightPx: number;
  metresPerPixel?: number;
  hint?: string;
  /** The boosted-contrast view, stored next to the image. */
  contrastKey?: string;
  /** A second aerial photo of the same frame (another source), stored next to the image, and what it is. */
  secondKey?: string;
  secondNote?: string;
  lot?: [number, number][];
  scope?: "house" | "site";
  /** Self-check rounds asked for, and how many ran. */
  review?: number;
  reviews?: number;
  /** Close-ups and edge snap after the self-check. */
  refine?: boolean;
  refined?: { sections: number; closeups: number; snapped: number };
  faces?: RoofFaceReading[];
  /** The full trace: per building its border, intersection points, lines, faces and obstructions. */
  buildings?: RoofBuilding[];
  noRoof?: boolean;
  wallsDeg?: number | null;
  notes?: string;
  message?: string;
  decisionId?: string;
  createdAt: string;
  finishedAt?: string;
};

const CONTENT_TYPE: Record<RoofFacesRequest["format"], string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

/** Store the image and the request, then hand the work to the background reader. */
export async function startRoofReading(c: Container, req: RoofFacesRequest, now = new Date()): Promise<RoofReading> {
  const id = newId("roof_");
  const s3Key = `roof/${id}.${req.format === "jpeg" ? "jpg" : req.format}`;
  await c.roofImages.put(s3Key, Buffer.from(req.imageBase64, "base64"), CONTENT_TYPE[req.format]);
  const contrastKey = req.contrastBase64 ? s3Key.replace(/(\.[a-z]+)$/, "-contrast$1") : undefined;
  if (contrastKey && req.contrastBase64) await c.roofImages.put(contrastKey, Buffer.from(req.contrastBase64, "base64"), CONTENT_TYPE[req.format]);
  const secondKey = req.secondImageBase64 ? s3Key.replace(/(\.[a-z]+)$/, "-second$1") : undefined;
  if (secondKey && req.secondImageBase64) await c.roofImages.put(secondKey, Buffer.from(req.secondImageBase64, "base64"), CONTENT_TYPE[req.format]);
  const row: RoofReading = {
    id,
    status: "pending",
    s3Key,
    format: req.format,
    widthPx: req.widthPx,
    heightPx: req.heightPx,
    metresPerPixel: req.metresPerPixel,
    hint: req.hint,
    contrastKey,
    secondKey,
    secondNote: req.secondImageNote,
    lot: req.lot,
    scope: req.scope,
    review: req.review,
    refine: req.refine,
    createdAt: now.toISOString(),
  };
  await c.store.putRecord(ROOF_READING, row);
  await c.dispatchRoofReading(id);
  return row;
}

export async function getRoofReading(c: Container, id: string): Promise<RoofReading | undefined> {
  return (await c.store.getRecord(ROOF_READING, id)) as RoofReading | undefined;
}

/** The background step: read the roof, record the decision, store the faces (or the error). */
export async function processRoofReading(c: Container, id: string, now = () => new Date()): Promise<RoofReading | undefined> {
  const row = await getRoofReading(c, id);
  if (!row || row.status !== "pending") return row;
  const finish = async (patch: Partial<RoofReading>) => {
    const done: RoofReading = { ...row, ...patch, finishedAt: now().toISOString() };
    await c.store.putRecord(ROOF_READING, done);
    return done;
  };
  try {
    const img = await c.roofImages.get(row.s3Key);
    if (!img) return finish({ status: "error", message: "The roof image could not be read back." });
    const contrast = row.contrastKey ? await c.roofImages.get(row.contrastKey) : null;
    const second = row.secondKey ? await c.roofImages.get(row.secondKey) : null;
    const r = await readRoofFaces(c.model, {
      imageBase64: Buffer.from(img).toString("base64"),
      contrastBase64: contrast ? Buffer.from(contrast).toString("base64") : undefined,
      secondImageBase64: second ? Buffer.from(second).toString("base64") : undefined,
      secondImageNote: row.secondNote,
      format: row.format,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
      metresPerPixel: row.metresPerPixel,
      hint: row.hint,
      lot: row.lot,
      scope: row.scope ?? "house",
      review: row.review ?? 2,
      refine: row.refine ?? false,
    });
    const decisionId = newId("dec_");
    await c.store.putDecision({
      id: decisionId,
      agentId: "roof-designer",
      eventId: null,
      subject: null,
      reasoningSummary: `Traced ${r.buildings.length} roof${r.buildings.length === 1 ? "" : "s"}: ${r.buildings.reduce((n, b) => n + b.lines.length, 0)} lines, ${r.buildings.reduce((n, b) => n + b.points.length, 0)} intersection points, ${r.faces.length} face${r.faces.length === 1 ? "" : "s"}; checked against the photo ${r.reviews} time${r.reviews === 1 ? "" : "s"}.${r.refined ? ` Missed sections added: ${r.refined.sections}. Close-ups moved ${r.refined.closeups} point${r.refined.closeups === 1 ? "" : "s"}; edge snap moved ${r.refined.snapped}.` : ""}${r.noRoof ? " No roof." : ""}${r.notes ? ` ${r.notes.slice(0, 300)}` : ""}`,
      action: null,
      autonomyLevel: null,
      outcome: "no_action",
      approverId: null,
      costAud: Math.round(turnCostAud("smart", { text: "", toolUses: [], stopReason: "end_turn", usage: r.usage }) * 10000) / 10000,
      contextHash: null,
      createdAt: now().toISOString(),
    });
    return finish({ status: "done", faces: r.faces, buildings: r.buildings, noRoof: r.noRoof, wallsDeg: r.wallsDeg, notes: r.notes, reviews: r.reviews, refined: r.refined, decisionId });
  } catch (err) {
    console.error("roof reading", id, err);
    return finish({ status: "error", message: "The roof could not be read." });
  }
}
