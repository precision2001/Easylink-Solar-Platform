import { NextResponse } from "next/server";
import { backendAuthedFetch, forwardBackendJson } from "@/lib/server/backend-authed-fetch";
import type { RoofDesignInputs } from "@/lib/server/auto-roof-design";
import { roofJob } from "@/lib/server/roofDesignPool";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Runs the platform designer for a lead's address and stores the result
 * (Quotes & Leads roof design). One design per lead at a time, and at most
 * two at once on this server, so a page full of new leads can't swamp it.
 */
const inFlight = new Map<string, Promise<NextResponse>>();
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

async function designLead(id: string): Promise<NextResponse> {
  const path = `/leads/${encodeURIComponent(id)}/roof-design`;
  const inputsRes = await backendAuthedFetch("admin", `${path}/inputs`);
  const inputsJson = (await inputsRes.json().catch(() => null)) as { success?: boolean; message?: string; data?: RoofDesignInputs } | null;
  if (!inputsRes.ok || !inputsJson?.data) {
    return NextResponse.json({ success: false, message: inputsJson?.message ?? "Could not load the lead's address." }, { status: inputsRes.status || 502 });
  }
  const inputs = inputsJson.data;

  let result;
  try {
    // On the design worker (one design at a time across the server).
    const r = await slot(() => roofJob({ kind: "auto", inputs }, { key: `lead|${id}|${Date.now()}` }));
    // Buffers come back from the worker as plain byte arrays.
    result = r.status === "READY" ? { ...r, thumb: Buffer.from(r.thumb), large: Buffer.from(r.large) } : r;
  } catch (err) {
    console.error("auto roof design failed", id, err);
    result = { status: "FAILED" as const, message: "The designer couldn't finish. Try again." };
  }

  const body =
    result.status === "READY"
      ? {
          status: result.status,
          address: inputs.address,
          lat: result.lat,
          lng: result.lng,
          panelCount: result.panelCount,
          panelWatts: result.panelWatts,
          systemKw: result.systemKw,
          orientation: result.orientation,
          faceCount: result.faceCount,
          roofAreaM2: result.roofAreaM2,
          message: result.message,
          thumbBase64: result.thumb.toString("base64"),
          largeBase64: result.large.toString("base64"),
        }
      : { status: result.status, address: inputs.address, lat: "lat" in result ? result.lat ?? null : null, lng: "lng" in result ? result.lng ?? null : null, message: result.message };

  return forwardBackendJson(
    await backendAuthedFetch("admin", path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = inFlight.get(id);
  if (existing) return (await existing).clone() as NextResponse;
  const job = designLead(id).finally(() => inFlight.delete(id));
  inFlight.set(id, job);
  return (await job).clone() as NextResponse;
}
