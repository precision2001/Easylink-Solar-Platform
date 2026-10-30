import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emitAiEvents, VISITOR_COOKIE } from "@/lib/server/ai-platform";
import { buildBackendUrl, extractMessage } from "@/lib/customers/backend";

const CAPTURE_PATH = "/design-capture";

/**
 * The backend rate-limits per visitor, but every request reaches it from this
 * server, so pass on the visitor's IP. nginx sets X-Real-IP; Next adds its own
 * x-forwarded-for even locally, so that one can't be trusted (see the note in
 * api/solar/roof-lines-check).
 */
const CLIENT_IP_HEADER = "x-easylink-client-ip";

/**
 * Public "save my design" from the /designs wizard. The backend creates the
 * customer, design and lead in one go and emails a portal link. No session is
 * set here: the emailed link is the only way into the account.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json(
      { message: "Server configuration is missing BACKEND_API_BASE_URL for design capture." },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const clientIp = request.headers.get("x-real-ip")?.trim();
  if (clientIp) headers[CLIENT_IP_HEADER] = clientIp;

  let backendResponse: Response;
  try {
    backendResponse = await fetch(buildBackendUrl(backendBaseUrl, CAPTURE_PATH), {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(body && typeof body === "object" ? body : {}),
        site: "easylinksolar.com.au",
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("design capture fetch error", error);
    return NextResponse.json(
      { message: "Unable to reach the design service. Please try again." },
      { status: 502 },
    );
  }

  const text = await backendResponse.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!backendResponse.ok) {
    const errors =
      payload && typeof payload === "object" && "errors" in payload && Array.isArray(payload.errors)
        ? payload.errors
        : undefined;
    return NextResponse.json(
      {
        message: extractMessage(payload, "We couldn't save your design. Please try again."),
        ...(errors ? { errors } : {}),
      },
      { status: backendResponse.status },
    );
  }

  const designId = (payload as { data?: { designId?: unknown } } | null)?.data?.designId;
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  after(() =>
    emitAiEvents(
      null,
      [
        {
          type: "form.submitted",
          subject: { type: "visitor", id: visitorId ?? "anonymous" },
          data: { form: "design", ...(designId ? { designId: String(designId) } : {}) },
        },
      ],
      visitorId,
    ),
  );

  return NextResponse.json(
    {
      message: extractMessage(payload, "Design saved. Check your email for a link to your portal."),
    },
    { status: 201 },
  );
}
