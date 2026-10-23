import type { RecordingStatus, TranscriptStatus } from "./recent";

/**
 * A stored call transcript, as the dialler panel and the Contact Centre both
 * read it.
 *
 * The shape and the "why is this empty" wording live together because the
 * reason a transcript is missing is the useful part: recording is gated on the
 * consent announcement, so "nothing here" has several very different causes
 * and an agent needs to know which one applies.
 */

export interface TranscriptSegment {
  idx: number;
  startSec: number;
  endSec: number | null;
  speaker: "AGENT" | "CUSTOMER" | "UNKNOWN";
  text: string;
  confidence: number | null;
}

export interface CallTranscript {
  id: string;
  recorded: boolean;
  recordingStatus: RecordingStatus;
  /** Why recording did not happen — set when the announcement broke. */
  recordingError: string | null;
  transcriptStatus: TranscriptStatus;
  transcriptText: string | null;
  transcriptError: string | null;
  consentAnnouncedAt: string | null;
  durationSec?: number | null;
  transcriptSegments: TranscriptSegment[];
}

/**
 * How each party is named in a transcript.
 *
 * "Caller" rather than "Agent": the person on our side of a call may be
 * EasyLink sales, an installer or a representative, and the recording does not
 * say which — so the label names their role on the call, which is always true,
 * instead of guessing at their job.
 */
export const SPEAKER_STYLE: Record<
  TranscriptSegment["speaker"],
  { label: string; title: string; color: string }
> = {
  AGENT: {
    label: "Caller",
    title: "Our side of the call — EasyLink, an installer or a representative",
    color: "#1565C0",
  },
  CUSTOMER: {
    label: "Customer",
    title: "The person who was called",
    color: "#B45309",
  },
  // Diarisation could not be tied to a party; saying so beats guessing.
  UNKNOWN: { label: "Speaker", title: "Party could not be identified", color: "#64748B" },
};

/** One-line state for a transcript panel, so the agent knows why it is empty. */
export function transcriptMessage(
  t: CallTranscript | null,
  hasCall: boolean,
): string {
  if (!hasCall) return "The transcript of a call appears here once it ends.";
  if (!t) return "Loading…";
  if (!t.recorded) {
    return t.consentAnnouncedAt
      ? "This call was not recorded."
      : "Not recorded — the recording announcement did not play, so no consent was given.";
  }
  if (t.recordingStatus === "RECORDING")
    return "Recording. The transcript is made after the call ends.";
  if (t.recordingStatus === "FAILED") {
    return `The recording failed, so there is no transcript${
      t.recordingError ? `: ${t.recordingError}` : "."
    }`;
  }
  if (t.transcriptStatus === "FAILED") {
    return `Transcription failed${t.transcriptError ? `: ${t.transcriptError}` : "."}`;
  }
  if (t.transcriptStatus === "QUEUED" || t.transcriptStatus === "PROCESSING") {
    return "Transcribing… this usually takes about as long as the call did.";
  }
  if (t.transcriptStatus === "READY") return "No speech was detected in this call.";
  return "Transcription is not enabled for this account.";
}

/**
 * Whether the transcript is still expected to change, so a reader knows
 * whether to keep polling. A settled transcript never becomes un-settled.
 */
export function transcriptSettled(t: CallTranscript): boolean {
  return (
    !t.recorded ||
    t.transcriptStatus === "READY" ||
    t.transcriptStatus === "FAILED" ||
    t.recordingStatus === "FAILED"
  );
}

/**
 * Whether diarisation actually told the two parties apart.
 *
 * Speaker labels come from Deepgram's speaker index, anchored to whoever spoke
 * first. When every utterance carries the same index the anchor makes all of
 * them "Agent" — which reads as a confident claim that the agent said the
 * customer's words too. Callers use this to drop the labels rather than print
 * an attribution the data does not support.
 */
export function speakersSeparated(segments: TranscriptSegment[]): boolean {
  if (segments.length < 2) return false;
  return new Set(segments.map((s) => s.speaker)).size > 1;
}
