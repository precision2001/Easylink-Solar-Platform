import sharp from "sharp";
import { parseGeoTiffDsm, type GeoTiffRaster } from "@/utils/geotiff";
import { analyseRoofSnapshot, ROOF_SNAPSHOT, type RoofSnapshotAnalysis, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines, fillFacesOnRoofs } from "@/lib/designer/roofLineCorrect";
import { generatePanelsForFaces, longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { findRoofObstructions } from "@/lib/designer/roofObstructions";
import { keepPanelsClear, panelCornersLatLng } from "@/lib/designer/panelClearance";
import { bestSquareRoof } from "@/lib/designer/squareRoof";
import { DESIGN_RULES, roofPitchDegrees } from "@/lib/designer/designRules";
import type { SolarEstimateResult, SolarPanel } from "@/types/solar";

/**
 * The platform designer, run on the server for a lead's address (Quotes &
 * Leads). Same steps, same code and same rules as the Designs page
 * (DesignsSolarPanelStepContent / useRoofSnapshot): zoom-21 image → roof
 * outline (square-roof reading confirmed by Google first) → faces → lines
 * corrected against the image → obstructions → panels packed per face, one
 * orientation, 100 mm clear of every roof line. Then drawn: every face's
 * border, obstructions and panels on the satellite image.
 */

type LatLng = { lat: number; lng: number };

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
export const AUTO_PANEL = { watts: 440, dims: { heightM: 1.762, widthM: 1.134 } };

const STATIC_MAPS = "https://maps.googleapis.com/maps/api/staticmap";

async function snapshot(lat: number, lng: number, zoom: number): Promise<{ png: Buffer; rgba: Uint8Array; geo: SnapshotGeo }> {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("Google Maps key is not configured");
  const params = new URLSearchParams({
    center: `${lat.toFixed(7)},${lng.toFixed(7)}`,
    zoom: String(zoom),
    size: "640x640",
    scale: String(ROOF_SNAPSHOT.scale),
    maptype: "satellite",
    format: "png32",
    key,
  });
  const res = await fetch(`${STATIC_MAPS}?${params}`, { cache: "no-store", headers: { Referer: "https://www.easylinksolar.com.au/" } });
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) throw new Error(`Satellite image failed: ${res.status}`);
  const png = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    png,
    rgba: new Uint8Array(data),
    geo: { centerLat: lat, centerLng: lng, zoom, scale: ROOF_SNAPSHOT.scale, widthPx: info.width, heightPx: info.height },
  };
}

async function raster(b64: string | null | undefined): Promise<GeoTiffRaster | null> {
  if (!b64) return null;
  try {
    const buf = Buffer.from(b64, "base64");
    return await parseGeoTiffDsm(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  } catch {
    return null;
  }
}

/** Web-Mercator pixel position of a point in the snapshot. */
export function toPx(geo: SnapshotGeo, p: LatLng): [number, number] {
  const W = 256 * 2 ** geo.zoom * geo.scale;
  const merc = (q: LatLng) => {
    const s = Math.sin((q.lat * Math.PI) / 180);
    return [((q.lng + 180) / 360) * W, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W];
  };
  const [x, y] = merc(p);
  const [xc, yc] = merc({ lat: geo.centerLat, lng: geo.centerLng });
  return [x - xc + geo.widthPx / 2, y - yc + geo.heightPx / 2];
}

function ringAreaM2(ring: LatLng[]): number {
  if (ring.length < 3) return 0;
  const lat0 = (ring.reduce((s, p) => s + p.lat, 0) / ring.length) * (Math.PI / 180);
  const mx = 111_320 * Math.cos(lat0), my = 110_540;
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    a += p.lng * mx * (q.lat * my) - q.lng * mx * (p.lat * my);
  }
  return Math.abs(a) / 2;
}

type Design = {
  outline: LatLng[][];
  faces: LatLng[][];
  obstructions: LatLng[][];
  panels: SolarPanel[];
  orientation: "PORTRAIT" | "LANDSCAPE";
};

function design(snap: RoofSnapshotAnalysis, estimate: SolarEstimateResult | undefined, dsm: GeoTiffRaster | null, mask: GeoTiffRaster | null): Design | null {
  const segments = estimate && !estimate.estimated ? estimate.roofSegments : null;
  const bestSq = bestSquareRoof(snap.squared, segments, snap.luma);
  const outline = bestSq
    ? [bestSq.ring]
    : regularizeRoofOutlines(regularizeRoofOutlines(snap.outlines.map((o) => o.ring)).map((r) => fitEavesToMask(r, snap.mask).ring));
  if (!outline.length || outline.every((r) => r.length < 3)) return null;

  const hip = bestSq?.faces ?? null;
  const detected = hip ? null : detectRoofFaces(dsm, outline, mask);
  let faces: { ring: LatLng[]; eaveDeg: number; pitchDeg?: number; azimuthDeg?: number }[] = hip
    ? hip
    : detected
      ? (() => {
          const rings = regularizeRoofOutlines(detected.map((f) => f.ring));
          return detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg }));
        })()
      : splitRoofsIntoFaces(outline).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
  if (detected) faces = fillFacesOnRoofs(faces, outline, snap.mask, snap.metresPerPixel);
  const corrected = hip ? { faces: hip } : correctInteriorLines(faces, outline, snap.luma);
  const faceRings = corrected.faces.map((f) => f.ring);

  const largest = outline.reduce((b, r) => (ringAreaM2(r) > ringAreaM2(b) ? r : b), outline[0]);
  const axis = longestEdgeAngleDegrees(largest);
  const obstructions = findRoofObstructions(snap.luma, faceRings).map((o) => o.ring);
  const pitchDeg = roofPitchDegrees(estimate?.roofSegments, estimate?.estimated ?? true);

  // One orientation for the whole roof: whichever fits more panels.
  const pack = (orientation: "PORTRAIT" | "LANDSCAPE") =>
    keepPanelsClear(
      generatePanelsForFaces(corrected.faces, AUTO_PANEL.dims, { orientation, pitchDeg, obstructions }, axis),
      faceRings,
      outline,
      AUTO_PANEL.dims,
      { clearM: DESIGN_RULES.edgeSetbackM },
    );
  const portrait = pack("PORTRAIT");
  const landscape = pack("LANDSCAPE");
  const useLandscape = landscape.length >= portrait.length;
  return {
    outline,
    faces: faceRings,
    obstructions,
    panels: useLandscape ? landscape : portrait,
    orientation: useLandscape ? "LANDSCAPE" : "PORTRAIT",
  };
}

