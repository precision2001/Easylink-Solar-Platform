import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  backendAuthedFetch,
  forwardBackendJson,
} from "@/lib/server/backend-authed-fetch";
import { INSTALLER_ACCESS_COOKIE } from "@/lib/auth/installer-cookies";
import { saveCustomerDocumentToPublic } from "@/lib/server/customer-document-upload";
import { forwardBackendJsonWithEvents } from "@/lib/server/ai-platform";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const res = await backendAuthedFetch(
    "installer",
    `/installer-customer-documents?customerId=${encodeURIComponent(id)}`,
  );
  return forwardBackendJson(res);
}

export async function POST(request: Request, ctx: Ctx) {
  const jar = await cookies();
  if (!jar.get(INSTALLER_ACCESS_COOKIE)?.value) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id: customerId } = await ctx.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file." }, { status: 400 });
  }

  const saved = await saveCustomerDocumentToPublic(customerId, file);
  if (!saved.ok) {
    return NextResponse.json({ message: saved.message }, { status: 400 });
  }

  const res = await backendAuthedFetch("installer", "/installer-customer-documents", {
    method: "POST",
    body: JSON.stringify({
      customerId,
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      url: saved.url,
    }),
  });

  // The AI labels every upload (meter, switchboard, inverter…): no checkboxes.
  const slot = formData.get("slot");
  return forwardBackendJsonWithEvents(res, "installer", (d) => [
    {
      type: "file.uploaded",
      subject: { type: "document", id: String(d.id ?? "") },
      links: [{ type: "customer", id: customerId }],
      data: { mimeType: saved.mimeType, sizeBytes: saved.sizeBytes, slot: typeof slot === "string" ? slot : null },
    },
  ]);
}
