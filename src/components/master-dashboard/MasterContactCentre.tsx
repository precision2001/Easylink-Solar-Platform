"use client";

import { useCallback, useEffect, useState } from "react";
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

import { cc, day, dur, phoneFmt, when, type CcOverview } from "@/components/contact-centre/api";
import { PresenceToggle } from "@/components/contact-centre/LiveCalls";

/**
 * Contact Centre: the day at a glance, from real calls (a Sydney day).
 * EasyLink AI answers every call on the main line and hands over to whoever
 * is available; this page shows what it did today, what is live now, the
 * callbacks and tasks due, who is taking calls, and the agent's own recent
 * calls with recordings. Calls are placed from the Agent Dialer.
 */

const KIND = { CALLBACK: "Callback", SITE_VISIT: "Site visit", TASK: "Task" } as const;
const KIND_TONE = {
  CALLBACK: { bg: "#DBEAFE", fg: "#1E40AF" },
  SITE_VISIT: { bg: "#DCFCE7", fg: "#166534" },
  TASK: { bg: "#EDE4FF", fg: "#3B1F75" },
} as const;
const PRESENCE_TONE = {
  AVAILABLE: { bg: "#DCFCE7", fg: "#166534", label: "Available" },
  BUSY: { bg: "#DBEAFE", fg: "#1E40AF", label: "On a call" },
  AWAY: { bg: "#E2E8F0", fg: "#334155", label: "Away" },
} as const;

