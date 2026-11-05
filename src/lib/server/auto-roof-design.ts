import sharp from "sharp";
import { parseGeoTiffDsm, type GeoTiffRaster } from "@/utils/geotiff";
import { analyseRoofSnapshot, ROOF_SNAPSHOT, type RoofSnapshotAnalysis, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import { fitEavesToMask } from "@/lib/designer/roofLineCheck";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { correctInteriorLines, fillFacesOnRoofs } from "@/lib/designer/roofLineCorrect";
import { generatePanelsForFaces, longestEdgeAngleDegrees } from "@/lib/designer/panelLayout";
import { findRoofObstructions, type RoofObstruction } from "@/lib/designer/roofObstructions";
import { keepPanelsClear, panelCornersLatLng } from "@/lib/designer/panelClearance";
import { bestSquareRoof, rankSquareReadings } from "@/lib/designer/squareRoof";
import { extractRoofOutlinesFromMask } from "@/utils/roofMaskContour";
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
  dims: { heightM: number; widthM: number };
  /** The roof came from Google's mask or building box, not a traced roof (the page's "check the roof" flag). */
  needsVerification: boolean;
};

/*
 * Everything below follows DesignsSolarPanelStepContent step for step, with
 * the same library calls; the page's own private helpers are copied here
 * unchanged (clip to the lot, area, de-duplicate) so the Design Platform's
 * file is never edited for this.
 */
const MIN_MASK_COVERAGE_FRACTION = 0.5; // page: MIN_MASK_COVERAGE_FRACTION
const MAX_BOUNDING_BOX_DISTANCE_M = 80; // page: MAX_BOUNDING_BOX_DISTANCE_M

function ringSignedArea(ring: LatLng[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    sum += a.lng * b.lat - b.lng * a.lat;
  }
  return sum / 2;
}

function clipRingToConvexPolygon(subject: LatLng[], clip: LatLng[]): LatLng[] {
  if (subject.length < 3 || clip.length < 3) return [];
  const ccw = ringSignedArea(clip) > 0;
  const inside = (p: LatLng, a: LatLng, b: LatLng) => {
    const cross = (b.lng - a.lng) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lng - a.lng);
    return ccw ? cross >= 0 : cross <= 0;
  };
  const intersection = (p1: LatLng, p2: LatLng, a: LatLng, b: LatLng): LatLng => {
    const denom = (p1.lng - p2.lng) * (a.lat - b.lat) - (p1.lat - p2.lat) * (a.lng - b.lng);
    if (Math.abs(denom) < 1e-15) return p2;
    const t = ((p1.lng - a.lng) * (a.lat - b.lat) - (p1.lat - a.lat) * (a.lng - b.lng)) / denom;
    return { lng: p1.lng + t * (p2.lng - p1.lng), lat: p1.lat + t * (p2.lat - p1.lat) };
  };
  let output = subject;
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) break;
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const curr = input[j], prev = input[(j - 1 + input.length) % input.length];
      const currIn = inside(curr, a, b), prevIn = inside(prev, a, b);
      if (currIn) {
        if (!prevIn) output.push(intersection(prev, curr, a, b));
        output.push(curr);
      } else if (prevIn) output.push(intersection(prev, curr, a, b));
    }
  }
  return output;
}

