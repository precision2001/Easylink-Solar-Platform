"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DiallerState, RecordingState } from "@/hooks/useAdminDialler";

/**
 * Agent Dialer over Amazon Connect. The rep stays in the Operations Portal;
 * Connect's softphone (the CCP) runs embedded in the page and carries the
 * audio. The backend still decides whether a number may be called and keeps
 * the `Call` row; Connect places the call, plays the recording notice
 * (the queue's outbound whisper flow), records it and transcribes it.
 *
 * Same return shape as `useAdminDialler`, so the dialler UI does not care
 * which carrier is underneath. `room` is always null (no LiveKit room) and
 * `join` is unused: calls EasyLink AI hands over ring in the embedded phone.
 */

const CCP_URL = process.env.NEXT_PUBLIC_CONNECT_CCP_URL || "https://easylink.my.connect.aws/ccp-v2/";
const REGION = process.env.NEXT_PUBLIC_CONNECT_REGION || "ap-southeast-2";

type PhoneStatus = "off" | "loading" | "signed-out" | "ready" | "error";

type PrepareResponse = { callRecordId: string | null; roomName: string; toNumber: string; queueArn: string };

/* Minimal typings for the parts of Streams used here. */
type StreamsConnection = { destroy: (cb?: object) => void; sendDigits: (d: string, cb?: object) => void };
type StreamsContact = {
  getContactId: () => string;
  isInbound: () => boolean;
  getInitialConnection: () => StreamsConnection | null;
  getAgentConnection: () => StreamsConnection | null;
  onConnecting: (cb: () => void) => void;
  onConnected: (cb: () => void) => void;
  onEnded: (cb: () => void) => void;
  onDestroy: (cb: () => void) => void;
};
type StreamsAgent = {
  connect: (endpoint: unknown, opts: { queueARN?: string; success?: () => void; failure?: (err: string) => void }) => void;
  mute: () => void;
  unmute: () => void;
  getState: () => { type: string; name: string };
  getAgentStates: () => { type: string; name: string; agentStateARN: string }[];
  setState: (state: unknown, cb?: object, opts?: object) => void;
  onRefresh: (cb: (a: StreamsAgent) => void) => void;
};
type StreamsGlobal = {
  core: {
    initCCP: (el: HTMLElement, opts: object) => void;
    terminate: () => void;
    getEventBus?: () => unknown;
    onAuthFail: (cb: () => void) => void;
    onAccessDenied?: (cb: () => void) => void;
    loginWindow?: Window | null;
  };
  agent: (cb: (a: StreamsAgent) => void) => void;
  contact: (cb: (c: StreamsContact) => void) => void;
  Endpoint: { byPhoneNumber: (n: string) => unknown };
  AgentStateType: { ROUTABLE: string; OFFLINE: string };
};

function msg(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload && typeof (payload as { message: unknown }).message === "string") {
    return (payload as { message: string }).message;
  }
  return fallback;
}

/** Shared between page visits: Streams can only be initialised once per page load. */
let ccpStarted = false;