/** What the system actually does, so the page never claims a rule that isn't applied. */
const RULES = [
  "EasyLink AI plays the recording notice on every call it answers",
  "Contact list numbers on the Do Not Call Register are never offered for calling",
  "People who asked not to be called are never offered again",
  "Text and email consent recorded for every customer and contact",
] as const;

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

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
  const [data, setData] = useState<CcOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(() => {
    cc("admin")
      .overview()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the contact centre"));
  }, []);

  // Live page: refresh every 15 seconds, and after a task is ticked off.
  useEffect(() => {
    load();
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [load, reload]);

  const done = async (id: string) => {
    await cc("admin")
      .setFollowUp(id, { status: "DONE" })
      .catch(() => undefined);
    setReload((n) => n + 1);
  };

  const k = data?.kpis;
  const KPIS = k
    ? [
        { l: "Calls today", v: String(k.callsToday), s: `${k.inbound} in · ${k.outbound} out` },
        { l: "Answered by EasyLink AI", v: String(k.answeredByAi), s: `${k.handedOver} handed to staff` },
        { l: "Callbacks booked", v: String(k.callbacksBooked + k.missed), s: `${k.missed} missed · ${k.callbacksBooked} nobody free` },
        { l: "Outbound connected", v: String(k.outboundConnected), s: k.outbound ? `${Math.round((k.outboundConnected / k.outbound) * 100)}% of ${k.outbound} dialled` : "None dialled yet" },
        { l: "Site visits booked", v: String(k.siteVisitsBooked), s: k.avgHandleSec ? `Avg call ${dur(k.avgHandleSec)}` : "No calls talked yet" },
      ]
    : [];
  const next = data?.followUps.items.find((f) => f.phone);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Contact Centre</span>
        </nav>
        <PresenceToggle onCall={false} />
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pt-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Contact Centre</h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            {data ? `Today, ${day(new Date(`${data.day}T12:00:00+11:00`).toISOString())} · refreshes every 15 seconds` : "Loading today…"}
          </p>
          {error && <p className="mt-2 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(KPIS.length ? KPIS : Array.from({ length: 5 }, (_, i) => ({ l: "", v: "–", s: "", i }))).map((x, i) => (
            <div key={x.l || i} className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white p-3.5">
              <span className="text-[12px] font-semibold text-[#5B6B80]">{x.l || "\u00a0"}</span>
              <span className="font-source-sans text-[26px] font-bold tabular-nums text-[#0F172A]">{x.v}</span>
              <span className="text-[12px] text-[#475569]">{x.s}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section aria-label="Next call" className="flex flex-col gap-3 rounded-[14px] bg-[#0B1A2E] p-[18px] text-white">
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold">Next call</h2>
              <span className="text-[12px] text-[#9FB0C8]">First callback due</span>
            </div>
            {next ? (
              <>
                <div className="flex flex-col gap-1.5 rounded-[12px] bg-[#13263F] p-3.5">
                  <strong className="text-[18px]">
                    {next.customer?.name ?? phoneFmt(next.phone)}
                    {next.customer?.address ? ` · ${next.customer.address.split(",").map((p) => p.trim()).filter(Boolean).slice(-2, -1)[0] ?? ""}` : ""}
                  </strong>
                  <span className="text-[13px] text-[#C3CFDF]">
                    {KIND[next.kind]}: {next.title}
                  </span>
                  {next.notes && <span className="text-[13px] text-[#FFB547]">{next.notes}</span>}
                  <span className={`text-[12px] ${next.overdue ? "text-[#FCA5A5]" : "text-[#9FB0C8]"}`}>
                    {next.overdue ? "Overdue · was due " : "Due "}
                    {when(next.dueAt)}
                    {next.fromAi ? " · booked by EasyLink AI" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/master/dialer?number=${encodeURIComponent(next.phone ?? "")}`}
                    className="flex h-12 flex-[1_1_140px] items-center justify-center rounded-[12px] bg-[#22C55E] text-[15px] font-bold text-[#052E16] no-underline"
                  >
                    Call in the dialler
                  </Link>
                  {next.customer && (
                    <Link
                      href={`/master/customers/${next.customer.id}`}
                      className="flex h-12 items-center rounded-[12px] border border-[#2A4466] px-3.5 text-[13px] font-semibold text-white no-underline"
                    >
                      Their record
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void done(next.id)}
                    className="flex h-12 items-center rounded-[12px] border border-[#2A4466] bg-transparent px-3.5 text-[13px] font-semibold text-white"
                  >
                    Mark done
                  </button>
                </div>
                <span className="text-[12px] text-[#C3CFDF]">The outcome you save in the dialler goes on the customer&rsquo;s record.</span>
              </>
            ) : (
              <p className="m-0 text-[13px] text-[#C3CFDF]">{data ? "No callbacks due today. Call lists are in the Agent Dialer." : "Loading…"}</p>
            )}
          </section>

          <section aria-label="Callbacks and tasks" className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <div className="flex items-center">
              <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Callbacks &amp; tasks</h2>
              <span className="text-[12px] text-[#5B6B80]">{data ? `${data.followUps.dueToday} due today` : ""}</span>
            </div>
            {data?.followUps.items.length === 0 && <p className="m-0 text-[13px] text-[#5B6B80]">Nothing due today.</p>}
            {data?.followUps.items.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap" style={{ background: KIND_TONE[t.kind].bg, color: KIND_TONE[t.kind].fg }}>
                  {t.fromAi ? "AI booked" : KIND[t.kind]}
                </span>
                <span className="flex min-w-0 flex-grow flex-col">
                  <span className="truncate text-[14px] font-semibold text-[#0F172A]">{t.customer?.name ?? phoneFmt(t.phone)}</span>
                  <span className="truncate text-[12px] text-[#5B6B80]">{t.title}</span>
                </span>
                <span className={`text-[12px] font-bold whitespace-nowrap ${t.overdue ? "text-[#B91C1C]" : "text-[#475569]"}`}>
                  {t.overdue ? "Overdue" : new Date(t.dueAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })}
                </span>
                <button type="button" onClick={() => void done(t.id)} className="shrink-0 text-[12px] font-semibold text-[#0B4A7A] hover:underline">
                  Done
                </button>
              </div>
            ))}
          </section>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section aria-label="Lines" className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Lines &amp; team</h2>
            {data?.lines.map((l) => (
              <div key={l.number} className="flex items-center gap-2.5 rounded-[10px] bg-[#F8FAFC] p-2.5">
                <span className="flex flex-grow flex-col">
                  <strong className="text-[14px] text-[#0F172A]">
                    {l.name} · {l.number}
                  </strong>
                  <span className="text-[12px] text-[#5B6B80]">{l.route}</span>
                </span>
                <span className={`text-[12px] font-bold ${l.waiting ? "text-[#92400E]" : "text-[#166534]"}`}>{l.waiting} waiting for a person</span>
              </div>
            ))}
            {data?.waiting.map((w) => (
              <div key={w.id} className="flex items-center gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] p-2.5 text-[13px]">
                <span className="flex-grow">
                  <b>{w.callerName ?? phoneFmt(w.callerNumber)}</b>
                  {w.reason ? ` · ${w.reason}` : ""}
                </span>
                <span className="font-bold tabular-nums text-[#92400E]">{w.secondsLeft}s</span>
                <Link href="/master/dialer" className="font-semibold text-[#0B4A7A] no-underline hover:underline">
                  Take it
                </Link>
              </div>
            ))}
            {data?.liveCalls.map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 rounded-[10px] bg-[#EFF6FF] p-2.5 text-[13px]">
                <span className="size-2 shrink-0 rounded-full bg-[#16A34A]" aria-hidden="true" />
                <span className="flex-grow">
                  <b>{c.customer?.name ?? phoneFmt(c.number)}</b> · {c.direction === "INBOUND" ? "inbound" : "outbound"} · {c.by}
                </span>
                <span className="text-[12px] text-[#475569]">since {new Date(c.startedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })}</span>
              </div>
            ))}
            <div className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2">
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#FFB547] text-[12px] font-bold text-[#3B1D00]">AI</span>
              <span className="flex flex-grow flex-col">
                <span className="text-[14px] font-semibold text-[#0F172A]">EasyLink AI</span>
                <span className="text-[12px] text-[#5B6B80]">Answers every call · verifies callers · hands over when needed</span>
              </span>
              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[12px] font-bold text-[#166534]">Answering</span>
            </div>
            {data?.team.length === 0 && <p className="m-0 text-[13px] text-[#5B6B80]">Nobody has opened the Agent Dialer yet. Staff show here once they set themselves Available.</p>}
            {data?.team.map((a) => {
              const tone = PRESENCE_TONE[a.status];
              return (
                <div key={a.userId} className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2">
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#1B3557] text-[12px] font-bold text-white">{initials(a.name)}</span>
                  <span className="flex flex-grow flex-col">
                    <span className="text-[14px] font-semibold text-[#0F172A]">{a.name}</span>
                    <span className="text-[12px] text-[#5B6B80]">Last seen {when(a.lastSeenAt)}</span>
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: tone.bg, color: tone.fg }}>
                    {tone.label}
                  </span>
                </div>
              );
            })}
          </section>

          <RecentCallsCard />
        </div>

        <section aria-label="Calling rules" className="flex flex-wrap gap-x-6 gap-y-2.5 rounded-[14px] border border-[#E3E8EF] bg-white px-[18px] py-3.5 text-[12px] text-[#334155]">
          <strong className="text-[13px] text-[#0F172A]">Calling rules applied</strong>
          {RULES.map((r) => (
            <span key={r}>✓ {r}</span>
          ))}
        </section>
      </div>
    </div>
  );
}
