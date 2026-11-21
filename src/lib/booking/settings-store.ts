import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { normaliseSettings, type BookingLinkSettings } from "@/lib/booking/rules";

/**
 * Booking link settings, kept in a small JSON file on the web server, outside
 * the deploy folder so a deploy doesn't reset it (default
 * ../data/booking-link.json next to the web app; BOOKING_LINK_SETTINGS_FILE
 * overrides). Missing or unreadable → the defaults.
 */
function file(): string {
  return process.env.BOOKING_LINK_SETTINGS_FILE || path.join(process.cwd(), "..", "data", "booking-link.json");
}

let cache: { at: number; value: BookingLinkSettings } | null = null;

export async function loadBookingSettings(): Promise<BookingLinkSettings> {
  if (cache && Date.now() - cache.at < 15_000) return cache.value;
  let raw: unknown = null;
  try {
    raw = JSON.parse(await readFile(file(), "utf8"));
  } catch {
    raw = null;
  }
  const value = normaliseSettings(raw);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveBookingSettings(input: unknown): Promise<BookingLinkSettings> {
  const value = normaliseSettings(input);
  const f = file();
  await mkdir(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, f);
  cache = { at: Date.now(), value };
  return value;
}