function dedupeSolarPanels(panels: SolarPanel[]): SolarPanel[] {
  const seen = new Set<string>();
  return panels.filter((p) => {
    const k = [p.segmentIndex, p.center.lat.toFixed(7), p.center.lng.toFixed(7), p.orientation, (p.rotationDegrees ?? 0).toFixed(2)].join(":");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function distanceM(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * 111_320, dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Page: `snapshotOutlines` — the roof as traced in the zoomed image. */
function snapshotOutlines(snap: RoofSnapshotAnalysis | null, estimate: SolarEstimateResult | undefined): LatLng[][] | null {
  const found = snap?.outlines;
  if (!snap || !found || found.length === 0) return null;
  const sq = !estimate?.estimated ? bestSquareRoof(snap.squared, estimate?.roofSegments, snap.luma ?? null) : null;
  if (sq) return [sq.ring];
  const straight = regularizeRoofOutlines(found.map((o) => o.ring));
  return regularizeRoofOutlines(straight.map((r) => fitEavesToMask(r, snap.mask).ring));
}

/** Page: `initialRoofPolygons` (snapshot, else Google's mask on the lot, else Google's building box). */
function initialRoofs(
  snap: RoofSnapshotAnalysis | null,
  estimate: SolarEstimateResult | undefined,
  mask: GeoTiffRaster | null,
  parcel: LatLng[] | null,
  pin: LatLng,
): { rings: LatLng[][]; traced: boolean } | null {
  const fromSnap = snapshotOutlines(snap, estimate);
  if (fromSnap) return { rings: fromSnap, traced: true };
  if (mask) {
    const traced = extractRoofOutlinesFromMask(mask);
    if (traced.length) {
      let rings = traced.map((o) => o.ring);
      if (parcel) {
        const clipped = rings.map((r) => clipRingToConvexPolygon(r, parcel)).filter((r) => r.length >= 3 && ringAreaM2(r) >= 4);
        if (clipped.length) rings = clipped;
      }
      const whole = estimate?.wholeRoofAreaM2;
      const covers = !whole || traced.reduce((s, o) => s + o.areaM2, 0) >= whole * MIN_MASK_COVERAGE_FRACTION;
      if (covers) return { rings, traced: true };
    }
  }
  const box = estimate?.boundingBox;
  if (box && distanceM(pin, { lat: (box.ne.lat + box.sw.lat) / 2, lng: (box.ne.lng + box.sw.lng) / 2 }) <= MAX_BOUNDING_BOX_DISTANCE_M) {
    return {
      rings: [[{ lat: box.ne.lat, lng: box.sw.lng }, { lat: box.ne.lat, lng: box.ne.lng }, { lat: box.sw.lat, lng: box.ne.lng }, { lat: box.sw.lat, lng: box.sw.lng }]],
      traced: false,
    };
  }
  return null;
}

function design(
  snap: RoofSnapshotAnalysis | null,
  estimate: SolarEstimateResult | undefined,
  dsm: GeoTiffRaster | null,
  mask: GeoTiffRaster | null,
  parcel: LatLng[] | null,
  pin: LatLng,
): Design | null {
  const initial = initialRoofs(snap, estimate, mask, parcel, pin);
  if (!initial) return null;

  // Page: handleSave — roof-line rule, then eaves fitted to the roof edge
  // unless Google confirms a square-walled hip roof.
  const lineMask = snap?.mask ?? mask;
  const lineLuma = snap?.luma ?? null;
  const straightened = regularizeRoofOutlines(initial.rings.filter((p) => p.length >= 3));
  const squareConfirmed =
    straightened.length === 1 && !estimate?.estimated && rankSquareReadings([straightened[0]], estimate?.roofSegments, lineLuma).length > 0;
  const paths = lineMask && !squareConfirmed
    ? regularizeRoofOutlines(straightened.map((ring) => fitEavesToMask(ring, lineMask).ring))
    : straightened;
  if (!paths.length) return null;

  // Page: facesFor (no Relook).
  let faces: { ring: LatLng[]; eaveDeg: number; pitchDeg?: number; azimuthDeg?: number }[];
  let obstructions: RoofObstruction[];
  const reading = paths.length === 1 && !estimate?.estimated ? rankSquareReadings([paths[0]], estimate?.roofSegments, lineLuma, {})[0] : undefined;
  if (reading) {
    faces = reading.faces;
    obstructions = snap ? findRoofObstructions(snap.luma, reading.faces.map((f) => f.ring)) : [];
  } else {
    const detected = detectRoofFaces(dsm, paths, mask);
    if (detected && detected.length > 0) {
      const rings = regularizeRoofOutlines(detected.map((f) => f.ring));
      faces = detected.map((f, i) => ({ ring: rings[i], eaveDeg: f.eaveDeg, pitchDeg: f.pitchDeg, azimuthDeg: f.azimuthDeg }));
      if (snap) faces = fillFacesOnRoofs(faces, paths, snap.mask, snap.metresPerPixel);
    } else {
      faces = splitRoofsIntoFaces(paths).map((f) => ({ ring: f.ring, eaveDeg: f.eaveDeg }));
    }
    faces = correctInteriorLines(faces, paths, lineLuma).faces;
    obstructions = snap ? findRoofObstructions(snap.luma, faces.map((f) => f.ring)) : [];
  }

  // Page: layoutPanels — the design's default orientation, Google's panel
  // size, the roof pitch, rows along the largest roof's main walls.
  const dims = estimate?.panelDimensions ?? AUTO_PANEL.dims;
  const orientation = DESIGN_RULES.defaultOrientation;
  const largest = paths.reduce<LatLng[] | null>((best, p) => (p.length >= 3 && (!best || ringAreaM2(p) > ringAreaM2(best)) ? p : best), null);
  const axis = largest ? longestEdgeAngleDegrees(largest) : undefined;
  const pitchDeg = roofPitchDegrees(estimate?.roofSegments, estimate?.estimated ?? true);
  const packed = generatePanelsForFaces(faces, dims, { orientation, pitchDeg, obstructions: obstructions.map((o) => o.ring) }, axis);
  const panels = dedupeSolarPanels(keepPanelsClear(packed, faces.map((f) => f.ring), paths, dims, { clearM: DESIGN_RULES.edgeSetbackM }));

  return {
    outline: paths,
    faces: faces.map((f) => f.ring),
    obstructions: obstructions.map((o) => o.ring),
    panels,
    orientation,
    dims,
    needsVerification: !initial.traced,
  };
}

const pts = (geo: SnapshotGeo, ring: LatLng[]) => ring.map((p) => toPx(geo, p).map((v) => v.toFixed(1)).join(",")).join(" ");

/** Faces, obstructions and panels drawn over the satellite image, cropped to the roof. */
async function render(png: Buffer, geo: SnapshotGeo, d: Design, mpp: number): Promise<{ thumb: Buffer; large: Buffer }> {
  const panelPolys = d.panels.map((p) => panelCornersLatLng(p, d.dims));
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
  const pin = inputs.pin;
  const [mask, dsm] = await Promise.all([raster(inputs.maskBase64), raster(inputs.dsmBase64)]);
  const parcel = inputs.parcel && inputs.parcel.length >= 3 ? inputs.parcel : null;

  // Page: useRoofSnapshot — zoom 21 first (~3 cm pixels), retried at 20 for a roof too big for the frame.
  let snap: Awaited<ReturnType<typeof snapshot>> | null = null;
  let analysis: RoofSnapshotAnalysis | null = null;
  for (const zoom of [ROOF_SNAPSHOT.zoom, ROOF_SNAPSHOT.zoom - 1]) {
    snap = await snapshot(pin.lat, pin.lng, zoom);
    analysis = analyseRoofSnapshot(snap.rgba, snap.geo, { pin, hint: mask, dsm, parcel });
    if (analysis) break;
  }
  if (!snap) return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: "Couldn't load the satellite image." };
  // Draw on the zoom-21 frame when the roof was traced there, else whichever frame was analysed last.
  const d = design(analysis, inputs.estimate, dsm, mask, parcel, pin);
  if (!d) return { status: "NO_ROOF", lat: pin.lat, lng: pin.lng, message: "Couldn't find a roof at this address in the satellite image." };

  const mpp = analysis?.metresPerPixel ?? (156543.03392 * Math.cos((pin.lat * Math.PI) / 180)) / 2 ** snap.geo.zoom / snap.geo.scale;
  const { thumb, large } = await render(snap.png, snap.geo, d, mpp);
  const panelCount = d.panels.length;
  const notes = [
    d.needsVerification ? "Roof outline from Google's data, not traced from the image: check the roof shape." : null,
    panelCount === 0 ? "Roof found, but no face is big enough for a panel." : null,
  ].filter(Boolean);
  return {
    status: "READY",
    lat: pin.lat,
    lng: pin.lng,
    panelCount,
    panelWatts: AUTO_PANEL.watts,
    systemKw: Math.round(((panelCount * AUTO_PANEL.watts) / 1000) * 100) / 100,
    orientation: d.orientation,
    faceCount: d.faces.length,
    roofAreaM2: Math.round(d.outline.reduce((s, r) => s + ringAreaM2(r), 0)),
    thumb,
    large,
    message: notes.length ? notes.join(" ") : null,
  };
}
