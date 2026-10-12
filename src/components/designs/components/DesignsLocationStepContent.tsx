"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { GoogleMap } from "@react-google-maps/api";
import Icon from "@/components/ui/Icons";
import { useGoogleMaps } from "@/components/providers/GoogleMapsProvider";
import {
  DESIGNS_LOCATION_STEP,
  type DesignsMapLocation,
} from "@/utils/constant";
import { useAppSelector } from "@/lib/store/hooks";

const MAP_CONTAINER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: "25px",
};

type Suggestion = {
  placeId: string;
  description: string;
};

/**
 * Figma 3:4160 — address entry card + satellite roof map.
 * - AutocompleteService fetches predictions as the user types.
 * - Selecting a suggestion moves the map center to that address.
 * - The pin stays visually fixed at the center of the map.
 * - Moving the map updates the address to match the centered pin position.
 */
export type DesignsLocationStepHandle = {
  getValues: () => {
    address: string;
    location: DesignsMapLocation | null;
    parcelBounds: { sw: DesignsMapLocation; ne: DesignsMapLocation } | null;
  };
};

export const DesignsLocationStepContent = forwardRef<
  DesignsLocationStepHandle,
  object
>(function DesignsLocationStepContent(_, ref) {
  // Seed from the store so editing an existing design opens on its saved site
  // address and pin rather than an empty search box.
  const storedCustomer = useAppSelector((s) => s.designProposal.customer);
  const [selectedAddress, setSelectedAddress] = useState(
    storedCustomer.address ?? "",
  );
  const [selectedLocation, setSelectedLocation] =
    useState<DesignsMapLocation | null>(() =>
      storedCustomer.mapLat != null && storedCustomer.mapLng != null
        ? { lat: storedCustomer.mapLat, lng: storedCustomer.mapLng }
        : null,
    );
  const [selectedParcelBounds, setSelectedParcelBounds] = useState<{
    sw: DesignsMapLocation;
    ne: DesignsMapLocation;
  } | null>(() =>
    storedCustomer.mapParcelBoundsSw && storedCustomer.mapParcelBoundsNe
      ? {
          sw: storedCustomer.mapParcelBoundsSw,
          ne: storedCustomer.mapParcelBoundsNe,
        }
      : null,
  );

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      address: selectedAddress,
      location: selectedLocation,
      parcelBounds: selectedParcelBounds,
    }),
  }));

  const { isLoaded } = useGoogleMaps();

  const mapRef = useRef<google.maps.Map | null>(null);
  const pendingMove = useRef<{ lat: number; lng: number; zoom: number } | null>(
    null,
  );
  const mapDivRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isProgrammaticMoveRef = useRef(false);

  const [center] = useState(DESIGNS_LOCATION_STEP.defaultCenter);
  const [mapZoom, setMapZoom] = useState(14);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  /* ── reverse geocode a LatLng → update address input ─────── */

  const reverseGeocode = useCallback(
    (latLng: google.maps.LatLng) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          setSelectedAddress(results[0].formatted_address);
        }
      });
    },
    [setSelectedAddress],
  );

  /* ── pan map so center pin stays in sync ──────────────────── */

  const moveTo = useCallback(
    (
      loc: { lat: number; lng: number },
      z: number,
      shouldReverseGeocode = false,
    ) => {
      setSelectedLocation(loc);
      // Reset here — only the ROOFTOP-geocode success path (selectSuggestion)
      // knows a reliable per-premise box and re-sets it right after calling
      // moveTo; every other caller (map drag, geolocation, restored pin) has
      // no such box, and a stale one from the previous address would clip
      // the next address's footprint against the wrong parcel.
      setSelectedParcelBounds(null);
      setMapZoom(z);
      if (mapRef.current) {
        isProgrammaticMoveRef.current = true;
        mapRef.current.panTo(loc);
        mapRef.current.setZoom(z);
        if (shouldReverseGeocode) {
          reverseGeocode(new google.maps.LatLng(loc.lat, loc.lng));
        }
      } else {
        pendingMove.current = { ...loc, zoom: z };
      }
    },
    [setSelectedLocation, reverseGeocode],
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (pendingMove.current) {
      const { lat, lng, zoom } = pendingMove.current;
      setMapZoom(zoom);
      isProgrammaticMoveRef.current = true;
      map.panTo({ lat, lng });
      map.setZoom(zoom);
      pendingMove.current = null;
    }
  }, []);

  const onZoomChanged = useCallback(() => {
    const zoom = mapRef.current?.getZoom();
    if (typeof zoom === "number") {
      setMapZoom(zoom);
    }
  }, []);

  const onMapIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapCenter = map.getCenter();
    if (!mapCenter) return;

    const loc = { lat: mapCenter.lat(), lng: mapCenter.lng() };

    if (isProgrammaticMoveRef.current) {
      isProgrammaticMoveRef.current = false;
      return;
    }

    if (
      selectedLocation &&
      Math.abs(selectedLocation.lat - loc.lat) < 0.000001 &&
      Math.abs(selectedLocation.lng - loc.lng) < 0.000001
    ) {
      return;
    }

    setSelectedLocation(loc);
    reverseGeocode(mapCenter);
  }, [setSelectedLocation, reverseGeocode, selectedLocation]);

  /* ── geolocation on mount ─────────────────────────────────── */

  useEffect(() => {
    if (selectedLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        moveTo(
          { lat: coords.latitude, lng: coords.longitude },
          DESIGNS_LOCATION_STEP.defaultZoom,
          true,
        ),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [moveTo, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation) return;
    const map = mapRef.current;
    const currentCenter = map?.getCenter();

    if (
      currentCenter &&
      Math.abs(currentCenter.lat() - selectedLocation.lat) < 0.000001 &&
      Math.abs(currentCenter.lng() - selectedLocation.lng) < 0.000001
    ) {
      return;
    }

    const zoom = map?.getZoom() ?? DESIGNS_LOCATION_STEP.defaultZoom;
    if (map) {
      isProgrammaticMoveRef.current = true;
      map.panTo(selectedLocation);
      map.setZoom(zoom);
    } else {
      pendingMove.current = { ...selectedLocation, zoom };
    }
  }, [selectedLocation]);

  /* ── close dropdown on outside click ─────────────────────── */

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── autocomplete predictions ─────────────────────────────── */

  const fetchSuggestions = useCallback(
    (value: string) => {
      if (!isLoaded || !value.trim() || !google?.maps?.places) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "au" },
          types: ["address"],
        },
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(
              predictions.map((p) => ({
                placeId: p.place_id,
                description: p.description,
              })),
            );
            setIsOpen(true);
            setActiveIndex(-1);
          } else {
            setSuggestions([]);
            setIsOpen(false);
          }
        },
      );
    },
    [isLoaded],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSelectedAddress(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    },
    [fetchSuggestions, setSelectedAddress],
  );

  /* ── place selection → move map ───────────────────────────── */

  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setSelectedAddress(suggestion.description);
      setSuggestions([]);
      setIsOpen(false);

      if (!isLoaded || !google?.maps?.places || !mapDivRef.current) return;

      const service = new google.maps.places.PlacesService(mapDivRef.current);
      const fallbackToPlacesDetails = () => {
        service.getDetails(
          { placeId: suggestion.placeId, fields: ["geometry"] },
          (place, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              place?.geometry?.location
            ) {
              moveTo(
                {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                },
                DESIGNS_LOCATION_STEP.defaultZoom,
              );
            }
          },
        );
      };

      // Places' point for a given placeId can be a business/suite marker
      // rather than the building itself — the likely cause of roof-detection
      // occasionally matching the wrong neighbouring building. Google's
      // Geocoder tags its own results with how precise they are; a ROOFTOP
      // result is a genuine building-level geocode, so prefer it over the
      // Places point when one's available, falling back unchanged otherwise.
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: suggestion.placeId }, (results, status) => {
        const rooftop = results?.find(
          (r) => r.geometry?.location_type === "ROOFTOP",
        );
        if (status === google.maps.GeocoderStatus.OK && rooftop) {
          moveTo(
            {
              lat: rooftop.geometry.location.lat(),
              lng: rooftop.geometry.location.lng(),
            },
            DESIGNS_LOCATION_STEP.defaultZoom,
          );
          // A tight per-premise box, when Google returns one — narrower than
          // the building, roughly the parcel. Attached/terrace buildings
          // share one continuous roofline from above, so the building-
          // footprint dataset returns a single polygon for the whole row;
          // this lets the solar-panel step clip that polygon down to just
          // this address's slice instead of selecting the neighbours too.
          if (rooftop.geometry.bounds) {
            setSelectedParcelBounds({
              sw: {
                lat: rooftop.geometry.bounds.getSouthWest().lat(),
                lng: rooftop.geometry.bounds.getSouthWest().lng(),
              },
              ne: {
                lat: rooftop.geometry.bounds.getNorthEast().lat(),
                lng: rooftop.geometry.bounds.getNorthEast().lng(),
              },
            });
          }
          return;
        }
        fallbackToPlacesDetails();
      });
    },
    [isLoaded, moveTo, setSelectedAddress],
  );

  /* ── keyboard navigation ────────────────────────── */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex]);
        }
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, activeIndex, suggestions, selectSuggestion],
  );

  /* ── render ───────────────────────────────────────────────── */

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-[1446px] flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-8 lg:px-[81px] lg:py-8">
      <div className="mx-auto grid w-full max-w-[1278px] grid-cols-1 gap-5 lg:grid-cols-[591fr_649fr] lg:items-stretch lg:gap-[38px]">
        {/* ── Left panel ── */}
        <div className="flex w-full min-w-0 flex-col items-center rounded-[46px] border-[3px] border-design-accent-cyan bg-linear-to-r from-yellow-lemon to-orange-amber px-6 py-8 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] sm:px-10 sm:py-10 lg:h-full lg:px-[46px]">
          <div className="flex w-full max-w-[505px] flex-1 flex-col justify-center gap-6 sm:gap-[48px]">
            <h2
              className="w-full max-w-[495px] text-center font-source-sans text-[clamp(28px,4.8vw,40px)] font-bold capitalize leading-tight text-white"
              style={{ letterSpacing: "0.248px" }}
            >
              {DESIGNS_LOCATION_STEP.title}
            </h2>

            <div className="flex flex-col gap-[12px]">
              <span className="font-inter text-[15.531px] font-medium leading-[22.188px] tracking-[-0.1668px] text-[#191919]">
                {DESIGNS_LOCATION_STEP.inputLabel}
              </span>

              {/* Input + dropdown wrapper */}
              <div ref={wrapperRef} className="relative">
                <div className="flex h-[56px] items-center gap-[10px] rounded-[11.094px] border border-yellow-lemon bg-white px-[17.75px]">
                  <Icon
                    name="LocationPin"
                    className="size-[24px] shrink-0 text-[#878787]"
                  />
                  {isLoaded ? (
                    <input
                      value={selectedAddress}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                      }}
                      placeholder={DESIGNS_LOCATION_STEP.inputPlaceholder}
                      autoComplete="off"
                      data-clarity-mask="true"
                      className="h-full flex-1 border-0 bg-transparent font-inter text-[12px] font-medium tracking-[-0.1668px] text-[#191919] outline-none placeholder:text-[#878787]"
                    />
                  ) : (
                    <span className="font-inter text-[12px] font-medium tracking-[-0.1668px] text-[#878787]">
                      Loading...
                    </span>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {isOpen && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-white shadow-[0px_8px_24px_rgba(0,0,0,0.12)]">
                    {suggestions.map((s, idx) => (
                      <li
                        key={s.placeId}
                        onMouseDown={() => selectSuggestion(s)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 font-inter text-[12px] font-medium leading-snug tracking-[-0.1668px] text-[#191919] transition-colors ${
                          idx === activeIndex ? "bg-gray-3" : "hover:bg-gray-2"
                        } ${idx !== 0 ? "border-t border-gray-4" : ""}`}
                      >
                        <Icon
                          name="LocationPin"
                          className="size-[16px] shrink-0 text-[#878787]"
                        />
                        {s.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden div required by PlacesService */}
        <div ref={mapDivRef} className="hidden" />

        {/* ── Right panel: map ── */}
        <div className="w-full min-w-0 overflow-hidden rounded-[28px] border-[3px] border-design-accent-cyan shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] lg:h-full">
          <div className="relative aspect-[649/525] h-full w-full min-h-[280px] lg:aspect-auto lg:min-h-0">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER}
                center={selectedLocation ?? center}
                zoom={mapZoom}
                onLoad={onMapLoad}
                onIdle={onMapIdle}
                onZoomChanged={onZoomChanged}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  mapTypeId: DESIGNS_LOCATION_STEP.mapType,
                }}
              />
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-[25px] bg-[linear-gradient(135deg,rgba(48,54,71,0.98)_0%,rgba(33,36,47,0.98)_100%)]">
                <p className="px-8 text-center font-source-sans text-[20px] font-medium text-white/60">
                  Loading map...
                </p>
              </div>
            )}

            {isLoaded ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex translate-y-[-18px] flex-col items-center">
                  <Icon
                    name="LocationPin"
                    className="size-[44px] text-[#FF3B30] drop-shadow-[0px_6px_14px_rgba(0,0,0,0.28)]"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
