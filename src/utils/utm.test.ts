import { describe, expect, it } from "vitest";
import { latLngToUtm, utmToLatLng, utmZoneFromEpsg } from "./utm";
import { rasterLatLngOf, rasterPixelOf, type GeoTiffRaster } from "./geotiff";

describe("UTM (Google Solar layers are in metres, not degrees)", () => {
  const zone = utmZoneFromEpsg(32756)!;

  it("reads the EPSG code", () => {
    expect(zone).toEqual({ zone: 56, south: true });
    expect(utmZoneFromEpsg(4326)).toBeNull();
  });

  it("projects 95 Bombay St, Lidcombe and back", () => {
    const p = { lat: -33.8533702, lng: 151.0517278 };
    const { e, n } = latLngToUtm(p.lat, p.lng, zone);
    expect(e).toBeGreaterThan(319000);
    expect(e).toBeLessThan(321000);
    expect(n).toBeGreaterThan(6251000);
    expect(n).toBeLessThan(6254000);
    const back = utmToLatLng(e, n, zone);
    expect(back.lat).toBeCloseTo(p.lat, 9);
    expect(back.lng).toBeCloseTo(p.lng, 9);
  });

  it("finds the right pixel in a UTM raster", () => {
    const r: GeoTiffRaster = {
      data: new Uint8Array(400 * 400),
      width: 400,
      height: 400,
      bounds: { north: 0, south: 0, east: 0, west: 0 },
      noDataValue: 0,
      utm: { ...zone, originX: 319659, originY: 6252494.5, resX: 0.5, resY: -0.5 },
    };
    const centre = rasterLatLngOf(r, 200.5, 120.5);
    const px = rasterPixelOf(r, centre.lat, centre.lng);
    expect(px.col).toBeCloseTo(200.5, 3);
    expect(px.row).toBeCloseTo(120.5, 3);
  });
});
