"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GoogleMap, OverlayView, Polygon, Polyline } from "@react-google-maps/api";
import Icon from "@/components/ui/Icons";
import { useGoogleMaps } from "@/components/providers/GoogleMapsProvider";
import {
  DESIGNS_LOCATION_STEP,
  DESIGNS_SOLAR_PANEL_STEP,
  type DesignsMapLocation,
} from "@/utils/constant";
import { useSolarEstimate } from "@/hooks/useSolarEstimate";
import { useSolarLayers, type SolarLayerType } from "@/hooks/useSolarLayers";
import { useBuildingFootprint } from "@/hooks/useBuildingFootprint";
import { useCadastralParcel } from "@/hooks/useCadastralParcel";
import type { GeoTiffOverlay } from "@/utils/geotiff";
import {
  extractRoofOutlinesFromMask,
  type LatLngRing,
  type RoofOutline,
} from "@/utils/roofMaskContour";
import type { SolarEstimateResult, SolarPanel } from "@/types/solar";
import { generatePanelsForFaces } from "@/lib/designer/panelLayout";
import { splitRoofsIntoFaces } from "@/lib/designer/roofFaces";
import { detectRoofFaces } from "@/lib/designer/roofFaceDetect";
import { regularizeRoofOutlines } from "@/lib/designer/roofLines";
import {
  checkInteriorLine,
  fitEavesToMask,
  interiorEdges,
  type LineCheck,
} from "@/lib/designer/roofLineCheck";
import {
  DESIGN_RULES,
  inverterSizingFor,
  roofPitchDegrees,
  type PanelOrientation,
} from "@/lib/designer/designRules";
import { mergeProposalData } from "@/lib/store/designProposalSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

const MAP_CONTAINER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "25px",
};

const ACTIVE_LAYERS: SolarLayerType[] = ["rgb", "mask", "dsm"];

/** Hard cap on Google Maps Polygon instances for generated panels (perf). Keep ≥ typical “panels that fit” so the map matches the left-panel count. */
const MAX_MAP_SOLAR_PANEL_POLYGONS = 1500;

/**
 * Minimum fraction of Google's own `wholeRoofAreaM2` the mask trace has to
 * cover before it's trusted as "the roof". A simple house roof is usually
 * one solid, confidently-classified blob close to 100% coverage. A complex
 * or steeply sloped roof can end up with the mask only flagging a small
 * flat/confident section — a trace that is *present* but covers, say, 15%
 * of the real building is a worse starting point than a rectangle roughly
 * covering the real footprint, even though "present" would otherwise look
 * like a trustworthy result.
 */
const MIN_MASK_COVERAGE_FRACTION = 0.5;

/**
 * Beyond this, Google's "nearest building" bounding box is almost certainly
 * a different building, not this one — see `boundingBoxDistanceFromPinM`.
 */
const MAX_BOUNDING_BOX_DISTANCE_M = 80;

/**
 * Beyond this, a footprint match and Google's own (real, non-estimated)
 * match for the same location almost certainly disagree about which
 * building this is — e.g. the footprint dataset matching a shed or garage
 * near the house instead of the house itself. Google's AU imagery is often
 * too dated to trust over a footprint match (the whole reason footprint is
 * preferred in the first place), but when Google DID return a genuine match
 * this far from the footprint, that's independent corroboration something's
 * wrong with the footprint pick, worth falling back to the mask trace for.
 */
const MAX_FOOTPRINT_GOOGLE_DISAGREEMENT_M = 40;

function formatNumber(n: number): string {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

function coordsMatchPin(
  pinLat: number,
  pinLng: number,
  loc: DesignsMapLocation,
) {
  return Math.abs(pinLat - loc.lat) < 1e-5 && Math.abs(pinLng - loc.lng) < 1e-5;
}

/* ── Geo helpers ─────────────────────────────────────────────── */

/**
 * Convert a panel center + dimensions to the four corner lat/lng coords.
 * Rotation is measured in planar degrees from the east axis counter-clockwise.
 */
function panelCorners(
  center: { lat: number; lng: number },
  heightM: number,
  widthM: number,
  orientation: "PORTRAIT" | "LANDSCAPE",
  rotationDegrees = 0,
  /** Roof pitch: the up-slope side looks shorter from above by cos(pitch). */
  slopeDegrees = 0,
): google.maps.LatLngLiteral[] {
  const metersPerLat = 111320;
  const metersPerLng = 111320 * Math.cos((center.lat * Math.PI) / 180);

  // Same convention as the packer (panelLayout.ts): portrait = long side up
  // the slope, whichever field the data source calls height — otherwise a
  // swapped height/width draws every panel turned 90° from where it was packed.
  const longSide = Math.max(heightM, widthM);
  const shortSide = Math.min(heightM, widthM);
  const halfHeightMeters =
    ((orientation === "LANDSCAPE" ? shortSide : longSide) / 2) *
    Math.cos((slopeDegrees * Math.PI) / 180);
  const halfWidthMeters = (orientation === "LANDSCAPE" ? longSide : shortSide) / 2;
  const angle = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    { x: -halfWidthMeters, y: halfHeightMeters },
    { x: halfWidthMeters, y: halfHeightMeters },
    { x: halfWidthMeters, y: -halfHeightMeters },
    { x: -halfWidthMeters, y: -halfHeightMeters },
  ].map((point) => {
    const rotatedX = point.x * cos - point.y * sin;
    const rotatedY = point.x * sin + point.y * cos;
    return {
      lat: center.lat + rotatedY / metersPerLat,
      lng: center.lng + rotatedX / metersPerLng,
    };
  });
}


/* ── Imperative overlay hook ─────────────────────────────────── */

function useImperativeOverlay(
  map: google.maps.Map | null,
  overlay: GeoTiffOverlay | null,
  opacity: number,
  visible: boolean,
) {
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);

  useEffect(() => {
    overlayRef.current?.setMap(null);
    overlayRef.current = null;

    if (!map || !overlay || !visible) return;

    const { north, south, east, west } = overlay.bounds;
    const bounds = new google.maps.LatLngBounds(
      { lat: south, lng: west },
      { lat: north, lng: east },
    );
    const g = new google.maps.GroundOverlay(overlay.imageUrl, bounds, {
      opacity,
      clickable: false,
    });
    g.setMap(map);
    overlayRef.current = g;

    return () => g.setMap(null);
  }, [map, overlay, opacity, visible]);
}

/* ── Imperative solar panels hook ───────────────────────────── */

function useImperativePanels(
  map: google.maps.Map | null,
  panels: SolarPanel[] | undefined,
  panelDimensions: { heightM: number; widthM: number } | undefined,
  visible: boolean,
) {
  const polygonsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    if (!map || !panels?.length || !panelDimensions || !visible) return;

    const subset = balancePanelsAcrossSegments(
      panels,
      MAX_MAP_SOLAR_PANEL_POLYGONS,
    );
    const created: google.maps.Polygon[] = [];

    for (const panel of subset) {
      const polygon = new google.maps.Polygon({
        paths: panelCorners(
          panel.center,
          panelDimensions.heightM,
          panelDimensions.widthM,
          panel.orientation,
          panel.rotationDegrees,
          panel.slopeDegrees,
        ),
        strokeColor: "#FFF176",
        strokeWeight: 0.8,
        fillColor: "#0B0C0C",
        fillOpacity: 0.82,
        clickable: false,
      });
      polygon.setMap(map);
      created.push(polygon);
    }

    polygonsRef.current = created;

    return () => {
      created.forEach((p) => p.setMap(null));
    };
  }, [map, panels, panelDimensions, visible]);
}

/**
 * Roof outline preview (before the customer enters edit mode): every polygon
 * traced from the Solar roof-mask GeoTIFF (true footprint, possibly several
 * disconnected sections on a large roof), else one rectangle from Building
 * Insights `boundingBox`.
 */
