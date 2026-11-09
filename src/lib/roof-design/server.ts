/**
 * Roof design on the server (Node only: uses sharp). Loads the same inputs
 * the Designs page loads — Google Solar insights and layers, the zoom-21
 * satellite image, the land lot and the building footprint — runs the shared
 * engine, and draws the result on the satellite image.
 *
 * Used by Quotes & Leads (auto-roof-design), the roof-design API and the
 * scripts. The browser page loads the same inputs through its hooks and runs
 * the same engine, so every module designs a roof the same way.
 */
import sharp from "sharp";
import { parseGeoTiffDsm, type GeoTiffRaster } from "@/utils/geotiff";
import { analyseRoofSnapshot, ROOF_SNAPSHOT, snapshotMetresPerPixel, type RoofSnapshotAnalysis, type SnapshotGeo } from "@/lib/designer/roofSnapshot";
import { getCadastre, getCombinedSolar, getFootprint, getLayerBytes, getSnapshotPng } from "@/lib/server/roofDataCache";
import { alignedNswSnapshot, getNswSnapshotPng, inNsw, nswImageryDate } from "@/lib/server/nswImagery";
import type { SolarEstimateResult } from "@/types/solar";
import { designRoof, googleDataStale, lotForDesign, type DesignRoofOptions, type RoofDesign, type RoofDesignContext } from "./engine";
import { panelCorners, ringAreaM2, type LatLng, type LatLngRing } from "./geometry";
import { aiRoofFacesEnabled, aiTraceKey, aiTraceRunning, fetchAiRoofTrace } from "./aiFaces";

/* ── Satellite image ────────────────────────────────────────────────── */

export type Snapshot = { png: Buffer; rgba: Uint8Array; geo: SnapshotGeo };

export function googleMapsKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
}

/** The satellite image around a point (640×640 at scale 2), as PNG and RGBA pixels. */
export async function fetchSnapshot(pin: LatLng, zoom: number, key = googleMapsKey()): Promise<Snapshot> {
  if (!key) throw new Error("Google Maps key is not configured");
  // Cached by point and zoom, shared with the Designs page's image route.
  const png = await getSnapshotPng(pin.lat, pin.lng, zoom, key);
  if (!png) throw new Error("Satellite image failed");
  return decodeSnapshot(png, pin, zoom);
}

/** An image already fetched (or a test image), decoded for analysis. */
/** The NSW aerial photo of a snapshot's frame, lined up with it, and the note Opus gets with it. */
export async function nswSecondPhoto(img: Snapshot, pin: LatLng): Promise<{ png: Buffer; note: string } | null> {
  const [aligned, date] = await Promise.all([
    alignedNswSnapshot(img.png, pin.lat, pin.lng, img.geo.zoom).catch(() => null),
    nswImageryDate(pin.lat, pin.lng).catch(() => null),
  ]);
  if (!aligned) return null;
  const parts = ["NSW Spatial Services aerial photo"];
  if (date?.capturedOn) parts.push(`flown ${date.capturedOn}`);
  if (date?.resolutionCm) parts.push(`${date.resolutionCm} cm pixels, enlarged to match`);
  return { png: aligned.png, note: parts.join(", ") };
}

/**
 * Google's satellite image, or the NSW aerial photo of the same frame when
 * Google's fails (owner, 9 Nov 2026: the NSW photos are the backup).
 */
export async function fetchSnapshotOrNsw(pin: LatLng, zoom: number, key = googleMapsKey()): Promise<Snapshot> {
  try {
    return await fetchSnapshot(pin, zoom, key);
  } catch (err) {
    const nsw = await getNswSnapshotPng(pin.lat, pin.lng, zoom).catch(() => null);
    if (!nsw) throw err;
    return decodeSnapshot(nsw, pin, zoom);
  }
}

export async function decodeSnapshot(png: Buffer, pin: LatLng, zoom: number): Promise<Snapshot> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    png,
    rgba: new Uint8Array(data),
    geo: { centerLat: pin.lat, centerLng: pin.lng, zoom, scale: ROOF_SNAPSHOT.scale, widthPx: info.width, heightPx: info.height },
  };
}

/**
 * The page's useRoofSnapshot: zoom 21 first (~3 cm pixels), retried at 20 for
 * a roof too big for the frame. Returns the last image fetched, so the result
 * can be drawn even when no roof was traced.
 */
