import { getVideoCallHistoryLabel, isVideoCallHistoryMessage } from "@/lib/chat/call-history-message";

/**
 * One plain line for a conversation list: markdown images and file links
 * (how the composer inserts attachments) read as "Photo" / the file name,
 * formatting marks are dropped, and call-history markers use their label.
 */
export function messagePreviewText(body: string | null | undefined, max = 80): string {
  if (!body) return "";
  if (isVideoCallHistoryMessage(body)) return getVideoCallHistoryLabel(body);
  const text = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " Photo ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, " $1 ")
    .replace(/[*_`>#~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Short timestamp for a conversation list in Sydney time: the time today,
 * the weekday within the last week, otherwise "12 Oct". Empty when unknown.
 */
export function conversationTimeLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = "Australia/Sydney";
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  if (day(d) === day(now)) {
    return new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
  }
  const ageDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (ageDays >= 0 && ageDays < 6) {
    return new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "short" }).format(d);
  }
  return new Intl.DateTimeFormat("en-AU", { timeZone: tz, day: "numeric", month: "short" }).format(d);
}