function useImperativeRoofOutline(
  map: google.maps.Map | null,
  maskOutlines: LatLngRing[] | null,
  buildingBoundingBox: SolarEstimateResult["boundingBox"] | undefined,
  visible: boolean,
) {
  const overlaysRef = useRef<(google.maps.Rectangle | google.maps.Polygon)[]>(
    [],
  );

  useEffect(() => {
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (!map || !visible) return;

    const opts = {
      strokeColor: "#00E5FF",
      strokeWeight: 2.5,
      strokeOpacity: 0.95,
      fillColor: "#00E5FF",
      fillOpacity: 0.04,
      clickable: false,
    } as const;

    if (maskOutlines && maskOutlines.length > 0) {
      const created = maskOutlines
        .filter((ring) => ring.length >= 3)
        .map((ring) => new google.maps.Polygon({ paths: ring, ...opts }));
      created.forEach((poly) => poly.setMap(map));
      overlaysRef.current = created;
      return () => created.forEach((poly) => poly.setMap(null));
    }

    if (buildingBoundingBox) {
      const rect = new google.maps.Rectangle({
        bounds: {
          north: buildingBoundingBox.ne.lat,
          south: buildingBoundingBox.sw.lat,
          east: buildingBoundingBox.ne.lng,
          west: buildingBoundingBox.sw.lng,
        },
        ...opts,
      });
      rect.setMap(map);
      overlaysRef.current = [rect];
      return () => rect.setMap(null);
    }
  }, [map, maskOutlines, buildingBoundingBox, visible]);
}

/* ── Roof-polygon editing helpers ───────────────────────────── */

type RoofPolygon = {
  id: number;
  paths: google.maps.LatLngLiteral[];
};

function makeDefaultPolygon(
  center: { lat: number; lng: number },
  offsetDeg = 0,
): google.maps.LatLngLiteral[] {
  const d = 0.00008;
  return [
    { lat: center.lat - d + offsetDeg, lng: center.lng - d + offsetDeg },
    { lat: center.lat + d + offsetDeg, lng: center.lng - d + offsetDeg },
    { lat: center.lat + d + offsetDeg, lng: center.lng + d + offsetDeg },
    { lat: center.lat - d + offsetDeg, lng: center.lng + d + offsetDeg },
  ];
}

function boundingBoxToPolygon(
  box: SolarEstimateResult["boundingBox"],
): google.maps.LatLngLiteral[] {
  return [
    { lat: box.ne.lat, lng: box.sw.lng },
    { lat: box.ne.lat, lng: box.ne.lng },
    { lat: box.sw.lat, lng: box.ne.lng },
    { lat: box.sw.lat, lng: box.sw.lng },
  ];
}

/** Planar-approximation distance between two lat/lng points, in meters — fine at building/block scale. */
function distanceM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const dLat = (b.lat - a.lat) * metersPerDegLat;
  const dLng = (b.lng - a.lng) * metersPerDegLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Google's Solar API finds the *nearest* building to the queried point, not
 * necessarily a building *at* it — on vacant/cleared/under-construction
 * blocks (no roof for either data source to find) it can snap to a
 * neighbour's house across the street instead. Distance from the pin to the
 * box's own center.
 */
function boundingBoxDistanceFromPinM(
  box: SolarEstimateResult["boundingBox"],
  pin: { lat: number; lng: number },
): number {
  return distanceM(pin, {
    lat: (box.ne.lat + box.sw.lat) / 2,
    lng: (box.ne.lng + box.sw.lng) / 2,
  });
}

function ringCentroid(ring: LatLngRing): { lat: number; lng: number } {
  const sum = ring.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length };
}

type ParcelBounds = { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };

/**
 * Sutherland–Hodgman clip of a ring against an axis-aligned lat/lng box, one
 * edge at a time. Used to trim a building-footprint polygon down to one
 * address's parcel: attached/terrace buildings share one continuous
 * roofline from above, so the footprint dataset returns a single polygon
 * for the whole row — Google's per-premise geocode `bounds`, when present,
 * is roughly the parcel, so clipping against it keeps just this address's
 * slice instead of the whole row.
 */
function clipRingToBounds(
  ring: LatLngRing,
  bounds: ParcelBounds,
): LatLngRing {
  type Pt = { lat: number; lng: number };
  const clipEdge = (
    points: Pt[],
    inside: (p: Pt) => boolean,
    intersect: (a: Pt, b: Pt) => Pt,
  ): Pt[] => {
    if (points.length === 0) return [];
    const out: Pt[] = [];
    for (let i = 0; i < points.length; i++) {
      const curr = points[i];
      const prev = points[(i - 1 + points.length) % points.length];
      const currIn = inside(curr);
      const prevIn = inside(prev);
      if (currIn) {
        if (!prevIn) out.push(intersect(prev, curr));
        out.push(curr);
      } else if (prevIn) {
        out.push(intersect(prev, curr));
      }
    }
    return out;
  };

  let pts: Pt[] = ring;
  pts = clipEdge(
    pts,
    (p) => p.lng >= bounds.sw.lng,
    (a, b) => {
      const t = (bounds.sw.lng - a.lng) / (b.lng - a.lng);
      return { lat: a.lat + t * (b.lat - a.lat), lng: bounds.sw.lng };
    },
  );
  pts = clipEdge(
    pts,
    (p) => p.lng <= bounds.ne.lng,
    (a, b) => {
      const t = (bounds.ne.lng - a.lng) / (b.lng - a.lng);
      return { lat: a.lat + t * (b.lat - a.lat), lng: bounds.ne.lng };
    },
  );
  pts = clipEdge(
    pts,
    (p) => p.lat >= bounds.sw.lat,
    (a, b) => {
      const t = (bounds.sw.lat - a.lat) / (b.lat - a.lat);
      return { lat: bounds.sw.lat, lng: a.lng + t * (b.lng - a.lng) };
    },
  );
  pts = clipEdge(
    pts,
    (p) => p.lat <= bounds.ne.lat,
    (a, b) => {
      const t = (bounds.ne.lat - a.lat) / (b.lat - a.lat);
      return { lat: bounds.ne.lat, lng: a.lng + t * (b.lng - a.lng) };
    },
  );
  return pts;
}

function ringSignedArea(ring: LatLngRing): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.lng * b.lat - b.lng * a.lat;
  }
  return sum / 2;
}

/**
 * Sutherland–Hodgman clip of a ring against an arbitrary convex polygon
 * (not just an axis-aligned box) — e.g. a real NSW cadastral lot boundary,
 * which is rarely a clean rectangle. Clips sequentially against each edge
 * of `clip`, so a genuinely non-convex clip polygon (an L-shaped lot, say)
 * can clip incorrectly — the caller's coverage sanity check is what catches
 * that case, same as it catches a misaligned box clip.
 */
function clipRingToConvexPolygon(subject: LatLngRing, clip: LatLngRing): LatLngRing {
  if (subject.length < 3 || clip.length < 3) return [];
  const ccw = ringSignedArea(clip) > 0;

  const inside = (
    p: { lat: number; lng: number },
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): boolean => {
    const cross = (b.lng - a.lng) * (p.lat - a.lat) - (b.lat - a.lat) * (p.lng - a.lng);
    return ccw ? cross >= 0 : cross <= 0;
  };

  const intersection = (
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): { lat: number; lng: number } => {
    const x1 = p1.lng,
      y1 = p1.lat,
      x2 = p2.lng,
      y2 = p2.lat;
    const x3 = a.lng,
      y3 = a.lat,
      x4 = b.lng,
      y4 = b.lat;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-15) return p2;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return { lng: x1 + t * (x2 - x1), lat: y1 + t * (y2 - y1) };
  };

  let output: LatLngRing = subject;
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) break;
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const curr = input[j];
      const prev = input[(j - 1 + input.length) % input.length];
      const currIn = inside(curr, a, b);
      const prevIn = inside(prev, a, b);
      if (currIn) {
        if (!prevIn) output.push(intersection(prev, curr, a, b));
        output.push(curr);
      } else if (prevIn) {
        output.push(intersection(prev, curr, a, b));
      }
    }
  }
  return output;
}

