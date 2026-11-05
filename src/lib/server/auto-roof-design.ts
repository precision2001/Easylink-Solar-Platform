import { DESIGN_RULES } from "@/lib/designer/designRules";
import type { SolarEstimateResult } from "@/types/solar";
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
  | { status: "NO_ROOF" | "NO_ADDRESS"; lat?: number; lng?: number; message: string };

/** EasyLink's standard panel for automatic designs (Jinko Tiger Neo class). */
export const AUTO_PANEL = DEFAULT_PANEL;

export async function runAutoRoofDesign(inputs: RoofDesignInputs): Promise<AutoRoofDesign> {
  if (!inputs.located || !inputs.pin) return { status: "NO_ADDRESS", message: "Couldn't find this address on the map." };
  const pin = inputs.pin;
  const [mask, dsm] = await Promise.all([parseRaster(inputs.maskBase64), parseRaster(inputs.dsmBase64)]);
  const parcel = inputs.parcel && inputs.parcel.length >= 3 ? { ring: inputs.parcel, areaM2: ringAreaM2(inputs.parcel) } : null;
  const r = await designRoofAt(pin, {
    context: { pin, estimate: inputs.estimate, mask, dsm, parcel },
    orientation: DESIGN_RULES.defaultOrientation,
    panelWatts: AUTO_PANEL.watts,
  });
  if (!r.image) return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: "Couldn't load the satellite image." };
  if (r.status !== "READY") return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: r.message };
  const d = r.design;
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
