/**
 * The Roof Designer's jobs as plain data in, plain data out, so they can run
 * on the design worker thread (src/lib/roof-design/worker.ts) as well as in
 * the web server. A design keeps the CPU busy for seconds at a time; on the
 * web server's own thread that froze every page and API for everyone
 * (7 Nov 2026), so the server sends them to the worker (roofDesignPool).
 */
import { panelCorners, type LatLng, type LatLngRing } from "./geometry";
import { designRoofAt, renderRoofDesign } from "./server";
import type { PanelOrientation } from "@/lib/designer/designRules";
import { runAutoRoofDesign, type AutoRoofDesign, type RoofDesignInputs } from "@/lib/server/auto-roof-design";

export type ApiDesignJob = {
  kind: "api";
  pin: LatLng;
  formattedAddress: string | null;
  orientation?: PanelOrientation | "best";
  beautify?: boolean;
  panelWatts?: number;
  /** Datasheet size of the panel (long side heightM, short side widthM); default: Google's panel. */
  panelDims?: { heightM: number; widthM: number };
  outline?: LatLngRing[];
  includeImage?: boolean;
};
export type AutoDesignJob = { kind: "auto"; inputs: RoofDesignInputs };
export type RoofJob = ApiDesignJob | AutoDesignJob;

/** What POST /api/roof-design answers (status READY or NO_ROOF). */
export type ApiDesignResult = { status: "READY" | "NO_ROOF"; body: Record<string, unknown> };
export type RoofJobResult<J extends RoofJob> = J extends ApiDesignJob ? ApiDesignResult : AutoRoofDesign;

export async function runApiDesign(job: ApiDesignJob): Promise<ApiDesignResult> {
  const { pin, formattedAddress } = job;
  const r = await designRoofAt(pin, {
    orientation: job.orientation,
    beautify: job.beautify === true,
    panelWatts: job.panelWatts,
    dims: job.panelDims,
    outline: job.outline?.length ? job.outline : undefined,
  });
  if (r.status !== "READY") return { status: "NO_ROOF", body: { status: "NO_ROOF", pin, formattedAddress, message: r.message } };
  const d = r.design;
  let image: { contentType: string; base64: string } | null = null;
  if (job.includeImage === true && r.image) {
    const { large } = await renderRoofDesign(r.image, d);
    image = { contentType: "image/jpeg", base64: large.toString("base64") };
  }
  return {
    status: "READY",
    body: {
      status: "READY",
      pin,
      formattedAddress,
      outline: { rings: d.outline, source: d.outlineSource, needsVerification: d.needsVerification, areaM2: d.roofAreaM2 },
      determined: d.determined,
      faces: {
        source: d.faceSet.source,
        evidence: d.faceSet.evidence,
        gables: d.faceSet.gables,
        items: d.faceSet.faces.map((f) => ({ ring: f.ring, pitchDeg: f.pitchDeg ?? null, azimuthDeg: f.azimuthDeg ?? null })),
        // The AI's own reading (before the engine scored and corrected it), so
        // the Designs page can score it too when it reads faces itself.
        ai: r.context.aiFaces?.length ? r.context.aiFaces.map((f) => ({ ring: f.ring, azimuthDeg: f.azimuthDeg ?? null })) : undefined,
        // Opus's full trace (owner's rule: it traces every roof first): the page uses it as the design too.
        trace: r.context.aiTrace ?? undefined,
        traceLines: d.faceSet.trace,
      },
      obstructions: d.faceSet.obstructions.map((o) => ({ ring: o.ring, kind: o.kind })),
      lines: { total: d.lines.total, checked: d.lines.checked, ok: d.lines.ok },
      panels: {
        orientation: d.orientation,
        count: d.panels.length,
        counts: d.counts,
        watts: d.panelWatts,
        dims: d.dims,
        items: d.panels.map((p) => ({ face: p.segmentIndex, center: p.center, rotationDeg: p.rotationDegrees ?? 0, slopeDeg: p.slopeDegrees ?? 0, corners: panelCorners(p, d.dims) })),
      },
      systemKw: d.systemKw,
      roofPitchDeg: d.pitchDeg,
      inverter: d.inverter,
      notes: d.notes,
      image,
    },
  };
}

/** Runs a job right here (on the worker, or in the web server as a fallback). */
export async function runRoofJob(job: RoofJob): Promise<ApiDesignResult | AutoRoofDesign> {
  return job.kind === "api" ? runApiDesign(job) : runAutoRoofDesign(job.inputs);
}
