import type { AiRoofTrace } from "./engine";
/**
 * How the platform's pages (installer, customer and operations portals, the
 * website) get a system designed: they ask the Roof Designer. Platform rule
 * (5 Nov 2026): no page works out a roof or a panel count on its own.
 */
import type { LatLng, LatLngRing, PanelDims } from "./geometry";
import type { InverterSizing, PanelOrientation } from "@/lib/designer/designRules";

export type RoofDesignRequest = ({ address: string } | LatLng) & {
  orientation?: PanelOrientation | "best";
  beautify?: boolean;
  panelWatts?: number;
  outline?: LatLngRing[];
  includeImage?: boolean;
};

export type RoofDesignFace = { ring: LatLngRing; pitchDeg: number | null; azimuthDeg: number | null };

export type RoofDesignPanel = { center: LatLng; rotationDeg: number; slopeDeg: number; corners: LatLngRing; face: number };

export type RoofDesignResponse =
  | {
      status: "READY";
      pin: LatLng;
      formattedAddress: string | null;
      outline: { rings: LatLngRing[]; source: string; needsVerification: boolean; areaM2: number };
      /** Every roof's lines passed the priority tests (Google, then the image). */
      determined: boolean;
      faces: {
        source: string;
        gables: number;
        items: RoofDesignFace[];
        /** The AI platform's reading of the roof from the image (Opus 5.5), when it was had. */
        ai?: { ring: LatLngRing; azimuthDeg: number | null }[];
        /** Opus's full trace (it traces every roof first): border, faces, lines, obstructions. */
        trace?: AiRoofTrace;
        traceLines?: { lines: number; faint: number; unconfirmed: number };
      };
      obstructions: { ring: LatLngRing; kind: "spot" | "step" }[];
      lines: { total: number; checked: number; ok: number };
      panels: {
        orientation: PanelOrientation;
        count: number;
        counts: Record<PanelOrientation, number>;
        watts: number;
        dims: PanelDims;
        items: RoofDesignPanel[];
      };
      systemKw: number;
      roofPitchDeg: number;
      inverter: InverterSizing;
      notes: string[];
      image: { contentType: string; base64: string } | null;
    }
  | { status: "NO_ROOF"; pin: LatLng; formattedAddress: string | null; message: string };

/** Ask the Roof Designer for a design. Throws with the API's message on failure. */
export async function requestRoofDesign(req: RoofDesignRequest, init?: { signal?: AbortSignal; baseUrl?: string }): Promise<RoofDesignResponse> {
  // 202: the design is still being worked on past one request's time (it
  // keeps going on the server); ask again shortly and collect it.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${init?.baseUrl ?? ""}/api/roof-design`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: init?.signal,
    });
    const json = (await res.json().catch(() => ({}))) as RoofDesignResponse & { message?: string };
    if (res.status === 202 && attempt < 8) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, 10_000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      });
      continue;
    }
    if (!res.ok || res.status === 202) throw new Error(json.message ?? `Roof design failed (${res.status})`);
    return json;
  }
}

const COMPASS = ["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"];

/** "North", "South-west"… for a face's downslope direction. */
export function compassName(azimuthDeg: number | null | undefined): string {
  if (azimuthDeg == null || !Number.isFinite(azimuthDeg)) return "Roof";
  return COMPASS[Math.round((((azimuthDeg % 360) + 360) % 360) / 45) % 8];
}

/** Panels on each face of a design, largest first, with the face's direction. */
export function panelsPerFace(d: Extract<RoofDesignResponse, { status: "READY" }>): { name: string; azimuthDeg: number | null; panels: number }[] {
  const counts = new Map<number, number>();
  for (const p of d.panels.items) counts.set(p.face, (counts.get(p.face) ?? 0) + 1);
  return [...counts.entries()]
    .map(([i, n]) => ({ name: compassName(d.faces.items[i]?.azimuthDeg), azimuthDeg: d.faces.items[i]?.azimuthDeg ?? null, panels: n }))
    .sort((a, b) => b.panels - a.panels);
}

/* ── Start early: the address step asks, the roof step collects ─────── */

type Early = { promise: Promise<RoofDesignResponse>; controller: AbortController; used: boolean; failedAt?: number };
const early = new Map<string, Early>();
const pinKey = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
/** A failed design is not asked for again for this long (7 Nov 2026: re-asking on every re-render piled up 504s). */
export const RETRY_AFTER_FAILURE_MS = 30_000;
let lastPrefetch: string | null = null;

function ask(pin: LatLng): Early {
  const k = pinKey(pin);
  const had = early.get(k);
  if (had && !(had.failedAt && Date.now() - had.failedAt > RETRY_AFTER_FAILURE_MS)) return had;
  const controller = new AbortController();
  const entry: Early = { promise: requestRoofDesign({ lat: pin.lat, lng: pin.lng }, { signal: controller.signal }), controller, used: false };
  entry.promise.catch(() => {
    entry.failedAt = Date.now();
  });
  early.set(k, entry);
  return entry;
}

/**
 * The Roof Designer's design for a pin, asked once per pin and shared (the
 * roof step collects what the address step started).
 */
export function roofDesignFor(pin: LatLng): Promise<RoofDesignResponse> {
  const e = ask(pin);
  e.used = true;
  return e.promise;
}

/** Asks again for a pin (Opus was still tracing it): the earlier answer is dropped. */
export function refreshRoofDesign(pin: LatLng): Promise<RoofDesignResponse> {
  early.delete(pinKey(pin));
  return roofDesignFor(pin);
}

/** True when the design says Opus is still tracing and checking the roof. */
export function stillTracing(d: RoofDesignResponse | null | undefined): boolean {
  const notes = (d as { notes?: string[] } | null | undefined)?.notes ?? [];
  return notes.some((n) => /^(EasyLink AI|Opus) is still/.test(n));
}

/**
 * The address step's head start: asks for the design once the pin has
 * settled. A head start for a pin the customer has since moved away from is
 * called off (the server drops it if it hasn't started), so nudging the pin
 * doesn't queue a design per nudge.
 */
export function prefetchRoofDesign(pin: LatLng): void {
  const k = pinKey(pin);
  if (lastPrefetch && lastPrefetch !== k) {
    const prev = early.get(lastPrefetch);
    if (prev && !prev.used) {
      prev.controller.abort();
      early.delete(lastPrefetch);
    }
  }
  lastPrefetch = k;
  ask(pin).promise.catch(() => {});
}
