"use client";

import { toast } from "react-toastify";
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
import { useRoofSnapshot } from "@/hooks/useRoofSnapshot";
import type { GeoTiffOverlay } from "@/utils/geotiff";
import type { SolarEstimateResult, SolarPanel } from "@/types/solar";
import {
  bestAvailableRoofs,
  boundingBoxNearPin as engineBoundingBoxNearPin,
  boxToRing,
  checkRoofLines,
  clipRingToConvexPolygon,
  confirmRoofOutlines,
  findRoofFaces,
  layoutRoofPanels,
  lotForDesign,
  panelCorners as roofPanelCorners,
  relookReadings,
  ringAreaM2,
  roofPitchOf,
  squareAround,
  straightenOutlines,
  type LatLngBox,
  type LatLngRing,
  type LineCheck,
  type SquareReading,
  type RoofDesignContext,
  type RoofFaceSet,
} from "@/lib/roof-design";
import { StreetViewThumb } from "./StreetViewThumb";
import {
  DESIGN_RULES,
  inverterSizingFor,
  roofPitchDegrees,
  type PanelOrientation,
} from "@/lib/designer/designRules";
import { mergeProposalData } from "@/lib/store/designProposalSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { compressCanvasSnapshot } from "@/lib/images/compress-browser";

const MAP_CONTAINER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "25px",
};

const ACTIVE_LAYERS: SolarLayerType[] = ["rgb", "mask", "dsm"];

/** Hard cap on Google Maps Polygon instances for generated panels (perf). Keep ≥ typical “panels that fit” so the map matches the left-panel count. */
const MAX_MAP_SOLAR_PANEL_POLYGONS = 1500;

// Roof-design limits (mask coverage, box distance, footprint check, lot clip) live in
// the shared engine: ROOF_DESIGN_LIMITS in src/lib/roof-design/engine.ts.

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

