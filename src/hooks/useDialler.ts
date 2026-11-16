"use client";

import { useAdminDialler } from "@/hooks/useAdminDialler";
import { useConnectDialler } from "@/hooks/useConnectDialler";

/**
 * Which phone line the Agent Dialer uses. Set NEXT_PUBLIC_DIALLER_PROVIDER to
 * "connect" for the Amazon Connect softphone; anything else keeps LiveKit.
 * Fixed at build time, so the same hook runs on every render.
 */
export const DIALLER_PROVIDER: "connect" | "livekit" =
  process.env.NEXT_PUBLIC_DIALLER_PROVIDER === "connect" ? "connect" : "livekit";

function useLiveKitDialler() {
  return { ...useAdminDialler(), softphone: null };
}

export const useDialler: () => ReturnType<typeof useConnectDialler> | ReturnType<typeof useLiveKitDialler> =
  DIALLER_PROVIDER === "connect" ? useConnectDialler : useLiveKitDialler;
