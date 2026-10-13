"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icons";
import { MasterSectionCard } from "@/components/master-dashboard/MasterSectionCard";
import { useAdminDialler } from "@/hooks/useAdminDialler";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
] as const;

function formatDuration(totalSec: number) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Display grouping only — the server re-validates and normalises to E.164. */
function prettyNumber(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.startsWith("04") && d.length > 4) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}`.trim();
  }
  if (/^0[23478]/.test(d) && d.length > 2) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)} ${d.slice(6, 10)}`.trim();
  }
  return value;
}

export function MasterDialler() {
  const [input, setInput] = useState("");
  const {
    state,
    error,
    activeNumber,
    muted,
    durationSec,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive,
  } = useAdminDialler();

  const press = (key: string) => {
    if (callActive) {
      // Mid-call keys drive the far end's IVR rather than editing the number.
      sendDigit(key);
      return;
    }
    setInput((prev) => (prev.length >= 15 ? prev : prev + key));
  };

  const statusLine = () => {
    if (state === "dialling") return "Dialling…";
    if (state === "connected") {
      return durationSec === null ? "Connected" : formatDuration(durationSec);
    }
    if (state === "ended") return "Call ended";
    return "Ready";
  };

  return (
    <MasterSectionCard
      title="Outbound call"
      headerRight={
        <span className="font-inter text-[11px] font-medium text-warm-ink/60">
          Australian numbers only
        </span>
      }
      bodyClassName="px-4 pb-5 pt-4"
    >
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <input
            value={callActive ? prettyNumber(activeNumber ?? "") : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !callActive && input.trim()) {
                void dial(input);
              }
            }}
            readOnly={callActive}
            inputMode="tel"
            placeholder="02 9876 5432"
            aria-label="Phone number to call"
            className="h-12 w-full rounded-[10px] border border-warm-border bg-white px-4 font-inter text-[18px] font-semibold tracking-[0.5px] text-warm-ink tabular-nums outline-none focus-visible:border-navy-800"
          />
          <div className="flex min-h-[18px] items-center justify-between">
            <span
              className={`font-inter text-[12px] font-medium ${
                state === "connected"
                  ? "text-emerald-600"
                  : state === "dialling"
                    ? "text-amber-600"
                    : "text-warm-ink/50"
              }`}
            >
              {statusLine()}
            </span>
            {!callActive && input ? (
              <button
                type="button"
                onClick={() => setInput("")}
                className="font-inter text-[12px] font-medium text-warm-ink/50 hover:text-warm-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYPAD.flat().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="flex h-12 items-center justify-center rounded-[10px] border border-warm-border bg-cream-50 font-inter text-[18px] font-semibold text-warm-ink tabular-nums transition-colors hover:bg-white active:bg-white"
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {callActive ? (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border font-inter text-[14px] font-semibold transition-colors ${
                  muted
                    ? "border-warm-border bg-warm-ink text-white"
                    : "border-warm-border bg-cream-50 text-warm-ink hover:bg-white"
                }`}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                onClick={hangUp}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-red-600 font-inter text-[14px] font-semibold text-white transition-colors hover:bg-red-700"
              >
                Hang up
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void dial(input)}
              disabled={!input.trim() || state === "dialling"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-emerald-600 font-inter text-[14px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="Phone" className="size-4" />
              Call
            </button>
          )}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 font-inter text-[12px] leading-[18px] text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    </MasterSectionCard>
  );
}
