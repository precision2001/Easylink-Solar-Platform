"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRecordingPlayback } from "@/hooks/useRecordingPlayback";
import {
  callMeta,
  callStamp,
  callSummary,
  callWho,
  clock,
  playbackBlockedReason,
  type RecentCall,
} from "@/lib/calls/recent";
import {
  SPEAKER_STYLE,
  speakersSeparated,
  transcriptMessage,
  type CallTranscript,
} from "@/lib/calls/transcript";

/**
 * The Easylink Designer "Contact Centre" mock (DistContact.dc.html).
 *
 * "Recent calls & recordings" is real: the agent's own call history, with
 * playback of the stored recording. Everything else is the mock's sample data
 * — there is no queue, routing or AI-receptionist backend behind the KPIs,
 * lines or roster, so the page says which half is which.
 *
 * The two things that are genuinely interactive in the mock are ported as real
 * state rather than baked to one frame:
 *
 *  - `status` drives both the select's own background and Kerry's pill, since
 *    in the mock the agent's shift state and the roster are the same fact.
 *  - `dispo` is the outcome picker, selected pill filled in sun.
 *
 * The working dialler is a separate page (`/master/dialer`) with the real call
 * path; "Call" here links there rather than pretending to place a call.
 */

/** Select background per status — mock `bgs`. */
const STATUS_BG = ["#DCFCE7", "#FFE7C2", "#F1F5F9", "#F1F5F9"] as const;

/** Roster pill per status — mock `S`. Kerry is the agent whose shift this is. */
const STATUS_PILL = [
  { bg: "#DCFCE7", fg: "#166534", label: "Available" },
  { bg: "#FFE7C2", fg: "#3B1D00", label: "On site" },
  { bg: "#E2E8F0", fg: "#334155", label: "Break" },
  { bg: "#E2E8F0", fg: "#334155", label: "Offline" },
] as const;

const STATUS_OPTIONS = [
  "Available",
  "In a meeting · AI answers",
  "Break",
  "Offline",
] as const;

const KPIS = [
  { l: "Calls today", v: "61", s: "3 lines · 4 agents" },
  { l: "Installer support", v: "14", s: "Kit, jobs and payouts" },
  { l: "Answered by AI", v: "9", s: "Overflow and after hours" },
  { l: "Avg wait", v: "0:24", s: "Target under 0:30" },
  { l: "Deposits taken", v: "4", s: "2 became Ready Sites" },
] as const;

const DISPOSITIONS = [
  "Deposit taken",
  "Wants changes",
  "Call back later",
  "Not interested",
  "No answer",
] as const;

const CB = { type: "Callback", bg: "#DBEAFE", fg: "#1E40AF" } as const;
const VM = { type: "Voicemail", bg: "#FFE7C2", fg: "#3B1D00" } as const;
const AIB = { type: "AI booked", bg: "#DCFCE7", fg: "#166534" } as const;
const PM = { type: "Portal", bg: "#EDE4FF", fg: "#3B1F75" } as const;

const TASKS = [
  { who: "Raj Malhotra", note: "Battery rebate question · EasyLink lead", when: "Now", wc: "#B91C1C", ...CB },
  { who: "Solarman Electrical", note: "Installer · JOB-3138 kit short 2 rails", when: "10:30 am", wc: "#92400E", ...PM },
  { who: "Unknown · 04xx xxx 112", note: "Inverter beeping · not a customer yet", when: "11:00 am", wc: "#92400E", ...VM },
  { who: "Priya Raman", note: "Ready Deal paid · check the installer called", when: "3:00 pm", wc: "#475569", ...CB },
  { who: "Penrith web lead", note: "AI booked a call · deposit-ready", when: "4:30 pm", wc: "#475569", ...AIB },
] as const;

const LINES = [
  {
    n: "EasyLink sales · 1300 [XXX XXX]",
    d: "Website, Ready Deals and new leads · rings sales, then the AI receptionist",
    s: "1 waiting",
    c: "#92400E",
  },
  {
    n: "Installer support · 02 [XXXX XXXX]",
    d: "Kit, job offers, handover packs and payouts",
    s: "0 waiting",
    c: "#166534",
  },
  {
    n: "Service & warranty · 1300 [XXX XXX]",
    d: "AI receptionist triages, books an installer or a drone check",
    s: "0 waiting",
    c: "#166534",
  },
] as const;