export async function analyseSnapshotAt(
  ctx: Pick<RoofDesignContext, "pin" | "mask" | "dsm" | "parcel" | "estimate">,
  fetchImage: (pin: LatLng, zoom: number) => Promise<Snapshot> = fetchSnapshot,
): Promise<{ image: Snapshot | null; analysis: RoofSnapshotAnalysis | null }> {
  let image: Snapshot | null = null;
  const heightsStale = googleDataStale(ctx as RoofDesignContext);
  for (const zoom of [ROOF_SNAPSHOT.zoom, ROOF_SNAPSHOT.zoom - 1]) {
    image = await fetchImage(ctx.pin, zoom);
    const analysis = analyseRoofSnapshot(image.rgba, image.geo, { pin: ctx.pin, hint: ctx.mask ?? null, dsm: ctx.dsm ?? null, parcel: ctx.parcel?.ring ?? null, heightsStale });
    if (analysis) return { image, analysis };
  }
  return { image, analysis: null };
}

/* ── Google Solar layers and the lot ────────────────────────────────── */

export async function parseRaster(data: ArrayBuffer | Buffer | string | null | undefined): Promise<GeoTiffRaster | null> {
  if (!data) return null;
  try {
    const buf = typeof data === "string" ? Buffer.from(data, "base64") : Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buf.byteLength === 0) return null;
    return await parseGeoTiffDsm(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
  } catch {
    return null;
  }
}

/** Where the Google data comes from: the platform backend (the live site), or Google directly with a key (scripts). */
export type RoofDataSource = { kind: "backend"; baseUrl: string } | { kind: "google"; key: string };

export function defaultDataSource(): RoofDataSource | null {
  if (process.env.BACKEND_API_BASE_URL) return { kind: "backend", baseUrl: process.env.BACKEND_API_BASE_URL };
  const key = googleMapsKey();
  return key ? { kind: "google", key } : null;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${url.split("?")[0]} ${res.status}`);
  return res.json();
}

async function getBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

type GoogleInsights = {
  center: { latitude: number; longitude: number };
  boundingBox: { sw: { latitude: number; longitude: number }; ne: { latitude: number; longitude: number } };
  imageryDate?: { year: number; month: number; day: number };
  solarPotential: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    panelCapacityWatts: number;
    panelHeightMeters: number;
    panelWidthMeters: number;
    carbonOffsetFactorKgPerMwh?: number;
    wholeRoofStats: { areaMeters2: number; groundAreaMeters2?: number };
    buildingStats?: { areaMeters2: number };
    roofSegmentStats: {
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: { areaMeters2: number };
      center: { latitude: number; longitude: number };
      boundingBox: { sw: { latitude: number; longitude: number }; ne: { latitude: number; longitude: number } };
    }[];
  };
};

const ll = (p: { latitude: number; longitude: number }): LatLng => ({ lat: p.latitude, lng: p.longitude });

/** Google's buildingInsights in the platform's shape (as the backend returns it, without the panel list). */
export function estimateFromGoogleInsights(g: GoogleInsights): SolarEstimateResult {
  const sp = g.solarPotential;
  const d = g.imageryDate;
  return {
    estimated: false,
    center: ll(g.center),
    boundingBox: { sw: ll(g.boundingBox.sw), ne: ll(g.boundingBox.ne) },
    imageryDate: d ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}` : "",
    maxPanelsCount: sp.maxArrayPanelsCount,
    maxArrayAreaM2: sp.maxArrayAreaMeters2,
    maxSunshineHoursPerYear: sp.maxSunshineHoursPerYear,
    panelCapacityWatts: sp.panelCapacityWatts,
    panelDimensions: { heightM: sp.panelHeightMeters, widthM: sp.panelWidthMeters },
    yearlyEnergyDcKwh: 0,
    co2SavingsKgPerYear: 0,
    wholeRoofAreaM2: sp.wholeRoofStats.areaMeters2,
    buildingAreaM2: sp.buildingStats?.areaMeters2 ?? sp.wholeRoofStats.groundAreaMeters2 ?? 0,
    roofSegments: sp.roofSegmentStats.map((s) => ({
      pitchDegrees: s.pitchDegrees,
      azimuthDegrees: s.azimuthDegrees,
      areaM2: s.stats.areaMeters2,
      center: ll(s.center),
      boundingBox: { sw: ll(s.boundingBox.sw), ne: ll(s.boundingBox.ne) },
    })),
    solarPanels: [],
  };
}

/** The Google Solar layers radius the live page uses. */
const LAYERS_RADIUS_M = 100;

/**
 * Everything the engine reads for a pin, loaded the way the Designs page
 * loads it. Missing pieces are left out (each step falls back), never fatal.
 * `parcel` can be passed when the caller already has the lot.
 */
