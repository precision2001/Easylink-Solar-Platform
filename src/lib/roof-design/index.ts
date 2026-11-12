/**
 * The roof-design code base, shared by every module that designs a roof.
 *
 *   import { designRoof, findRoofFaces, layoutRoofPanels } from "@/lib/roof-design";   // browser or Node
 *   import { designRoofAt, renderRoofDesign } from "@/lib/roof-design/server";          // Node only (sharp)
 *
 * External systems use the HTTP API: POST /api/roof-design (see docs/ROOF_DESIGN_API.md).
 */
export * from "./geometry";
export * from "./engine";
export { DESIGN_RULES, inverterSizingFor, dcAcLimitPercent, roofPitchDegrees } from "@/lib/designer/designRules";
export type { PanelOrientation, InverterSizing } from "@/lib/designer/designRules";

// Building blocks the engine is made of, for pages that need one piece
// (straightening a drawn outline, the standard hip split for an old design).
export { regularizeRoofOutlines as straightenOutlines } from "@/lib/designer/roofLines";
export { splitRoofsIntoFaces as standardHipFaces } from "@/lib/designer/roofFaces";
export { snapshotMetresPerPixel, ROOF_SNAPSHOT, type RoofSnapshotAnalysis, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
export type { SquareReading } from "@/lib/designer/squareRoof";
export type { LineCheck } from "@/lib/designer/roofLineCheck";
export type { RoofObstruction } from "@/lib/designer/roofObstructions";