export function useConnectDialler(enabled: boolean) {
  const [state, setState] = useState<DiallerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [recording, setRecording] = useState<RecordingState>("pending");
  const [phone, setPhone] = useState<PhoneStatus>(enabled ? "loading" : "off");
  const [incoming, setIncoming] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const connectRef = useRef<StreamsGlobal | null>(null);
  const agentRef = useRef<StreamsAgent | null>(null);
  const contactRef = useRef<StreamsContact | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const answeredRef = useRef(false);

  const post = (path: string, body: object) =>
    fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);

  const reset = useCallback(() => {
    contactRef.current = null;
    roomNameRef.current = null;
    answeredRef.current = false;
    setMuted(false);
    setDurationSec(null);
    setRecording("pending");
    setActiveNumber(null);
    setIncoming(false);
  }, []);

  /** Start the embedded phone once the container is on the page. */
  const mountPhone = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (!enabled || !el || ccpStarted) return;
      ccpStarted = true;
      // Streams ships global typings (not a module); it attaches `window.connect`.
      // @ts-expect-error -- side-effect import of a non-module package
      void import("amazon-connect-streams").then(() => {
        const cx = (window as unknown as { connect: StreamsGlobal }).connect;
        connectRef.current = cx;
        cx.core.initCCP(el, {
          ccpUrl: CCP_URL,
          region: REGION,
          loginPopup: true,
          loginPopupAutoClose: true,
          loginOptions: { autoClose: true, height: 640, width: 420, top: 80, left: 80 },
          softphone: { allowFramedSoftphone: true, disableRingtone: false },
          pageOptions: { enableAudioDeviceSettings: true, enablePhoneTypeSettings: false },
          ccpAckTimeout: 5000,
          ccpSynTimeout: 3000,
          ccpLoadTimeout: 10000,
        });
        cx.core.onAuthFail(() => setPhone("signed-out"));
        cx.core.onAccessDenied?.(() => {
          setPhone("error");
          setError("This browser is signed in to Connect without phone access. Sign in with the sales login.");
        });
        cx.agent((agent) => {
          agentRef.current = agent;
          setPhone("ready");
          setError(null);
          // A rep who is Offline can't place or take calls; go Available.
          const st = agent.getState();
          if (st.type === cx.AgentStateType.OFFLINE) {
            const avail = agent.getAgentStates().find((s) => s.type === cx.AgentStateType.ROUTABLE);
            if (avail) agent.setState(avail, {}, { enqueueNextState: false });
          }
        });
        cx.contact((contact) => {
          contactRef.current = contact;
          const inbound = contact.isInbound();
          if (inbound) {
            // EasyLink AI handed this caller over: it rings in the embedded phone.
            setIncoming(true);
            setState("dialling");
            setActiveNumber("Caller from EasyLink AI");
          }
          const contactId = contact.getContactId();
          const room = roomNameRef.current;
          if (room) void post("/api/admin/calls/dial/connect-contact", { roomName: room, contactId });
          contact.onConnected(() => {
            if (answeredRef.current) return;
            answeredRef.current = true;
            setState("connected");
            setDurationSec(0);
            // The outbound whisper flow plays the recording notice before the rep is connected.
            setRecording("on");
            const r = roomNameRef.current;
            if (r) void post("/api/admin/calls/dial/connected", { roomName: r });
          });
          contact.onEnded(() => {
            const r = roomNameRef.current;
            if (r) void post("/api/admin/calls/dial/end", { roomName: r });
            reset();
            setState("ended");
          });
        });
      }).catch(() => {
        ccpStarted = false;
        setPhone("error");
        setError("The phone could not load. Refresh the page.");
      });
    },
    [enabled, reset],
  );

  const signIn = useCallback(() => {
    // Streams opens the Connect sign-in popup itself when the session is missing;
    // re-opening the CCP URL in a popup covers a blocked first popup.
    window.open(CCP_URL, "easylink-connect-login", "width=420,height=640,top=80,left=80");
  }, []);

  const dial = useCallback(
    async (rawNumber: string, opts?: { campaignId?: string }) => {
      if (state !== "idle") return;
      const agent = agentRef.current;
      const cx = connectRef.current;
      if (!agent || !cx) {
        setError(phone === "signed-out" ? "Sign in to the phone first." : "The phone is still starting. Try again in a moment.");
        return;
      }
      setError(null);
      setState("dialling");
      try {
        // The backend checks the number and opens the Call row (wrap-up saves against it).
        const res = await fetch("/api/admin/calls/dial/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toNumber: rawNumber, ...(opts?.campaignId ? { campaignId: opts.campaignId } : {}) }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(msg(payload, "Could not place the call."));
        const data = ((payload as { data?: PrepareResponse })?.data ?? payload) as PrepareResponse;
        roomNameRef.current = data.roomName;
        setActiveNumber(data.toNumber);
        setCallRecordId(data.callRecordId ?? null);
        await new Promise<void>((resolve, reject) =>
          agent.connect(cx.Endpoint.byPhoneNumber(data.toNumber), {
            queueARN: data.queueArn,
            success: () => resolve(),
            failure: (err) => reject(new Error(typeof err === "string" && err ? `Connect could not place the call (${err}).` : "Connect could not place the call.")),
          }),
        );
      } catch (err) {
        const r = roomNameRef.current;
        if (r) void post("/api/admin/calls/dial/end", { roomName: r });
        setError(err instanceof Error ? err.message : "Could not place the call.");
        reset();
        setState("idle");
      }
    },
    [state, phone, reset],
  );

  const hangUp = useCallback(() => {
    const c = contactRef.current;
    if (c) {
      (c.getAgentConnection() ?? c.getInitialConnection())?.destroy({});
    } else {
      reset();
      setState("idle");
    }
  }, [reset]);

  const toggleMute = useCallback(() => {
    const a = agentRef.current;
    if (!a) return;
    if (muted) a.unmute();
    else a.mute();
    setMuted(!muted);
  }, [muted]);

  const sendDigit = useCallback((digit: string) => {
    if (!/^[0-9*#]$/.test(digit)) return;
    contactRef.current?.getInitialConnection()?.sendDigits(digit, {});
  }, []);

  useEffect(() => {
    if (state !== "connected") return;
    const t = window.setInterval(() => setDurationSec((p) => (p ?? 0) + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (state !== "ended") return;
    const t = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [state]);

  return {
    state,
    error,
    activeNumber,
    callRecordId,
    muted,
    durationSec,
    recording,
    room: null,
    transferId: null as string | null,
    join: async () => undefined,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive: state === "dialling" || state === "connected",
    /* Connect-only */
    phone,
    incoming,
    mountPhone,
    signIn,
  };
}
