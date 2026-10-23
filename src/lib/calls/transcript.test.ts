import { describe, expect, it } from "vitest";
import {
  speakersSeparated,
  transcriptMessage,
  transcriptSettled,
  type CallTranscript,
  type TranscriptSegment,
} from "./transcript";

function seg(idx: number, speaker: TranscriptSegment["speaker"]): TranscriptSegment {
  return { idx, startSec: idx, endSec: idx + 1, speaker, text: `line ${idx}`, confidence: 0.9 };
}

function transcript(over: Partial<CallTranscript> = {}): CallTranscript {
  return {
    id: "c1",
    recorded: true,
    recordingStatus: "STORED",
    recordingError: null,
    transcriptStatus: "READY",
    transcriptText: null,
    transcriptError: null,
    consentAnnouncedAt: "2026-10-22T02:35:17.022Z",
    transcriptSegments: [],
    ...over,
  };
}

describe("speakersSeparated", () => {
  it("is false when every utterance landed on one speaker", () => {
    // The real case: Deepgram returned the same index for all 15 utterances,
    // so the anchor labelled a two-way conversation entirely "Agent".
    const all = Array.from({ length: 15 }, (_, i) => seg(i, "AGENT"));
    expect(speakersSeparated(all)).toBe(false);
  });

  it("is true once two parties appear", () => {
    expect(speakersSeparated([seg(0, "AGENT"), seg(1, "CUSTOMER")])).toBe(true);
  });

  it("is false for a single utterance, which proves nothing either way", () => {
    expect(speakersSeparated([seg(0, "AGENT")])).toBe(false);
    expect(speakersSeparated([])).toBe(false);
  });
});

describe("transcriptMessage", () => {
  it("separates 'not recorded' from 'no consent was given'", () => {
    expect(transcriptMessage(transcript({ recorded: false }), true)).toBe(
      "This call was not recorded.",
    );
    expect(
      transcriptMessage(transcript({ recorded: false, consentAnnouncedAt: null }), true),
    ).toContain("announcement did not play");
  });

  it("reports a failed recording with its reason", () => {
    expect(
      transcriptMessage(
        transcript({ recordingStatus: "FAILED", recordingError: "egress died" }),
        true,
      ),
    ).toBe("The recording failed, so there is no transcript: egress died");
  });

  it("explains a READY transcript that came back empty", () => {
    expect(transcriptMessage(transcript(), true)).toBe(
      "No speech was detected in this call.",
    );
  });

  it("says a transcript is still being made", () => {
    expect(transcriptMessage(transcript({ transcriptStatus: "PROCESSING" }), true)).toContain(
      "Transcribing",
    );
  });
});

describe("transcriptSettled", () => {
  it("keeps polling only while an outcome is still possible", () => {
    expect(transcriptSettled(transcript({ transcriptStatus: "QUEUED" }))).toBe(false);
    expect(transcriptSettled(transcript({ transcriptStatus: "PROCESSING" }))).toBe(false);
    expect(transcriptSettled(transcript())).toBe(true);
    expect(transcriptSettled(transcript({ recordingStatus: "FAILED" }))).toBe(true);
    expect(transcriptSettled(transcript({ recorded: false }))).toBe(true);
  });
});
