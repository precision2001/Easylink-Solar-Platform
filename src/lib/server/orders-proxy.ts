import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/customers/backend";
import type { BackendPortal } from "@/lib/server/backend-authed-fetch";

/** Portals that can buy: the cart checks out as a customer or an installer. */
export type BuyerPortal = Extract<BackendPortal, "customer" | "installer">;

export function buyerPortalFrom(request: Request): BuyerPortal | null {
  const p = new URL(request.url).searchParams.get("portal");
  return p === "customer" || p === "installer" ? p : null;
}

export function badPortal() {
  return NextResponse.json({ message: "portal must be customer or installer." }, { status: 400 });
}

/** Unauthenticated call to the Express API (warehouses and cart pricing are public). */
export async function backendPublicFetch(path: string, init?: RequestInit): Promise<Response | NextResponse> {
  const base = process.env.BACKEND_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ message: "Server configuration is missing BACKEND_API_BASE_URL." }, { status: 500 });
  }
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body != null) headers.set("Content-Type", "application/json");
  try {
    return await fetch(buildBackendUrl(base, path), { ...init, headers, cache: "no-store" });
  } catch {
    return NextResponse.json({ message: "Unable to reach the backend service." }, { status: 502 });
  }
}
