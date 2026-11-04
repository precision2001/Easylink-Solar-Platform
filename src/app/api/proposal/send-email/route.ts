import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import {
  clientIpFrom,
  createRateLimiter,
  isSameOriginRequest,
} from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * The browser compresses the email copy to about 900 KB (EMAIL_PDF_MAX_BYTES);
 * this leaves headroom for a copy that couldn't be squeezed that far.
 */
const MAX_PDF_BYTES = 3 * 1024 * 1024;

const HOUR_MS = 60 * 60 * 1000;
/** Per visitor IP — a customer re-downloading a few times is fine. */
const ipLimiter = createRateLimiter({ limit: 5, windowMs: HOUR_MS });
/** Per recipient address, so one inbox can't be flooded from many IPs. */
const recipientLimiter = createRateLimiter({ limit: 3, windowMs: HOUR_MS });

function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { message: "Too many proposal emails. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
    },
  );
}

const bodySchema = z.object({
  to: z.string().email(),
  /** Base64-encoded PDF bytes (no data: URL prefix). */
  pdfBase64: z.string().min(1),
  filename: z
    .string()
    .max(120)
    .optional()
    .default("Solar-Energy-Proposal.pdf"),
  /** Used in the email body salutation only. */
  dearName: z.string().max(200).optional(),
});

function firstWordName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "Customer";
  return t.split(/\s+/)[0] ?? "Customer";
}

export async function POST(request: Request) {
  // Only the site's own proposal modal may send these.
  if (!isSameOriginRequest(request.headers, request.url)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const ipCheck = ipLimiter.check(clientIpFrom(request.headers));
  if (!ipCheck.allowed) return tooManyRequests(ipCheck.retryAfterMs);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Email is not configured (missing RESEND_API_KEY)." },
      { status: 503 },
    );
  }

  // Two body formats: multipart with the PDF as a file (what the site sends —
  // no base64 overhead, so a compressed proposal stays under the web server's
  // 1 MB request limit), or the older JSON with base64.
  let to: string;
  let filename: string;
  let dearName: string | undefined;
  let buffer: Buffer;

  // Refuse oversized bodies before reading them (base64 JSON is ~4/3 the size).
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > Math.ceil((MAX_PDF_BYTES * 4) / 3) + 64 * 1024) {
    return NextResponse.json(
      { message: "The proposal PDF is too large to email. Download it and send it as a link instead." },
      { status: 413 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ message: "Invalid form body." }, { status: 400 });
    }
    const file = form.get("pdf");
    const parsed = bodySchema.omit({ pdfBase64: true }).safeParse({
      to: form.get("to"),
      filename: form.get("filename") ?? undefined,
      dearName: form.get("dearName") ?? undefined,
    });
    if (!parsed.success || !(file instanceof Blob)) {
      return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }
    ({ to, filename, dearName } = parsed.data);
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid request.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    ({ to, filename, dearName } = parsed.data);
    try {
      buffer = Buffer.from(parsed.data.pdfBase64, "base64");
    } catch {
      return NextResponse.json({ message: "Invalid PDF encoding." }, { status: 400 });
    }
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Easylink Solar <onboarding@resend.dev>";

  if (buffer.length < 100) {
    return NextResponse.json({ message: "PDF file is too small or empty." }, { status: 400 });
  }

  // Only PDFs may be attached.
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ message: "The attachment must be a PDF." }, { status: 400 });
  }

  // The browser compresses the email copy to about 1.5 MB; this is a backstop well
  // under what mail providers accept, so an oversized file fails clearly here.
  if (buffer.length > MAX_PDF_BYTES) {
    return NextResponse.json(
      { message: "The proposal PDF is too large to email. Download it and send it as a link instead." },
      { status: 413 },
    );
  }

  const recipientCheck = recipientLimiter.check(to.trim().toLowerCase());
  if (!recipientCheck.allowed) return tooManyRequests(recipientCheck.retryAfterMs);

  const salutation = dearName?.trim()
    ? dearName.trim()
    : firstWordName(to.split("@")[0] ?? "Customer");

  const resend = new Resend(apiKey);
  const sent = await resend.emails.send({
    from,
    to: [to],
    subject: "Your Solar Energy System Proposal — Easylink Solar",
    html: `
      <p>Dear ${escapeHtml(salutation)},</p>
      <p>Thank you for the opportunity to present your Solar Energy System Proposal. Your PDF is attached to this email.</p>
      <p>Best regards,<br />Easylink Solar</p>
    `,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });

  if (sent.error) {
    console.error("[proposal/send-email] Resend error:", sent.error);
    return NextResponse.json(
      { message: sent.error.message ?? "Failed to send email." },
      { status: sent.error.statusCode === 422 ? 400 : 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