const pts = (geo: SnapshotGeo, ring: LatLng[]) => ring.map((p) => toPx(geo, p).map((v) => v.toFixed(1)).join(",")).join(" ");

/** Faces, obstructions and panels drawn over the satellite image, cropped to the roof. */
async function render(png: Buffer, geo: SnapshotGeo, d: Design, mpp: number): Promise<{ thumb: Buffer; large: Buffer }> {
  const panelPolys = d.panels.map((p) => panelCornersLatLng(p, AUTO_PANEL.dims));
  const stroke = Math.max(2, Math.round(geo.widthPx / 640));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${geo.widthPx}" height="${geo.heightPx}">
  ${d.faces.map((r) => `<polygon points="${pts(geo, r)}" fill="rgba(255,232,102,0.10)" stroke="#FFC21A" stroke-width="${stroke}" stroke-linejoin="round"/>`).join("")}
  ${d.outline.map((r) => `<polygon points="${pts(geo, r)}" fill="none" stroke="#FFE866" stroke-width="${stroke + 1}" stroke-linejoin="round"/>`).join("")}
  ${panelPolys.map((r) => `<polygon points="${pts(geo, r)}" fill="#13284A" fill-opacity="0.92" stroke="#9CC3FF" stroke-width="${Math.max(1, stroke - 1)}"/>`).join("")}
  ${d.obstructions.map((r) => `<polygon points="${pts(geo, r)}" fill="rgba(246,138,10,0.35)" stroke="#F68A0A" stroke-width="${stroke}"/>`).join("")}
</svg>`;

  // Crop: the roof plus about 4 m around it, at least 18 m across, 4:3.
  const all = [...d.outline.flat(), ...panelPolys.flat()].map((p) => toPx(geo, p));
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const pad = 4 / mpp, minSpan = 18 / mpp;
  const x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + pad;
  let x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  let w = Math.max(x1 - x0, minSpan), h = Math.max(y1 - y0, minSpan * 0.75);
  if (w / h < 4 / 3) w = (h * 4) / 3; else h = (w * 3) / 4;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  w = Math.min(w, geo.widthPx); h = Math.min(h, geo.heightPx);
  x0 = Math.round(Math.max(0, Math.min(geo.widthPx - w, cx - w / 2)));
  y0 = Math.round(Math.max(0, Math.min(geo.heightPx - h, cy - h / 2)));
  const region = { left: x0, top: y0, width: Math.round(w), height: Math.round(h) };

  // Sharp crops before it composites, so flatten the drawing first, then crop.
  const overlaid = await sharp(png).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  const drawn = await sharp(overlaid).extract(region).png().toBuffer();
  // Platform rule: every image is compressed.
  const large = await sharp(drawn).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  const thumb = await sharp(drawn).resize(360, 270, { fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  return { thumb, large };
}

export async function runAutoRoofDesign(inputs: RoofDesignInputs): Promise<AutoRoofDesign> {
  if (!inputs.located || !inputs.pin) return { status: "NO_ADDRESS", message: "Couldn't find this address on the map." };
  const { lat, lng } = inputs.pin;
  const [mask, dsm] = await Promise.all([raster(inputs.maskBase64), raster(inputs.dsmBase64)]);
  const parcel = inputs.parcel && inputs.parcel.length >= 3 ? inputs.parcel : null;

  // Zoom 21 first (~3 cm pixels); a roof too big for that frame is retried at 20 — as on the Designs page.
  for (const zoom of [ROOF_SNAPSHOT.zoom, ROOF_SNAPSHOT.zoom - 1]) {
    const snap = await snapshot(lat, lng, zoom);
    const analysis = analyseRoofSnapshot(snap.rgba, snap.geo, { pin: { lat, lng }, hint: mask, dsm, parcel });
    if (!analysis) continue;
    const d = design(analysis, inputs.estimate, dsm, mask);
    if (!d) continue;
    const { thumb, large } = await render(snap.png, snap.geo, d, analysis.metresPerPixel);
    const panelCount = d.panels.length;
    return {
      status: "READY",
      lat,
      lng,
      panelCount,
      panelWatts: AUTO_PANEL.watts,
      systemKw: Math.round(((panelCount * AUTO_PANEL.watts) / 1000) * 100) / 100,
      orientation: d.orientation,
      faceCount: d.faces.length,
      roofAreaM2: Math.round(d.outline.reduce((s, r) => s + ringAreaM2(r), 0)),
      thumb,
      large,
      message: panelCount === 0 ? "Roof found, but no face is big enough for a panel." : null,
    };
  }
  return { status: "NO_ROOF", lat, lng, message: "Couldn't find a roof at this address in the satellite image." };
}
