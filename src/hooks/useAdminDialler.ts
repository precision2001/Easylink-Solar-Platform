"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { resolveLiveKitServerUrl } from "@/lib/livekit/livekit-url";
import { extractMessage, unwrapApiData } from "@/lib/customers/backend";

export type DiallerState = "idle" | "dialling" | "connected" | "ended";

type DialResponse = {
  callId: string;
  roomName: string;
  toNumber: string;
  token: string;
  url?: string | null;
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
  const [muted, setMuted] = useState(false);
  /** Seconds since the far end picked up — null until then. */
  const [durationSec, setDurationSec] = useState<number | null>(null);

  const roomRef = useRef<Room | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const hangingUpRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const teardown = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    roomNameRef.current = null;
    audioElRef.current?.remove();
    audioElRef.current = null;
    setMuted(false);
    setDurationSec(null);
    setActiveNumber(null);
    hangingUpRef.current = false;
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
   * Flip to the connected state. Idempotent, because several signals can tell
   * us the phone answered (the SIP participant joining, its audio arriving, or
   * it already being in the room when we connect) and whichever lands first
   * wins — the later ones must not restart the timer.
   */
  const markConnected = useCallback(() => {
    setState((prev) => (prev === "dialling" ? "connected" : prev));
    setDurationSec((prev) => (prev === null ? 0 : prev));
  }, []);

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
        if (room.remoteParticipants.size > 0) markConnected();

        await room.localParticipant.setMicrophoneEnabled(true);
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
    muted,
    durationSec,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive: state === "dialling" || state === "connected",
  };
}
