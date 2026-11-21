/**
 * Calendar booking link: the rules for which times a customer may pick.
 *
 * Pure functions only (no fetch, no env) so they run in the browser, on the
 * server and in tests alike. All wall-clock times are Sydney time; instants
 * are ISO strings in UTC.
 */

export const BOOKING_TZ = "Australia/Sydney";

export const BOOKING_KINDS = ["SITE_VISIT", "CALLBACK", "SERVICE"] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

/** Opening hours for one weekday, in minutes after midnight; null = closed. */
export type DayHours = { open: number; close: number } | null;

export type KindRule = {
  enabled: boolean;
  /** Length of the booking. */
  minutes: number;
  /** Start times are offered every `step` minutes from opening. */
  step: number;
  /** Index 0 = Sunday … 6 = Saturday. */
  hours: DayHours[];
};

export type EarliestRule = "NEXT_BUSINESS_DAY" | "SAME_DAY_3H" | "TWO_BUSINESS_DAYS";

export type BookingLinkSettings = {
  /** The public link and personal links accept bookings. */
  live: boolean;
  kinds: Record<BookingKind, KindRule>;
  earliest: EarliestRule;
  /** How far ahead customers can book. */
  horizonDays: number;
  /** Travel gap kept free before and after a site or service visit. */
  gapMinutes: number;
  /** Most visits (site + service) the receiving person gets in a day. */
  maxVisitsPerDay: number;
  closedOnPublicHolidays: boolean;
};

const h = (n: number) => n * 60;
const WEEKDAYS = (open: number, close: number, sat: DayHours = null): DayHours[] => [
  null,
  { open, close },
  { open, close },
  { open, close },
  { open, close },
  { open, close },
  sat,
];

export const DEFAULT_BOOKING_LINK_SETTINGS: BookingLinkSettings = {
  live: true,
  kinds: {
    SITE_VISIT: { enabled: true, minutes: 60, step: 60, hours: WEEKDAYS(h(8), h(17), { open: h(9), close: h(13) }) },
    CALLBACK: { enabled: true, minutes: 15, step: 30, hours: WEEKDAYS(h(9), h(17)) },
    SERVICE: { enabled: false, minutes: 60, step: 60, hours: WEEKDAYS(h(8), h(16)) },
  },
  earliest: "NEXT_BUSINESS_DAY",
  horizonDays: 28,
  gapMinutes: 30,
  maxVisitsPerDay: 4,
  closedOnPublicHolidays: true,
};

export const KIND_TEXT: Record<BookingKind, { label: string; short: string; sub: string }> = {
  SITE_VISIT: { label: "Free site visit", short: "Site visit", sub: "We come to your home to check the roof, switchboard and shading" },
  CALLBACK: { label: "Phone call back", short: "Call back", sub: "A solar specialist calls you" },
  SERVICE: { label: "Service visit", short: "Service visit", sub: "A technician checks a fault or warranty issue" },
};

/** NSW statewide public holidays (nsw.gov.au), Sydney dates. Add 2028 before the end of 2027. */
export const NSW_PUBLIC_HOLIDAYS = new Set<string>([
  "2026-01-01", "2026-01-26", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06", "2026-04-25", "2026-04-27",
  "2026-06-08", "2026-10-05", "2026-12-25", "2026-12-26", "2026-12-28",
  "2027-01-01", "2027-01-26", "2027-03-26", "2027-03-27", "2027-03-28", "2027-03-29", "2027-04-25", "2027-04-26",
  "2027-06-14", "2027-10-04", "2027-12-25", "2027-12-26", "2027-12-27", "2027-12-28",
]);

// ---------------------------------------------------------------- Sydney time

export type SydneyParts = { y: number; m: number; d: number; hour: number; minute: number; weekday: number };

const partsFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: BOOKING_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function sydneyParts(at: Date): SydneyParts {
  const p: Record<string, string> = {};
  for (const x of partsFmt.formatToParts(at)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, hour: +p.hour % 24, minute: +p.minute, weekday: WD[p.weekday] ?? 0 };
}

/** "YYYY-MM-DD" of a Sydney calendar day. */
export const dayKey = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function sydneyDayKey(at: Date): string {
  const p = sydneyParts(at);
  return dayKey(p.y, p.m, p.d);
}

/** The instant of a Sydney wall-clock time (handles daylight saving). */
export function sydneyTime(y: number, m: number, d: number, minutes: number): Date {
  const wall = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  let guess = wall - 10 * 3600_000;
  for (let i = 0; i < 3; i++) {
    const p = sydneyParts(new Date(guess));
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute);
    guess += wall - seen;
  }
  return new Date(guess);
}

/** Calendar arithmetic on Sydney dates (no time zone involved). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return dayKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const isBusinessDay = (key: string) => {
  const wd = weekdayOf(key);
  return wd !== 0 && wd !== 6 && !NSW_PUBLIC_HOLIDAYS.has(key);
};

/** The earliest instant a customer may book from `now`. */
export function earliestStart(rule: EarliestRule, now: Date): Date {
  if (rule === "SAME_DAY_3H") return new Date(now.getTime() + 3 * 3600_000);
  let key = sydneyDayKey(now);
  let need = rule === "TWO_BUSINESS_DAYS" ? 2 : 1;
  while (need > 0) {
    key = addDays(key, 1);
    if (isBusinessDay(key)) need--;
  }
  const [y, m, d] = key.split("-").map(Number);
  return sydneyTime(y, m, d, 0);
}

// ---------------------------------------------------------------- free times

