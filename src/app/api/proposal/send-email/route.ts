import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Email is not configured (missing RESEND_API_KEY)." },
      { status: 503 },
    );
  }

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

  const { to, pdfBase64, filename, dearName } = parsed.data;

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Easylink Solar <onboarding@resend.dev>";

  let buffer: Buffer;
  try {
    buffer = Buffer.from(pdfBase64, "base64");
  } catch {
    return NextResponse.json({ message: "Invalid PDF encoding." }, { status: 400 });
  }

  if (buffer.length < 100) {
    return NextResponse.json({ message: "PDF file is too small or empty." }, { status: 400 });
  }

  // The browser compresses the email copy to about 1.5 MB; this is a backstop well
  // under what mail providers accept, so an oversized file fails clearly here.
  if (buffer.length > MAX_PDF_BYTES) {
    return NextResponse.json(
      { message: "The proposal PDF is too large to email. Download it and send it as a link instead." },
      { status: 413 },
    );
  }

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
