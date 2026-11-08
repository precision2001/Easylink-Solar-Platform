import { newId } from "../core/envelope.js";
import { turnCostAud } from "../ai/model.js";
import type { Container } from "../container.js";
import { readRoofFaces, type RoofFaceReading, type RoofFacesRequest } from "./faces.js";

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
  faces?: RoofFaceReading[];
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
  await c.files.put(s3Key, Buffer.from(req.imageBase64, "base64"), CONTENT_TYPE[req.format]);
  const row: RoofReading = {
    id,
    status: "pending",
    s3Key,
    format: req.format,
    widthPx: req.widthPx,
    heightPx: req.heightPx,
    metresPerPixel: req.metresPerPixel,
    hint: req.hint,
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
    const img = await c.bytes.raw({ s3Key: row.s3Key }, 10 * 1024 * 1024);
    if (!img) return finish({ status: "error", message: "The roof image could not be read back." });
    const r = await readRoofFaces(c.model, {
      imageBase64: Buffer.from(img.bytes).toString("base64"),
      format: row.format,
      widthPx: row.widthPx,
      heightPx: row.heightPx,
      metresPerPixel: row.metresPerPixel,
      hint: row.hint,
    });
    const decisionId = newId("dec_");
    await c.store.putDecision({
      id: decisionId,
      agentId: "roof-designer",
      eventId: null,
      subject: null,
      reasoningSummary: `Read ${r.faces.length} roof face${r.faces.length === 1 ? "" : "s"} from the satellite image.${r.notes ? ` ${r.notes.slice(0, 300)}` : ""}`,
      action: null,
      autonomyLevel: null,
      outcome: "no_action",
      approverId: null,
      costAud: Math.round(turnCostAud("smart", { text: "", toolUses: [], stopReason: "end_turn", usage: r.usage }) * 10000) / 10000,
      contextHash: null,
      createdAt: now().toISOString(),
    });
    return finish({ status: "done", faces: r.faces, wallsDeg: r.wallsDeg, notes: r.notes, decisionId });
  } catch (err) {
    console.error("roof reading", id, err);
    return finish({ status: "error", message: "The roof could not be read." });
  }
}
