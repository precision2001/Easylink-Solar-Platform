/**
 * Australian outbound-contact rules (spec 8.2, 14.2).
 * - Telecommunications (Telemarketing and Research Calls) Industry Standard 2017:
 *   marketing calls only 9am–8pm weekdays, 9am–5pm Saturday, none on Sunday or
 *   national public holidays, in the recipient's local time.
 * - EasyLink quiet hours for agent-originated SMS: none 8pm–8am local time.
 * This is engineering guidance, not legal advice; review with a lawyer.
 */

export type AuState = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT" | "ACT";

export const STATE_TZ: Record<AuState, string> = {
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
  WA: "Australia/Perth",
};

/** State from an Australian postcode (Australia Post ranges). */
export function stateFromPostcode(postcode: string | number): AuState | null {
  const p = Number(String(postcode).trim());
  if (!Number.isFinite(p)) return null;
  if ((p >= 200 && p <= 299) || (p >= 2600 && p <= 2618) || (p >= 2900 && p <= 2920)) return "ACT";
  if ((p >= 1000 && p <= 2599) || (p >= 2619 && p <= 2899) || (p >= 2921 && p <= 2999)) return "NSW";
  if ((p >= 3000 && p <= 3999) || (p >= 8000 && p <= 8999)) return "VIC";
  if ((p >= 4000 && p <= 4999) || (p >= 9000 && p <= 9999)) return "QLD";
  if (p >= 5000 && p <= 5999) return "SA";
  if (p >= 6000 && p <= 6999) return "WA";
  if (p >= 7000 && p <= 7999) return "TAS";
  if (p >= 800 && p <= 999) return "NT";
  return null;
}

/** Last 4-digit number in an address, used as the postcode. */
export function stateFromAddress(address: string | null | undefined): AuState | null {
  if (!address) return null;
  const explicit = address.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i)?.[1]?.toUpperCase() as AuState | undefined;
  if (explicit) return explicit;
  const pcs = address.match(/\b\d{4}\b/g);
  return pcs ? stateFromPostcode(pcs.at(-1)!) : null;
}

/**
 * National public holidays (and nationally observed substitutes) when telemarketing
 * calls are prohibited. Review every year against the Fair Work Ombudsman list.
 */
export const NATIONAL_PUBLIC_HOLIDAYS = new Set<string>([
  // 2026
  "2026-01-01", "2026-01-26", "2026-04-03", "2026-04-06", "2026-04-25", "2026-12-25", "2026-12-28",
  // 2027
  "2027-01-01", "2027-01-26", "2027-03-26", "2027-03-29", "2027-04-25", "2027-12-27", "2027-12-28",
]);

type LocalTime = { date: string; weekday: number; hour: number; minute: number };

export function localTime(at: Date, tz: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: wd, hour, minute: Number(get("minute")) };
}

/** Telemarketing Industry Standard calling window. Unknown state → use the strictest (latest-opening) zone. */
export function withinTelemarketingHours(at: Date, state: AuState | null): { ok: boolean; reason?: string } {
  const zones = state ? [STATE_TZ[state]] : Object.values(STATE_TZ);
  for (const tz of zones) {
    const t = localTime(at, tz);
    if (NATIONAL_PUBLIC_HOLIDAYS.has(t.date)) return { ok: false, reason: `national public holiday (${t.date})` };
    if (t.weekday === 0) return { ok: false, reason: "Sunday" };
    const mins = t.hour * 60 + t.minute;
    if (t.weekday === 6) {
      if (mins < 9 * 60 || mins >= 17 * 60) return { ok: false, reason: "outside 9am–5pm Saturday" };
    } else if (mins < 9 * 60 || mins >= 20 * 60) {
      return { ok: false, reason: "outside 9am–8pm weekdays" };
    }
  }
  return { ok: true };
}

/** EasyLink quiet hours for agent-originated SMS (spec 7.4). */
export function withinSmsHours(at: Date, state: AuState | null): boolean {
  const zones = state ? [STATE_TZ[state]] : Object.values(STATE_TZ);
  return zones.every((tz) => {
    const { hour } = localTime(at, tz);
    return hour >= 8 && hour < 20;
  });
}

/** Opt-out keywords for inbound SMS (Spam Act functional unsubscribe). */
export function isOptOut(text: string): boolean {
  return /^\s*(stop|stop all|unsubscribe|cancel|end|quit|opt out|optout)\s*[.!]?\s*$/i.test(text);
}
