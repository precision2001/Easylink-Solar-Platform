import { Resend } from "resend";
import { KIND_TEXT, sayWhen, type BookingKind } from "@/lib/booking/rules";

/**
 * Booking confirmation and cancellation emails (Resend), with a calendar
 * invite attached. Best effort: a failed email never undoes a booking.
 */

export const BOOKING_PHONE = { display: "02 9163 8128", tel: "+61291638128" };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const icsTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);

/** A one-event calendar file (UTC times, so every calendar shows local time correctly). */
export function bookingIcs(opts: { id: string; kind: BookingKind; startAt: string; endAt: string; address?: string | null; manageUrl: string; cancel?: boolean }): string {
  const title = `EasyLink Solar: ${KIND_TEXT[opts.kind].label}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EasyLink Solar//Booking link//EN",
    `METHOD:${opts.cancel ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:booking-${opts.id}@easylinksolar.com.au`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(opts.startAt)}`,
    `DTEND:${icsTime(opts.endAt)}`,
    `SUMMARY:${icsText(title)}`,
    opts.address && opts.kind !== "CALLBACK" ? `LOCATION:${icsText(opts.address)}` : null,
    `DESCRIPTION:${icsText(`Change or cancel: ${opts.manageUrl}\nQuestions: ${BOOKING_PHONE.display}`)}`,
    `STATUS:${opts.cancel ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function shell(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F2F9FC;font-family:Arial,Helvetica,sans-serif;color:#111C27">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E1E7EF;border-radius:14px">
<tr><td style="padding:24px 24px 8px;font-size:18px;font-weight:bold">EasyLink Solar</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:15px;line-height:23px;color:#304050">${body}</td></tr>
</table>
<p style="font-size:12px;color:#4B5B6E;margin:14px 0 0">EasyLink Plus Pty Ltd · easylinksolar.com.au</p>
</td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, ics: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const out = await new Resend(key).emails.send({
      from: process.env.RESEND_FROM_EMAIL?.trim() || "EasyLink Solar <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      attachments: [{ filename: "easylink-booking.ics", content: Buffer.from(ics, "utf8"), contentType: "text/calendar" }],
    });
    return !out.error;
  } catch {
    return false;
  }
}

export async function sendBookingConfirmation(opts: {
  to: string;
  firstName: string;
  id: string;
  kind: BookingKind;
  startAt: string;
  endAt: string;
  address?: string | null;
  manageUrl: string;
}): Promise<boolean> {
  const what = KIND_TEXT[opts.kind].label;
  const when = sayWhen(opts.startAt);
  const next =
    opts.kind === "CALLBACK"
      ? `A solar specialist will call you from ${BOOKING_PHONE.display}.`
      : opts.kind === "SERVICE"
        ? "Your technician will be in touch before they arrive."
        : "We'll check your roof, switchboard and shading so your quote is exact. Please make sure someone 18 or over is home.";
  const html = shell(`
<p style="margin:0 0 14px">Hi ${esc(opts.firstName || "there")},</p>
<p style="margin:0 0 14px">You're booked in:</p>
<p style="margin:0 0 14px;padding:14px 16px;background:#E6F7FB;border-radius:10px;color:#111C27"><strong>${esc(what)}</strong><br>${esc(when)} (Sydney time)${opts.address && opts.kind !== "CALLBACK" ? `<br>${esc(opts.address)}` : ""}</p>
<p style="margin:0 0 14px">${esc(next)}</p>
<p style="margin:0 0 18px"><a href="${esc(opts.manageUrl)}" style="display:inline-block;background:#0369A1;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">Change or cancel</a></p>
<p style="margin:0">Questions? Call ${BOOKING_PHONE.display}. The attached invite adds it to your calendar.</p>`);
  return send(opts.to, `Booked: ${what}, ${when}`, html, bookingIcs(opts));
}

export async function sendBookingCancelled(opts: {
  to: string;
  firstName: string;
  id: string;
  kind: BookingKind;
  startAt: string;
  endAt: string;
  rebookUrl: string;
}): Promise<boolean> {
  const what = KIND_TEXT[opts.kind].label;
  const html = shell(`
<p style="margin:0 0 14px">Hi ${esc(opts.firstName || "there")},</p>
<p style="margin:0 0 14px">Your ${esc(what.toLowerCase())} on ${esc(sayWhen(opts.startAt))} is cancelled.</p>
<p style="margin:0 0 18px"><a href="${esc(opts.rebookUrl)}" style="display:inline-block;background:#0369A1;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:10px">Book another time</a></p>
<p style="margin:0">Or call ${BOOKING_PHONE.display}.</p>`);
  return send(opts.to, `Cancelled: ${what}`, html, bookingIcs({ ...opts, manageUrl: opts.rebookUrl, cancel: true }));
}
