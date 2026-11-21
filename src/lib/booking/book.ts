import { bookingLinkFor, makeLinkToken } from "@/lib/booking/link-token";
import { sendBookingCancelled, sendBookingConfirmation } from "@/lib/booking/notify";
import { addDays, isFreeTime, KIND_TEXT, sayWhen, sydneyDayKey, sydneyTime, type BookingKind } from "@/lib/booking/rules";
import {
  api,
  appendNote,
  busyTimes,
  cancelAppointment,
  createBooking,
  findOrCreateLead,
  getAppointment,
  getLead,
  nationalPhone,
  nominateToInstaller,
  BookingError,
  type Lead,
} from "@/lib/booking/service";
import { loadBookingSettings } from "@/lib/booking/settings-store";
import { firstName, type ResolvedTarget } from "@/lib/booking/target";

export type Details = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  smsOk?: boolean;
};

export type BookResult = {
  id: string;
  kind: BookingKind;
  startAt: string;
  endAt: string;
  when: string;
  manageUrl: string;
  emailed: boolean;
};

async function assertFree(kind: BookingKind, leadId: string | null, startAt: string) {
  const settings = await loadBookingSettings();
  if (!settings.live || !settings.kinds[kind]?.enabled) throw new BookingError("Online booking is closed right now. Please call us.", 403);
  const key = sydneyDayKey(new Date(startAt));
  const [y, m, d] = key.split("-").map(Number);
  const [ny, nm, nd] = addDays(key, 1).split("-").map(Number);
  const busy = await busyTimes(kind, leadId, sydneyTime(y, m, d, 0).toISOString(), sydneyTime(ny, nm, nd, 0).toISOString());
  if (!isFreeTime(settings, kind, busy, new Date(), startAt)) throw new BookingError("Sorry, that time isn't free any more. Please pick another.", 409);
  return settings.kinds[kind].minutes;
}

const SOURCE = "Website - booking link";

/** Book a time for a customer from the booking page. */
export async function bookFromLink(target: ResolvedTarget, kind: BookingKind, startAt: string, d: Details): Promise<BookResult> {
  let lead: Lead;
  let createdForInstaller = false;
  if (target.type === "lead") {
    lead = target.lead;
    const patch: Details = {};
    if (!lead.customerEmail && d.email) patch.email = d.email;
    if (!lead.customerPhone && d.phone) patch.phone = d.phone;
    if (!lead.address && d.address) patch.address = d.address;
    if (Object.keys(patch).length) {
      const { lead: merged } = await patchLead(lead, patch);
      lead = merged;
    }
  } else {
    if (!d.name || !d.phone || !d.email) throw new BookingError("Please fill in your name, mobile and email.");
    if (kind !== "CALLBACK" && !d.address) throw new BookingError("Please add the property address.");
    // Check the time before saving anything, so a refused booking leaves no record behind.
    await assertFree(kind, null, startAt);
    const out = await findOrCreateLead(
      { name: d.name, phone: d.phone, email: d.email, address: d.address ?? "", smsOk: !!d.smsOk },
      target.type === "installer" ? `${SOURCE} (installer)` : SOURCE,
    );
    lead = out.lead;
    createdForInstaller = target.type === "installer" && out.created;
  }

  const minutes = await assertFree(kind, lead.id, startAt);
  const start = new Date(startAt);
  const endAt = new Date(start.getTime() + minutes * 60_000).toISOString();
  const notes = ["Booked online by the customer.", d.notes?.trim() ? `Customer note: ${d.notes.trim()}` : null].filter(Boolean).join(" ");
  const appt = await createBooking(kind, lead.id, start.toISOString(), endAt, notes);
  if (!appt.id) throw new BookingError("The booking didn't save. Please try again or call us.", 502);

  // An installer's own link: a new customer and their booking go to that installer.
  if (createdForInstaller && target.type === "installer") {
    await nominateToInstaller(lead.id, target.installerId, "Booked through the installer's booking link.").catch(() => undefined);
  }

  const when = sayWhen(start.toISOString());
  const fresh = (await getLead(lead.id).catch(() => null)) ?? lead;
  await appendNote(fresh, `${KIND_TEXT[kind].label} booked for ${when}.${d.notes?.trim() ? ` Note: ${d.notes.trim()}` : ""}`).catch(() => undefined);

  const manageUrl = bookingLinkFor({ type: "booking", id: appt.id });
  const email = lead.customerEmail || d.email || "";
  const emailed = email
    ? await sendBookingConfirmation({
        to: email,
        firstName: firstName(lead.customerName ?? d.name),
        id: appt.id,
        kind,
        startAt: start.toISOString(),
        endAt,
        address: lead.address ?? d.address,
        manageUrl,
      })
    : false;

  return { id: appt.id, kind, startAt: start.toISOString(), endAt, when, manageUrl, emailed };
}