/** Shoelace formula over a planar meters projection — fine at building scale. */
function ringAreaM2(ring: LatLngRing): number {
  if (ring.length < 3) return 0;
  const avgLat = ring.reduce((sum, p) => sum + p.lat, 0) / ring.length;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((avgLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ax = a.lng * metersPerDegLng;
    const ay = a.lat * metersPerDegLat;
    const bx = b.lng * metersPerDegLng;
    const by = b.lat * metersPerDegLat;
    area += ax * by - bx * ay;
  }
  return Math.abs(area / 2);
}

function parcelBoundsAreaM2(bounds: ParcelBounds): number {
  const widthM = distanceM(bounds.sw, { lat: bounds.sw.lat, lng: bounds.ne.lng });
  const heightM = distanceM(bounds.sw, { lat: bounds.ne.lat, lng: bounds.sw.lng });
  return widthM * heightM;
}

/**
 * Below this, the clip is almost certainly a misalignment, not a legitimate
 * trim — e.g. a large/irregular commercial footprint where Google's parcel
 * box only grazes one corner, clipping away nearly the whole real roof
 * rather than isolating one address's share of a shared building.
 */
const MIN_CLIP_COVERAGE_FRACTION = 0.35;

/** Dedupe key must include roof segment so nearby/overlapping polygons do not steal each other's panels. */
function getSolarPanelKey(panel: SolarPanel): string {
  return [
    panel.segmentIndex,
    panel.center.lat.toFixed(7),
    panel.center.lng.toFixed(7),
    panel.orientation,
    (panel.rotationDegrees ?? 0).toFixed(2),
  ].join(":");
}

function dedupeSolarPanels(panels: SolarPanel[]): SolarPanel[] {
  const seen = new Set<string>();
  const unique: SolarPanel[] = [];

  for (const panel of panels) {
    const key = getSolarPanelKey(panel);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(panel);
  }

  return unique;
}

function balancePanelsAcrossSegments(
  panels: SolarPanel[],
  maxPanels: number,
): SolarPanel[] {
  if (panels.length <= maxPanels) {
    return panels;
  }

  const grouped = new Map<number, SolarPanel[]>();
  for (const panel of panels) {
    const group = grouped.get(panel.segmentIndex) ?? [];
    group.push(panel);
    grouped.set(panel.segmentIndex, group);
  }

  const queues = [...grouped.values()];
  const balanced: SolarPanel[] = [];

  while (
    balanced.length < maxPanels &&
    queues.some((queue) => queue.length > 0)
  ) {
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      balanced.push(next);
      if (balanced.length >= maxPanels) break;
    }
  }

  return balanced;
}

/* ── Main component ──────────────────────────────────────────── */

type ActiveLayer = "satellite" | "panels";

export type DesignsSolarMetricsValue = {
  systemSize: string;
  totalPanels: string;
  numberOfPanels: string;
  co2Offset: string;
};

export type DesignsSolarPanelStepHandle = {
  getMetrics: () => DesignsSolarMetricsValue;
  /** Writes current roof + panels to Redux so Next/Back keeps the layout */
  persistDesignToStore: () => void;
};

export const DesignsSolarPanelStepContent = forwardRef<
  DesignsSolarPanelStepHandle,
  object
