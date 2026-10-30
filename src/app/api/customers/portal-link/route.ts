import { NextResponse } from "next/server";
import { z } from "zod";
import { buildBackendUrl, extractMessage, unwrapApiData } from "@/lib/customers/backend";
import { setCustomerSessionCookies } from "@/lib/auth/customer-cookies";
import { checkPortalRole } from "@/lib/auth/portal-role";
import type { CustomerUser } from "@/lib/store/customerAuthSlice";

/** Matches the backend's portal-link rate limiter key (see design capture). */
const CLIENT_IP_HEADER = "x-easylink-client-ip";

const bodySchema = z.union([
  z.object({ action: z.literal("redeem"), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal("request"), email: z.string().trim().email() }),
]);

type RedeemPayload = { accessToken: string; refreshToken: string; user: CustomerUser };

/**
 * Passwordless portal links.
 * - `request`: email me a sign-in link (always the same reply).
 * - `redeem`: the /portal-link page's button; exchanges the emailed token for
 *   the usual customer session cookies.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "This link isn't valid. Request a new one from the sign-in page." },
      { status: 400 },
    );
  }

  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json(
      { message: "Server configuration is missing BACKEND_API_BASE_URL for sign-in." },
      { status: 500 },
    );
  }

  const input = parsed.data;
  const path = input.action === "redeem" ? "/auth/portal-link/redeem" : "/auth/portal-link/request";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const clientIp = request.headers.get("x-real-ip")?.trim();
  if (clientIp) headers[CLIENT_IP_HEADER] = clientIp;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(buildBackendUrl(backendBaseUrl, path), {
      method: "POST",
      headers,
      body: JSON.stringify(input.action === "redeem" ? { token: input.token } : { email: input.email }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("portal link fetch error", error);
    return NextResponse.json({ message: "Unable to reach the sign-in service." }, { status: 502 });
  }

  const payload = await backendResponse.json().catch(() => null);
  if (!backendResponse.ok) {
    return NextResponse.json(
      { message: extractMessage(payload, "This link has expired or was already used.") },
      { status: backendResponse.status },
    );
  }

  if (input.action === "request") {
    return NextResponse.json({
      message: extractMessage(payload, "If that email has an Easylink account, a sign-in link is on its way."),
    });
  }

  const data = unwrapApiData<RedeemPayload>(payload);
  if (!data || typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    return NextResponse.json({ message: "Unexpected response from sign-in service." }, { status: 502 });
  }
  const roleCheck = checkPortalRole("customer", data.user?.role);
  if (!roleCheck.ok) {
    return NextResponse.json({ message: roleCheck.message }, { status: roleCheck.status });
  }

  const res = NextResponse.json({
    message: "Signed in.",
    user: data.user,
    accessToken: data.accessToken,
  });
  setCustomerSessionCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
  return res;
}