export type Busy = { startAt: string; endAt: string; kind?: string | null };

export type FreeDay = { date: string; times: { start: string; end: string; label: string }[] };

export function timeLabel(minutes: number): string {
  const hr = Math.floor(minutes / 60);
  const mi = minutes % 60;
  return `${((hr + 11) % 12) + 1}:${String(mi).padStart(2, "0")} ${hr < 12 ? "am" : "pm"}`;
}

const isVisit = (kind?: string | null) => kind === "SITE_VISIT" || kind === "SERVICE";

/**
 * Free start times per Sydney day between `fromKey` and `toKey` (inclusive),
 * after the earliest-booking rule, opening hours, public holidays, existing
 * bookings (with the travel gap around visits) and the daily visit limit.
 */
export function freeTimes(
  settings: BookingLinkSettings,
  kind: BookingKind,
  busy: Busy[],
  now: Date,
  fromKey: string,
  toKey: string,
): FreeDay[] {
  const rule = settings.kinds[kind];
  if (!settings.live || !rule?.enabled) return [];
  const first = earliestStart(settings.earliest, now).getTime();
  const last = sydneyTime(...(addDays(sydneyDayKey(now), settings.horizonDays).split("-").map(Number) as [number, number, number]), 24 * 60).getTime();
  const visit = isVisit(kind);
  const gap = visit ? settings.gapMinutes * 60_000 : 0;
  const spans = busy.map((b) => {
    const pad = visit && isVisit(b.kind ?? "SITE_VISIT") ? gap : 0;
    return { s: Date.parse(b.startAt) - pad, e: Date.parse(b.endAt) + pad, day: sydneyDayKey(new Date(b.startAt)), visit: isVisit(b.kind ?? "SITE_VISIT") };
  });

  const out: FreeDay[] = [];
  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) {
    const hours = rule.hours[weekdayOf(key)];
    if (!hours) continue;
    if (settings.closedOnPublicHolidays && NSW_PUBLIC_HOLIDAYS.has(key)) continue;
    if (visit && spans.filter((b) => b.visit && b.day === key).length >= settings.maxVisitsPerDay) continue;
    const [y, m, d] = key.split("-").map(Number);
    const times: FreeDay["times"] = [];
    for (let t = hours.open; t + rule.minutes <= hours.close; t += rule.step) {
      const s = sydneyTime(y, m, d, t).getTime();
      const e = s + rule.minutes * 60_000;
      if (s < first || e > last) continue;
      if (spans.some((b) => s < b.e && e > b.s)) continue;
      times.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString(), label: timeLabel(t) });
    }
    if (times.length) out.push({ date: key, times });
  }
  return out;
}

/** True when `startIso` is one of the free times for that kind right now. */
export function isFreeTime(settings: BookingLinkSettings, kind: BookingKind, busy: Busy[], now: Date, startIso: string): boolean {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  const key = sydneyDayKey(start);
  return freeTimes(settings, kind, busy, now, key, key).some((d) => d.times.some((t) => Date.parse(t.start) === start.getTime()));
}

/** Merge saved settings over the defaults so new fields always have a value. */
export function normaliseSettings(raw: unknown): BookingLinkSettings {
  const base = DEFAULT_BOOKING_LINK_SETTINGS;
  if (!raw || typeof raw !== "object") return structuredClone(base);
  const r = raw as Partial<BookingLinkSettings>;
  const kinds = {} as Record<BookingKind, KindRule>;
  for (const k of BOOKING_KINDS) {
    const saved = (r.kinds?.[k] ?? {}) as Partial<KindRule>;
    const hours = Array.isArray(saved.hours) && saved.hours.length === 7 ? saved.hours : base.kinds[k].hours;
    kinds[k] = {
      enabled: typeof saved.enabled === "boolean" ? saved.enabled : base.kinds[k].enabled,
      minutes: clampInt(saved.minutes, 15, 240, base.kinds[k].minutes),
      step: clampInt(saved.step, 15, 240, base.kinds[k].step),
      hours: hours.map((x, i) =>
        x && typeof x === "object" && Number.isFinite(x.open) && Number.isFinite(x.close) && x.open < x.close
          ? { open: clampInt(x.open, 0, 1440, 0), close: clampInt(x.close, 0, 1440, 1440) }
          : x === null
            ? null
            : base.kinds[k].hours[i],
      ),
    };
  }
  return {
    live: typeof r.live === "boolean" ? r.live : base.live,
    kinds,
    earliest: (["NEXT_BUSINESS_DAY", "SAME_DAY_3H", "TWO_BUSINESS_DAYS"] as const).includes(r.earliest as EarliestRule)
      ? (r.earliest as EarliestRule)
      : base.earliest,
    horizonDays: clampInt(r.horizonDays, 7, 90, base.horizonDays),
    gapMinutes: clampInt(r.gapMinutes, 0, 120, base.gapMinutes),
    maxVisitsPerDay: clampInt(r.maxVisitsPerDay, 1, 12, base.maxVisitsPerDay),
    closedOnPublicHolidays: typeof r.closedOnPublicHolidays === "boolean" ? r.closedOnPublicHolidays : base.closedOnPublicHolidays,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? Math.round(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** "Tuesday 24 November, 10:00 am" in Sydney time. */
export function sayWhen(iso: string): string {
  const at = new Date(iso);
  const date = at.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: BOOKING_TZ });
  const p = sydneyParts(at);
  return `${date}, ${timeLabel(p.hour * 60 + p.minute)}`;
}
