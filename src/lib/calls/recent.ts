/**
 * Shape and formatting for a row of the agent's call history.
 *
 * Two pages render this list — the Agent Dialer, where a row reopens a stored
 * transcript, and the Contact Centre, where it plays the recording — so the
 * field mapping lives here rather than being written twice and drifting.
 */

export type RecordingStatus = "NOT_RECORDED" | "RECORDING" | "STORED" | "FAILED";
export type TranscriptStatus =
  | "NOT_REQUESTED"
  | "QUEUED"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export interface RecentCall {
  id: string;
  counterpartyNumber: string;
  startedAt: string;
  durationSec: number | null;
  outcome: string | null;
  notes: string | null;
  transcriptStatus: TranscriptStatus;
  recordingStatus: RecordingStatus;
  leadId: string | null;
  leadName: string | null;
  hasTranscript: boolean;
  hasRecording: boolean;
}

/** Seconds as `m:ss`. */
export const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** "26 Aug, 2:14 pm" — enough to tell two calls apart in a list. */
export function callStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  })}, ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

/** CALL_BACK_LATER → "Call back later". */
export function outcomeLabel(outcome: string): string {
  const words = outcome.toLowerCase().split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Who the call was with: the matched customer, else the raw number. */
export function callWho(c: RecentCall): string {
  return c.leadName ?? c.counterpartyNumber;
}

/**
 * The muted tail after the name — "· 0412 345 678 · 1:15".
 *
 * The number is only repeated when a lead name replaced it in the title, so
 * the row never prints the same number twice.
 */
export function callMeta(c: RecentCall): string {
  const parts = [
    ...(c.leadName ? [c.counterpartyNumber] : []),
    c.durationSec != null ? clock(c.durationSec) : "—",
  ];
  return parts.join(" · ");
}

/**
 * The summary line for a history row.
 *
 * The mock's rows carry a hand-written précis of the conversation; the nearest
 * real thing is the agent's own wrap-up, so that is shown when it exists. The
 * notes are a multi-line template ("Appointment: …", "Assigned installer: …"),
 * so newlines are flattened to keep the row one line high. With no notes the
 * row says what it actually knows — the outcome, or that nothing was written
 * up — rather than inventing a summary.
 */
export function callSummary(c: RecentCall): string {
  const notes = c.notes?.replace(/\s+/g, " ").trim();
  if (notes) return notes;
  if (c.outcome) return outcomeLabel(c.outcome);
  return "No wrap-up notes saved for this call.";
}

/**
 * Why a row's play button is inert, or null when it will work.
 *
 * Recording is gated on the consent announcement, so "not recorded" is a
 * normal outcome rather than a fault, and a failed recording is a different
 * thing again — the agent is told which.
 */
export function playbackBlockedReason(c: RecentCall): string | null {
  if (c.hasRecording) return null;
  if (c.recordingStatus === "RECORDING") return "Still recording";
  if (c.recordingStatus === "FAILED") return "Recording failed for this call";
  return "This call was not recorded";
}
