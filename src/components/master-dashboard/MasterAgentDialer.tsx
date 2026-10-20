"use client";

import { useEffect, useState } from "react";
import { useAdminDialler } from "@/hooks/useAdminDialler";

/**
 * "Agent Dialer" from the Easylink Designer mock — the real call mechanics
 * (dial/hangup/mute/keypad) reuse the working admin dialler built for
 * /master/calls. The "Up next" queue and "Customer" panel are real now,
 * pulled from the Lead table (see crm.service.ts on the backend). The call
 * script, Voxa live assist, wrap-up form and timeline are still the mock's
 * own sample data — there's no script engine, AI live-assist, disposition
 * or activity-timeline backend behind those yet.
 */

interface QueueEntry {
  id: string;
  name: string;
  phone: string | null;
  suburb: string;
  note: string;
  followUpDate: string;
}

interface LeadMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  retailer: string | null;
  consentCalls: boolean;
  consentSms: boolean;
  consentEmail: boolean;
  designId: string | null;
}

type CustomerLookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unknown" }
  | { status: "found"; lead: LeadMatch };

/**
 * The qualification answers the agent collects on the call. These are inputs
 * to fill in, not facts about the current customer, so the mock's values are
 * placeholders — they show the shape of a good answer without pretending we
 * already know it.
 */
const FIELDS = [
  { key: "systemSize", label: "Existing system size", placeholder: "6.6 kW · installed 2019" },
  { key: "quarterlyBill", label: "Average quarterly bill", placeholder: "$680" },
  { key: "homeDuringDay", label: "Home during the day?", placeholder: "Partly · works from home 2 days" },
  { key: "decisionMakers", label: "Decision makers present", placeholder: "Yes · Karen and partner" },
] as const;

type ScriptKey = (typeof FIELDS)[number]["key"];

type WrapUp = {
  script: Record<ScriptKey, string>;
  outcome: string;
  appointment: string;
  installer: string;
  notes: string;
  sendSms: boolean;
};


interface TranscriptSegment {
  idx: number;
  startSec: number;
  endSec: number | null;
  speaker: "AGENT" | "CUSTOMER" | "UNKNOWN";
  text: string;
  confidence: number | null;
}

interface CallTranscript {
  id: string;
  recorded: boolean;
  recordingStatus: "NOT_RECORDED" | "RECORDING" | "STORED" | "FAILED";
  transcriptStatus: "NOT_REQUESTED" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";
  transcriptText: string | null;
  transcriptError: string | null;
  consentAnnouncedAt: string | null;
  transcriptSegments: TranscriptSegment[];
}

const SPEAKER_STYLE: Record<TranscriptSegment["speaker"], { label: string; color: string }> = {
  AGENT: { label: "Agent", color: "#1565C0" },
  CUSTOMER: { label: "Customer", color: "#B45309" },
  // Diarisation could not be tied to a party; saying so beats guessing.
  UNKNOWN: { label: "Speaker", color: "#64748B" },
};

const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

const TIMELINE = [
  { title: "AI qualification call · 2 min", meta: "Voxa Sales Qualifier · Tue 7 Oct · marked “hot”", color: "#F68A0A" },
  { title: "SMS: quote link sent", meta: "Mon 6 Oct · delivered", color: "#1976D2" },
  { title: "Solar design created", meta: "Mon 6 Oct · 10 kW + 13 kWh option", color: "#15803D" },
  { title: "Web chat", meta: "Sun 5 Oct · Voxa Chat · asked about rebates", color: "#1976D2" },
  { title: "Lead created", meta: "Sun 5 Oct · website quote form", color: "#64748B" },
] as const;

const SCRIPT_QUOTE =
  "“Under the federal Cheaper Home Batteries Program you could get a discount on a battery added to your existing solar. Can I check a few details about your system?”";

const SUGGESTED_REPLY =
  "Offer a free on-site assessment: “With a 6.6 kW system and evening use that high, a 10–13 kWh battery is usually the sweet spot. Could our assessor visit Thursday or Friday?”";

const DETECTED_TAGS = ["Detected: battery interest", "Bill ~$680/qtr", "Objection: upfront cost"] as const;