export async function loadRoofContext(
  pin: LatLng,
  source: RoofDataSource | null = defaultDataSource(),
  extra: Partial<Pick<RoofDesignContext, "parcel" | "footprint" | "parcelBounds">> = {},
): Promise<RoofDesignContext> {
  const ctx: RoofDesignContext = { pin, ...extra };
  if (!source) return ctx;
  if (source.kind === "backend") {
    // Through the address cache shared with the Designs page's data routes.
    const [combined, parcel, footprint] = await Promise.all([
      getCombinedSolar(pin.lat, pin.lng).then((r) => (r.ok ? (r.data as unknown as { estimate: SolarEstimateResult; dataLayers: { maskUrl?: string; dsmUrl?: string } }) : null)),
      extra.parcel !== undefined ? Promise.resolve(null) : getCadastre<{ ring: LatLngRing; areaM2: number }>(pin.lat, pin.lng).then((r) => (r.ok ? r.data : null)),
      extra.footprint !== undefined ? Promise.resolve(null) : getFootprint<{ ring: LatLngRing }>(pin.lat, pin.lng).then((r) => (r.ok ? r.data : null)),
    ]).catch(() => [null, null, null] as const);
    if (combined?.estimate) ctx.estimate = combined.estimate;
    if (parcel?.ring && parcel.ring.length >= 3) ctx.parcel = { ring: parcel.ring, areaM2: parcel.areaM2 ?? ringAreaM2(parcel.ring) };
    if (footprint?.ring && footprint.ring.length >= 3) ctx.footprint = footprint.ring;
    const layer = (u?: string) => (u ? getLayerBytes(u).then(parseRaster).catch(() => null) : Promise.resolve(null));
    [ctx.mask, ctx.dsm] = await Promise.all([layer(combined?.dataLayers?.maskUrl), layer(combined?.dataLayers?.dsmUrl)]);
    ctx.parcel = lotForDesign(ctx.parcel, ctx.estimate, pin);
    return ctx;
  }
  const key = source.key;
  const at = `location.latitude=${pin.lat}&location.longitude=${pin.lng}`;
  const [insights, layers] = await Promise.all([
    getJson(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${at}&requiredQuality=LOW&key=${key}`).catch(() => null),
    getJson(
      `https://solar.googleapis.com/v1/dataLayers:get?${at}&radiusMeters=${LAYERS_RADIUS_M}&view=FULL_LAYERS&requiredQuality=LOW&pixelSizeMeters=0.5&key=${key}`,
    ).catch(() => null) as Promise<{ maskUrl?: string; dsmUrl?: string } | null>,
  ]);
  if (insights) ctx.estimate = estimateFromGoogleInsights(insights as GoogleInsights);
  const layer = (u?: string) => (u ? getBytes(`${u}&key=${key}`).then(parseRaster) : Promise.resolve(null));
  [ctx.mask, ctx.dsm] = await Promise.all([layer(layers?.maskUrl), layer(layers?.dsmUrl)]);
  ctx.parcel = lotForDesign(ctx.parcel, ctx.estimate, pin);
  return ctx;
}

/* ── Drawing ────────────────────────────────────────────────────────── */

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

const pts = (geo: SnapshotGeo, ring: LatLngRing) => ring.map((p) => toPx(geo, p).map((v) => v.toFixed(1)).join(",")).join(" ");

