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