>(function DesignsSolarPanelStepContent(_, ref) {
  const { isLoaded } = useGoogleMaps();
  const dispatch = useAppDispatch();
  const solarDesignFromStore = useAppSelector(
    (s) => s.designProposal.solarDesign,
  );

  const proposalCustomer = useAppSelector((s) => s.designProposal.customer);
  const selectedLocation = useMemo((): DesignsMapLocation | null => {
    if (proposalCustomer.mapLat != null && proposalCustomer.mapLng != null) {
      return {
        lat: proposalCustomer.mapLat,
        lng: proposalCustomer.mapLng,
      };
    }
    return null;
  }, [proposalCustomer.mapLat, proposalCustomer.mapLng]);

  /** Google's tight per-premise geocode box, when available — see `clipRingToBounds`. */
  const parcelBounds = useMemo((): ParcelBounds | null => {
    if (proposalCustomer.mapParcelBoundsSw && proposalCustomer.mapParcelBoundsNe) {
      return {
        sw: proposalCustomer.mapParcelBoundsSw,
        ne: proposalCustomer.mapParcelBoundsNe,
      };
    }
    return null;
  }, [proposalCustomer.mapParcelBoundsSw, proposalCustomer.mapParcelBoundsNe]);

  useEffect(() => {
    if (!selectedLocation || !solarDesignFromStore) return;
    if (
      coordsMatchPin(
        solarDesignFromStore.pinLat,
        solarDesignFromStore.pinLng,
        selectedLocation,
      )
    ) {
      return;
    }
    dispatch(mergeProposalData({ solarDesign: null }));
  }, [dispatch, selectedLocation, solarDesignFromStore]);

  const [mapReady, setMapReady] = useState<google.maps.Map | null>(null);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("panels");

  /* ── Roof polygon editing state ── */
  const [isEditing, setIsEditing] = useState(false);
  const roofCounter = useRef(0);
  const [editingRoofs, setEditingRoofs] = useState<RoofPolygon[]>([]);
  /** Which roof polygon is selected for delete (click a roof on the map). */
  const [selectedRoofId, setSelectedRoofId] = useState<number | null>(null);
  const [savedRoofs, setSavedRoofs] = useState<google.maps.LatLngLiteral[][]>(
    [],
  );
  const polygonRefs = useRef<Map<number, google.maps.Polygon>>(new Map());
  const [generatedPanels, setGeneratedPanels] = useState<SolarPanel[] | null>(
    null,
  );
  const [polygonTotalAreaM2, setPolygonTotalAreaM2] = useState<number | null>(
    null,
  );
  const [isGeneratingPanels, setIsGeneratingPanels] = useState(false);
  const [hasInitializedRoof, setHasInitializedRoof] = useState(false);
  /** One orientation for every panel on every roof — never mixed. */
  const [panelOrientation, setPanelOrientation] = useState<PanelOrientation>(
    DESIGN_RULES.defaultOrientation,
  );

  const { data, loading, error, retry } = useSolarEstimate(selectedLocation);
  const {
    rgb: rgbOverlay,
    mask: maskOverlay,
    dsm: dsmRaster,
    loading: layersLoading,
    error: layersError,
    retry: layersRetry,
  } = useSolarLayers(selectedLocation, ACTIVE_LAYERS);
  const footprint = useBuildingFootprint(selectedLocation);
  const cadastralParcel = useCadastralParcel(selectedLocation);

  const maskRaster = maskOverlay?.raster ?? null;

  /**
   * Every roof section traced from the mask, largest first — a large
   * commercial/industrial roof commonly comes back as several disconnected
   * blobs (ridge lines, rooftop plant, vents), so this is a list rather than
   * one outline.
   */
  const maskTracedOutlines = useMemo((): RoofOutline[] => {
    if (!maskRaster || !selectedLocation) return [];
    return extractRoofOutlinesFromMask(maskRaster);
  }, [maskRaster, selectedLocation]);

  const roofMaskOutlines = useMemo((): LatLngRing[] | null => {
    return maskTracedOutlines.length > 0
      ? maskTracedOutlines.map((o) => o.ring)
      : null;
  }, [maskTracedOutlines]);

  /**
   * True once the mask trace covers enough of Google's own whole-roof figure
   * to be trusted as "the roof" — see `MIN_MASK_COVERAGE_FRACTION`. With no
   * whole-roof figure to compare against, any non-empty trace is accepted
   * (nothing better to fall back to anyway, short of the bounding box).
   */
  const maskOutlinesCoverEnoughOfRoof = useMemo(() => {
    if (maskTracedOutlines.length === 0) return false;
    const wholeRoofAreaM2 = data?.wholeRoofAreaM2;
    if (!wholeRoofAreaM2) return true;
    const tracedAreaM2 = maskTracedOutlines.reduce(
      (sum, o) => sum + o.areaM2,
      0,
    );
    return tracedAreaM2 >= wholeRoofAreaM2 * MIN_MASK_COVERAGE_FRACTION;
  }, [data?.wholeRoofAreaM2, maskTracedOutlines]);

  /**
   * Microsoft's free building-footprint outline (see useBuildingFootprint) —
   * current, Australia-covering satellite data, used ahead of Google's Solar
   * mask trace: Google's Australian imagery is years out of date (see the
   * client doc), so even where its mask trace "covers enough" of the roof it
   * can be tracing a building that no longer looks like this. A footprint
   * match is still just one outline per building (no roof-plane/pitch
   * segmentation), so it's always flagged for the installer to verify below.
   *
   * Clipped to the parcel bounds when available (see `clipRingToBounds`) —
   * attached/terrace buildings share one continuous roofline, so the raw
   * footprint can span several neighbours' addresses, not just this one. A
   * degenerate clip (bounds barely grazing the footprint, or none at all)
   * falls back to the unclipped match rather than a near-empty sliver.
   */
  /**
   * Trims a merged footprint match (e.g. a terrace row, or several close
   * industrial buildings) down to one address's own parcel — cadastral
   * first (a real NSW land-parcel polygon, available for most NSW
   * addresses), falling back to Google's sparser `bounds` rectangle when
   * no cadastral match exists. Both apply the same coverage sanity check:
   * a legitimate trim uses up most of the clip shape's own area; a clip
   * that only grazes a corner of a much bigger footprint signals
   * misalignment, not a real boundary — safer to show the whole
   * (still-flagged-unverified) match than a nonsensical sliver.
   */
  const footprintOutline: LatLngRing | null = useMemo(() => {
    const raw = footprint.data?.ring ?? null;
    if (!raw) return raw;

    const cadastralRing = cadastralParcel.data?.ring ?? null;
    if (cadastralRing) {
      const clipped = clipRingToConvexPolygon(raw, cadastralRing);
      if (clipped.length >= 3) {
        const coverage = ringAreaM2(clipped) / cadastralParcel.data!.areaM2;
        if (coverage >= MIN_CLIP_COVERAGE_FRACTION) return clipped;
      }
    }

    if (parcelBounds) {
      const clipped = clipRingToBounds(raw, parcelBounds);
      if (clipped.length >= 3) {
        const coverage = ringAreaM2(clipped) / parcelBoundsAreaM2(parcelBounds);
        if (coverage >= MIN_CLIP_COVERAGE_FRACTION) return clipped;
      }
    }

    return raw;
  }, [cadastralParcel.data, footprint.data?.ring, parcelBounds]);

  const maskIsGood = Boolean(roofMaskOutlines?.length && maskOutlinesCoverEnoughOfRoof);

  /**
   * True when a footprint match and a *genuine* (non-estimated) Google match
   * for the same point are far enough apart that they're probably different
   * buildings — see `MAX_FOOTPRINT_GOOGLE_DISAGREEMENT_M`. Google's real
   * match is the arbiter here precisely because it's real: when Google did
   * find actual imagery for this address, its own result is independent
   * corroboration the footprint dataset picked the wrong nearby structure
   * (a shed, garage, outbuilding) rather than the house itself.
   */
  const footprintDisagreesWithGoogle = useMemo(() => {
    if (!footprintOutline || !data || data.estimated) return false;
    return (
      distanceM(ringCentroid(footprintOutline), data.center) >
      MAX_FOOTPRINT_GOOGLE_DISAGREEMENT_M
    );
  }, [data, footprintOutline]);

  /**
   * Google's own bounding box, but only when it's actually near the pin —
   * see `boundingBoxDistanceFromPinM`. `undefined` (not just falsy) so call
   * sites can tell "no bounding box" apart from "don't trust this one".
   */
  const boundingBoxNearPin = useMemo((): SolarEstimateResult["boundingBox"] | undefined => {
    if (!data?.boundingBox || !selectedLocation) return undefined;
    const distance = boundingBoxDistanceFromPinM(data.boundingBox, selectedLocation);
    return distance <= MAX_BOUNDING_BOX_DISTANCE_M ? data.boundingBox : undefined;
  }, [data?.boundingBox, selectedLocation]);

  /** A disagreeing footprint is untrusted outright — not just "beaten if something better shows up" — so it never wins over a worse-but-plausible fallback either. */
  const trustedFootprintOutline = footprintDisagreesWithGoogle
    ? null
    : footprintOutline;

  /** True when the starting shape is a real trace of the roof, not a footprint or rectangle guess. */
  const initialRoofIsTraced = Boolean(!trustedFootprintOutline && maskIsGood);

  /** Best roof outline available right now — null while still waiting on a source that could still beat the next fallback. */
  const bestAvailableOutlines = useMemo((): LatLngRing[] | null => {
    if (trustedFootprintOutline) return [trustedFootprintOutline];
    if (maskIsGood) return roofMaskOutlines as LatLngRing[];
    // Google's real match disagreed with the footprint and the mask trace
    // didn't independently pan out — trust Google's own (real, near-pin)
    // bounding box over the footprint rather than showing the wrong building.
    if (footprintDisagreesWithGoogle && boundingBoxNearPin) {
      return [boundingBoxToPolygon(boundingBoxNearPin)];
    }
    // Nothing better corroborates or contradicts it — still the best guess available.
    if (footprintOutline) return [footprintOutline];
    return null;
  }, [
    boundingBoxNearPin,
    footprintDisagreesWithGoogle,
    footprintOutline,
    maskIsGood,
    roofMaskOutlines,
    trustedFootprintOutline,
  ]);

  const initialRoofPolygons = useMemo((): google.maps.LatLngLiteral[][] | null => {
    if (!selectedLocation) return null;
    // All three must resolve before trusting anything: `footprintOutline`
    // (clipped by cadastral/Google bounds) and `footprintDisagreesWithGoogle`
    // both depend on data that arrives asynchronously after the footprint
    // match itself — so a footprint that resolves before the cadastral
    // lookup and Google's own estimate do would otherwise get trusted
    // unclipped/unchecked by default — and, since this effect only ever
    // runs once per address, locked in wrong permanently even after the
    // slower data arrives and would have corrected it.
    if (footprint.loading || cadastralParcel.loading || loading) return null;
    if (bestAvailableOutlines) return bestAvailableOutlines;
    if (boundingBoxNearPin) return [boundingBoxToPolygon(boundingBoxNearPin)];
    if (layersLoading) return null;
    return [makeDefaultPolygon(selectedLocation)];
  }, [
    bestAvailableOutlines,
    boundingBoxNearPin,
    cadastralParcel.loading,
    footprint.loading,
    layersLoading,
    loading,
    selectedLocation,
  ]);

  /**
   * True while the roof(s) on screen came from a building-footprint match, a
   * rectangle guess (the building's bounding box, or — with no coverage at
   * all — a plain default square centered on the pin) rather than a real
   * trace of the roof from imagery. All three are reasonable starting
   * points, but none is "AI found your exact roof" the way a mask trace is —
   * worth flagging so installers know to actually check the shape against
   * the satellite image instead of trusting it outright, which matters most
   * in dense or informally-mapped areas where building-footprint data can be
   * stale or offset from where the building actually is.
   */
  const [roofNeedsVerification, setRoofNeedsVerification] = useState(false);

  /* Reset polygon selection when address changes (derived-state pattern, avoids effect) */
  const [prevSelectedLocation, setPrevSelectedLocation] =
    useState(selectedLocation);
  if (prevSelectedLocation !== selectedLocation) {
    setPrevSelectedLocation(selectedLocation);
    setGeneratedPanels(null);
    setSavedRoofs([]);
    setPolygonTotalAreaM2(null);
    setIsEditing(false);
    setEditingRoofs([]);
    setSelectedRoofId(null);
    setHasInitializedRoof(false);
  }

  useEffect(() => {
    if (!isEditing) {
      setSelectedRoofId(null);
      return;
    }
    if (editingRoofs.length === 0) {
      setSelectedRoofId(null);
      return;
    }
    setSelectedRoofId((prev) => {
      if (prev !== null && editingRoofs.some((r) => r.id === prev)) {
        return prev;
      }
      return editingRoofs[0].id;
    });
  }, [isEditing, editingRoofs]);

  useEffect(() => {
    if (!selectedLocation || hasInitializedRoof || !initialRoofPolygons) {
      return;
    }
    if (
      solarDesignFromStore &&
      coordsMatchPin(
        solarDesignFromStore.pinLat,
        solarDesignFromStore.pinLng,
        selectedLocation,
      ) &&
      (solarDesignFromStore.savedRoofs.length > 0 ||
        (solarDesignFromStore.generatedPanels?.length ?? 0) > 0)
    ) {
      return;
    }

    // One editing roof per detected section — a large roof traced into
    // several disconnected mask blobs starts the editor with all of them
    // instead of just whichever one happened to seed first.
    setEditingRoofs(
      initialRoofPolygons.map((paths) => ({
        id: ++roofCounter.current,
        paths,
      })),
    );
    setIsEditing(true);
    setHasInitializedRoof(true);
    setRoofNeedsVerification(!initialRoofIsTraced);
  }, [
    hasInitializedRoof,
    initialRoofIsTraced,
    initialRoofPolygons,
    selectedLocation,
    solarDesignFromStore,
  ]);

  const availablePanelLimit = useMemo(() => {
    return generatedPanels?.length ?? 0;
  }, [generatedPanels]);

  const [panelCountInput, setPanelCountInput] = useState("");

  const mapCaptureRef = useRef<HTMLDivElement | null>(null);
  const panelCountInputRef = useRef("");
  const solarPersistRef = useRef({
    savedRoofs: [] as google.maps.LatLngLiteral[][],
    generatedPanels: null as SolarPanel[] | null,
    polygonTotalAreaM2: null as number | null,
    panelCountInput: "",
    panelOrientation: DESIGN_RULES.defaultOrientation as PanelOrientation,
  });
  const screenshotFromStoreRef = useRef<string | null>(null);
  const didHydrateFromReduxRef = useRef(false);

  useEffect(() => {
    panelCountInputRef.current = panelCountInput;
  }, [panelCountInput]);

  useEffect(() => {
    solarPersistRef.current = {
      savedRoofs,
      generatedPanels,
      polygonTotalAreaM2,
      panelCountInput,
      panelOrientation,
    };
  }, [
    savedRoofs,
    generatedPanels,
    polygonTotalAreaM2,
    panelCountInput,
    panelOrientation,
  ]);

  useEffect(() => {
    screenshotFromStoreRef.current =
      solarDesignFromStore?.mapScreenshotDataUrl ?? null;
  }, [solarDesignFromStore?.mapScreenshotDataUrl]);

  useLayoutEffect(() => {
    didHydrateFromReduxRef.current = false;
  }, [proposalCustomer.mapLat, proposalCustomer.mapLng]);

  useLayoutEffect(() => {
    if (!selectedLocation || !solarDesignFromStore) return;
    if (
      !coordsMatchPin(
        solarDesignFromStore.pinLat,
        solarDesignFromStore.pinLng,
        selectedLocation,
      )
    ) {
      return;
    }
    if (didHydrateFromReduxRef.current) return;
    didHydrateFromReduxRef.current = true;
    setSavedRoofs(solarDesignFromStore.savedRoofs);
    setGeneratedPanels(solarDesignFromStore.generatedPanels);
    setPolygonTotalAreaM2(solarDesignFromStore.polygonTotalAreaM2);
    setPanelCountInput(solarDesignFromStore.panelCountInput);
    setPanelOrientation(
      solarDesignFromStore.panelOrientation ?? DESIGN_RULES.defaultOrientation,
    );
    setHasInitializedRoof(true);
    setIsEditing(false);
  }, [selectedLocation, solarDesignFromStore]);

  const selectedPanelCount = useMemo(() => {
    // An emptied box means "no explicit count yet" and falls back to the
    // roof's full capacity — distinct from the user explicitly typing 0,
    // which must be honored as a real (zero-panel) selection.
    if (panelCountInput === "") return availablePanelLimit;
    const parsed = Number.parseInt(panelCountInput, 10);
    if (!Number.isFinite(parsed)) return availablePanelLimit;
    return Math.min(Math.max(parsed, 0), availablePanelLimit);
  }, [availablePanelLimit, panelCountInput]);

  const visiblePanels = useMemo(
    () => (generatedPanels ?? []).slice(0, selectedPanelCount),
    [generatedPanels, selectedPanelCount],
  );

  const panelCountDisplayValue = useMemo(() => {
    if (!availablePanelLimit) return "";
    if (panelCountInput === "") return String(availablePanelLimit);
    const parsed = Number.parseInt(panelCountInput, 10);
    if (!Number.isFinite(parsed)) return String(availablePanelLimit);
    return String(Math.min(Math.max(parsed, 0), availablePanelLimit));
  }, [availablePanelLimit, panelCountInput]);

  const [proposalMetrics, setProposalMetrics] =
    useState<DesignsSolarMetricsValue>({
      systemSize: "6.6 kW",
      totalPanels: "16",
      numberOfPanels: "16",
      co2Offset: "7.2 tonnes/year",
    });

  useEffect(() => {
    const panelCount =
      panelCountDisplayValue ||
      String(selectedPanelCount || availablePanelLimit || 0);
    const watts = data?.panelCapacityWatts ?? 0;
    const systemSizeKw =
      watts > 0 ? ((Number(panelCount) * watts) / 1000).toFixed(1) : "6.6";
    const co2OffsetTonnes =
      data?.co2SavingsKgPerYear != null
        ? `${(data.co2SavingsKgPerYear / 1000).toFixed(1)} tonnes/year`
        : "7.2 tonnes/year";

    setProposalMetrics({
      systemSize: `${systemSizeKw} kW`,
      totalPanels: panelCount,
      numberOfPanels: panelCount,
      co2Offset: co2OffsetTonnes,
    });
  }, [
    availablePanelLimit,
    data?.co2SavingsKgPerYear,
    data?.panelCapacityWatts,
    panelCountDisplayValue,
    selectedPanelCount,
  ]);

  /* ── Edit / Save handlers ── */

  const handleEditClick = useCallback(() => {
    if (!selectedLocation) return;
    setIsEditing(true);
    if (savedRoofs.length > 0) {
      // Already-saved shapes — the installer confirmed these (or drew them)
      // before, so there's nothing new to flag.
      setRoofNeedsVerification(false);
      setEditingRoofs(
        savedRoofs.map((paths) => ({ id: ++roofCounter.current, paths })),
      );
    } else {
      const fallback: google.maps.LatLngLiteral[][] = bestAvailableOutlines ?? [
        boundingBoxNearPin
          ? boundingBoxToPolygon(boundingBoxNearPin)
          : makeDefaultPolygon(selectedLocation),
      ];
      setRoofNeedsVerification(!initialRoofIsTraced);
      setEditingRoofs(
        fallback.map((paths) => ({ id: ++roofCounter.current, paths })),
      );
    }
  }, [
    bestAvailableOutlines,
    boundingBoxNearPin,
    initialRoofIsTraced,
    savedRoofs,
    selectedLocation,
  ]);

  const getCurrentEditingPaths = useCallback(() => {
    return editingRoofs.map((roof) => {
      const ref = polygonRefs.current.get(roof.id);
      if (!ref) return roof.paths;
      return ref
        .getPath()
        .getArray()
        .map((p) => ({ lat: p.lat(), lng: p.lng() }));
    });
  }, [editingRoofs]);

  const handleAddRoof = useCallback(() => {
    if (!selectedLocation) return;

    const newId = ++roofCounter.current;
    setEditingRoofs((prev) => [
      ...prev,
      {
        id: newId,
        paths:
          bestAvailableOutlines?.[0] ??
          (boundingBoxNearPin
            ? boundingBoxToPolygon(boundingBoxNearPin)
            : makeDefaultPolygon(selectedLocation, prev.length * 0.0002)),
      },
    ]);
    setSelectedRoofId(newId);
  }, [bestAvailableOutlines, boundingBoxNearPin, selectedLocation]);

  /** Removes the roof currently selected on the map; keeps at least one polygon. */
  const handleDeleteRoof = useCallback(() => {
    if (selectedRoofId === null) return;
    setEditingRoofs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== selectedRoofId);
    });
  }, [selectedRoofId]);

  /**
   * Roof-line finder: faces come from Google's height model when it covers
   * the roof (each face with its own pitch and slope direction), straightened
   * so neighbouring faces share corners. Without usable height data, falls
   * back to the standard hip split of each outline.
   */
  const facesFor = useCallback(
    (paths: google.maps.LatLngLiteral[][]) => {
      const detected = detectRoofFaces(dsmRaster, paths, maskRaster);
      if (detected && detected.length > 0) {
        const rings = regularizeRoofOutlines(detected.map((f) => f.ring));
        return {
          source: "height-model" as const,
          faces: detected.map((f, i) => ({
            ring: rings[i],
            eaveDeg: f.eaveDeg,
            pitchDeg: f.pitchDeg,
            azimuthDeg: f.azimuthDeg as number | undefined,
          })),
        };
      }
      return {
        source: "assumed-hip" as const,
        faces: splitRoofsIntoFaces(paths).map((f) => ({
          ring: f.ring,
          eaveDeg: f.eaveDeg,
          pitchDeg: undefined as number | undefined,
          azimuthDeg: undefined as number | undefined,
        })),
      };
    },
    [dsmRaster, maskRaster],
  );

  const savedFaceSet = useMemo(() => facesFor(savedRoofs), [facesFor, savedRoofs]);
  const savedFaces = savedFaceSet.faces;

  /**
   * Every roof line of the saved design, checked against Google's imagery:
   * eaves against the roof mask, hips/valleys/ridges against the image.
   */
  const lineChecks = useMemo((): LineCheck[] => {
    if (savedRoofs.length === 0) return [];
    const eaves = savedRoofs.flatMap((ring) => fitEavesToMask(ring, maskRaster).checks);
    // Faces traced from the height model run up to ~0.5 m inside the outline.
    const tol = savedFaceSet.source === "height-model" ? 0.5 : 0.05;
    const inner = interiorEdges(savedFaces, savedRoofs, tol).map(([a, b]) =>
      checkInteriorLine(a, b, rgbOverlay?.luma ?? null),
    );
    return [...eaves, ...inner];
  }, [maskRaster, rgbOverlay, savedFaceSet.source, savedFaces, savedRoofs]);

  const lineCheckSummary = useMemo(() => {
    const checked = lineChecks.filter((c) => c.status !== "no-data");
    const ok = checked.filter((c) => c.status === "confirmed" || c.status === "adjusted");
    return { total: lineChecks.length, checked: checked.length, ok: ok.length };
  }, [lineChecks]);

  /** Google's area-weighted roof pitch, or the 22.5° default when there's no real data. */
  const roofPitchDeg = useMemo(
    () => roofPitchDegrees(data?.roofSegments, data?.estimated),
    [data?.estimated, data?.roofSegments],
  );

  /** Packs every roof with the design's single orientation, the 100 mm setback and the roof pitch. */
  const layoutPanels = useCallback(
    (
      paths: google.maps.LatLngLiteral[][],
      orientation: PanelOrientation,
    ): SolarPanel[] | null => {
      if (!data?.panelDimensions) return null;
      // Face rule: find each roof's faces (height model, else hip split) and
      // pack them one at a time, so no panel crosses a hip, valley or ridge.
      const { faces } = facesFor(paths);
      return dedupeSolarPanels(
        generatePanelsForFaces(faces, data.panelDimensions, {
          orientation,
          pitchDeg: roofPitchDeg,
        }),
      );
    },
    [data?.panelDimensions, facesFor, roofPitchDeg],
  );

  /**
   * Writes the design to Redux, after the map has repainted so the
   * screenshot used in proposals shows the new panels.
   */
  const persistSolarDesign = useCallback(
    (
      paths: google.maps.LatLngLiteral[][],
      panels: SolarPanel[] | null,
      totalAreaM2: number,
      orientation: PanelOrientation,
    ) => {
      const pin = selectedLocation;
      if (!pin) return;
      const pathsSnapshot = paths.map((p) => [...p]);
      const panelSnap = panelCountInputRef.current;

      const captureAndPersist = async () => {
        let dataUrl: string | null = null;
        try {
          if (mapCaptureRef.current) {
            const { default: html2canvas } = await import("html2canvas");
            const canvas = await html2canvas(mapCaptureRef.current, {
              scale: 1,
              useCORS: true,
              logging: false,
              backgroundColor: "#1a1d29",
            });
            dataUrl = canvas.toDataURL("image/png");
          }
        } catch {
          dataUrl = null;
        }
        dispatch(
          mergeProposalData({
            solarDesign: {
              pinLat: pin.lat,
              pinLng: pin.lng,
              savedRoofs: pathsSnapshot,
              generatedPanels: panels,
              polygonTotalAreaM2: totalAreaM2,
              panelCountInput: panelSnap,
              mapScreenshotDataUrl: dataUrl,
              panelOrientation: orientation,
            },
          }),
        );
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(() => {
            void captureAndPersist();
          }, 280);
        });
      });
    },
    [dispatch, selectedLocation],
  );

  /**
   * Panel counts for both orientations on the saved roofs, so the toggle can
   * show what switching would give before the customer clicks it.
   */
  const orientationCounts = useMemo((): Record<
    PanelOrientation,
    number
  > | null => {
    if (isEditing || savedRoofs.length === 0 || !data?.panelDimensions) {
      return null;
    }
    return {
      PORTRAIT: layoutPanels(savedRoofs, "PORTRAIT")?.length ?? 0,
      LANDSCAPE: layoutPanels(savedRoofs, "LANDSCAPE")?.length ?? 0,
    };
  }, [data?.panelDimensions, isEditing, layoutPanels, savedRoofs]);

  /**
   * Switches the whole design between portrait and landscape. While editing,
   * the choice applies on Save; once roofs are saved, panels re-lay straight
   * away.
   */
  const handleOrientationChange = useCallback(
    (next: PanelOrientation) => {
      if (next === panelOrientation) return;
      setPanelOrientation(next);
      if (isEditing || savedRoofs.length === 0) return;
      const panels = layoutPanels(savedRoofs, next);
      setGeneratedPanels(panels);
      persistSolarDesign(savedRoofs, panels, polygonTotalAreaM2 ?? 0, next);
    },
    [
      isEditing,
      layoutPanels,
      panelOrientation,
      persistSolarDesign,
      polygonTotalAreaM2,
      savedRoofs,
    ],
  );

  const handleSave = useCallback(() => {
    /* Read final paths from imperative polygon refs (user may have dragged vertices),
       then apply the roof-line rule: straight edges at 0/45/90° to the main
       walls, corners at line intersections, shared corners between roofs. */
    const straightened = regularizeRoofOutlines(
      getCurrentEditingPaths().filter((p) => p.length >= 3),
    );
    // Roof-line check: fit each eave onto Google's roof mask (moved when the
    // real edge is more than 100 mm away), then straighten again.
    const validPaths = maskRaster
      ? regularizeRoofOutlines(
          straightened.map((ring) => fitEavesToMask(ring, maskRaster).ring),
        )
      : straightened;
    setSavedRoofs(validPaths);

    if (validPaths.length === 0) {
      setGeneratedPanels(null);
      setPolygonTotalAreaM2(null);
      polygonRefs.current.clear();
      setIsEditing(false);
      setEditingRoofs([]);
      setSelectedRoofId(null);
      if (selectedLocation) {
        dispatch(
          mergeProposalData({
            solarDesign: {
              pinLat: selectedLocation.lat,
              pinLng: selectedLocation.lng,
              savedRoofs: [],
              generatedPanels: null,
              polygonTotalAreaM2: null,
              panelCountInput: panelCountInputRef.current,
              mapScreenshotDataUrl: null,
              panelOrientation,
            },
          }),
        );
      }
      return;
    }

    let totalArea = 0;
    for (const path of validPaths) {
      totalArea += google.maps.geometry.spherical.computeArea(
        path.map((p) => new google.maps.LatLng(p.lat, p.lng)),
      );
    }
    setPolygonTotalAreaM2(totalArea);

    let panelsToPersist: SolarPanel[] | null = null;
    setIsGeneratingPanels(true);
    try {
      panelsToPersist = layoutPanels(validPaths, panelOrientation);
      setGeneratedPanels(panelsToPersist);
    } finally {
      setIsGeneratingPanels(false);
    }

    polygonRefs.current.clear();
    setIsEditing(false);
    setEditingRoofs([]);
    setSelectedRoofId(null);

    persistSolarDesign(validPaths, panelsToPersist, totalArea, panelOrientation);
  }, [
    dispatch,
    getCurrentEditingPaths,
    layoutPanels,
    maskRaster,
    panelOrientation,
    persistSolarDesign,
    selectedLocation,
  ]);

  /** Inverter and phase needs for the panels currently selected, under the oversizing and export rules. */
  const inverterSizing = useMemo(() => {
    const watts = data?.panelCapacityWatts ?? 0;
    if (!watts || !selectedPanelCount) return null;
    return inverterSizingFor(selectedPanelCount, watts);
  }, [data?.panelCapacityWatts, selectedPanelCount]);

  const mapCenter = selectedLocation ?? DESIGNS_LOCATION_STEP.defaultCenter;
  const mapZoom = selectedLocation ? DESIGNS_LOCATION_STEP.defaultZoom : 14;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    map.setTilt(0);
    map.setHeading(0);
    // `onLoad` fires as soon as the `google.maps.Map` instance exists — not
    // once its projection/viewport has actually finished initialising.
    // Overlays (our roof Polygon included) attached before that can silently
    // fail to render: `map.getBounds()` returns undefined until the map is
    // truly ready. `'idle'` fires once the map has finished rendering
    // (including projection setup), so we gate `mapReady` — and therefore
    // every overlay that depends on it — on that instead.
    google.maps.event.addListenerOnce(map, "idle", () => {
      setMapReady(map);
    });
  }, []);

  /* layer visibility */
  const showSolarRgb = activeLayer === "satellite";
  const showPanels = activeLayer === "panels";

  /* GeoTIFF imagery overlays */
  useImperativeOverlay(mapReady, rgbOverlay, 0.92, showSolarRgb);
  useImperativeOverlay(mapReady, maskOverlay, 0.45, showSolarRgb);

  /* Solar panels + roof outline (building footprint, else mask-traced perimeter, else API bounding box) */
  useImperativePanels(
    mapReady,
    visiblePanels,
    data?.panelDimensions,
    showPanels,
  );
  useImperativeRoofOutline(
    mapReady,
    bestAvailableOutlines,
    boundingBoxNearPin,
    showPanels && !isEditing && savedRoofs.length === 0,
  );

  /* Left panel metric rows */
  const metrics = useMemo(
    () =>
      DESIGNS_SOLAR_PANEL_STEP.metrics.map((metric) => {
        if (!data) return { ...metric, value: "—" };

        if (metric.id === "total-roof-area") {
          const area = polygonTotalAreaM2 ?? data.wholeRoofAreaM2;
          return { ...metric, value: `${formatNumber(area)} m²` };
        }

        if (metric.id === "usable-roof-area") {
          if (polygonTotalAreaM2 !== null && data.panelDimensions) {
            const panelArea =
              data.panelDimensions.heightM * data.panelDimensions.widthM;
            const usable = (generatedPanels?.length ?? 0) * panelArea;
            return {
              ...metric,
              value: `${formatNumber(
                generatedPanels ? usable : polygonTotalAreaM2,
              )} m²`,
            };
          }
          return {
            ...metric,
            value: `${formatNumber(data.maxArrayAreaM2)} m²`,
          };
        }

        /* panels-fit */
        if (generatedPanels !== null) {
          return { ...metric, value: String(generatedPanels.length) };
        }
        return { ...metric, value: "0" };
      }),
    [data, generatedPanels, polygonTotalAreaM2],
  );

  const combinedError = error ?? layersError;
  const combinedRetry = () => {
    if (error) retry();
    if (layersError) layersRetry();
  };

  void combinedError;
  void combinedRetry;

  useImperativeHandle(
    ref,
    () => ({
      getMetrics: () => proposalMetrics,
      persistDesignToStore: () => {
        if (!selectedLocation) return;
        dispatch(
          mergeProposalData({
            solarDesign: {
              pinLat: selectedLocation.lat,
              pinLng: selectedLocation.lng,
              savedRoofs: solarPersistRef.current.savedRoofs,
              generatedPanels: solarPersistRef.current.generatedPanels,
              polygonTotalAreaM2: solarPersistRef.current.polygonTotalAreaM2,
              panelCountInput: solarPersistRef.current.panelCountInput,
              mapScreenshotDataUrl: screenshotFromStoreRef.current,
              panelOrientation: solarPersistRef.current.panelOrientation,
            },
          }),
        );
      },
    }),
    [dispatch, proposalMetrics, selectedLocation],
  );

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-[81px] lg:py-8">
      <div className="mx-auto grid w-full max-w-[1278px] grid-cols-1 gap-5 lg:grid-cols-[591fr_649fr] lg:items-stretch lg:gap-[58px]">
        {/* ── Left panel ── */}
        <div className="flex w-full min-w-0 items-center rounded-[46px] border-[3px] border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber px-6 py-8 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] sm:px-10 sm:py-10 lg:h-full lg:px-[30px] lg:py-[30px]">
          <div className="mx-auto flex w-full max-w-[514px] flex-col items-center gap-6 sm:gap-[32px]">
            {/* Title + description */}
            <div className="flex max-w-[498px] flex-col items-center gap-[10px] text-center">
              <h2
                className="w-full font-source-sans text-[clamp(28px,4.8vw,40px)] font-bold capitalize leading-[1.05] text-white"
                style={{ letterSpacing: "0.248px" }}
              >
                {DESIGNS_SOLAR_PANEL_STEP.title}
              </h2>
              <div
                className="font-source-sans text-[clamp(18px,2.4vw,22px)] font-normal capitalize leading-[1.35] text-black"
                style={{ letterSpacing: "0.248px" }}
              >
                {DESIGNS_SOLAR_PANEL_STEP.descriptionLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            {/* Metric rows */}
            <div className="flex w-full flex-col gap-[10px]">
              {metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="flex h-[56px] items-center justify-between rounded-[12px] border-2 border-yellow-lemon bg-white px-[12px] pl-[14px]"
                >
                  <span className="font-inter text-[14px] font-normal tracking-[-0.1504px] text-ink">
                    {metric.label}
                  </span>

                  {metric.id === "panels-fit" ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={loading ? "" : panelCountDisplayValue}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        if (!digitsOnly) {
                          setPanelCountInput("");
                          return;
                        }
                        const nextValue = availablePanelLimit
                          ? Math.min(
                              Number.parseInt(digitsOnly, 10),
                              availablePanelLimit,
                            )
                          : Number.parseInt(digitsOnly, 10);
                        setPanelCountInput(String(nextValue));
                      }}
                      disabled={loading || !availablePanelLimit}
                      aria-label={metric.label}
                      className="h-[36px] w-[92px] rounded-[6px] bg-[#FDE047] px-[12px] text-center font-inter text-[14px] font-semibold tracking-[-0.1504px] text-ink shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] outline-none disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  ) : (
                    <span className="rounded-[6px] bg-[#FDE047] px-[14px] py-[8px] font-inter text-[14px] font-semibold tracking-[-0.1504px] text-ink shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)]">
                      {loading ? "..." : metric.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {inverterSizing && !isEditing && (
              <div className="w-full rounded-[10px] bg-white/80 px-4 py-3 font-inter text-[12px] leading-[1.45] text-ink">
                <p className="font-semibold">
                  {inverterSizing.arrayKw.toFixed(1)} kW of panels ·{" "}
                  {panelOrientation === "PORTRAIT" ? "portrait" : "landscape"}{" "}
                  on every roof · {Math.round(DESIGN_RULES.edgeSetbackM * 1000)} mm
                  edge setback · {Math.round(roofPitchDeg)}° pitch
                  {data?.estimated ? " (assumed)" : ""}
                </p>
                <p>
                  Hybrid inverter or battery: from{" "}
                  {inverterSizing.minInverterKwHybridOrBattery.toFixed(1)} kW (
                  {Math.round(DESIGN_RULES.dcAcRatioHybridOrBattery * 100)}% sizing),{" "}
                  {inverterSizing.phasesHybridOrBattery === 1
                    ? "single phase"
                    : "three phase"}
                  .
                </p>
                <p>
                  Standard inverter, no battery: from{" "}
                  {inverterSizing.minInverterKwStandard.toFixed(1)} kW (
                  {Math.round(DESIGN_RULES.dcAcRatioStandard * 100)}% STC
                  limit),{" "}
                  {inverterSizing.phasesStandard === 1
                    ? "single phase"
                    : "three phase"}
                  .
                </p>
                <p className="text-ink/60">
                  200% needs an inverter rated for it. Export up to {DESIGN_RULES.exportLimitKwPerPhase} kW per
                  phase.
                </p>
              </div>
            )}

            {!isEditing && lineCheckSummary.total > 0 && (
              <p className="w-full rounded-[10px] bg-white/80 px-4 py-2 text-center font-inter text-[12px] font-medium text-ink">
                {savedFaceSet.source === "height-model"
                  ? `${savedFaces.length} roof faces found from Google's height data. `
                  : "Roof faces assumed (no usable height data) — check on site. "}
                {lineCheckSummary.checked === 0
                  ? "Roof lines not checked — Google imagery isn't available for this roof. Confirm on site."
                  : `${lineCheckSummary.ok} of ${lineCheckSummary.total} roof lines confirmed against Google imagery (±${Math.round(
                      DESIGN_RULES.roofLineToleranceM * 1000,
                    )} mm). Dashed orange lines need checking on site.`}
              </p>
            )}

            {data?.estimated && (
              <p className="w-full rounded-[10px] bg-white/70 px-4 py-2 text-center font-inter text-[12px] font-medium text-ink/70">
                Google Solar imagery is not available for this location yet.
                These values are estimates based on typical Australian rooftops.
              </p>
            )}

            {isEditing && roofNeedsVerification && (
              <p className="w-full rounded-[10px] border border-amber-300 bg-amber-50/90 px-4 py-2 text-center font-inter text-[12px] font-medium text-amber-900">
                This shape is a guess, not a traced roof — drag its corners
                (or add/delete roofs) to match the satellite image before
                saving.
              </p>
            )}

            {(loading || layersLoading || isGeneratingPanels) && (
              <p className="animate-pulse font-inter text-[14px] font-medium text-white/80">
                {isGeneratingPanels
                  ? "Saving roof and generating solar panels..."
                  : layersLoading
                    ? "Loading roof imagery..."
                    : "Analysing solar potential..."}
              </p>
            )}
          </div>
        </div>

        {/* ── Right panel: map ── */}
        <div className="w-full min-w-0 overflow-hidden rounded-[28px] border-[3px] border-design-accent-cyan shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:h-full">
          {/* Outer wrapper: overlays (RGB/Panels/Save) sit outside capture ref */}
          <div className="relative aspect-[649/525] h-full w-full min-h-[280px] overflow-hidden rounded-[25px] lg:aspect-auto lg:min-h-0">
            {/* Capture target = satellite map + roof/panel overlays only (no UI chrome) */}
            <div
              ref={mapCaptureRef}
              className="relative h-full w-full overflow-hidden rounded-[25px]"
            >
              {isLoaded ? (
                <>
                  <GoogleMap
                    mapContainerStyle={MAP_CONTAINER}
                    center={mapCenter}
                    zoom={mapZoom}
                    onLoad={onMapLoad}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: false,
                      mapTypeId: "satellite",
                      tilt: 0,
                      rotateControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {selectedLocation && (
                      <OverlayView
                        position={selectedLocation}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        getPixelPositionOffset={(width, height) => ({
                          x: -(width / 2),
                          y: -height,
                        })}
                      >
                        <div className="pointer-events-none flex flex-col items-center">
                          <Icon
                            name="LocationPin"
                            className="size-[36px] text-[#FF3B30] drop-shadow-[0px_4px_10px_rgba(0,0,0,0.32)]"
                          />
                        </div>
                      </OverlayView>
                    )}

                    {/* Editable roof polygons (edit mode) — gated on mapReady
                        (now 'idle'-confirmed) so the Polygon never attaches
                        before the map's projection is ready to render it. */}
                    {!!mapReady &&
                      !!isEditing &&
                      editingRoofs.map((roof) => {
                        const isSelected = roof.id === selectedRoofId;
                        return (
                          <Polygon
                            key={roof.id}
                            paths={roof.paths}
                            options={{
                              fillColor: "#51FF00",
                              fillOpacity: isSelected ? 0.26 : 0.22,
                              // Cyan (unselected) vs. amber (selected) are both
                              // far from typical rooftop colours (gray/white/
                              // brown), so the outline stays visible regardless
                              // of what's underneath — a same-hue green stroke
                              // at low opacity could disappear into bright or
                              // reflective roofing.
                              strokeColor: isSelected ? "#FBBF24" : "#00E5FF",
                              strokeOpacity: 1,
                              strokeWeight: isSelected ? 4 : 3.5,
                              clickable: true,
                              zIndex: isSelected ? 12 : 10,
                            }}
                            draggable
                            editable
                            onClick={() => setSelectedRoofId(roof.id)}
                            onLoad={(polygon) => {
                              polygonRefs.current.set(roof.id, polygon);
                            }}
                            onUnmount={() => {
                              polygonRefs.current.delete(roof.id);
                            }}
                          />
                        );
                      })}

                    {/* Roof lines (view mode): solid amber = confirmed against
                        Google's imagery, dashed orange = check on site. */}
                    {!!mapReady &&
                      !isEditing &&
                      lineChecks.map((line, idx) => {
                        const ok = line.status === "confirmed" || line.status === "adjusted";
                        return (
                          <Polyline
                            key={`line-${idx}`}
                            path={[line.a, line.b]}
                            options={
                              ok
                                ? {
                                    strokeColor: "#FBBF24",
                                    strokeOpacity: 0.95,
                                    strokeWeight: line.kind === "eave" ? 2 : 1.4,
                                    clickable: false,
                                    zIndex: 7,
                                  }
                                : {
                                    strokeColor: "#FB923C",
                                    strokeOpacity: 0,
                                    clickable: false,
                                    zIndex: 7,
                                    icons: [
                                      {
                                        icon: {
                                          path: "M 0,-1 0,1",
                                          strokeOpacity: 1,
                                          strokeColor: "#FB923C",
                                          strokeWeight: 2,
                                          scale: 2,
                                        },
                                        offset: "0",
                                        repeat: "8px",
                                      },
                                    ],
                                  }
                            }
                          />
                        );
                      })}

                    {/* Saved roof outlines (view mode) */}
                    {!!mapReady &&
                      !isEditing &&
                      savedRoofs.map((paths, idx) => (
                        <Polygon
                          key={`saved-${idx}`}
                          paths={paths}
                          options={{
                            fillColor: "#22c55e",
                            fillOpacity: 0.1,
                            strokeColor: "#22c55e",
                            strokeOpacity: 0.85,
                            strokeWeight: 2,
                            clickable: false,
                            zIndex: 5,
                          }}
                        />
                      ))}
                  </GoogleMap>
                </>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-[25px] bg-[linear-gradient(135deg,rgba(48,54,71,0.98)_0%,rgba(33,36,47,0.98)_100%)]">
                  <p className="px-8 text-center font-source-sans text-[20px] font-medium text-white/60">
                    Loading map...
                  </p>
                </div>
              )}
            </div>

            {/* Top-right controls — excluded from proposal screenshot */}
            <div className="pointer-events-auto absolute left-[14px] right-[14px] top-[14px] z-10 flex flex-wrap items-center justify-end gap-[8px]">
              <LayerToggle active={activeLayer} onChange={setActiveLayer} />
              <OrientationToggle
                value={panelOrientation}
                counts={orientationCounts}
                disabled={isGeneratingPanels || !data?.panelDimensions}
                onChange={handleOrientationChange}
              />
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddRoof}
                    disabled={isGeneratingPanels}
                    className="h-[33px] rounded-[6px] bg-white/90 px-[14px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-[#2094F3] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:bg-white"
                  >
                    + Add New Roof
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteRoof}
                    disabled={
                      isGeneratingPanels ||
                      editingRoofs.length <= 1 ||
                      selectedRoofId === null
                    }
                    aria-label="Delete the selected roof (click a roof on the map first)"
                    className="h-[33px] rounded-[6px] bg-white/90 px-[14px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-[#DC2626] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Delete roof
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={
                      isGeneratingPanels || loading || !data?.panelDimensions
                    }
                    aria-label={
                      loading || !data?.panelDimensions
                        ? "Waiting for solar data to finish loading before you can save"
                        : undefined
                    }
                    className="h-[33px] rounded-[6px] bg-[linear-gradient(126deg,#22c55e_0%,#16a34a_100%)] px-[18px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-white shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isGeneratingPanels
                      ? "Saving..."
                      : loading || !data?.panelDimensions
                        ? "Loading solar data..."
                        : "Save Roof"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleEditClick}
                  disabled={!selectedLocation}
                  className="h-[33px] rounded-[6px] bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)] px-[18px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-white shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] disabled:opacity-50"
                >
                  {DESIGNS_SOLAR_PANEL_STEP.mapActions.primary}
                </button>
              )}
            </div>

            {/* Edit mode instruction hint — excluded from screenshot */}
            {isEditing && (
              <div className="pointer-events-none absolute bottom-[14px] left-1/2 z-10 -translate-x-1/2">
                <p className="whitespace-nowrap rounded-[8px] bg-black/60 px-4 py-2 font-inter text-[12px] font-medium text-white backdrop-blur-sm">
                  Click a roof to select (amber border) · Delete removes that
                  roof
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── Sub-components ──────────────────────────────────────────── */

/** Small outline of a panel, upright for portrait and on its side for landscape. */
function PanelGlyph({ orientation }: { orientation: PanelOrientation }) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-[2px] border-[1.5px] border-current ${
        orientation === "PORTRAIT" ? "h-[13px] w-[8px]" : "h-[8px] w-[13px]"
      }`}
    />
  );
}

function OrientationToggle({
  value,
  counts,
  disabled,
  onChange,
}: {
  value: PanelOrientation;
  /** Panels that fit in each orientation on the saved roofs; null while editing. */
  counts: Record<PanelOrientation, number> | null;
  disabled: boolean;
  onChange: (v: PanelOrientation) => void;
}) {
  const options: { value: PanelOrientation; label: string }[] = [
    { value: "PORTRAIT", label: "Portrait" },
    { value: "LANDSCAPE", label: "Landscape" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Panel orientation for every roof"
      className="flex overflow-hidden rounded-[6px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)]"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const count = counts?.[opt.value];
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={
              count !== undefined
                ? `${opt.label}: ${count} panels fit on the saved roofs`
                : `${opt.label} panels on every roof (applies when you save)`
            }
            className={`flex h-[33px] items-center gap-[6px] px-[11px] font-inter text-[12px] font-semibold tracking-[-0.1px] transition disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "bg-white text-[#2094F3]"
                : "bg-white/60 text-[#333] hover:bg-white/80"
            }`}
          >
            <PanelGlyph orientation={opt.value} />
            {opt.label}
            {count !== undefined && (
              <span className="tabular-nums opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function LayerToggle({
  active,
  onChange,
}: {
  active: ActiveLayer;
  onChange: (v: ActiveLayer) => void;
}) {
  const options: { value: ActiveLayer; label: string }[] = [
    { value: "satellite", label: "RGB" },
    { value: "panels", label: "Panels" },
  ];

  return (
    <div className="flex overflow-hidden rounded-[6px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`h-[33px] px-[11px] font-inter text-[12px] font-semibold tracking-[-0.1px] transition ${
            active === opt.value
              ? "bg-white text-[#2094F3]"
              : "bg-white/60 text-[#333] hover:bg-white/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