/** Faces, outline, panels and obstructions drawn over the satellite image, cropped 4:3 to the roof; JPEG thumbnail (360×270) and large (≤1200 wide). */
export async function renderRoofDesign(image: Snapshot, d: RoofDesign): Promise<{ thumb: Buffer; large: Buffer }> {
  const { png, geo } = image;
  const mpp = snapshotMetresPerPixel(geo);
  const panelPolys = d.panels.map((p) => panelCorners(p, d.dims));
  const stroke = Math.max(2, Math.round(geo.widthPx / 640));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${geo.widthPx}" height="${geo.heightPx}">
  ${d.faceSet.faces.map((f) => `<polygon points="${pts(geo, f.ring)}" fill="rgba(255,232,102,0.10)" stroke="#FFC21A" stroke-width="${stroke}" stroke-linejoin="round"/>`).join("")}
  ${d.outline.map((r) => `<polygon points="${pts(geo, r)}" fill="none" stroke="#FFE866" stroke-width="${stroke + 1}" stroke-linejoin="round"/>`).join("")}
  ${panelPolys.map((r) => `<polygon points="${pts(geo, r)}" fill="#13284A" fill-opacity="0.92" stroke="#9CC3FF" stroke-width="${Math.max(1, stroke - 1)}"/>`).join("")}
  ${d.faceSet.obstructions.map((o) => `<polygon points="${pts(geo, o.ring)}" fill="rgba(246,138,10,0.35)" stroke="#F68A0A" stroke-width="${stroke}"/>`).join("")}
</svg>`;

  // Crop: the roof plus about 4 m around it, at least 18 m across, 4:3.
  const all = [...d.outline.flat(), ...panelPolys.flat()].map((p) => toPx(geo, p));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const pad = 4 / mpp;
  const minSpan = 18 / mpp;
  const x1 = Math.max(...xs) + pad;
  const y1 = Math.max(...ys) + pad;
  let x0 = Math.min(...xs) - pad;
  let y0 = Math.min(...ys) - pad;
  let w = Math.max(x1 - x0, minSpan);
  let h = Math.max(y1 - y0, minSpan * 0.75);
  if (w / h < 4 / 3) w = (h * 4) / 3;
  else h = (w * 3) / 4;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  w = Math.min(w, geo.widthPx);
  h = Math.min(h, geo.heightPx);
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

/* ── Pin in, design out ─────────────────────────────────────────────── */

export type DesignRoofAtResult =
  | { status: "READY"; design: RoofDesign; context: RoofDesignContext; image: Snapshot | null }
  | { status: "NO_ROOF"; context: RoofDesignContext; image: Snapshot | null; message: string };

/**
 * The whole design for a pin on the server: inputs loaded (unless given),
 * the satellite image analysed, the engine run.
 */
export async function designRoofAt(
  pin: LatLng,
  opts: DesignRoofOptions & {
    context?: RoofDesignContext;
    source?: RoofDataSource | null;
    fetchImage?: (pin: LatLng, zoom: number) => Promise<Snapshot>;
  } = {},
): Promise<DesignRoofAtResult> {
  // The satellite image doesn't depend on Google's data: fetch it alongside.
  const fetchImage = opts.fetchImage ?? fetchSnapshotOrNsw;
  const early = new Map<number, Promise<Snapshot>>();
  if (!opts.context?.snapshot) {
    const first = fetchImage(pin, ROOF_SNAPSHOT.zoom);
    first.catch(() => {});
    early.set(ROOF_SNAPSHOT.zoom, first);
  }
  const fetchEarly = (p: LatLng, zoom: number) => early.get(zoom) ?? fetchImage(p, zoom);
  // Owner's rule: Opus traces every roof first (visible lines and
  // intersection points, borders, faces, obstructions). It starts as soon as
  // the zoom-21 image and the land lot are in, alongside Google's data.
  const aiFirst = early.get(ROOF_SNAPSHOT.zoom);
  const contextP = opts.context ? Promise.resolve(opts.context) : loadRoofContext(pin, opts.source === undefined ? defaultDataSource() : opts.source);
  const wantTrace = !opts.context?.aiTrace && !opts.outline && Boolean(aiFirst) && aiRoofFacesEnabled();
  // In NSW, the state's surveyed aerial photo of the same frame goes with it
  // (owner, 9 Nov 2026): lined up with Google's, so Opus can confirm faint
  // lines and corners on a second picture.
  const nswP = wantTrace && inNsw(pin.lat, pin.lng) ? aiFirst!.then((img) => nswSecondPhoto(img, pin)).catch(() => null) : Promise.resolve(null);
  const traceP = wantTrace
    ? Promise.all([aiFirst!, contextP.catch(() => null), nswP]).then(([img, ctx, second]) => fetchAiRoofTrace(img, { lot: ctx?.parcel?.ring ?? null, key: aiTraceKey(pin), second })).catch(() => null)
    : null;
  const context = await contextP;
  // The lot may not hold the whole house (a property over two lots): widen it first.
  context.parcel = lotForDesign(context.parcel, context.estimate, pin);
  let image: Snapshot | null = null;
  if (!context.snapshot) {
    try {
      const r = await analyseSnapshotAt(context, fetchEarly);
      image = r.image;
      context.snapshot = r.analysis;
    } catch {
      // No image: the engine falls back to Google's mask or box.
    }
  }
  if (traceP) {
    context.aiTrace = await traceP;
    if (context.aiTrace === null && aiTraceRunning(aiTraceKey(pin))) context.aiTracePending = true;
    if (context.aiTrace?.faces.length) context.aiFaces = context.aiTrace.faces;
    // Opus says there is no building roof here (bare ground, a yard, a building site).
    if (context.aiTrace?.noRoof) {
      return { status: "NO_ROOF", context, image, message: "No building roof at this address in the satellite image (bare ground, a yard or a building site)." };
    }
  }
  const design = designRoof(context, opts);
  if (!design) return { status: "NO_ROOF", context, image, message: "Couldn't find a roof at this address in the satellite image." };
  return { status: "READY", design, context, image };
}
