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

const FIELDS = [
  { label: "Existing system size", value: "6.6 kW · installed 2019" },
  { label: "Average quarterly bill", value: "$680" },
  { label: "Home during the day?", value: "Partly · works from home 2 days" },
  { label: "Decision makers present", value: "Yes · Karen and partner" },
] as const;

const TRANSCRIPT = [
  { who: "Sam", text: "How much of your solar do you think gets used in the evening?", color: "#1565C0" },
  { who: "Karen", text: "Not much, we are exporting most of it and the feed-in is tiny now.", color: "#B45309" },
  { who: "Sam", text: "That is very common. A battery stores that for the evening.", color: "#1565C0" },
  { who: "Karen", text: "It is the upfront cost I worry about, to be honest.", color: "#B45309" },
] as const;

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

const WRAPUP_NOTES =
  "6.6 kW system installed 2019, Fronius inverter. Evening usage high (2 teenagers, pool pump). Interested in 13 kWh battery if rebate applies. Concerned about upfront cost – mention finance options at visit.";

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
                <span className="font-source-sans text-[32px] font-bold tabular-nums">
                  {statusLine()}
                </span>
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
                  <div key={f.label} className="flex flex-col gap-1">
                    <span className="text-[13px] text-[#334155]">{f.label}</span>
                    <input
                      readOnly
                      value={f.value}
                      className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A] outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Voxa live assist</h2>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[12px] font-semibold text-[#166534]">
                  Sentiment: positive
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {TRANSCRIPT.map((t, i) => (
                  <div key={i} className="flex gap-2 text-[13px]">
                    <span className="w-12 shrink-0 font-semibold" style={{ color: t.color }}>
                      {t.who}
                    </span>
                    <span className="text-[#334155]">{t.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1 rounded-[10px] bg-[#EFF6FF] p-3">
                <span className="text-[13px] font-bold text-[#1D4ED8]">Suggested reply</span>
                <p className="m-0 text-[13px] leading-[19px] text-[#1E3A5F]">{SUGGESTED_REPLY}</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                  defaultValue={OUTCOME_OPTIONS[0]}
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
                  readOnly
                  value="Thu 16 Oct · 10:00 am"
                  className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
                Assign to installer
                <select className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A]">
                  {INSTALLER_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[13px] text-[#334155]">
              Notes (AI draft – edit before saving)
              <textarea
                defaultValue={WRAPUP_NOTES}
                rows={3}
                className="rounded-[10px] border border-[#CBD5E1] bg-white p-3 text-[13px] leading-[19px] text-[#0F172A]"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px] text-[#334155]">
                <input type="checkbox" defaultChecked className="size-4" />
                Send SMS confirmation (includes STOP opt-out)
              </label>
              <div className="flex gap-2">
                <span
                  title="Not built yet — no CRM/disposition backend connected"
                  className="flex h-10 cursor-not-allowed items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#94A3B8]"
                >
                  Save &amp; pause
                </span>
                <span
                  title="Not built yet — no CRM/disposition backend connected"
                  className="flex h-10 cursor-not-allowed items-center rounded-[10px] bg-[#F68A0A]/60 px-4 text-[13px] font-bold text-[#3B1D00]/60"
                >
                  Save &amp; dial next
                </span>
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
              <p className="m-0 text-[13px] text-[#5B6B80]">
                Unknown caller — no matching lead for this number.
              </p>
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
