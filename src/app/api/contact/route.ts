import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { emitAiEvents, VISITOR_COOKIE } from "@/lib/server/ai-platform";
import {
  buildBackendUrl,
  extractMessage,
} from "@/lib/customers/backend";

const CONTACT_PATH = "/leads/contact";

/** Public "Send us a message" contact form — stores a Lead and emails sales. */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;

  if (!backendBaseUrl) {
    return NextResponse.json(
      {
        message:
          "Server configuration is missing BACKEND_API_BASE_URL for contact form.",
      },
      { status: 500 },
    );
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(buildBackendUrl(backendBaseUrl, CONTACT_PATH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...(body && typeof body === "object" ? body : {}),
        site: "easylinksolar.com.au",
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("contact form fetch error", error);
    return NextResponse.json(
      { message: "Unable to reach the contact service." },
      { status: 502 },
    );
  }

  const responseText = await backendResponse.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!backendResponse.ok) {
    // The backend's generic `validate()` middleware reports issues as
    // `errors: [{ field, message }]`, not the `fieldErrors` shape some other
    // auth routes build by hand — forward it as-is for the form to map.
    const errors =
      payload &&
      typeof payload === "object" &&
      "errors" in payload &&
      Array.isArray(payload.errors)
        ? payload.errors
        : undefined;

    return NextResponse.json(
      {
        message: extractMessage(
          payload,
          "Could not send your message. Please try again.",
        ),
        ...(errors ? { errors } : {}),
      },
      { status: backendResponse.status },
    );
  }

  // New website lead → the Sales agent responds within minutes (AI platform).
  const leadData = (payload as { data?: { id?: unknown } } | null)?.data;
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  after(() =>
    emitAiEvents(
      null,
      [
        { type: "form.submitted", subject: { type: "visitor", id: visitorId ?? "anonymous" }, data: { form: "contact" } },
        ...(leadData?.id ? [{ type: "lead.created", subject: { type: "lead", id: String(leadData.id) }, data: { source: "website_contact_form" } }] : []),
      ],
      visitorId,
    ),
  );

  return NextResponse.json(
    {
      message: extractMessage(
        payload,
        "Thanks — we've received your message and will be in touch shortly.",
      ),
    },
    { status: 200 },
  );
}
