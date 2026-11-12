/**
 * Sending a design to the customer: it is already in their portal (it is
 * their design); this tells them, with a one-time sign-in link by email
 * and/or SMS. The backend also does this on its own after every staff or
 * installer save (at most once every 10 minutes).
 */

export type DesignChannel = "email" | "sms" | "both";
export type DesignShareResult = {
  email: "sent" | "failed" | "no-email" | "not-asked";
  sms: "sent" | "failed" | "no-mobile" | "no-consent" | "unavailable" | "not-asked";
  sharedAt: string | null;
  skipped?: "recently-sent" | "not-a-customer";
};

/** The lead's design and when it last went to the customer (Quotes & Leads rows). */
export type LeadDesignShare = {
  id: string;
  updatedAt: string;
  sharedAt: string | null;
  /** "EMAIL", "SMS" or "EMAIL,SMS". */
  sharedChannels: string | null;
};

export async function sendDesignToCustomer(
  portal: "admin" | "installers",
  designId: string,
  channel: DesignChannel,
): Promise<DesignShareResult> {
  const res = await fetch(`/api/${portal}/designs/${encodeURIComponent(designId)}/send-to-customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel }),
  });
  const body = (await res.json().catch(() => null)) as { data?: DesignShareResult; message?: string } | null;
  if (!res.ok || !body?.data) throw new Error(body?.message || "Could not send the design.");
  return body.data;
}

const EMAIL_WHY: Record<string, string> = {
  failed: "the email didn't go through",
  "no-email": "there's no email address for them",
};
const SMS_WHY: Record<string, string> = {
  failed: "the text didn't go through",
  "no-mobile": "there's no Australian mobile for them",
  "no-consent": "they've said no to texts",
  unavailable: "SMS isn't switched on yet",
};

/** One plain sentence for a toast: what went, and why anything didn't. */
export function describeShare(r: DesignShareResult | null | undefined): { tone: "success" | "warning" | "info"; text: string } | null {
  if (!r) return null;
  if (r.skipped === "recently-sent") return { tone: "info", text: "The customer was sent this design in the last 10 minutes, so no new message went." };
  if (r.skipped === "not-a-customer") return null;
  const sent = [r.email === "sent" ? "email" : null, r.sms === "sent" ? "SMS" : null].filter(Boolean);
  const notes = [
    r.email !== "sent" && EMAIL_WHY[r.email] ? `No email: ${EMAIL_WHY[r.email]}.` : null,
    r.sms !== "sent" && SMS_WHY[r.sms] ? `No SMS: ${SMS_WHY[r.sms]}.` : null,
  ].filter(Boolean);
  if (!sent.length) {
    return { tone: "warning", text: ["The design is in the customer's portal, but no message went.", ...notes].join(" ") };
  }
  return { tone: notes.length ? "warning" : "success", text: [`Sent to the customer's portal, with a link by ${sent.join(" and ")}.`, ...notes].join(" ") };
}

/** "Sent 2 h ago by email + SMS" / "Not sent to the customer yet". */
export function shareLabel(d: Pick<LeadDesignShare, "sharedAt" | "sharedChannels" | "updatedAt">, now = Date.now()): { text: string; stale: boolean } {
  if (!d.sharedAt) return { text: "Not sent to the customer yet", stale: true };
  const mins = Math.max(0, Math.round((now - new Date(d.sharedAt).getTime()) / 60000));
  const when = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 48 * 60 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
  const how = (d.sharedChannels ?? "").split(",").filter(Boolean).map((c) => (c === "SMS" ? "SMS" : "email")).join(" + ");
  // Changed since it was last sent (a minute's grace for the save itself).
  const stale = new Date(d.updatedAt).getTime() - new Date(d.sharedAt).getTime() > 60_000;
  return { text: `${stale ? "Changed since sent" : "Sent to customer"} ${when}${how ? ` by ${how}` : ""}`, stale };
}

export type ShareState = {
  state: "unsent" | "changed" | "sent";
  /** "2 h ago", "just now"; null when never sent. */
  when: string | null;
  /** "Email + SMS", "Email"; null when never sent. */
  how: string | null;
};

/** The indicator's state: never sent, changed since it was sent, or sent and current. */
export function shareState(d: Pick<LeadDesignShare, "sharedAt" | "sharedChannels" | "updatedAt">, now = Date.now()): ShareState {
  if (!d.sharedAt) return { state: "unsent", when: null, how: null };
  const mins = Math.max(0, Math.round((now - new Date(d.sharedAt).getTime()) / 60000));
  const when = mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 48 * 60 ? `${Math.round(mins / 60)} h ago` : `${Math.round(mins / 1440)} days ago`;
  const how = (d.sharedChannels ?? "").split(",").filter(Boolean).map((c) => (c === "SMS" ? "SMS" : "Email")).join(" + ") || null;
  const changed = new Date(d.updatedAt).getTime() - new Date(d.sharedAt).getTime() > 60_000;
  return { state: changed ? "changed" : "sent", when, how };
}
