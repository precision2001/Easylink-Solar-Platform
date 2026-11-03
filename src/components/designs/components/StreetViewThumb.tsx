"use client";

import { useState } from "react";

/**
 * The house from the street (Google Street View), shown over the corner of
 * the roof map: gables, metal bay roofs, verandahs and antennas are easy to
 * miss from above. Click to enlarge. Hidden when there is no Street View for
 * the address. Left out of the proposal screenshot (data-html2canvas-ignore).
 */
export function StreetViewThumb({ lat, lng }: { lat: number; lng: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const src = `/api/solar/street-view?lat=${lat.toFixed(7)}&lng=${lng.toFixed(7)}`;
  if (failed === src) return null;
  return (
    <button
      type="button"
      data-html2canvas-ignore="true"
      onClick={() => setBig((b) => !b)}
      title={big ? "Street View — click to shrink" : "Street View — click to enlarge"}
      className={`absolute bottom-3 left-3 z-10 overflow-hidden rounded-[12px] border-2 border-white/80 bg-black/40 shadow-lg transition-all ${
        big ? "w-[min(560px,85%)]" : "w-[150px]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Street View of the house" className="block h-auto w-full" onError={() => setFailed(src)} />
      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-[1px] font-inter text-[10px] font-semibold text-white">
        Street View
      </span>
    </button>
  );
}
