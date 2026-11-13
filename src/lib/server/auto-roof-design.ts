import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { SolarEstimateResult, SolarPanel } from "@/types/solar";
import { DEFAULT_PANEL, ringAreaM2, type LatLng } from "@/lib/roof-design";
import { designRoofAt, parseRaster, renderRoofDesign, toPx } from "@/lib/roof-design/server";

/**
 * The platform designer, run on the server for a lead's address (Quotes &
 * Leads). It runs the shared roof-design engine (src/lib/roof-design) — the
 * same code the Designs page runs — on the inputs the backend gives for the
 * lead, and draws every face's border, obstructions and panels on the
 * satellite image.
 */

export { toPx };

export type RoofDesignInputs = {
  address: string;
  formattedAddress?: string;
  located: boolean;
  pin?: LatLng;
  estimate?: SolarEstimateResult;
  maskBase64?: string | null;
  dsmBase64?: string | null;
  parcel?: LatLng[] | null;
  /**
   * The design staff just saved for the lead (owner, 10 Nov 2026: the lead
   * kept showing its old automatic design after a redesign). When given, the
   * lead's picture is that design exactly: its roofs, its faces, its panels.
   */
  saved?: SavedLeadDesign | null;
};

export type SavedLeadDesign = {
  roofs: LatLng[][];
  panels: SolarPanel[];
  faces?: { ring: LatLng[]; pitchDeg?: number; azimuthDeg?: number }[];
  orientation?: "PORTRAIT" | "LANDSCAPE";
  dims?: { heightM: number; widthM: number };
  systemKw?: number;
};

export type AutoRoofDesign =
  | {
      status: "READY";
      lat: number;
      lng: number;
      panelCount: number;
      panelWatts: number;
      systemKw: number;
      orientation: "PORTRAIT" | "LANDSCAPE";
      faceCount: number;
      roofAreaM2: number;
      thumb: Buffer;
      large: Buffer;
      message: string | null;
    }
  | { status: "NO_ROOF" | "NO_ADDRESS" | "TRACING"; lat?: number; lng?: number; message: string };

/** EasyLink's standard panel for automatic designs (Jinko Tiger Neo class). */
export const AUTO_PANEL = DEFAULT_PANEL;

export async function runAutoRoofDesign(inputs: RoofDesignInputs): Promise<AutoRoofDesign> {
  if (!inputs.located || !inputs.pin) return { status: "NO_ADDRESS", message: "Couldn't find this address on the map." };
  const pin = inputs.pin;
  const [mask, dsm] = await Promise.all([parseRaster(inputs.maskBase64), parseRaster(inputs.dsmBase64)]);
  const parcel = inputs.parcel && inputs.parcel.length >= 3 ? { ring: inputs.parcel, areaM2: ringAreaM2(inputs.parcel) } : null;
  const saved = inputs.saved?.roofs?.length && inputs.saved.panels?.length ? inputs.saved : null;
  if (saved) return drawSavedDesign(pin, saved, { estimate: inputs.estimate, mask, dsm, parcel });
  const r = await designRoofAt(pin, {
    context: { pin, estimate: inputs.estimate, mask, dsm, parcel },
    orientation: DESIGN_RULES.defaultOrientation,
    panelWatts: AUTO_PANEL.watts,
    // As on the Designs page, so a lead's design matches the one staff open.
    beautify: true,
  });
  if (!r.image) return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: "Couldn't load the satellite image." };
  if (r.status !== "READY") return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: r.message };
  const d = r.design;
  // Opus is still tracing: nothing is kept yet; the caller asks again.
  if (d.notes.some((n) => /^(EasyLink AI|Opus) is still/.test(n))) return { status: "TRACING", lat: pin.lat, lng: pin.lng, message: "EasyLink AI is still tracing this roof." };
  const { thumb, large } = await renderRoofDesign(r.image, d);
  return {
    status: "READY",
    lat: pin.lat,
    lng: pin.lng,
    panelCount: d.panels.length,
    panelWatts: d.panelWatts,
    systemKw: d.systemKw,
    orientation: d.orientation,
    faceCount: d.faceSet.faces.length,
    roofAreaM2: d.roofAreaM2,
    thumb,
    large,
    message: d.notes.length ? d.notes.join(" ") : null,
  };
}

/** The lead's picture from the design staff saved: its roofs (no new trace), faces and panels as saved. */
async function drawSavedDesign(
  pin: LatLng,
  saved: SavedLeadDesign,
  ctx: { estimate?: SolarEstimateResult; mask: Awaited<ReturnType<typeof parseRaster>>; dsm: Awaited<ReturnType<typeof parseRaster>>; parcel: { ring: LatLng[]; areaM2: number } | null },
): Promise<AutoRoofDesign> {
  const r = await designRoofAt(pin, {
    context: { pin, estimate: ctx.estimate, mask: ctx.mask, dsm: ctx.dsm, parcel: ctx.parcel },
    outline: saved.roofs,
    orientation: saved.orientation ?? DESIGN_RULES.defaultOrientation,
    panelWatts: AUTO_PANEL.watts,
  });
  if (!r.image) return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: "Couldn't load the satellite image." };
  if (r.status !== "READY") return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: r.message };
  const base = r.design;
  const panels = saved.panels;
  const systemKw = saved.systemKw && saved.systemKw > 0 ? saved.systemKw : (panels.length * base.panelWatts) / 1000;
  const d = {
    ...base,
    outline: saved.roofs,
    panels,
    dims: saved.dims ?? base.dims,
    orientation: saved.orientation ?? base.orientation,
    faceSet: saved.faces?.length ? { ...base.faceSet, faces: saved.faces.map((f) => ({ ...f, ring: f.ring })) as typeof base.faceSet.faces } : base.faceSet,
  };
  const { thumb, large } = await renderRoofDesign(r.image, d);
  return {
    status: "READY",
    lat: pin.lat,
    lng: pin.lng,
    panelCount: panels.length,
    panelWatts: panels.length ? Math.round((systemKw * 1000) / panels.length) : base.panelWatts,
    systemKw: +systemKw.toFixed(2),
    orientation: d.orientation,
    faceCount: d.faceSet.faces.length,
    roofAreaM2: base.roofAreaM2,
    thumb,
    large,
    message: "The design saved for this lead.",
  };
}