const OUTCOME_OPTIONS = [
  "Site visit booked",
  "Call back later",
  "Not interested",
  "Voicemail left",
  "Do not call",
] as const;

const INSTALLER_OPTIONS = [
  "[Installer partner – Hills District]",
  "[Installer partner – North West]",
] as const;

const NOTES_PLACEHOLDER =
  "e.g. 6.6 kW system installed 2019, Fronius inverter. Evening usage high. Interested in 13 kWh battery if rebate applies. Concerned about upfront cost – mention finance options at visit.";

type NewLeadForm = {
  name: string;
  email: string;
  address: string;
  retailer: string;
  consentCalls: boolean;
  consentSms: boolean;
  consentEmail: boolean;
};

/**
 * Consent starts at calls-only: they answered this call, so calling is the one
 * channel we can defend. SMS and email are left for the agent to tick only if
 * the contact actually agreed — the Lead columns default to `true`, which would
 * otherwise record consent nobody gave.
 */
const EMPTY_LEAD_FORM: NewLeadForm = {
  name: "",
  email: "",
  address: "",
  retailer: "",
  consentCalls: true,
  consentSms: false,
  consentEmail: false,
};

type LeadSaveState = { status: "idle" | "saving" } | { status: "error"; message: string };

type WrapSaveState =
  | { status: "idle" | "saving" | "saved" }
  | { status: "error"; message: string };

/** The dropdown's labels mapped onto the backend's `CallOutcome` enum. */
const OUTCOME_TO_ENUM: Record<string, string> = {
  "Site visit booked": "SITE_VISIT_BOOKED",
  "Call back later": "CALL_BACK_LATER",
  "Not interested": "NOT_INTERESTED",
  "Voicemail left": "VOICEMAIL_LEFT",
  "Do not call": "DO_NOT_CALL",
};

/**
 * Folds the qualification answers and the appointment into the notes text.
 * `Call.notes` is a single free-text column, so anything the agent captured
 * has to live there or be thrown away.
 */
function composeNotes(w: WrapUp): string {
  const answered = FIELDS.filter((f) => w.script[f.key].trim()).map(
    (f) => `${f.label}: ${w.script[f.key].trim()}`,
  );
  if (w.appointment.trim()) answered.push(`Appointment: ${w.appointment.trim()}`);
  if (w.installer.trim()) answered.push(`Assigned installer: ${w.installer.trim()}`);

  return [w.notes.trim(), answered.join("\n")].filter(Boolean).join("\n\n");
}

/** A blank wrap-up, used for the first call and to clear between calls. */
const EMPTY_WRAPUP: WrapUp = {
  script: { systemSize: "", quarterlyBill: "", homeDuringDay: "", decisionMakers: "" },
  outcome: OUTCOME_OPTIONS[0],
  appointment: "",
  installer: INSTALLER_OPTIONS[0],
  notes: "",
  sendSms: true,
};

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

/** One-line state for the transcript panel, so the agent knows why it is empty. */
function transcriptMessage(t: CallTranscript | null, hasCall: boolean): string {
  if (!hasCall) return "The transcript of a call appears here once it ends.";
  if (!t) return "Loading…";
  if (!t.recorded) {
    return t.consentAnnouncedAt
      ? "This call was not recorded."
      : "Not recorded — the recording announcement did not play, so no consent was given.";
  }
  if (t.recordingStatus === "RECORDING") return "Recording. The transcript is made after the call ends.";
  if (t.recordingStatus === "FAILED") return "The recording failed, so there is no transcript.";
  if (t.transcriptStatus === "FAILED") {
    return `Transcription failed${t.transcriptError ? `: ${t.transcriptError}` : "."}`;
  }
  if (t.transcriptStatus === "QUEUED" || t.transcriptStatus === "PROCESSING") {
    return "Transcribing… this usually takes about as long as the call did.";
  }
  if (t.transcriptStatus === "READY") return "No speech was detected in this call.";
  return "Transcription is not enabled for this account.";
}

