import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/auth/admin-cookies";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/auth/customer-cookies";
import { INSTALLER_ACCESS_COOKIE } from "@/lib/auth/installer-cookies";
import type { BackendPortal } from "@/lib/server/backend-authed-fetch";

/**
 * Bridge from the portals to the EasyLink AI platform (easylink-ai-platform).
 * The browser never talks to it directly: these server helpers attach the
 * signed-in person's existing portal token, so the AI platform resolves them
 * through the same backend (/users/me) and applies the same permissions.
 *
 * Env: AI_PLATFORM_URL (e.g. https://xxxx.execute-api.ap-southeast-2.amazonaws.com)
 *      AI_EVENT_INGEST_KEY (shared secret for anonymous website events)
 */
const PORTAL_COOKIE: Record<BackendPortal, string> = {
  admin: ADMIN_ACCESS_COOKIE,
  installer: INSTALLER_ACCESS_COOKIE,
  customer: CUSTOMER_ACCESS_COOKIE,
};

export const VISITOR_COOKIE = "el_vid";

export function aiPlatformConfigured(): boolean {
  return !!process.env.AI_PLATFORM_URL;
}

function aiUrl(path: string) {
  return `${process.env.AI_PLATFORM_URL!.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Call the AI platform as the person signed in to `portal`. */
export async function aiFetch(portal: BackendPortal, path: string, init?: RequestInit): Promise<Response | NextResponse> {
  if (!aiPlatformConfigured()) {
    return NextResponse.json({ success: false, message: "AI platform is not connected.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }
  const token = (await cookies()).get(PORTAL_COOKIE[portal])?.value;
  if (!token) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init?.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  try {
    return await fetch(aiUrl(path), { ...init, headers, cache: "no-store" });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to reach the AI platform." }, { status: 502 });
  }
}

export async function forwardAiJson(res: Response | NextResponse): Promise<NextResponse> {
  if (res instanceof NextResponse) return res;
  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export type AiEventInput = {
  type: string;
  subject?: { type: string; id: string };
  links?: { type: string; id: string }[];
  data?: Record<string, unknown>;
  pii?: string[];
};

/**
 * Emit catalogue events after a successful change in an existing route
 * (the backend can't emit them itself yet). Never throws and never delays the
 * person's request for long: AI is additive.
 */
export async function emitAiEvents(portal: BackendPortal | null, events: AiEventInput[], visitorId?: string): Promise<void> {
  if (!aiPlatformConfigured() || !events.length) return;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = portal ? (await cookies()).get(PORTAL_COOKIE[portal])?.value : undefined;
    // The ingest key marks this as the portal server relaying a change the backend accepted.
    if (process.env.AI_EVENT_INGEST_KEY) headers["x-ingest-key"] = process.env.AI_EVENT_INGEST_KEY;
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (headers["x-ingest-key"]) {
      if (visitorId) headers["x-visitor-id"] = visitorId;
    } else return;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    await fetch(aiUrl("/v1/events"), { method: "POST", headers, body: JSON.stringify(events), signal: ctrl.signal, cache: "no-store" }).catch(() => undefined);
    clearTimeout(t);
  } catch {
    /* AI is additive: never fail the person's request because of it */
  }
}

/** Which portal session (if any) the current request carries, most privileged first. */
export async function currentPortal(): Promise<BackendPortal | null> {
  const jar = await cookies();
  for (const p of ["admin", "installer", "customer"] as const) if (jar.get(PORTAL_COOKIE[p])?.value) return p;
  return null;
}

/**
 * Forward a backend response to the browser unchanged and, when it succeeded,
 * emit the matching catalogue events after the response has gone.
 */
export async function forwardBackendJsonWithEvents(
  res: Response | NextResponse,
  portal: BackendPortal | null,
  build: (data: Record<string, unknown>) => AiEventInput[],
): Promise<NextResponse> {
  if (res instanceof NextResponse) return res;
  const text = await res.text();
  if (res.ok && aiPlatformConfigured()) {
    let data: Record<string, unknown> = {};
    try {
      const json = JSON.parse(text) as { data?: unknown };
      data = (json?.data && typeof json.data === "object" ? json.data : json) as Record<string, unknown>;
    } catch {
      /* non-JSON body: emit with no data */
    }
    const events = build(data ?? {});
    after(() => emitAiEvents(portal, events));
  }
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
