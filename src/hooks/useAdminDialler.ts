"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
} from "livekit-client";
import { resolveLiveKitServerUrl } from "@/lib/livekit/livekit-url";
import { extractMessage, unwrapApiData } from "@/lib/customers/backend";

export type DiallerState = "idle" | "dialling" | "connected" | "ended";

/**
 * Recording state for the current call.
 * - `pending`  — the announcement has not finished yet.
 * - `on`       — announced and recording.
 * - `off`      — recording is not configured for this deployment.
 * - `failed`   — the announcement broke, so nothing is being recorded.
 */
export type RecordingState = "pending" | "on" | "off" | "failed";

type DialResponse = {
  callId: string;
  /** `Call` row id; null when the carrier call went through but logging didn't. */
  callRecordId: string | null;
  roomName: string;
  toNumber: string;
  token: string;
  url?: string | null;
  /** Notice to play before recording starts; null when nothing is recorded. */
  recordingAnnouncementUrl?: string | null;
};

/**
 * Outbound PSTN dialler for the admin portal. The far end is a phone, not
 * an app user, so there's no invite/answer signalling like
 * `useLiveKitCall` — the backend places the carrier call and we just join
 * the room it was bridged into, mic only.
 */
export function useAdminDialler() {
  const [state, setState] = useState<DiallerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  /** Seconds since the far end picked up — null until then. */
  const [durationSec, setDurationSec] = useState<number | null>(null);
  /**
   * Whether this call is being recorded. "failed" is the one that matters:
   * the announcement broke, so there is no consent and no recording, and the
   * agent needs to know that rather than assume the usual.
   */
  const [recording, setRecording] = useState<RecordingState>("pending");

  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const hangingUpRef = useRef(false);
  /** Guards the one-time "answered" transition — several signals can report it. */
  const answeredRef = useRef(false);
  /** Recording announcement for the current call; null when recording is off. */
  const announcementUrlRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const teardown = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    roomNameRef.current = null;
    audioElRef.current?.remove();
    audioElRef.current = null;
    setMuted(false);
    setDurationSec(null);
    setRecording("pending");
    setActiveNumber(null);
    hangingUpRef.current = false;
    answeredRef.current = false;
    // `callRecordId` deliberately survives teardown: the agent writes the call
    // up *after* hanging up, and the wrap-up still needs the row to save to.
    // It is replaced on the next dial.
  }, []);

  /** Tell the server to drop the carrier leg — a browser disconnect alone leaves it billing. */
  const releaseCarrierLeg = useCallback(async (roomName: string) => {
    try {
      await fetch("/api/admin/calls/dial/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
    } catch {
      // Best effort — the room also expires on its own once empty.
    }
  }, []);

  /**
   * Plays the "this call may be recorded" announcement to the callee, tells the
   * server it has played (which is what starts the recording), and only then
   * opens the agent's microphone.
   *
   * The announcement is published as the agent's audio track while their mic is
   * still muted, so the customer hears the notice before anyone speaks. If no
   * announcement is configured the deployment records nothing, and the mic
   * simply opens straight away.
   */
  const announceThenOpenMic = useCallback(async (roomName: string) => {
    const room = roomRef.current;
    if (!room) return;

    const url = announcementUrlRef.current;
    if (!url) {
      // Recording is switched off for this deployment, which is a choice, not
      // a fault — so the call simply proceeds unrecorded.
      setRecording("off");
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
      return;
    }

    let ctx: AudioContext | null = null;
    let published: LocalAudioTrack | null = null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`announcement fetch failed: ${res.status}`);
      const bytes = await res.arrayBuffer();

      ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(bytes);
      const destination = ctx.createMediaStreamDestination();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);

      const mediaTrack = destination.stream.getAudioTracks()[0];
      if (!mediaTrack) throw new Error("announcement produced no audio track");

      published = new LocalAudioTrack(mediaTrack);
      await room.localParticipant.publishTrack(published);

      // A context created outside a user gesture can start suspended, and a
      // suspended context plays silence while the timer below runs happily to
      // completion — which would report consent for an announcement nobody
      // heard. Resuming first is what makes the report truthful.
      if (ctx.state === "suspended") await ctx.resume();
      if (ctx.state !== "running") {
        throw new Error(`audio context did not start (state: ${ctx.state})`);
      }

      source.start();

      // Wait out the clip, plus a moment so the tail is not clipped by the
      // unpublish.
      await new Promise((resolve) =>
        setTimeout(resolve, buffer.duration * 1000 + 250),
      );

      const res2 = await fetch("/api/admin/calls/dial/consent-announced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName }),
      });
      // Recording only starts if this lands. An unchecked response here was
      // how a played announcement could still leave a call unrecorded.
      if (!res2.ok) {
        throw new Error(`consent report failed: ${res2.status}`);
      }

      setRecording("on");
    } catch (err) {
      // No announcement means no consent, so nothing is recorded — but the
      // call itself continues. Tell the server why, so this shows up in the
      // call record instead of only in this browser's console, and tell the
      // agent, who would otherwise assume they are being recorded.
      console.error("Recording announcement failed; call will not be recorded", err);
      setRecording("failed");
      void fetch("/api/admin/calls/dial/consent-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          reason: err instanceof Error ? err.message : String(err),
        }),
      }).catch(() => undefined);
    } finally {
      if (published) {
        await room.localParticipant.unpublishTrack(published).catch(() => undefined);
        published.stop();
      }
      await ctx?.close().catch(() => undefined);
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => undefined);
    }
  }, []);

  /**
   * Flip to the connected state. Idempotent, because several signals can tell
   * us the phone answered (the SIP participant joining, its audio arriving, or
   * it already being in the room when we connect) and whichever lands first
   * wins — the later ones must not restart the timer.
   */
  const markConnected = useCallback(() => {
    // Ref, not the state updater, so the "first answer" decision stays out of
    // render and can't fire twice under StrictMode.
    const firstAnswer = !answeredRef.current;
    answeredRef.current = true;

    setState((prev) => (prev === "dialling" ? "connected" : prev));
    setDurationSec((prev) => (prev === null ? 0 : prev));

    // Stamp connectedAt server-side so talk time is measured from the real
    // answer, not from whenever the agent gets round to saving the wrap-up.
    const roomName = roomNameRef.current;
    if (!firstAnswer || !roomName) return;

    void fetch("/api/admin/calls/dial/connected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName }),
    }).catch(() => {
      // Best effort: a missed stamp costs us a duration, not the call.
    });

    void announceThenOpenMic(roomName);
  }, [announceThenOpenMic]);

  const hangUp = useCallback(() => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;

    const roomName = roomNameRef.current;
    if (roomName) void releaseCarrierLeg(roomName);

    teardown();
    setState("idle");
  }, [releaseCarrierLeg, teardown]);

  const dial = useCallback(
    async (rawNumber: string) => {
      if (state !== "idle") return;

      setError(null);
      setState("dialling");

      try {
        const res = await fetch("/api/admin/calls/dial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toNumber: rawNumber }),
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(extractMessage(payload, "Could not place the call."));
        }

        const data = unwrapApiData<DialResponse>(payload);
        const url = resolveLiveKitServerUrl(data?.url);

        if (!data?.token || !data?.roomName) {
          throw new Error("Unexpected response from the calling service.");
        }
        if (!url) {
          throw new Error(
            "Calling server URL is not configured. Set NEXT_PUBLIC_LIVEKIT_URL.",
          );
        }

        const room = new Room();
        roomRef.current = room;
        roomNameRef.current = data.roomName;
        setActiveNumber(data.toNumber);
        setCallRecordId(data.callRecordId ?? null);
        announcementUrlRef.current = data.recordingAnnouncementUrl ?? null;

        // The phone joining as a SIP participant is what "answered" means here.
        room.on(RoomEvent.ParticipantConnected, markConnected);

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          // Audio from the far end means it answered, even if we never saw
          // the ParticipantConnected event for it.
          markConnected();
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
          audioElRef.current = el as HTMLAudioElement;
        });

        room.on(RoomEvent.ParticipantDisconnected, () => {
          // Far end hung up.
          if (hangingUpRef.current) return;
          teardown();
          setState("ended");
        });

        room.on(RoomEvent.Disconnected, () => {
          if (hangingUpRef.current) return;
          teardown();
          setState("ended");
        });

        await room.connect(url, data.token);

        // ParticipantConnected only fires for participants that join *after*
        // we do. When the phone answers quickly the SIP participant is already
        // in the room by the time connect() resolves, so without this check the
        // call would sit on "Dialling…" for its whole duration.
        // The mic is opened by `announceThenOpenMic` once the recording notice
        // has played — opening it here would let the agent talk over the
        // announcement, or start a recorded conversation before consent.
        if (room.remoteParticipants.size > 0) markConnected();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not place the call.";
        setError(message);
        teardown();
        setState("idle");
      }
    },
    [state, teardown, markConnected],
  );

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    void room.localParticipant
      .setMicrophoneEnabled(!next)
      .then(() => setMuted(next))
      .catch(() => setError("Could not change the microphone."));
  }, [muted]);

  /** Send DTMF, so IVRs ("press 1 for sales") are navigable. Codes per RFC 4733: 0-9, `*`=10, `#`=11. */
  const sendDigit = useCallback((digit: string) => {
    const room = roomRef.current;
    if (!room || !/^[0-9*#]$/.test(digit)) return;
    const code = digit === "*" ? 10 : digit === "#" ? 11 : Number(digit);
    void room.localParticipant.publishDtmf(code, digit).catch(() => {
      // Not fatal — the call stays up even if the tone does not land.
    });
  }, []);

  useEffect(() => {
    if (state !== "connected") return;
    const timer = window.setInterval(() => {
      setDurationSec((prev) => (prev ?? 0) + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  // "Ended" is a transient state so the UI can show why the call stopped.
  useEffect(() => {
    if (state !== "ended") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    return () => {
      const roomName = roomNameRef.current;
      if (roomName) void releaseCarrierLeg(roomName);
      roomRef.current?.disconnect();
      audioElRef.current?.remove();
    };
  }, [releaseCarrierLeg]);

  return {
    state,
    error,
    activeNumber,
    /** `Call` row this session is writing to — the wrap-up saves against it. */
    callRecordId,
    muted,
    durationSec,
    /** Whether this call is being recorded — `failed` means it is not. */
    recording,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive: state === "dialling" || state === "connected",
  };
}
