"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ParticipantKind, Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { Btn } from "@/components/jobs/ui";
import { cc, dur, phoneFmt, when, type AcceptedTransfer, type AiOutbound, type Assist, type ConnectLiveCall, type ConnectTranscript, type LeadSummary, type PendingTransfer, type Portal, type Presence } from "./api";

const PRESENCE: { key: Presence; label: string; dot: string }[] = [
  { key: "AVAILABLE", label: "Available", dot: "#16A34A" },
  { key: "BUSY", label: "On a call", dot: "#F59E0B" },
  { key: "AWAY", label: "Away", dot: "#94A3B8" },
];

/**
 * "Can EasyLink AI hand calls to me?" Available means calls the AI can't
 * finish ring here first; Away means the AI books a callback instead.
 */
export function PresenceToggle({ onCall }: { onCall: boolean }) {
  const [status, setStatus] = useState<Presence | null>(null);
  const [team, setTeam] = useState<{ userId: string; name: string; status: Presence }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cc("admin")
      .presence()
      .then((p) => {
        if (cancelled) return;
        setStatus(p.me.status);
        setTeam(p.team);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load your status"));
    return () => {
      cancelled = true;
    };
  }, []);

  // On a call you're busy; after it, back to whatever you chose (available unless you'd said away).
  const shown: Presence | null = onCall ? "BUSY" : status === "BUSY" ? "AVAILABLE" : status;

  const choose = (s: Presence) => {
    setStatus(s);
    void cc("admin")
      .setPresence(s)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't change your status"));
  };

  const others = team.filter((t) => t.status === "AVAILABLE").length;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] font-semibold text-[#334155]">Calls from EasyLink AI:</span>
      <div role="radiogroup" aria-label="Your status" className="flex rounded-full bg-[#F1F5F9] p-0.5">
        {PRESENCE.filter((p) => p.key !== "BUSY").map((p) => {
          const on = shown === p.key || (p.key === "AVAILABLE" && shown === "BUSY");
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={onCall}
              onClick={() => choose(p.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${on ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}
            >
              <span className="size-2 rounded-full" style={{ background: on && shown === "BUSY" ? "#F59E0B" : p.dot }} aria-hidden="true" />
              {on && shown === "BUSY" ? "On a call" : p.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <span className="text-[12px] text-[#991B1B]">{error}</span>
      ) : (
        <span className="text-[12px] text-[#64748B]">
          {shown === "AWAY" ? "EasyLink AI will book callbacks instead of ringing you." : others > 1 ? `${others} people available` : "Calls EasyLink AI can't finish ring here for 30 seconds."}
        </span>
      )}
    </div>
  );
}

/**
 * Calls EasyLink AI wants to hand to a person. The dialler checks every few
 * seconds while open (which also keeps you "here"); the first to accept
 * joins the live call with the AI's summary.
 */
export function IncomingTransfers({ enabled, onAccepted }: { enabled: boolean; onAccepted: (t: AcceptedTransfer) => void }) {
  const [pending, setPending] = useState<PendingTransfer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // Every 8 s, and not while the tab is hidden: a handed-over call rings for
    // 30 s, so this still catches it in time without eating the API's limit.
    const load = () => {
      if (document.visibilityState === "hidden") return;
      cc("admin")
        .pendingTransfers()
        .then((p) => !cancelled && setPending(p))
        .catch(() => undefined);
    };
    void load();
    const poll = window.setInterval(load, 8000);
    document.addEventListener("visibilitychange", load);
    const clock = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(clock);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled]);

  // Count down locally between checks.
  const [seenAt, setSeenAt] = useState(() => Date.now());
  const [prevPending, setPrevPending] = useState(pending);
  if (prevPending !== pending) {
    setPrevPending(pending);
    setSeenAt(Date.now());
  }
  void tick;
  const elapsed = Math.floor((Date.now() - seenAt) / 1000);
  const shown = enabled ? pending.filter((p) => p.secondsLeft - elapsed > 0) : [];
  if (!shown.length && !error) return null;

  const accept = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const t = await cc("admin").acceptTransfer(id);
      setPending((p) => p.filter((x) => x.id !== id));
      onAccepted(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't take the call");
      setPending((p) => p.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  };

  const decline = async (id: string) => {
    setPending((p) => p.filter((x) => x.id !== id));
    await cc("admin")
      .declineTransfer(id)
      .catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-2" aria-live="assertive">
      {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">{error}</p>}
      {shown.map((p) => (
        <section key={p.id} className="flex flex-col gap-3 rounded-[14px] border-2 border-[#16A34A] bg-[#F0FDF4] p-4 shadow-[0_0_0_4px_rgba(22,163,74,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#15803D]">EasyLink AI is handing you a call</span>
              <span className="text-[18px] font-bold text-[#0F172A]">
                {p.callerName ?? "Caller"} · {phoneFmt(p.callerNumber)}
              </span>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold tabular-nums text-[#15803D]">{Math.max(0, p.secondsLeft - elapsed)}s</span>
          </div>
          {p.reason && <span className="text-[13px] font-semibold text-[#166534]">Why: {p.reason}</span>}
          <p className="m-0 text-[14px] leading-[21px] text-[#14532D]">{p.summary}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn kind="secondary" disabled={busy === p.id} onClick={() => void decline(p.id)}>
              Can&apos;t take it
            </Btn>
            <Btn disabled={busy === p.id} onClick={() => void accept(p.id)}>
              {busy === p.id ? "Joining…" : "Take the call"}
            </Btn>
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- live transcript ----------

export type LiveLine = { id: number; who: "you" | "caller" | "ai"; text: string; final: boolean };

/**
 * Streams the call's two sides (your microphone, the caller's line) to
 * Deepgram as two channels and returns the running transcript. Needs a
 * short-lived key from the backend; without one it reports why and stays off.
 */
export function useLiveTranscript(room: Room | null, active: boolean) {
  const [lines, setLines] = useState<LiveLine[]>([]);
  const [status, setStatus] = useState<"off" | "starting" | "on" | "unavailable">("off");
  const [note, setNote] = useState<string | null>(null);
  const seq = useRef(0);

  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    if (active) {
      setLines([]);
      setStatus("starting");
      setNote(null);
    } else setStatus("off");
  }

  const push = useCallback((who: LiveLine["who"], text: string, final: boolean) => {
    setLines((prev) => {
      const next = [...prev];
      // Replace this speaker's interim line with the newer words.
      const i = next.findLastIndex((l) => l.who === who && !l.final);
      const line = { id: i >= 0 ? next[i]!.id : ++seq.current, who, text, final };
      if (i >= 0) next[i] = line;
      else next.push(line);
      return next.slice(-200);
    });
  }, []);

  useEffect(() => {
    if (!active || !room) return;
    let closed = false;
    let ws: WebSocket | null = null;
    let ctx: AudioContext | null = null;
    let proc: ScriptProcessorNode | null = null;
    const sources: MediaStreamAudioSourceNode[] = [];

    const start = async () => {
      let token: { token: string; language: string };
      try {
        token = await cc("admin").liveTranscriptToken();
      } catch (e) {
        if (!closed) {
          setStatus("unavailable");
          setNote(e instanceof Error ? e.message : "Live transcript isn't available");
        }
        return;
      }
      if (closed) return;
      // Wait for both sides' audio: your mic, and the caller's line.
      const mine = () => room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
      const theirs = () => {
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.audioTrackPublications.values()) {
            if (pub.track && p.kind === ParticipantKind.SIP) return (pub.track as RemoteTrack).mediaStreamTrack;
          }
        }
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.audioTrackPublications.values()) if (pub.track) return (pub.track as RemoteTrack).mediaStreamTrack;
        }
        return undefined;
      };
      for (let i = 0; i < 40 && !closed && (!mine() || !theirs()); i++) await new Promise((r) => setTimeout(r, 250));
      const a = mine();
      const b = theirs();
      if (closed || !a || !b) {
        if (!closed) {
          setStatus("unavailable");
          setNote("Couldn't hear both sides of the call for a transcript.");
        }
        return;
      }

      ctx = new AudioContext({ sampleRate: 16000 });
      const merger = ctx.createChannelMerger(2);
      [a, b].forEach((track, ch) => {
        const src = ctx!.createMediaStreamSource(new MediaStream([track]));
        src.connect(merger, 0, ch);
        sources.push(src);
      });
      proc = ctx.createScriptProcessor(4096, 2, 2);
      merger.connect(proc);
      // A silent sink keeps the processor running without playing anything back.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      proc.connect(mute);
      mute.connect(ctx.destination);

      const qs = new URLSearchParams({
        model: "nova-3",
        language: token.language || "en-AU",
        encoding: "linear16",
        sample_rate: "16000",
        channels: "2",
        multichannel: "true",
        interim_results: "true",
        smart_format: "true",
        punctuate: "true",
      });
      ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${qs}`, ["bearer", token.token]);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => !closed && setStatus("on");
      ws.onerror = () => {
        if (!closed) {
          setStatus("unavailable");
          setNote("The live transcript connection failed.");
        }
      };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(String(ev.data)) as { type?: string; channel_index?: number[]; is_final?: boolean; channel?: { alternatives?: { transcript?: string }[] } };
          if (m.type !== "Results") return;
          const text = m.channel?.alternatives?.[0]?.transcript?.trim();
          if (!text) return;
          push(m.channel_index?.[0] === 0 ? "you" : "caller", text, Boolean(m.is_final));
        } catch {
          // ignore anything that isn't a transcript
        }
      };
      proc.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const l = e.inputBuffer.getChannelData(0);
        const r = e.inputBuffer.getChannelData(1);
        const out = new Int16Array(l.length * 2);
        for (let i = 0; i < l.length; i++) {
          out[i * 2] = Math.max(-1, Math.min(1, l[i]!)) * 0x7fff;
          out[i * 2 + 1] = Math.max(-1, Math.min(1, r[i]!)) * 0x7fff;
        }
        ws.send(out.buffer);
      };
    };
    void start();

    return () => {
      closed = true;
      try {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
        ws?.close();
      } catch {
        // already closed
      }
      proc?.disconnect();
      sources.forEach((s) => s.disconnect());
      void ctx?.close().catch(() => undefined);
    };
  }, [room, active, push]);

  return { lines, status, note };
}

export function LiveTranscriptPanel({ lines, status, note, callerName, handover }: { lines: LiveLine[]; status: string; note: string | null; callerName?: string | null; handover?: string | null }) {
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Live transcript</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${status === "on" ? "bg-[#DCFCE7] text-[#166534]" : status === "starting" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F1F5F9] text-[#475569]"}`}
        >
          {status === "on" ? "Listening" : status === "starting" ? "Starting…" : status === "unavailable" ? "Off" : "Not on a call"}
        </span>
      </div>
      {handover && (
        <div className="rounded-[10px] bg-[#EFF6FF] p-3 text-[13px] leading-[19px] text-[#1E3A5F]">
          <b className="text-[#1D4ED8]">From EasyLink AI.</b> {handover}
        </div>
      )}
      {note && <p className="m-0 text-[12.5px] text-[#92400E]">{note}</p>}
      {lines.length === 0 ? (
        <p className="m-0 text-[13px] text-[#5B6B80]">{status === "off" ? "During a call, what you and the caller say appears here as you speak." : "Waiting for someone to speak…"}</p>
      ) : (
        <div className="flex max-h-[260px] flex-col gap-1.5 overflow-y-auto">
          {lines.map((l) => (
            <div key={l.id} className={`flex gap-2 text-[13px] ${l.final ? "" : "opacity-60"}`}>
              <span className="w-[86px] shrink-0 font-semibold" style={{ color: l.who === "you" ? "#1565C0" : l.who === "ai" ? "#7C3AED" : "#B45309" }}>
                {l.who === "you" ? "You" : l.who === "ai" ? "EasyLink AI" : (callerName?.split(" ")[0] ?? "Caller")}
              </span>
              <span className="text-[#334155]">{l.text}</span>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
    </section>
  );
}

// ---------- AI relationship summary ----------

/** "Where things stand" with this customer, written by AI from their whole record. */
export function CustomerAiSummary({ portal, leadId, itemCount, compact }: { portal: Portal; leadId: string; itemCount?: number; compact?: boolean }) {
  const [s, setS] = useState<LeadSummary | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cc(portal)
      .leadSummary(leadId)
      .then((r) => {
        if (cancelled) return;
        setS(r.data);
        setEnabled(r.meta?.summaries !== false);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [portal, leadId]);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      setS(await cc(portal).writeLeadSummary(leadId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write the summary");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;
  const stale = s && itemCount !== undefined && itemCount > s.itemCount ? itemCount - s.itemCount : 0;
  return (
    <section className={`flex flex-col gap-2 rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[14px] font-bold text-[#1D4ED8]">Where things stand</h2>
        {enabled && (
          <Btn small kind="ghost" disabled={busy} onClick={() => void write()}>
            {busy ? "Writing…" : s ? "Refresh" : "Write with AI"}
          </Btn>
        )}
      </div>
      {s ? (
        <>
          <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[20px] text-[#1E3A5F]">{s.summary}</p>
          <span className="text-[12px] text-[#475569]">
            AI summary, {when(s.updatedAt)}
            {stale ? ` · ${stale} new ${stale === 1 ? "item" : "items"} since; refresh to include them` : ""}
          </span>
        </>
      ) : (
        <p className="m-0 text-[13px] text-[#475569]">{enabled ? "A few lines on this customer from their calls, messages, notes and job: what they want, where it's up to, and what's next." : "AI summaries aren't switched on for this server."}</p>
      )}
      {error && <span className="text-[12.5px] text-[#991B1B]">{error}</span>}
    </section>
  );
}

// ---------- live assist ----------

const MOOD = {
  positive: { bg: "#DCFCE7", fg: "#166534", label: "Caller seems positive" },
  neutral: { bg: "#F1F5F9", fg: "#334155", label: "Caller seems neutral" },
  negative: { bg: "#FEE2E2", fg: "#991B1B", label: "Caller seems unhappy" },
} as const;

/**
 * Suggests what to say next from the live transcript: asks again after two
 * new finished lines, at most every 12 seconds, so a long call costs a few
 * cents rather than a request per word.
 */
export function LiveAssistPanel({ lines, active, leadId }: { lines: LiveLine[]; active: boolean; leadId?: string | null }) {
  const [assist, setAssist] = useState<Assist | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // A ref, not state: whether a request is in flight never changes what is drawn.
  const busy = useRef(false);
  const lastAsked = useRef({ at: 0, count: 0 });
  const finals = lines.filter((l) => l.final);

  const [prevActive, setPrevActive] = useState(active);
  if (prevActive !== active) {
    setPrevActive(active);
    if (active) {
      setAssist(null);
      setNote(null);
    }
  }

  // Which call a reply belongs to: a reply arriving after the call ended is dropped.
  const callSeq = useRef(0);
  useEffect(() => {
    callSeq.current += 1;
    if (!active) lastAsked.current = { at: 0, count: 0 };
  }, [active]);

  const finalCount = finals.length;
  useEffect(() => {
    if (!active) return;
    const due = finalCount - lastAsked.current.count >= 2 && Date.now() - lastAsked.current.at > 12_000;
    if (!due || busy.current || note) return;
    lastAsked.current = { at: Date.now(), count: finalCount };
    busy.current = true;
    const seq = callSeq.current;
    cc("admin")
      .assist(
        finals.map((l) => ({ who: l.who === "caller" ? ("caller" as const) : ("you" as const), text: l.text })),
        leadId ?? undefined,
      )
      .then((a) => seq === callSeq.current && setAssist(a))
      .catch((e) => seq === callSeq.current && setNote(e instanceof Error ? e.message : "Live assist isn't available"))
      .finally(() => {
        busy.current = false;
      });
    // Runs when a line finishes; `finals` is read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, finalCount, note, leadId]);

  const mood = assist?.sentiment ? MOOD[assist.sentiment] : null;
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Live assist</h2>
        {mood ? (
          <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: mood.bg, color: mood.fg }}>
            {mood.label}
          </span>
        ) : (
          <span className="text-[12px] text-[#64748B]">{active ? "Listening" : ""}</span>
        )}
      </div>
      {note ? (
        <p className="m-0 text-[12.5px] text-[#92400E]">{note}</p>
      ) : !assist ? (
        <p className="m-0 text-[13px] text-[#5B6B80]">{active ? "Suggestions appear once the conversation gets going." : "During a call, EasyLink AI suggests what to say next."}</p>
      ) : (
        <>
          {assist.watchOut && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-2.5 text-[13px] font-semibold text-[#991B1B]">{assist.watchOut}</p>}
          {assist.suggestedReply && (
            <div className="flex flex-col gap-1 rounded-[10px] bg-[#EFF6FF] p-3">
              <span className="text-[13px] font-bold text-[#1D4ED8]">Suggested reply</span>
              <p className="m-0 text-[13px] leading-[19px] text-[#1E3A5F]">{assist.suggestedReply}</p>
            </div>
          )}
          {assist.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assist.topics.map((t) => (
                <span key={t} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] text-[#475569]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------- listen-in ----------

/**
 * Listen to a live call: joins its room hidden and listen-only, so the people
 * on the call can't hear you and don't see you. One call at a time.
 */
export function useListenIn() {
  const [listening, setListening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const els = useRef<HTMLMediaElement[]>([]);

  const stop = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    els.current.forEach((e) => e.remove());
    els.current = [];
    setListening(null);
  }, []);

  const listen = useCallback(
    async (callId: string) => {
      stop();
      setError(null);
      try {
        const pass = await cc("admin").listen(callId);
        const room = new Room();
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
          els.current.push(el);
        });
        room.on(RoomEvent.Disconnected, () => stop());
        await room.connect(pass.url, pass.token);
        setListening(callId);
      } catch (e) {
        stop();
        setError(e instanceof Error ? e.message : "Couldn't listen to that call");
      }
    },
    [stop],
  );

  useEffect(() => stop, [stop]);
  return { listening, error, listen, stop };
}

// ---------- Amazon Connect: live transcripts and the Live calls board ----------

const toLines = (t: ConnectTranscript | null): LiveLine[] =>
  t && t.found ? t.turns.map((x, i) => ({ id: i, who: x.who === "rep" ? "you" : x.who === "ai" ? "ai" : "caller", text: x.text, final: true })) : [];

/**
 * The live transcript of a Connect call, polled every few seconds while it is
 * on (EasyLink AI's turns from its conversation log, a rep's call from Contact
 * Lens real-time). Keeps polling briefly after the call so the last words land.
 */
export function useConnectLiveTranscript(contactId: string | null, active: boolean) {
  const [data, setData] = useState<ConnectTranscript | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [prevId, setPrevId] = useState(contactId);
  if (prevId !== contactId) {
    setPrevId(contactId);
    if (contactId) {
      setData(null);
      setNote(null);
    }
  }
  useEffect(() => {
    if (!contactId) return;
    let stop = false;
    let after = active ? Infinity : 2;
    const tick = async () => {
      try {
        const t = await cc("admin").connectTranscript(contactId);
        if (stop) return;
        setData(t);
        setNote(null);
        if (t.found && !t.active) after = Math.min(after, 2);
      } catch (e) {
        if (!stop) setNote(e instanceof Error ? e.message : "Live transcript unavailable");
      }
    };
    void tick();
    const timer = window.setInterval(() => {
      if (after <= 0) return window.clearInterval(timer);
      if (after !== Infinity) after -= 1;
      void tick();
    }, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [contactId, active]);
  const lines = toLines(data);
  const on = Boolean(contactId) && active;
  return { lines, status: on ? (lines.length ? "on" : "starting") : lines.length ? "on" : "off", note };
}

function secondsSince(iso: string | null, now: number) {
  return iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000)) : null;
}

/** Every call on now, EasyLink AI's and the reps', with its live transcript one click away. */
export function ConnectLiveBoard() {
  const [calls, setCalls] = useState<ConnectLiveCall[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let stop = false;
    const load = () =>
      cc("admin")
        .connectLive()
        .then((c) => {
          if (stop) return;
          setCalls(c);
          setError(null);
        })
        .catch((e) => !stop && setError(e instanceof Error ? e.message : "Couldn't load live calls"));
    void load();
    const t = window.setInterval(load, 5000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stop = true;
      window.clearInterval(t);
      window.clearInterval(clock);
    };
  }, []);
  const opened = calls?.find((c) => c.contactId === open) ?? null;
  const live = useConnectLiveTranscript(open, Boolean(opened));
  return (
    <section aria-label="Live calls" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">Live calls</h2>
        <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#166534]">{calls ? `${calls.length} on now` : "Loading"}</span>
      </div>
      {error && <p className="m-0 text-[13px] text-[#991B1B]">{error}</p>}
      {calls && calls.length === 0 ? (
        <p className="m-0 text-[13px] text-[#5B6B80]">No calls on right now. EasyLink AI and rep calls appear here as they happen; open one to read it live.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {(calls ?? []).map((c) => (
            <li key={c.contactId}>
              <button
                type="button"
                onClick={() => setOpen((cur) => (cur === c.contactId ? null : c.contactId))}
                aria-expanded={open === c.contactId}
                className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border px-3 py-2 text-left text-[13px] ${open === c.contactId ? "border-[#1565C0] bg-[#EFF6FF]" : "border-[#E3E8EF] hover:bg-[#F8FAFC]"}`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" aria-hidden="true" />
                <span className="font-semibold text-[#0F172A]">{c.customerName ?? phoneFmt(c.customerNumber) ?? "Caller"}</span>
                <span className="text-[#5B6B80]">{c.direction === "outbound" ? "Outbound" : "Inbound"} · {c.withAi ? "EasyLink AI" : c.handledBy}</span>
                <span className="ml-auto tabular-nums text-[#334155]">{dur(secondsSince(c.startedAt, now))}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <LiveTranscriptPanel lines={live.lines} status={opened ? live.status : "off"} note={live.note ?? (opened ? null : "This call has ended.")} callerName={opened?.customerName ?? null} />
      )}
    </section>
  );
}

/** Operations: turn EasyLink AI's outbound calling on or off, pick the lists, and see today's calls. */
export function AiDiallerCard() {
  const [d, setD] = useState<AiOutbound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    () =>
      cc("admin")
        .aiOutbound()
        .then((x) => {
          setD(x);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the AI dialler")),
    [],
  );
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [load]);
  const save = async (patch: Partial<AiOutbound["settings"]>) => {
    if (!d) return;
    setSaving(true);
    try {
      const settings = await cc("admin").saveAiOutbound(patch);
      setD({ ...d, settings });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };
  const s = d?.settings;
  const toggleList = (id: string) => s && void save({ listIds: s.listIds.includes(id) ? s.listIds.filter((x) => x !== id) : [...s.listIds, id] });
  return (
    <section aria-label="EasyLink AI calling" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 flex-grow text-[16px] font-bold text-[#0F172A]">EasyLink AI calling</h2>
        {s && (
          <button
            type="button"
            role="switch"
            aria-checked={s.enabled}
            disabled={saving || (!s.enabled && (!d?.configured || s.listIds.length === 0))}
            onClick={() => void save({ enabled: !s.enabled })}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold disabled:opacity-50 ${s.enabled ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#475569]"}`}
          >
            {s.enabled ? "On: AI is calling" : "Off"}
          </button>
        )}
      </div>
      {error && <p className="m-0 text-[13px] text-[#991B1B]">{error}</p>}
      {!d ? (
        <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p>
      ) : (
        <>
          <p className="m-0 text-[12.5px] leading-[18px] text-[#475569]">
            EasyLink AI rings the lists you tick, makes and emails proposals, and closes sales. Every number gets the same checks as the Agent Dialer: Do Not Call Register, consent, a wash in the last 30 days, and calling hours in the customer&rsquo;s state.
          </p>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-[#334155]">Lists to call</span>
            {d.lists.length === 0 ? (
              <span className="text-[13px] text-[#5B6B80]">No contact lists yet. Import the washed list in Contact lists first.</span>
            ) : (
              d.lists.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-[13px] text-[#0F172A]">
                  <input type="checkbox" checked={s!.listIds.includes(l.id)} disabled={saving} onChange={() => toggleList(l.id)} />
                  {l.name} <span className="text-[#5B6B80]">({l.contacts.toLocaleString("en-AU")})</span>
                </label>
              ))
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-[#334155]">AI agents</span>
            {d.agents.map((a, i) => (
              <div key={a.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border border-[#E3E8EF] px-3 py-2 text-[13px]">
                <label className="flex items-center gap-2 font-semibold text-[#0F172A]">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    disabled={saving}
                    onChange={() => void save({ agents: s!.agents.map((x, j) => (j === i ? { ...x, enabled: !x.enabled } : x)) })}
                  />
                  Jay · {a.states.join(", ")}
                </label>
                <label className="flex items-center gap-1.5 text-[#475569]">
                  conversations per day
                  <select
                    value={a.dailyLimit}
                    disabled={saving}
                    onChange={(e) => void save({ agents: s!.agents.map((x, j) => (j === i ? { ...x, dailyLimit: Number(e.target.value) } : x)) })}
                    className="rounded-[8px] border border-[#CBD5E1] px-1.5 py-0.5"
                  >
                    {[25, 50, 100, 150, 200, 300].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <span className="ml-auto tabular-nums text-[#334155]">
                  {a.today} of {a.dailyLimit} conversations today · {a.dials} dialled · {a.answered} answered{a.active ? ` · ${a.active} on now` : ""}
                </span>
              </div>
            ))}
            <span className="text-[12px] text-[#5B6B80]">Each agent calls only contacts in its state (by state, else postcode).</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Dialled today", d.today.calls],
              ["Conversations", d.today.conversations],
              ["Answered", d.today.answered],
              ["On now", d.today.active],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-[10px] bg-[#F8FAFC] p-2.5">
                <div className="text-[11.5px] font-semibold text-[#5B6B80]">{l}</div>
                <div className="font-source-sans text-[22px] font-bold tabular-nums text-[#0F172A]">{v}</div>
              </div>
            ))}
          </div>
          {!d.configured && <p className="m-0 text-[12.5px] text-[#92400E]">The AI calling flow isn&rsquo;t set up on this server.</p>}
        </>
      )}
    </section>
  );
}