function TranscriptBadge({ transcript }: { transcript: CallTranscript | null }) {
  if (!transcript?.recorded) return null;

  const [label, bg, fg] =
    transcript.recordingStatus === "RECORDING"
      ? ["Recording", "#FEE2E2", "#991B1B"]
      : transcript.transcriptStatus === "READY"
        ? ["Transcript ready", "#DCFCE7", "#166534"]
        : transcript.transcriptStatus === "FAILED" || transcript.recordingStatus === "FAILED"
          ? ["Unavailable", "#FEE2E2", "#991B1B"]
          : ["Processing", "#E2E8F0", "#334155"];

  return (
    <span
      className="rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function SampleTag() {
  return (
    <span className="rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[10px] font-bold text-[#1E40AF]">
      Sample
    </span>
  );
}

export function MasterAgentDialer() {
  const [input, setInput] = useState("");
  const {
    state,
    error,
    activeNumber,
    callRecordId,
    muted,
    durationSec,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive,
  } = useAdminDialler();

  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerLookup>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/calls/queue")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.message ?? "Failed to load queue");
        setQueue(json.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setQueueError(err instanceof Error ? err.message : "Failed to load queue");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Looks up whichever number is currently relevant — what's typed while idle,
  // or the real number being called once a call starts — debounced so typing
  // doesn't fire a request per keystroke.
  const lookupNumber = callActive ? activeNumber : input;
  const lookupDigits = (lookupNumber ?? "").replace(/\D/g, "");

  // Render-time reset (same pattern as useBuildingFootprint/useCadastralParcel):
  // the moment the relevant number changes, `customer` must stop reflecting
  // the *previous* number on this same render, not one render later once an
  // effect gets around to it.
  const [prevLookupDigits, setPrevLookupDigits] = useState(lookupDigits);
  if (prevLookupDigits !== lookupDigits) {
    setPrevLookupDigits(lookupDigits);
    setCustomer(lookupDigits.length < 6 ? { status: "idle" } : { status: "loading" });
  }

  // The wrap-up belongs to one call. `callKey` changes the moment a different
  // number goes on the line, which clears the previous agent's answers and
  // notes — without this the form is one shared scratchpad and last call's
  // text carries into the next one.
  // Keyed on the call *record*, not on being on the line: the write-up happens
  // after hanging up, so the form must survive the call ending and only clear
  // when the next call starts.
  const callKey = callRecordId ?? (callActive ? (activeNumber ?? "") : "");
  const [wrapUp, setWrapUp] = useState<WrapUp>(EMPTY_WRAPUP);
  const [wrapSave, setWrapSave] = useState<WrapSaveState>({ status: "idle" });
  const [prevCallKey, setPrevCallKey] = useState(callKey);
  if (prevCallKey !== callKey) {
    setPrevCallKey(callKey);
    setWrapUp(EMPTY_WRAPUP);
    setWrapSave({ status: "idle" });
  }

  const setScript = (key: ScriptKey, value: string) =>
    setWrapUp((w) => ({ ...w, script: { ...w.script, [key]: value } }));

  const [transcript, setTranscript] = useState<CallTranscript | null>(null);

  // The transcript only exists after the call: the recording has to finish
  // uploading and Transcribe has to run. Poll while it is in flight and stop
  // as soon as it reaches a terminal state, so a finished call doesn't keep
  // hitting the API forever.
  useEffect(() => {
    if (!callRecordId) {
      setTranscript(null);
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      try {
        const res = await fetch(`/api/admin/calls/${callRecordId}/transcript`);
        const json = await res.json().catch(() => null);
        if (cancelled || !res.ok || !json?.success) return;

        const data = json.data as CallTranscript;
        setTranscript(data);

        const settled =
          !data.recorded ||
          data.transcriptStatus === "READY" ||
          data.transcriptStatus === "FAILED" ||
          data.recordingStatus === "FAILED";
        if (!settled) timer = window.setTimeout(load, 5000);
      } catch {
        // Transient failure: the next call or reload picks it up.
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [callRecordId, state]);

  const saveWrapUp = async (thenDialNext: boolean) => {
    if (!callRecordId) return;

    setWrapSave({ status: "saving" });
    try {
      const res = await fetch(`/api/admin/calls/${callRecordId}/disposition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: OUTCOME_TO_ENUM[wrapUp.outcome],
          // The collected answers belong with the notes — there is no
          // structured place for them on the Call row yet.
          notes: composeNotes(wrapUp),
          smsConfirmationSent: wrapUp.sendSms,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? "Could not save the wrap-up.");
      }

      setWrapSave({ status: "saved" });
      if (thenDialNext) {
        const next = queue?.find((q) => q.phone);
        if (next?.phone) {
          setInput(next.phone);
          void dial(next.phone);
        }
      }
    } catch (err) {
      setWrapSave({
        status: "error",
        message: err instanceof Error ? err.message : "Could not save the wrap-up.",
      });
    }
  };

  const [newLead, setNewLead] = useState<NewLeadForm>(EMPTY_LEAD_FORM);
  const [leadSave, setLeadSave] = useState<LeadSaveState>({ status: "idle" });

  // The capture form is about one caller, so it clears with the call too.
  const [prevFormKey, setPrevFormKey] = useState(callKey);
  if (prevFormKey !== callKey) {
    setPrevFormKey(callKey);
    setNewLead(EMPTY_LEAD_FORM);
    setLeadSave({ status: "idle" });
  }

  const createLead = async () => {
    const name = newLead.name.trim();
    if (!name) return;

    setLeadSave({ status: "saving" });
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: lookupNumber || undefined,
          customerEmail: newLead.email.trim() || undefined,
          address: newLead.address.trim() || undefined,
          retailer: newLead.retailer.trim() || undefined,
          source: "Agent Dialer · outbound call",
          notes: wrapUp.notes.trim() || undefined,
          consentCalls: newLead.consentCalls,
          consentSms: newLead.consentSms,
          consentEmail: newLead.consentEmail,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message ?? "Could not create the lead.");
      }

      // Flip the panel straight to the new record, so the call header starts
      // naming them and the agent doesn't have to re-look-up mid-call.
      const lead = json.data;
      setCustomer({
        status: "found",
        lead: {
          id: lead.id,
          name: lead.customerName ?? name,
          email: lead.customerEmail ?? null,
          phone: lead.customerPhone ?? null,
          address: lead.address ?? null,
          retailer: lead.retailer ?? null,
          consentCalls: lead.consentCalls ?? newLead.consentCalls,
          consentSms: lead.consentSms ?? newLead.consentSms,
          consentEmail: lead.consentEmail ?? newLead.consentEmail,
          designId: lead.designId ?? null,
        },
      });
      setLeadSave({ status: "idle" });
    } catch (err) {
      setLeadSave({
        status: "error",
        message: err instanceof Error ? err.message : "Could not create the lead.",
      });
    }
  };

  useEffect(() => {
    if (lookupDigits.length < 6) return;

    const timer = window.setTimeout(() => {
      fetch(`/api/admin/calls/lookup?phone=${encodeURIComponent(lookupNumber ?? "")}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setCustomer({ status: "found", lead: json.data });
          } else {
            setCustomer({ status: "unknown" });
          }
        })
        .catch(() => setCustomer({ status: "unknown" }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [lookupNumber, lookupDigits]);

  const press = (key: string) => {
    if (callActive) {
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
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Agent Dialer</span>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-start gap-4 px-8 py-6 pb-14 lg:grid-cols-[260px_1fr_320px]">
        {/* Up next queue — real leads with an upcoming follow-up */}
        <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Up next</h2>
          <p className="m-0 text-[12px] leading-[17px] text-[#5B6B80]">
            {queueError
              ? queueError
              : queue === null
                ? "Loading…"
                : `${queue.length} lead${queue.length === 1 ? "" : "s"} with an upcoming follow-up`}
          </p>
          <div className="flex flex-col divide-y divide-[#EEF2F6] border-t border-[#EEF2F6]">
            {queue?.length === 0 ? (
              <p className="py-3 text-[13px] text-[#5B6B80]">Nothing scheduled.</p>
            ) : null}
            {(queue ?? []).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  if (!callActive && q.phone) setInput(q.phone);
                }}
                disabled={callActive || !q.phone}
                className="flex items-start justify-between gap-2 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#0F172A]">{q.name}</span>
                  <span className="text-[12px] text-[#5B6B80]">
                    {q.suburb} · {q.note}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-[#5B6B80]">
                  {new Date(q.followUpDate).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-[#EEF2F6] pt-3">
            <span className="text-[13px] font-bold text-[#0F172A]">Manual dial</span>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !callActive && input.trim()) {
                    void dial(input);
                  }
                }}
                disabled={callActive}
                inputMode="tel"
                placeholder="04xx xxx xxx"
                aria-label="Phone number to call"
                className="h-11 min-w-0 flex-1 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[14px] text-[#0F172A] tabular-nums outline-none focus-visible:border-[#0B1A2E] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
              />
              <button
                type="button"
                onClick={() => void dial(input)}
                disabled={!input.trim() || callActive}
                aria-label="Call"
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Live dialer — the real thing */}
        <section className="flex flex-col gap-4">
          {callActive ? (
            // In-call: real number, real timer, real mute/hang-up. No "Recording ·
            // consent announced" line like the mock's — we don't record calls or
            // announce consent, and showing that text on a real active call would
            // be a false compliance claim, not just a cosmetic gap.
            <div className="flex flex-col gap-4 rounded-[14px] bg-[#0B1A2E] p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F68A0A] text-[15px] font-bold text-[#3B1D00]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold">{activeNumber}</span>
                  <span className="text-[12px] text-[#9FB0C8]">Outbound call</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                {state === "connected" ? (
                  <>
                    <span className="font-source-sans text-[32px] font-bold">
                      {customer.status === "found"
                        ? `On call with ${customer.lead.name}`
                        : "On call"}
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-[#9FB0C8]">
                      {durationSec === null ? "Connected" : formatDuration(durationSec)}
                    </span>
                  </>
                ) : (
                  <span className="font-source-sans text-[32px] font-bold tabular-nums">
                    {statusLine()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex h-11 flex-1 min-w-[90px] flex-col items-center justify-center gap-0.5 rounded-[10px] text-[12px] font-semibold ${
                    muted ? "bg-white text-[#0B1A2E]" : "bg-[#13263F] text-white hover:bg-[#1B3557]"
                  }`}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                {["Hold", "Transfer", "Conference", "Keypad", "Pause rec", "Hand to AI"].map((label) => (
                  <span
                    key={label}
                    title="Not built yet"
                    className="flex h-11 flex-1 min-w-[90px] cursor-not-allowed items-center justify-center rounded-[10px] bg-[#13263F]/60 text-[12px] font-medium text-[#5C6B80]"
                  >
                    {label}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={hangUp}
                  className="flex h-11 flex-1 min-w-[110px] items-center justify-center gap-1.5 rounded-[10px] bg-red-600 text-[13px] font-semibold text-white hover:bg-red-700"
                >
                  Hang up
                </button>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[8px] border border-red-400/40 bg-red-500/10 px-3 py-2 text-[12px] leading-[18px] text-red-200"
                >
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
              <div className="mx-auto flex w-full max-w-[320px] flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && input.trim()) {
                        void dial(input);
                      }
                    }}
                    inputMode="tel"
                    placeholder="02 9876 5432"
                    aria-label="Phone number to call"
                    className="h-12 w-full rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-center text-[18px] font-semibold tracking-[0.5px] text-[#0F172A] tabular-nums outline-none focus-visible:border-[#0B1A2E]"
                  />
                  <span className="text-center text-[12px] font-medium text-[#5B6B80]">
                    {statusLine()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {KEYPAD.flat().map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => press(key)}
                      className="flex h-11 items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-[#F8FAFC] text-[17px] font-semibold text-[#0F172A] tabular-nums hover:bg-white"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void dial(input)}
                  disabled={!input.trim() || state === "dialling"}
                  className="flex h-11 w-full items-center justify-center rounded-[10px] bg-emerald-600 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Call
                </button>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-[18px] text-red-700"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
                  Call script · Battery qualification
                </h2>
                <span className="shrink-0 text-[12px] text-[#5B6B80]">Step 3 of 6</span>
              </div>
              <p className="m-0 rounded-[10px] bg-[#FFF7E6] p-3 text-[13px] leading-[19px] text-[#3B1D00]">
                {SCRIPT_QUOTE}
              </p>
              <div className="flex flex-col gap-2.5">
                {FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-[13px] text-[#334155]">{f.label}</span>
                    <input
                      value={wrapUp.script[f.key]}
                      onChange={(e) => setScript(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus-visible:border-[#0B1A2E]"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Call transcript</h2>
                <TranscriptBadge transcript={transcript} />
              </div>
              <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto">
                {transcript?.transcriptSegments?.length ? (
                  transcript.transcriptSegments.map((s) => (
                    <div key={s.idx} className="flex gap-2 text-[13px]">
                      <span
                        className="w-[72px] shrink-0 font-semibold"
                        style={{ color: SPEAKER_STYLE[s.speaker].color }}
                        title={`at ${clock(s.startSec)}`}
                      >
                        {SPEAKER_STYLE[s.speaker].label}
                      </span>
                      <span className="text-[#334155]">{s.text}</span>
                    </div>
                  ))
                ) : (
                  <p className="m-0 text-[13px] leading-[19px] text-[#5B6B80]">
                    {transcriptMessage(transcript, Boolean(callRecordId))}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 rounded-[10px] bg-[#EFF6FF] p-3">
                <span className="flex items-center gap-2 text-[13px] font-bold text-[#1D4ED8]">
                  Suggested reply <SampleTag />
                </span>
                <p className="m-0 text-[13px] leading-[19px] text-[#1E3A5F]">{SUGGESTED_REPLY}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SampleTag />
                {DETECTED_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] text-[#475569]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Wrap-up &amp; disposition</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
                Outcome
                <select
                  value={wrapUp.outcome}
                  onChange={(e) => setWrapUp((w) => ({ ...w, outcome: e.target.value }))}
                  className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
                >
                  {OUTCOME_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
                Appointment
                <input
                  value={wrapUp.appointment}
                  onChange={(e) => setWrapUp((w) => ({ ...w, appointment: e.target.value }))}
                  placeholder="Thu 16 Oct · 10:00 am"
                  className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
                Assign to installer
                <select
                  value={wrapUp.installer}
                  onChange={(e) => setWrapUp((w) => ({ ...w, installer: e.target.value }))}
                  className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
                >
                  {INSTALLER_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
              Notes
              <textarea
                value={wrapUp.notes}
                onChange={(e) => setWrapUp((w) => ({ ...w, notes: e.target.value }))}
                placeholder={NOTES_PLACEHOLDER}
                rows={3}
                className="rounded-[10px] border border-[#CBD5E1] bg-white p-3 text-[13px] leading-[19px] text-[#0F172A] placeholder:text-[#94A3B8]"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px] text-[#334155]">
                <input
                  type="checkbox"
                  checked={wrapUp.sendSms}
                  onChange={(e) => setWrapUp((w) => ({ ...w, sendSms: e.target.checked }))}
                  className="size-4"
                />
                Send SMS confirmation (includes STOP opt-out)
              </label>
              <div className="flex items-center gap-2">
                {wrapSave.status === "error" ? (
                  <p role="alert" className="m-0 text-[12px] font-semibold text-[#991B1B]">
                    {wrapSave.message}
                  </p>
                ) : wrapSave.status === "saved" ? (
                  <p role="status" className="m-0 text-[12px] font-semibold text-[#166534]">
                    Saved to this call
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void saveWrapUp(false)}
                  disabled={!callRecordId || wrapSave.status === "saving"}
                  title={callRecordId ? undefined : "Place a call first — the wrap-up saves against it"}
                  className="flex h-10 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A] disabled:cursor-not-allowed disabled:text-[#94A3B8]"
                >
                  {wrapSave.status === "saving" ? "Saving…" : "Save & pause"}
                </button>
                <button
                  type="button"
                  onClick={() => void saveWrapUp(true)}
                  disabled={!callRecordId || wrapSave.status === "saving"}
                  title={callRecordId ? undefined : "Place a call first — the wrap-up saves against it"}
                  className="flex h-10 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[13px] font-bold text-[#3B1D00] disabled:cursor-not-allowed disabled:bg-[#F68A0A]/60 disabled:text-[#3B1D00]/60"
                >
                  Save &amp; dial next
                </button>
              </div>
            </div>
          </section>
        </section>

        {/* Right column — one grid cell holding both cards, so neither stretches to match the center column's height. */}
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Customer</h2>
            {customer.status === "idle" ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">
                Dial or select a number to look up the contact.
              </p>
            ) : customer.status === "loading" ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">Looking up…</p>
            ) : customer.status === "unknown" ? (
              <>
                <p className="m-0 text-[13px] text-[#5B6B80]">
                  Unknown caller — no matching lead for this number.
                </p>
                <div className="flex flex-col gap-2 border-t border-[#EEF2F6] pt-2">
                  <span className="text-[13px] font-semibold text-[#0F172A]">
                    Create lead from this call
                  </span>
                  <input
                    value={newLead.name}
                    onChange={(e) => setNewLead((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name (required)"
                    aria-label="Customer name"
                    className="h-9 rounded-[8px] border border-[#CBD5E1] px-2.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8]"
                  />
                  <input
                    value={newLead.email}
                    onChange={(e) => setNewLead((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    type="email"
                    aria-label="Customer email"
                    className="h-9 rounded-[8px] border border-[#CBD5E1] px-2.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8]"
                  />
                  <input
                    value={newLead.address}
                    onChange={(e) => setNewLead((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Address or suburb"
                    aria-label="Customer address"
                    className="h-9 rounded-[8px] border border-[#CBD5E1] px-2.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8]"
                  />
                  <input
                    value={newLead.retailer}
                    onChange={(e) => setNewLead((f) => ({ ...f, retailer: e.target.value }))}
                    placeholder="Energy retailer"
                    aria-label="Energy retailer"
                    className="h-9 rounded-[8px] border border-[#CBD5E1] px-2.5 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8]"
                  />
                  <span className="pt-1 text-[12px] font-semibold text-[#334155]">
                    Consent given on this call
                  </span>
                  {(
                    [
                      ["consentCalls", "Calls"],
                      ["consentSms", "SMS"],
                      ["consentEmail", "Email"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-[12px] text-[#334155]">
                      <input
                        type="checkbox"
                        checked={newLead[key]}
                        onChange={(e) =>
                          setNewLead((f) => ({ ...f, [key]: e.target.checked }))
                        }
                        className="size-3.5"
                      />
                      {label}
                    </label>
                  ))}
                  <span className="text-[11px] leading-[15px] text-[#5B6B80]">
                    Phone <strong className="text-[#0F172A]">{lookupNumber || "—"}</strong> and any
                    wrap-up notes are saved with the lead.
                  </span>
                  {leadSave.status === "error" ? (
                    <p role="alert" className="m-0 text-[12px] font-semibold text-[#991B1B]">
                      {leadSave.message}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void createLead()}
                    disabled={!newLead.name.trim() || leadSave.status === "saving"}
                    className="h-9 rounded-[8px] bg-[#0B1A2E] text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#94A3B8]"
                  >
                    {leadSave.status === "saving" ? "Creating…" : "Create lead"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-[14px] font-bold text-[#0F172A]">{customer.lead.name}</span>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                  <span className="text-[#5B6B80]">Email</span>
                  <span className="text-[#1E40AF]">{customer.lead.email ?? "—"}</span>
                  <span className="text-[#5B6B80]">Address</span>
                  <span className="text-[#1E40AF]">{customer.lead.address ?? "—"}</span>
                  <span className="text-[#5B6B80]">Retailer</span>
                  <span className="text-[#1E40AF]">{customer.lead.retailer ?? "—"}</span>
                  <span className="text-[#5B6B80]">Consent</span>
                  <span className="flex gap-2 text-emerald-600">
                    {customer.lead.consentCalls ? "Calls ✓" : null}
                    {customer.lead.consentSms ? "· SMS ✓" : null}
                    {customer.lead.consentEmail ? "· Email ✓" : null}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <span
                    title="No design viewer in the admin portal yet"
                    className="cursor-not-allowed text-[13px] font-semibold text-[#94A3B8] underline decoration-dotted"
                  >
                    Open solar design
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Activity timeline — sample */}
          <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[14px] font-bold text-[#0F172A]">Timeline</h2>
              <SampleTag />
            </div>
            <div className="flex flex-col gap-3">
              {TIMELINE.map((t, i) => (
                <div key={i} className="flex gap-2.5">
                  <span
                    className="mt-1 size-2 shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-semibold text-[#0F172A]">{t.title}</span>
                    <span className="text-[11px] text-[#5B6B80]">{t.meta}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
