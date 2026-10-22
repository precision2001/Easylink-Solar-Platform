import { describe, expect, it } from "vitest";
import {
  callMeta,
  callSummary,
  callWho,
  clock,
  outcomeLabel,
  playbackBlockedReason,
  type RecentCall,
} from "./recent";

function call(over: Partial<RecentCall> = {}): RecentCall {
  return {
    id: "c1",
    counterpartyNumber: "+61493801658",
    startedAt: "2026-10-22T02:35:17.022Z",
    durationSec: 75,
    outcome: null,
    notes: null,
    transcriptStatus: "NOT_REQUESTED",
    recordingStatus: "NOT_RECORDED",
    leadId: null,
    leadName: null,
    hasTranscript: false,
    hasRecording: false,
    ...over,
  };
}

describe("clock", () => {
  it("formats as m:ss with a padded seconds field", () => {
    expect(clock(75)).toBe("1:15");
    expect(clock(5)).toBe("0:05");
    expect(clock(0)).toBe("0:00");
    expect(clock(137)).toBe("2:17");
  });
});

describe("outcomeLabel", () => {
  it("turns an enum member into a sentence", () => {
    expect(outcomeLabel("CALL_BACK_LATER")).toBe("Call back later");
    expect(outcomeLabel("SITE_VISIT_BOOKED")).toBe("Site visit booked");
  });
});

describe("callWho", () => {
  it("prefers the matched customer over the raw number", () => {
    expect(callWho(call({ leadName: "Smita Salvi" }))).toBe("Smita Salvi");
  });

  it("falls back to the number when no lead matched", () => {
    expect(callWho(call())).toBe("+61493801658");
  });
});

describe("callMeta", () => {
  it("repeats the number only when a name took its place in the title", () => {
    expect(callMeta(call({ leadName: "Smita Salvi" }))).toBe(
      "+61493801658 · 1:15",
    );
  });

  it("omits the number when the title is already the number", () => {
    expect(callMeta(call())).toBe("1:15");
  });

  it("dashes a call that never connected", () => {
    expect(callMeta(call({ durationSec: null }))).toBe("—");
  });
});

describe("callSummary", () => {
  it("flattens the multi-line wrap-up template onto one line", () => {
    const notes =
      "Client is also looking for battery install.\n\nExisting system size: 10\nAverage quarterly bill: 440";
    expect(callSummary(call({ notes }))).toBe(
      "Client is also looking for battery install. Existing system size: 10 Average quarterly bill: 440",
    );
  });

  it("falls back to the outcome when there are no notes", () => {
    expect(callSummary(call({ outcome: "CALL_BACK_LATER" }))).toBe(
      "Call back later",
    );
  });

  it("treats whitespace-only notes as absent", () => {
    expect(callSummary(call({ notes: "   \n  ", outcome: "WRONG_NUMBER" }))).toBe(
      "Wrong number",
    );
  });

  it("says nothing was written up rather than inventing a summary", () => {
    expect(callSummary(call())).toBe("No wrap-up notes saved for this call.");
  });
});

describe("playbackBlockedReason", () => {
  it("allows playback only when audio is stored", () => {
    expect(
      playbackBlockedReason(call({ hasRecording: true, recordingStatus: "STORED" })),
    ).toBeNull();
  });

  it("separates a failed recording from one that never happened", () => {
    expect(playbackBlockedReason(call({ recordingStatus: "FAILED" }))).toBe(
      "Recording failed for this call",
    );
    expect(playbackBlockedReason(call({ recordingStatus: "NOT_RECORDED" }))).toBe(
      "This call was not recorded",
    );
  });

  it("reports a call still in progress as such", () => {
    expect(playbackBlockedReason(call({ recordingStatus: "RECORDING" }))).toBe(
      "Still recording",
    );
  });
});