async function patchLead(lead: Lead, patch: Details): Promise<{ lead: Lead }> {
  const body: Record<string, string> = {};
  if (patch.email) body.customerEmail = patch.email;
  if (patch.phone) body.customerPhone = nationalPhone(patch.phone);
  if (patch.address) body.address = patch.address;
  await api("PATCH", `/leads/${lead.id}`, body);
  return {
    lead: {
      ...lead,
      customerEmail: body.customerEmail ?? lead.customerEmail,
      customerPhone: body.customerPhone ?? lead.customerPhone,
      address: body.address ?? lead.address,
    },
  };
}

export type ManagedBooking = {
  kind: BookingKind;
  label: string;
  startAt: string;
  endAt: string;
  when: string;
  status: string;
  firstName: string;
  rebookToken: string | null;
  /** The booking has started or finished. */
  past: boolean;
};

function kindOf(a: { aiKind?: string | null; title?: string }): BookingKind {
  if (a.aiKind === "CALLBACK" || a.aiKind === "SERVICE" || a.aiKind === "SITE_VISIT") return a.aiKind;
  // Backend titles: "Site visit: …", "Call back: …", "Service call: …".
  const t = (a.title ?? "").toLowerCase();
  if (t.startsWith("service")) return "SERVICE";
  if (t.startsWith("call")) return "CALLBACK";
  return "SITE_VISIT";
}

export async function loadManaged(appointmentId: string): Promise<{ booking: ManagedBooking; lead: Lead | null } | null> {
  const a = await getAppointment(appointmentId);
  if (!a) return null;
  const lead = a.leadId ? await getLead(a.leadId).catch(() => null) : null;
  const kind = kindOf(a);
  return {
    lead,
    booking: {
      kind,
      label: KIND_TEXT[kind].label,
      startAt: a.startAt,
      endAt: a.endAt,
      when: sayWhen(a.startAt),
      status: a.status,
      firstName: firstName(lead?.customerName),
      rebookToken: lead ? makeLinkToken({ type: "lead", id: lead.id }) : null,
      past: Date.parse(a.startAt) < Date.now(),
    },
  };
}

/** Cancel a booking from its change-or-cancel link. */
export async function cancelFromLink(appointmentId: string): Promise<ManagedBooking> {
  const m = await loadManaged(appointmentId);
  if (!m) throw new BookingError("We couldn't find that booking.", 404);
  if (m.booking.status === "CANCELLED") return m.booking;
  if (Date.parse(m.booking.startAt) < Date.now()) throw new BookingError("That booking has already started. Please call us.", 409);
  await cancelAppointment(appointmentId);
  if (m.lead) {
    await appendNote(m.lead, `Customer cancelled their ${m.booking.label.toLowerCase()} for ${m.booking.when} online.`).catch(() => undefined);
    if (m.lead.customerEmail) {
      const rebook = bookingLinkFor({ type: "lead", id: m.lead.id });
      await sendBookingCancelled({
        to: m.lead.customerEmail,
        firstName: m.booking.firstName,
        id: appointmentId,
        kind: m.booking.kind,
        startAt: m.booking.startAt,
        endAt: m.booking.endAt,
        rebookUrl: rebook,
      });
    }
  }
  return { ...m.booking, status: "CANCELLED" };
}

/** Move a booking: book the new time first, then cancel the old one. */
export async function rescheduleFromLink(appointmentId: string, startAt: string): Promise<BookResult> {
  const m = await loadManaged(appointmentId);
  if (!m || !m.lead) throw new BookingError("We couldn't find that booking.", 404);
  if (m.booking.status === "CANCELLED") throw new BookingError("That booking was cancelled. Please make a new one.", 409);
  const out = await bookFromLink({ type: "lead", lead: m.lead }, m.booking.kind, startAt, { notes: `Moved from ${m.booking.when}.` });
  await cancelAppointment(appointmentId).catch(() => undefined);
  return out;
}
