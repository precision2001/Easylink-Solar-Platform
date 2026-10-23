"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playbackBlockedReason, type RecentCall } from "@/lib/calls/recent";

/**
 * Plays a call's stored recording.
 *
 * The audio lives in one element owned by the hook rather than in the markup,
 * because both the Agent Dialer and the Contact Centre play from the same
 * history list and only one recording should ever be audible at a time.
 *
 * Nothing is fetched until the agent presses play: the URL is signed and
 * short-lived, so minting one per click is the point — a URL baked into the
 * page at render time would be a durable public link to a customer
 * conversation.
 */
export function useRecordingPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Created on first use: `Audio` does not exist while rendering on the server. */
  const element = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "none";
      el.addEventListener("ended", () => setPlayingId(null));
      el.addEventListener("error", () =>
        setError("The recording could not be played."),
      );
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  // Leaving the page must stop the audio — a customer conversation should not
  // keep playing over whatever the agent navigated to.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = useCallback(
    async (call: RecentCall) => {
      const blocked = playbackBlockedReason(call);
      if (blocked) {
        setError(blocked);
        return;
      }

      const el = element();
      if (playingId === call.id) {
        el.pause();
        setPlayingId(null);
        return;
      }

      setLoadingId(call.id);
      setError(null);
      try {
        const res = await fetch(`/api/admin/calls/${call.id}/recording`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          setError(json?.message ?? "Could not load that recording.");
          return;
        }
        el.src = json.data.url as string;
        await el.play();
        setPlayingId(call.id);
      } catch {
        setError("Could not play that recording.");
      } finally {
        setLoadingId(null);
      }
    },
    [element, playingId],
  );

  return {
    playingId,
    loadingId,
    error,
    toggle,
    dismissError: useCallback(() => setError(null), []),
  };
}
