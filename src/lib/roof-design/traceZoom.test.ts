import { describe, expect, it } from "vitest";
import { traceZoomFor } from "./server";

const box = (wM: number, hM: number, lat = -33.855, lng = 151.049) => {
  const dLat = hM / 111_320;
  const dLng = wM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    { lat, lng },
    { lat, lng: lng + dLng },
    { lat: lat + dLat, lng: lng + dLng },
    { lat: lat + dLat, lng },
  ];
};

describe("traceZoomFor", () => {
  it("traces a house at zoom 21", () => {
    expect(traceZoomFor({ footprint: box(15, 12) })).toBe(21);
    expect(traceZoomFor(null)).toBe(21);
  });
  it("traces a long townhouse row on the wider zoom-20 picture", () => {
    expect(traceZoomFor({ footprint: box(12, 40) })).toBe(20);
  });
  it("uses the lot when there's no footprint", () => {
    expect(traceZoomFor({ footprint: null, parcel: { ring: box(35, 30), areaM2: 1050 } })).toBe(20);
  });
  it("traces a factory or warehouse on a picture wide enough for the whole roof", () => {
    expect(traceZoomFor({ footprint: box(80, 50) })).toBe(19);
    expect(traceZoomFor({ footprint: box(160, 90) })).toBe(18);
    expect(traceZoomFor({ footprint: box(600, 400) })).toBe(18);
  });
  it("on a big lot, goes by the lot when Google's footprint is only part of the roof", () => {
    expect(traceZoomFor({ footprint: box(40, 30), parcel: { ring: box(150, 100), areaM2: 15_000 } })).toBe(18);
  });
  it("on a house block, goes by the house, not the lot", () => {
    expect(traceZoomFor({ footprint: box(15, 12), parcel: { ring: box(15, 45), areaM2: 675 } })).toBe(21);
  });
});