/** A panel's corners as the map draws them (shared roof-design geometry, the packer's convention). */
function panelCorners(
  center: { lat: number; lng: number },
  heightM: number,
  widthM: number,
  orientation: "PORTRAIT" | "LANDSCAPE",
  rotationDegrees = 0,
  slopeDegrees = 0,
): google.maps.LatLngLiteral[] {
  return roofPanelCorners({ center, orientation, rotationDegrees, slopeDegrees }, { heightM, widthM });
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

type ParcelBounds = LatLngBox;

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
  /** Beautify Design: panels in aligned, symmetric blocks instead of the most that fit. */
  const [beautified, setBeautified] = useState(false);
  /**
   * Side walls of an attached (terrace) house: the roof is cut to the strip
   * between its two party walls. Terraces share one roof and one land lot
   * can hold several houses (24 Derwent St, Glebe), so the walls are marked
   * by hand: two clicks along one wall, one click on the other.
   */
  const [wallClicks, setWallClicks] = useState<google.maps.LatLngLiteral[] | null>(null);
  /** Relook roof: the confirmed readings of this roof, best first, and which one is shown. */
  const [relook, setRelook] = useState<{ readings: SquareReading[]; index: number } | null>(null);
  const [sideWalls, setSideWalls] = useState<{
    lines: [google.maps.LatLngLiteral, google.maps.LatLngLiteral][];
    widthM: number;
    roofsBefore: google.maps.LatLngLiteral[][];
  } | null>(null);

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
   * Zoom-in roof analysis — the starting point for every roof: Google's
   * satellite image at zoom 21 (~3 cm pixels) around the pin, with the roof
   * found by its colour and traced (see roofSnapshot.ts). Its mask fits the
   * eaves and its brightness finds the hips, ridges and valleys.
   */
  // The land lot keeps the roof finder off the neighbours' roofs; wait for
  // it, and for Google's building, which widens a lot that doesn't hold the
  // whole house (a property over two lots — the engine's `lotForDesign`).
  const designLot = useMemo(
    () => (cadastralParcel.loading || loading ? null : lotForDesign(cadastralParcel.data, data, selectedLocation ?? undefined)),
    [cadastralParcel.data, cadastralParcel.loading, data, loading, selectedLocation],
  );
  const parcelRing = designLot?.ring ?? null;
  const roofSnapshot = useRoofSnapshot(
    selectedLocation ?? null,
    maskRaster,
    layersLoading || cadastralParcel.loading || loading,
    dsmRaster,
    parcelRing,
  );
  /**
   * Everything the shared roof-design engine (src/lib/roof-design) reads for
   * this address. The engine makes every decision — which outline to start
   * from, the faces, the lines, the panels — the same way for this page, the
   * Quotes & Leads designer and the roof-design API.
   */
  const roofCtx = useMemo((): RoofDesignContext | null => {
    if (!selectedLocation) return null;
    return {
      pin: selectedLocation,
      estimate: data ?? null,
      snapshot: roofSnapshot.analysis ?? null,
      mask: maskRaster,
      dsm: dsmRaster ?? null,
      rgbLuma: rgbOverlay?.luma ?? null,
      parcel: designLot,
      parcelBounds,
      footprint: footprint.data?.ring ?? null,
    };
  }, [selectedLocation, data, roofSnapshot.analysis, maskRaster, dsmRaster, rgbOverlay?.luma, designLot, parcelBounds, footprint.data?.ring]);

  /** Google's own bounding box, only when it's near the pin (on a vacant block Google snaps to a neighbour). */
  const boundingBoxNearPin = useMemo(() => (roofCtx ? engineBoundingBoxNearPin(roofCtx) ?? undefined : undefined), [roofCtx]);

  /** Best roof outline available right now — null while still waiting on a source that could still beat the next fallback. */
  const bestAvailable = useMemo(() => (roofCtx ? bestAvailableRoofs(roofCtx) : null), [roofCtx]);
  const bestAvailableOutlines = bestAvailable?.rings ?? null;
  /** True when the starting shape is a real trace of the roof, not a footprint or rectangle guess. */
  const initialRoofIsTraced = bestAvailable?.traced ?? false;

  const initialRoofPolygons = useMemo((): google.maps.LatLngLiteral[][] | null => {
    if (!selectedLocation || !roofCtx) return null;
    // Footprint, lot and Google's estimate must all resolve before trusting
    // anything: the footprint is clipped by the lot and checked against
    // Google, and the roof is only initialised once per address.
    if (footprint.loading || cadastralParcel.loading || loading) return null;
    // Wait for the zoom-in analysis before falling back to a footprint or box.
    if (roofSnapshot.loading) return null;
    if (bestAvailableOutlines) return bestAvailableOutlines;
    if (boundingBoxNearPin) return [boxToRing(boundingBoxNearPin)];
    if (layersLoading) return null;
    return [squareAround(selectedLocation)];
  }, [
    bestAvailableOutlines,
    boundingBoxNearPin,
    cadastralParcel.loading,
    footprint.loading,
    layersLoading,
    loading,
    roofCtx,
    roofSnapshot.loading,
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
    setSideWalls(null);
    setWallClicks(null);
    setRelook(null);
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
    // A stored design with no roof and no panels (an empty save, or a draft
    // from before the roof was traced) has nothing to restore. Restoring it
    // left the page out of edit mode with no roof, so the green Save Roof
    // button never showed (134 Old Canterbury Rd, 29 Oct 2026); start the
    // editor with the roof found instead.
    if (
      solarDesignFromStore.savedRoofs.length === 0 &&
      (solarDesignFromStore.generatedPanels?.length ?? 0) === 0
    ) {
      return;
    }
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
    setBeautified(false);
    setWallClicks(null);
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
          ? boxToRing(boundingBoxNearPin)
          : squareAround(selectedLocation),
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
            ? boxToRing(boundingBoxNearPin)
            : squareAround(selectedLocation, prev.length * 0.0002)),
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
   * Every face of the roof(s), lines corrected against the image and
   * obstructions found — the shared engine's `findRoofFaces` (square-walled
   * reading confirmed by Google and the image, else the height model, else
   * the hip split). Relook accepts slightly looser readings.
   */
  const facesFor = useCallback(
    (paths: google.maps.LatLngLiteral[][]): RoofFaceSet =>
      roofCtx
        ? findRoofFaces(paths, roofCtx, { relook: Boolean(relook) })
        : { source: "assumed-hip", faces: [], interiorChecks: [], moved: 0, obstructions: [], gables: 0 },
    [roofCtx, relook],
  );

  const savedFaceSet = useMemo(() => facesFor(savedRoofs), [facesFor, savedRoofs]);

  /** The faces the panels sit on, in a plain serialisable shape, saved with the design for the proposal drawing. */
  const facesForProposal = useCallback(
    (paths: google.maps.LatLngLiteral[][]) => {
      if (paths.length === 0) return undefined;
      try {
        return facesFor(paths).faces.map((f) => {
          const face = f as { ring: google.maps.LatLngLiteral[]; pitchDeg?: number; azimuthDeg?: number };
          return {
            ring: face.ring.map((p) => ({ lat: p.lat, lng: p.lng })),
            pitchDeg: face.pitchDeg,
            azimuthDeg: face.azimuthDeg,
          };
        });
      } catch {
        return undefined;
      }
    },
    [facesFor],
  );
  const savedFaces = savedFaceSet.faces;

  /**
   * Every roof line of the saved design, checked against Google's imagery:
   * eaves against the roof mask, hips/valleys/ridges against the image.
   */
  const lineCheckResult = useMemo(
    () => (roofCtx ? checkRoofLines(savedRoofs, savedFaceSet, roofCtx) : { lines: [] as LineCheck[], total: 0, checked: 0, ok: 0 }),
    [roofCtx, savedFaceSet, savedRoofs],
  );
  const lineChecks = lineCheckResult.lines;
  const lineCheckSummary = useMemo(
    () => ({ total: lineCheckResult.total, checked: lineCheckResult.checked, ok: lineCheckResult.ok }),
    [lineCheckResult],
  );

  /** Packs every roof with the design's single orientation, the 100 mm setback and the roof pitch (the shared engine's `layoutRoofPanels`). */
  const layoutPanels = useCallback(
    (
      paths: google.maps.LatLngLiteral[][],
      orientation: PanelOrientation,
      beautify = false,
    ): SolarPanel[] | null => {
      if (!data?.panelDimensions || !roofCtx) return null;
      return layoutRoofPanels(paths, facesFor(paths), roofCtx, { orientation, beautify, dims: data.panelDimensions });
    },
    [data?.panelDimensions, facesFor, roofCtx],
  );

  /** Google's area-weighted roof pitch, or the 22.5° default when there's no real data. */
  const roofPitchDeg = useMemo(() => (roofCtx ? roofPitchOf(roofCtx) : roofPitchDegrees(undefined, true)), [roofCtx]);

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
            // JPEG within the snapshot budget (lib/images/policy.ts): a PNG
            // of satellite imagery is ~1 MB and was over the web server's
            // request limit, so designs failed to save.
            dataUrl = compressCanvasSnapshot(canvas);
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
              panelDimensions: data?.panelDimensions,
              roofFaces: facesForProposal(pathsSnapshot),
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
    [dispatch, selectedLocation, data?.panelDimensions, facesForProposal],
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
      const panels = layoutPanels(savedRoofs, next, beautified);
      setGeneratedPanels(panels);
      persistSolarDesign(savedRoofs, panels, polygonTotalAreaM2 ?? 0, next);
    },
    [
      beautified,
      isEditing,
      layoutPanels,
      panelOrientation,
      persistSolarDesign,
      polygonTotalAreaM2,
      savedRoofs,
    ],
  );

  /** Beautify on/off: re-lays the saved roofs in aligned blocks, or back to the most that fit. */
  const handleBeautifyToggle = useCallback(() => {
    if (isEditing || savedRoofs.length === 0) return;
    const next = !beautified;
    const panels = layoutPanels(savedRoofs, panelOrientation, next);
    setBeautified(next);
    setGeneratedPanels(panels);
    setPanelCountInput("");
    persistSolarDesign(savedRoofs, panels, polygonTotalAreaM2 ?? 0, panelOrientation);
  }, [beautified, isEditing, layoutPanels, panelOrientation, persistSolarDesign, polygonTotalAreaM2, savedRoofs]);

  /** Re-lays panels on new saved roofs (after the side walls cut them). */
  const applyRoofs = useCallback(
    (roofs: google.maps.LatLngLiteral[][]) => {
      setSavedRoofs(roofs);
      let area = 0;
      for (const r of roofs) area += ringAreaM2(r);
      setPolygonTotalAreaM2(area);
      const panels = layoutPanels(roofs, panelOrientation, beautified);
      setGeneratedPanels(panels);
      setPanelCountInput("");
      persistSolarDesign(roofs, panels, area, panelOrientation);
    },
    [beautified, layoutPanels, panelOrientation, persistSolarDesign],
  );

  const handleSideWallsButton = useCallback(() => {
    if (sideWalls) {
      // Remove the walls: back to the roof as it was.
      const before = sideWalls.roofsBefore;
      setSideWalls(null);
      setWallClicks(null);
      applyRoofs(before);
      return;
    }
    setWallClicks((c) => (c ? null : []));
  }, [applyRoofs, sideWalls]);

  /**
   * Relook roof: draws the roof again in other readings (other edge and
   * colour settings, hip or gable at each end), keeps those Google's roof
   * data confirms, and shows them best first — the reading whose hips,
   * valleys and ridges the image shows most — one more per press.
   */
  const handleRelook = useCallback(() => {
    const analysis = roofSnapshot.analysis;
    if (!analysis || data?.estimated) {
      toast.info("Relook needs the zoomed roof image and Google's roof data, which aren't available here. Use Edit to mark the roof.");
      return;
    }
    let state = relook;
    if (!state) {
      const readings = roofCtx ? relookReadings(roofCtx, savedRoofs.length === 1 ? savedRoofs[0] : null) : [];
      if (readings.length === 0) {
        toast.info("No other reading of this roof matches Google's roof data. Use Edit to mark the roof by hand.");
        return;
      }
      state = { readings, index: -1 };
    }
    const key = (r: google.maps.LatLngLiteral[]) => r.map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`).join(";");
    const current = savedRoofs.length === 1 ? key(savedRoofs[0]) : "";
    let next = (state.index + 1) % state.readings.length;
    if (state.readings.length > 1 && key(state.readings[next].ring) === current) next = (next + 1) % state.readings.length;
    setRelook({ readings: state.readings, index: next });
    setSideWalls(null);
    setWallClicks(null);
    applyRoofs([state.readings[next].ring]);
  }, [applyRoofs, data?.estimated, relook, roofCtx, roofSnapshot.analysis, savedRoofs]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!wallClicks || !e.latLng) return;
      const pts = [...wallClicks, { lat: e.latLng.lat(), lng: e.latLng.lng() }];
      if (pts.length < 3) {
        setWallClicks(pts);
        return;
      }
      setWallClicks(null);
      // Wall 1 through the first two clicks; wall 2 parallel through the third.
      const ref = pts[0];
      const mL = 111320 * Math.cos((ref.lat * Math.PI) / 180);
      const xy = (p: google.maps.LatLngLiteral) => ({ x: (p.lng - ref.lng) * mL, y: (p.lat - ref.lat) * 111320 });
      const ll = (p: { x: number; y: number }) => ({ lat: ref.lat + p.y / 111320, lng: ref.lng + p.x / mL });
      const a = xy(pts[0]), b = xy(pts[1]), c = xy(pts[2]);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) return;
      const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
      const n = { x: -u.y, y: u.x };
      const w = (c.x - a.x) * n.x + (c.y - a.y) * n.y;
      if (Math.abs(w) < 1) return;
      const far = 80;
      const p = (t: number, s: number) => ll({ x: a.x + n.x * t + u.x * s, y: a.y + n.y * t + u.y * s });
      const strip: google.maps.LatLngLiteral[] = [p(0, -far), p(0, far), p(w, far), p(w, -far)];
      const before = sideWalls?.roofsBefore ?? savedRoofs;
      const clipped = before
        .map((r) => clipRingToConvexPolygon(r, strip))
        .filter((r) => r.length >= 3 && ringAreaM2(r) >= 2);
      if (clipped.length === 0) return;
      setSideWalls({
        lines: [
          [p(0, -far), p(0, far)],
          [p(w, -far), p(w, far)],
        ],
        widthM: Math.abs(w),
        roofsBefore: before,
      });
      applyRoofs(clipped);
    },
    [applyRoofs, savedRoofs, sideWalls, wallClicks],
  );

  const handleSave = useCallback(() => {
    /* Read final paths from imperative polygon refs (user may have dragged vertices),
       then apply the roof-line rule: straight edges at 0/45/90° to the main
       walls, corners at line intersections, shared corners between roofs. */
    // Then each eave fitted to the roof edge in the image — unless Google and
    // the image confirm a square-walled reading, whose border stays along the
    // walls (fitting it to the rough trace pushed 25 Gilbert St's east eave
    // onto the patio). The shared engine's `confirmRoofOutlines`.
    const drawn = getCurrentEditingPaths().filter((p) => p.length >= 3);
    const validPaths = roofCtx ? confirmRoofOutlines(drawn, roofCtx) : straightenOutlines(drawn);
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
      setBeautified(false);
      // New roofs drawn: the side-wall cut (if any) is part of them now.
      setSideWalls(null);
      setWallClicks(null);
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
    panelOrientation,
    persistSolarDesign,
    roofCtx,
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
  // Preview outline before editing: only the traced roof, once the zoom-in
  // analysis has finished. Google's building box is never drawn as a
  // rectangle here (it flashed up while loading, before the real outline).
  useImperativeRoofOutline(
    mapReady,
    roofSnapshot.loading ? null : bestAvailableOutlines,
    undefined,
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
              panelDimensions: data?.panelDimensions,
              roofFaces: facesForProposal(solarPersistRef.current.savedRoofs),
            },
          }),
        );
      },
    }),
    [dispatch, proposalMetrics, selectedLocation, data?.panelDimensions, facesForProposal],
  );

  return (
    // Desktop: both windows stay inside the screen at one height; when the
    // notes under the metrics grow (after Save Roof), the left window scrolls
    // inside itself instead of pushing the page — the map window and its
    // buttons never leave the screen (2A Delhi St, 31 Oct 2026).
    <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 lg:h-full lg:min-h-0 lg:px-[81px] lg:py-[clamp(12px,3vh,32px)]">
      <div className="mx-auto grid w-full max-w-[1278px] grid-cols-1 gap-5 lg:h-full lg:max-h-[min(640px,100%)] lg:min-h-0 lg:grid-cols-[591fr_649fr] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch lg:gap-[58px]">
        {/* ── Left panel ── */}
        <div className="flex w-full min-w-0 items-center rounded-[46px] border-[3px] border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber px-6 py-8 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] sm:px-10 sm:py-10 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-[30px] lg:py-[24px]">
          <div className="mx-auto flex w-full max-w-[514px] flex-col items-center gap-6 sm:gap-[32px] lg:max-h-full lg:gap-[20px] lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:py-1 lg:[scrollbar-width:thin] lg:[scrollbar-color:rgba(11,42,74,0.45)_transparent]">
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
                {roofSnapshot.analysis ? "Roof found by zooming into Google's satellite image. " : ""}
                {savedFaceSet.source === "square-hip"
                  ? `${savedFaces.length} roof faces drawn from the walls by trigonometry (${
                      "gables" in savedFaceSet && savedFaceSet.gables ? `${savedFaceSet.gables} gable end${savedFaceSet.gables > 1 ? "s" : ""}, rest hipped` : "hip roof"
                    }), confirmed by Google's roof data; ${savedFaceSet.interiorChecks.filter((c) => c.status === "confirmed").length} of ${savedFaceSet.interiorChecks.length} hips, valleys and ridges seen in the image. `
                  : savedFaceSet.source === "height-model"
                    ? `${savedFaces.length} roof faces found from Google's height data. `
                    : "Roof faces assumed (no usable height data) — check on site. "}
                {savedFaceSet.moved > 0 ? `${savedFaceSet.moved} roof lines moved onto the edges in the image. ` : ""}
                {sideWalls ? `Attached house: roof limited to its side walls (${sideWalls.widthM.toFixed(1)} m wide). ` : ""}
                {savedFaceSet.obstructions.length > 0
                  ? `${savedFaceSet.obstructions.filter((o) => o.kind === "spot").length} possible vents, fans or antennas and ${
                      savedFaceSet.obstructions.filter((o) => o.kind === "step").length
                    } level differences or shadow bands found and packed around (orange boxes) — check on site. `
                  : ""}
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

            {(loading || layersLoading || roofSnapshot.loading || isGeneratingPanels) && (
              <p className="animate-pulse font-inter text-[14px] font-medium text-white/80">
                {isGeneratingPanels
                  ? "Saving roof and generating solar panels..."
                  : layersLoading
                    ? "Loading roof imagery..."
                    : roofSnapshot.loading
                      ? "Zooming in and finding the roof lines..."
                      : "Analysing solar potential..."}
              </p>
            )}
          </div>
        </div>

        {/* ── Right panel: map ── */}
        <div className="w-full min-w-0 overflow-hidden rounded-[28px] border-[3px] border-design-accent-cyan shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:h-full lg:min-h-0">
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
                    onClick={handleMapClick}
                    options={{
                      draggableCursor: wallClicks ? "crosshair" : undefined,
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

                    {/* Side walls of an attached house (marked by hand) */}
                    {!!mapReady &&
                      sideWalls?.lines.map((line, idx) => (
                        <Polyline
                          key={`wall-${idx}`}
                          path={line}
                          options={{ strokeColor: "#EF4444", strokeOpacity: 1, strokeWeight: 3, clickable: false, zIndex: 9 }}
                        />
                      ))}
                    {!!mapReady &&
                      wallClicks?.map((pt, idx) => (
                        <Polygon
                          key={`wallpt-${idx}`}
                          paths={[0, 1, 2, 3].map((k) => ({
                            lat: pt.lat + 0.000004 * Math.sin((k * Math.PI) / 2),
                            lng: pt.lng + 0.000005 * Math.cos((k * Math.PI) / 2),
                          }))}
                          options={{ fillColor: "#EF4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1, clickable: false, zIndex: 11 }}
                        />
                      ))}
                    {!!mapReady && wallClicks && wallClicks.length === 2 ? (
                      <Polyline
                        path={wallClicks}
                        options={{ strokeColor: "#EF4444", strokeOpacity: 1, strokeWeight: 3, clickable: false, zIndex: 9 }}
                      />
                    ) : null}

                    {/* Obstructions and steps found on the zoomed image (view mode) */}
                    {!!mapReady &&
                      !isEditing &&
                      savedFaceSet.obstructions.map((o, idx) => (
                        <Polygon
                          key={`obs-${idx}`}
                          paths={o.ring}
                          options={{
                            fillColor: "#FB923C",
                            fillOpacity: 0.15,
                            strokeColor: "#FB923C",
                            strokeOpacity: 1,
                            strokeWeight: 1.5,
                            clickable: false,
                            zIndex: 8,
                          }}
                        />
                      ))}

                    {/* Every roof face with its own border (view mode): eaves,
                        hips, valleys and ridges; panels keep 100 mm inside. */}
                    {!!mapReady &&
                      !isEditing &&
                      savedFaces.map((face, idx) => (
                        <Polygon
                          key={`face-${idx}`}
                          paths={face.ring}
                          options={{
                            fillOpacity: 0,
                            strokeColor: "#FBBF24",
                            strokeOpacity: 0.95,
                            strokeWeight: 1.6,
                            clickable: false,
                            zIndex: 7,
                          }}
                        />
                      ))}

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
                  {selectedLocation ? (
                    <StreetViewThumb lat={selectedLocation.lat} lng={selectedLocation.lng} />
                  ) : null}
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
                <>
                <button
                  type="button"
                  onClick={handleRelook}
                  disabled={savedRoofs.length === 0 || !roofSnapshot.analysis}
                  title="Draw the roof again: other readings of its edges, hips and gables, checked against Google's roof data and the image"
                  className="h-[33px] rounded-[6px] bg-[linear-gradient(126deg,#FFEF62_0%,#F78D00_100%)] px-[12px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-[#152238] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {relook ? `Relook roof (${relook.index + 1}/${relook.readings.length})` : "Relook roof"}
                </button>
                <button
                  type="button"
                  onClick={handleSideWallsButton}
                  disabled={savedRoofs.length === 0}
                  aria-pressed={Boolean(wallClicks) || Boolean(sideWalls)}
                  title="Attached (terrace) house: mark its two side walls so panels stay on this house"
                  className={`h-[33px] rounded-[6px] px-[12px] font-inter text-[13px] font-semibold tracking-[-0.1504px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    wallClicks ? "bg-[#EF4444] text-white" : "bg-white/90 text-[#DC2626] hover:bg-white"
                  }`}
                >
                  {sideWalls ? "Remove side walls" : wallClicks ? "Cancel walls" : "Side walls"}
                </button>
                <button
                  type="button"
                  onClick={handleBeautifyToggle}
                  disabled={!(generatedPanels && generatedPanels.length > 0)}
                  aria-pressed={beautified}
                  title={
                    generatedPanels && generatedPanels.length > 0
                      ? beautified
                        ? "Back to the most panels that fit"
                        : "Arrange the panels in neat, aligned blocks"
                      : "Place panels on the roof first"
                  }
                  className={`beautify-btn h-[33px] rounded-[6px] px-[16px] font-inter text-[13px] font-extrabold tracking-[0.2px] shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    beautified ? "bg-black/80 ring-2 ring-[#F5C542]" : "bg-black/60 hover:bg-black/75"
                  }`}
                >
                  <span className="beautify-glitter">✦ Beautify</span>
                </button>
                <button
                  type="button"
                  onClick={handleEditClick}
                  disabled={!selectedLocation}
                  className="h-[33px] rounded-[6px] bg-[linear-gradient(126deg,#2094F3_0%,#17CFCF_100%)] px-[18px] font-inter text-[13px] font-semibold tracking-[-0.1504px] text-white shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] disabled:opacity-50"
                >
                  {DESIGNS_SOLAR_PANEL_STEP.mapActions.primary}
                </button>
                </>
              )}
            </div>

            {wallClicks ? (
              <div className="pointer-events-none absolute bottom-[14px] left-1/2 z-10 -translate-x-1/2">
                <p className="whitespace-nowrap rounded-[8px] bg-black/70 px-4 py-2 font-inter text-[12px] font-medium text-white backdrop-blur-sm">
                  {wallClicks.length < 2
                    ? `Click ${wallClicks.length === 0 ? "two points" : "a second point"} along one side wall (use Street View: front fence line)`
                    : "Now click one point on the other side wall"}
                </p>
              </div>
            ) : null}

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
