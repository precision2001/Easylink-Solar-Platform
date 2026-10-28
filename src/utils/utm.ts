/**
 * WGS84 ↔ UTM (Transverse Mercator), accurate to well under a millimetre
 * within a zone — Google Solar's data layers (DSM, mask, RGB) are delivered
 * in UTM (e.g. EPSG:32756, zone 56 south, for Sydney).
 */

const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

export type UtmZone = { zone: number; south: boolean };

/** EPSG 326xx (north) / 327xx (south) → zone, or null for anything else. */
export function utmZoneFromEpsg(epsg: number | undefined): UtmZone | null {
  if (!epsg) return null;
  if (epsg >= 32601 && epsg <= 32660) return { zone: epsg - 32600, south: false };
  if (epsg >= 32701 && epsg <= 32760) return { zone: epsg - 32700, south: true };
  return null;
}

function centralMeridian(zone: number): number {
  return ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
}

function meridianArc(phi: number): number {
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  return A * (
    (1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
    ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
    ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
    ((35 * e6) / 3072) * Math.sin(6 * phi)
  );
}

export function latLngToUtm(lat: number, lng: number, { zone, south }: UtmZone): { e: number; n: number } {
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180 - centralMeridian(zone);
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);
  const N = A / Math.sqrt(1 - E2 * sin * sin);
  const T = tan * tan;
  const C = EP2 * cos * cos;
  const Aa = cos * lam;
  const M = meridianArc(phi);
  const e =
    K0 * N * (Aa + ((1 - T + C) * Aa ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5) / 120) + 500000;
  let n =
    K0 *
    (M +
      N * tan * ((Aa * Aa) / 2 + ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 +
        ((61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6) / 720));
  if (south) n += 10000000;
  return { e, n };
}

export function utmToLatLng(e: number, n: number, { zone, south }: UtmZone): { lat: number; lng: number } {
  const x = e - 500000;
  const y = south ? n - 10000000 : n;
  const M = y / K0;
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const T1 = tan1 * tan1;
  const C1 = EP2 * cos1 * cos1;
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * sin1 * sin1, 1.5);
  const D = x / (N1 * K0);
  const phi =
    phi1 -
    ((N1 * tan1) / R1) *
      ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);
  const lam =
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120) /
    cos1;
  return { lat: (phi * 180) / Math.PI, lng: ((centralMeridian(zone) + lam) * 180) / Math.PI };
}
