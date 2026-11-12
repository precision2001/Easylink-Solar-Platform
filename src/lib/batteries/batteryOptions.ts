"use client";

import { useEffect, useState } from "react";

import { isSizeId } from "./sizeId";

/**
 * Battery sizes by brand, range and phase for the Design Platform's battery
 * picker (website Designs page and the portals' Solar Designer), from the
 * backend (GET /api/pricing/battery-options → /pricing/battery-options).
 *
 * Each size is one battery system the maker allows (modules per stack,
 * parallel stacks, single or three phase) with the inverters it runs on. A
 * picked size is saved as the equipment item's product id
 * ("size:<range>:<phase>:<stacks>x<modules>"), and the pricing engine prices
 * it with that range's kit of that size, or that range extended as an
 * estimate ("priced": "estimate").
 */
export type BatterySizeOption = {
  id: string;
  phase: 1 | 3;
  stacks: number;
  modulesPerStack: number;
  modules: number;
  kwh: number;
  inverters: string[];
  label: string;
  priced: "exact" | "estimate";
};

export type BatteryRangeOption = {
  id: string;
  brand: string;
  range: string;
  module: string;
  moduleKwh: number;
  cecStatus: "listed" | "expiring" | "expired" | "not listed" | "unknown";
  cec: string;
  sizes: BatterySizeOption[];
};

export type BatteryOptions = { checked: string; ranges: BatteryRangeOption[] };

export { SIZE_PREFIX, isSizeId } from "./sizeId";

let cache: Promise<BatteryOptions> | null = null;

/** All battery sizes (both phases), fetched once per page load. */
export function loadBatteryOptions(): Promise<BatteryOptions> {
  if (!cache) {
    cache = fetch("/api/pricing/battery-options")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { data?: BatteryOptions; message?: string } | null;
        if (!res.ok || !body?.data) throw new Error(body?.message || `Battery sizes unavailable (${res.status})`);
        return body.data;
      })
      .catch((e: unknown) => {
        cache = null; // try again next time
        throw e;
      });
  }
  return cache;
}

export function useBatteryOptions(): { options: BatteryOptions | null; error: string } {
  const [options, setOptions] = useState<BatteryOptions | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    loadBatteryOptions()
      .then((o) => live && setOptions(o))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Battery sizes unavailable"));
    return () => {
      live = false;
    };
  }, []);
  return { options, error };
}

/** Brands with at least one size on this phase (any phase when unknown). */
export function batteryBrands(options: BatteryOptions, phase?: 1 | 3): string[] {
  return [...new Set(options.ranges.filter((r) => sizesFor(r, phase).length).map((r) => r.brand))].sort((a, b) => a.localeCompare(b));
}

export function sizesFor(range: BatteryRangeOption, phase?: 1 | 3): BatterySizeOption[] {
  return phase ? range.sizes.filter((s) => s.phase === phase) : range.sizes;
}

/** A brand's sizes as picker options, smallest first, range named on each. */
export function brandSizeOptions(options: BatteryOptions, brand: string, phase?: 1 | 3): { value: string; label: string }[] {
  return options.ranges
    .filter((r) => r.brand === brand)
    .flatMap((r) => sizesFor(r, phase).map((s) => ({ r, s })))
    .sort((a, b) => a.s.kwh - b.s.kwh || a.s.phase - b.s.phase)
    .map(({ r, s }) => ({ value: s.id, label: `${r.range} · ${s.label}${s.priced === "estimate" ? " · price estimated" : ""}` }));
}

/** The range and size behind a size id. */
export function findSize(options: BatteryOptions | null, id: string): { range: BatteryRangeOption; size: BatterySizeOption } | null {
  if (!options || !isSizeId(id)) return null;
  for (const range of options.ranges) {
    const size = range.sizes.find((s) => s.id === id);
    if (size) return { range, size };
  }
  return null;
}

/** "4 modules · single phase" / "2 stacks × 6 · three phase". */
export function sizeLayout(size: BatterySizeOption): string {
  const layout = size.stacks > 1 ? `${size.stacks} stacks × ${size.modulesPerStack}` : `${size.modules} module${size.modules > 1 ? "s" : ""}`;
  return `${layout} · ${size.phase === 1 ? "single" : "three"} phase`;
}

export const CEC_LABEL: Record<BatteryRangeOption["cecStatus"], string> = {
  listed: "Yes",
  expiring: "Yes (listing ends soon)",
  expired: "No (expired)",
  "not listed": "Not yet",
  unknown: "Check",
};