const RULES = [
  "Outbound sales calls only Mon–Fri 9 am–8 pm, Sat 9 am–5 pm, never Sundays or national public holidays",
  "Lists checked against the Do Not Call Register",
  "SMS only to customers who agreed to it, with opt-out",
  "Recording notice played on every call",
] as const;

/**
 * The only section of this page backed by real data.
 *
 * Rows come from the agent's own call history, and the play button streams the
 * stored recording through a signed URL minted per click — the bucket holds
 * customer conversations and stays private, so nothing here links an object
 * directly. A row whose call was never recorded says so instead of offering
 * dead audio.
 */
function RecentCallsCard() {
  const [calls, setCalls] = useState<RecentCall[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const playback = useRecordingPlayback();

  /** Which row is expanded, and the transcripts already fetched, kept by id. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<
    Record<string, CallTranscript | null>
  >({});

  /**
   * Transcripts are fetched per row on expand, not with the list: they carry
   * every utterance of a conversation, so loading eight of them to show none
   * would be the wasteful way round.
   */
  const openTranscript = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (transcripts[id] !== undefined) return;

    try {
      const res = await fetch(`/api/admin/calls/${id}/transcript`);
      const json = await res.json();
      setTranscripts((prev) => ({
        ...prev,
        [id]: res.ok && json?.success ? (json.data as CallTranscript) : null,
      }));
    } catch {
      setTranscripts((prev) => ({ ...prev, [id]: null }));
    }
  };

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/calls/recent?limit=8");
        const json = await res.json();
        if (!live) return;
        if (!res.ok || !json?.success) {
          setLoadError(json?.message ?? "Could not load recent calls.");
          return;
        }
        setCalls(json.data as RecentCall[]);
      } catch {
        if (live) setLoadError("Could not reach the server.");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <section
      aria-label="Recent calls"
      className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
          My recent calls &amp; recordings
        </h2>
        <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#166534]">
          Live data
        </span>
      </div>

      {playback.error ? (
        <p className="m-0 rounded-[8px] bg-[#FEE2E2] px-2.5 py-1.5 text-[12px] text-[#991B1B]">
          {playback.error}
        </p>
      ) : null}

      {loadError ? (
        <p className="m-0 text-[13px] text-[#991B1B]">{loadError}</p>
      ) : calls === null ? (
        <p className="m-0 text-[13px] text-[#5B6B80]">Loading recent calls…</p>
      ) : calls.length === 0 ? (
        <p className="m-0 text-[13px] leading-[19px] text-[#5B6B80]">
          No calls yet on this account. Calls you place from the{" "}
          <Link href="/master/dialer" className="text-[#1565C0]">
            Agent Dialer
          </Link>{" "}
          appear here with their recording and transcript.
        </p>
      ) : (
        calls.map((c) => {
          const blocked = playbackBlockedReason(c);
          const on = playback.playingId === c.id;
          const expanded = openId === c.id;
          const t = transcripts[c.id];
          return (
            <div key={c.id} className="flex flex-col border-b border-[#EEF2F6]">
              <div className="flex gap-2.5 py-2.5">
              <button
                type="button"
                onClick={() => playback.toggle(c)}
                disabled={Boolean(blocked) || playback.loadingId === c.id}
                aria-label={on ? `Pause ${callWho(c)}` : `Play ${callWho(c)}`}
                title={blocked ?? (on ? "Pause" : "Play recording")}
                className="flex size-9 flex-[0_0_36px] items-center justify-center rounded-full text-[13px] text-white disabled:cursor-not-allowed"
                style={{ background: blocked ? "#94A3B8" : "#0B1A2E" }}
              >
                {playback.loadingId === c.id ? "…" : on ? "❚❚" : "▶"}
              </button>
              <span className="flex min-w-0 flex-grow flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[#0F172A]">
                  {callWho(c)}{" "}
                  <span className="font-medium text-[#5B6B80]">· {callMeta(c)}</span>
                </span>
                <span
                  className="line-clamp-2 text-[12px] text-[#334155]"
                  title={c.notes ?? undefined}
                >
                  {callSummary(c)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[12px] whitespace-nowrap text-[#5B6B80]">
                  {callStamp(c.startedAt)}
                </span>
                {c.hasTranscript ? (
                  <button
                    type="button"
                    onClick={() => openTranscript(c.id)}
                    aria-expanded={expanded}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-semibold text-[#166534] underline"
                  >
                    {expanded ? "Hide transcript" : "Transcript"}
                  </button>
                ) : (
                  <span
                    title="No transcript for this call"
                    className="cursor-help text-[12px] font-semibold text-[#94A3B8]"
                  >
                    —
                  </span>
                )}
              </span>
              </div>

              {expanded ? (
                <div className="mb-2.5 ml-[46px] flex max-h-[240px] flex-col gap-1.5 overflow-y-auto rounded-[10px] bg-[#F8FAFC] p-2.5">
                  {t === undefined ? (
                    <p className="m-0 text-[12px] text-[#5B6B80]">Loading transcript…</p>
                  ) : t === null ? (
                    // A failed fetch, not an empty transcript — saying
                    // "loading" here would leave the agent waiting forever.
                    <p className="m-0 text-[12px] text-[#991B1B]">
                      Could not load this transcript.
                    </p>
                  ) : t.transcriptSegments?.length ? (
                    <>
                      {!speakersSeparated(t.transcriptSegments) ? (
                        <p className="m-0 text-[11px] text-[#92400E]">
                          Caller and customer could not be told apart on this
                          recording — it mixes both parties into one track — so
                          the lines are timestamped instead of attributed.
                        </p>
                      ) : null}
                      {t.transcriptSegments.map((seg) => {
                        const named = speakersSeparated(t.transcriptSegments);
                        return (
                          <div key={seg.idx} className="flex gap-2 text-[12px]">
                            <span
                              className="w-[64px] shrink-0 font-semibold"
                              style={{
                                color: named
                                  ? SPEAKER_STYLE[seg.speaker].color
                                  : "#64748B",
                              }}
                              title={
                                named
                                  ? SPEAKER_STYLE[seg.speaker].title
                                  : `at ${clock(seg.startSec)}`
                              }
                            >
                              {named ? SPEAKER_STYLE[seg.speaker].label : clock(seg.startSec)}
                            </span>
                            <span className="text-[#334155]">{seg.text}</span>
                          </div>
                        );
                      })}
                    </>
                  ) : t.transcriptText ? (
                    // Diarisation produced no segments, but there is still text.
                    <p className="m-0 text-[12px] whitespace-pre-wrap text-[#334155]">
                      {t.transcriptText}
                    </p>
                  ) : (
                    <p className="m-0 text-[12px] text-[#5B6B80]">
                      {transcriptMessage(t, true)}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </section>
  );
}

export function MasterContactCentre() {
  const [status, setStatus] = useState(0);
  const [dispo, setDispo] = useState(-1);

  const pill = STATUS_PILL[status];

  const AGENTS = [
    {
      ini: "K",
      n: "Kerry",
      r: "Customer support · sales line",
      av: "#F68A0A",
      avFg: "#3B1D00",
      bg: pill.bg,
      fg: pill.fg,
      s: pill.label,
    },
    {
      ini: "MK",
      n: "Mark Kelly",
      r: "Operations · installer support line",
      av: "#1B3557",
      avFg: "#FFFFFF",
      bg: "#DBEAFE",
      fg: "#1E40AF",
      s: "On call",
    },
    {
      ini: "AI",
      n: "Receptionist (Voxa)",
      r: "Overflow, after hours and service triage",
      av: "#FFB547",
      avFg: "#3B1D00",
      bg: "#DCFCE7",
      fg: "#166534",
      s: "Live",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Contact Centre</span>
        </nav>
        <span
          title="Recent calls & recordings are real; the rest is sample data"
          className="cursor-help rounded-full bg-[#DBEAFE] px-2 py-0.5 text-[11px] font-bold text-[#1E40AF]"
        >
          Mostly sample data
        </span>
        <label htmlFor="mystatus" className="text-[13px] text-[#475569]">
          My status
        </label>
        <select
          id="mystatus"
          value={STATUS_OPTIONS[status]}
          onChange={(e) => setStatus(e.target.selectedIndex)}
          className="h-[38px] rounded-[10px] border border-[#CBD5E1] px-2.5 text-[13px]"
          style={{ background: STATUS_BG[status] }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pt-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Contact Centre
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            EasyLink sales, installer support and service lines · your own
            recent calls and recordings are live below · the rest of this page
            is sample data until queue routing and the Voxa receptionist are
            connected
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white p-3.5"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">{k.l}</span>
              <span className="font-source-sans text-[26px] font-bold text-[#0F172A]">
                {k.v}
              </span>
              <span className="text-[12px] text-[#475569]">{k.s}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section
            aria-label="Dialer"
            className="flex flex-col gap-3 rounded-[14px] bg-[#0B1A2E] p-[18px] text-white"
          >
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold">Next call</h2>
              <span className="text-[12px] text-[#9FB0C8]">
                From the team callback list
              </span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-[12px] bg-[#13263F] p-3.5">
              <strong className="text-[18px]">Raj Malhotra · Seven Hills</strong>
              <span className="text-[13px] text-[#C3CFDF]">
                EasyLink lead · proposal sent 10 Oct · 6.6 kW + 13 kWh · asked
                about the battery rebate
              </span>
              <span className="text-[13px] text-[#FFB547]">
                Goal: answer the rebate question, take a deposit, then make it a
                Ready Site
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/master/dialer"
                className="flex h-12 flex-[1_1_140px] items-center justify-center rounded-[12px] bg-[#22C55E] text-[15px] font-bold text-[#052E16] no-underline"
              >
                Call
              </Link>
              <span
                title="Not built yet"
                className="flex h-12 cursor-help items-center rounded-[12px] border border-[#2A4466] px-3.5 text-[13px] font-semibold text-white"
              >
                Send SMS
              </span>
              <span
                title="Not built yet"
                className="flex h-12 cursor-help items-center rounded-[12px] border border-[#2A4466] px-3.5 text-[13px] font-semibold text-white"
              >
                Skip
              </span>
            </div>
            <span className="text-[12px] text-[#9FB0C8]">Outcome after the call</span>
            <div role="group" aria-label="Call outcome" className="flex flex-wrap gap-1.5">
              {DISPOSITIONS.map((l, i) => {
                const on = i === dispo;
                return (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDispo(i)}
                    className="h-[38px] cursor-pointer rounded-full border px-3 text-[12px] font-semibold"
                    style={{
                      borderColor: on ? "#F68A0A" : "#2A4466",
                      background: on ? "#F68A0A" : "transparent",
                      color: on ? "#3B1D00" : "#FFFFFF",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <span className="text-[12px] text-[#C3CFDF]">
              The outcome updates Raj&rsquo;s stage in Quotes &amp; Leads.
              &ldquo;Deposit taken&rdquo; offers to create a Ready Site for
              installers.
            </span>
          </section>

          <section
            aria-label="Callbacks and tasks"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">
                Callbacks &amp; tasks
              </h2>
              <span className="text-[12px] text-[#5B6B80]">5 today</span>
            </div>
            {TASKS.map((t) => (
              <div
                key={t.who}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2"
              >
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap"
                  style={{ background: t.bg, color: t.fg }}
                >
                  {t.type}
                </span>
                <span className="flex flex-grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">
                    {t.who}
                  </span>
                  <span className="text-[12px] text-[#5B6B80]">{t.note}</span>
                </span>
                <span
                  className="text-[12px] font-bold whitespace-nowrap"
                  style={{ color: t.wc }}
                >
                  {t.when}
                </span>
              </div>
            ))}
          </section>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section
            aria-label="Lines"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
              Lines &amp; team on shift
            </h2>
            {LINES.map((l) => (
              <div
                key={l.n}
                className="flex items-center gap-2.5 rounded-[10px] bg-[#F8FAFC] p-2.5"
              >
                <span className="flex flex-grow flex-col">
                  <strong className="text-[14px] text-[#0F172A]">{l.n}</strong>
                  <span className="text-[12px] text-[#5B6B80]">{l.d}</span>
                </span>
                <span className="text-[12px] font-bold" style={{ color: l.c }}>
                  {l.s}
                </span>
              </div>
            ))}
            {AGENTS.map((a) => (
              <div
                key={a.n}
                className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2"
              >
                <span
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ background: a.av, color: a.avFg }}
                >
                  {a.ini}
                </span>
                <span className="flex flex-grow flex-col">
                  <span className="text-[14px] font-semibold text-[#0F172A]">
                    {a.n}
                  </span>
                  <span className="text-[12px] text-[#5B6B80]">{a.r}</span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                  style={{ background: a.bg, color: a.fg }}
                >
                  {a.s}
                </span>
              </div>
            ))}
          </section>

          <RecentCallsCard />
        </div>

        <section
          aria-label="Calling rules"
          className="flex flex-wrap gap-x-6 gap-y-2.5 rounded-[14px] border border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[12px] text-[#334155]"
        >
          <strong className="text-[13px] text-[#0F172A]">Calling rules applied</strong>
          {RULES.map((r) => (
            <span key={r}>✓ {r}</span>
          ))}
        </section>
      </div>
    </div>
  );
}
