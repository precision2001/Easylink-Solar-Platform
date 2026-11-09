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
    expect(traceZoomFor({ footprint: null, parcel: { ring: box(50, 60), areaM2: 3000 } })).toBe(20);
  });
});
