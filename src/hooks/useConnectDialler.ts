"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "livekit-client";
import type { DiallerState, RecordingState } from "@/hooks/useAdminDialler";
import { extractMessage, unwrapApiData } from "@/lib/customers/backend";
import { toAuE164 } from "@/lib/connect/phone";

/**
 * The Agent Dialer on Amazon Connect.
 *
 * The browser is the phone: the Connect softphone (CCP) runs in a hidden
 * iframe and places and answers calls itself. Connect does the rest — the
 * outbound whisper flow plays the recording notice to the customer and turns
 * on recording, Contact Lens and redaction before the agent is joined, and
 * EasyLink AI hands calls over by putting them in a queue this agent answers.
 * The backend only keeps the `Call` row the wrap-up saves to.
 *
 * Returns the same shape as `useAdminDialler`, plus `softphone` for what only
 * Connect has: sign-in, availability, and a call ringing in.
 */

/** Instance softphone URL; the page's origin must be an approved origin on the instance. */
const CCP_URL =
  process.env.NEXT_PUBLIC_CONNECT_CCP_URL || "https://easylink-sso.my.connect.aws/ccp-v2/";
/** Portal route that signs the rep in to Connect (SAML federation); no Connect password. */
const LOGIN_URL = "/api/admin/connect/login";
/** Outbound queue ARN; blank uses the agent's routing profile default (Sales). */
const OUTBOUND_QUEUE_ARN = process.env.NEXT_PUBLIC_CONNECT_OUTBOUND_QUEUE_ARN || "";

export type SoftphoneStatus = "loading" | "signin" | "ready" | "error";

export type IncomingCall = {
  contactId: string;
  callerNumber: string;
  /** Set when EasyLink AI handed this call over. */
  summary: string | null;
  reason: string | null;
  sentiment: string | null;
};

type Listener = {
  agent: (a: connect.Agent) => void;
  contact: (c: connect.Contact) => void;
  status: (s: SoftphoneStatus, note?: string) => void;
};

// initCCP may only run once per window, and its subscriptions cannot be
// removed, so one softphone serves the page and forwards to whichever
// dialler is mounted.
let started: Promise<void> | null = null;
let current: Listener | null = null;
let lastStatus: { s: SoftphoneStatus; note?: string } = { s: "loading" };
let lastAgent: connect.Agent | null = null;

function emitStatus(s: SoftphoneStatus, note?: string) {
  lastStatus = { s, note };
  current?.status(s, note);
}

function startSoftphone(): Promise<void> {
  if (started) return started;
  started = (async () => {
    await import("amazon-connect-streams/release/connect-streams.js");
    const box = document.createElement("div");
    box.id = "easylink-ccp";
    // Hidden, not removed: the iframe carries the call audio.
    box.style.cssText = "position:fixed;width:320px;height:465px;left:-10000px;top:0;";
    document.body.appendChild(box);
    connect.core.initCCP(box, {
      ccpUrl: CCP_URL,
      region: "ap-southeast-2",
      loginPopup: true,
      loginPopupAutoClose: true,
      loginUrl: LOGIN_URL,
      loginOptions: { autoClose: true, height: 600, width: 420, top: 0, left: 0 },
      softphone: { allowFramedSoftphone: true, disableRingtone: false },
      pageOptions: { enableAudioDeviceSettings: true, enablePhoneTypeSettings: false },
      ccpLoadTimeout: 10000,
    });
    connect.core.onAuthFail(() => emitStatus("signin"));
    connect.core.onAccessDenied(() => emitStatus("error", "This login has no Amazon Connect agent access."));
    connect.core.onIframeRetriesExhausted(() =>
      emitStatus("error", "The phone could not load. Check this site is an approved origin in Amazon Connect."),
    );
    connect.agent((agent) => {
      lastAgent = agent;
      emitStatus("ready");
      current?.agent(agent);
    });
    connect.contact((c) => current?.contact(c));
  })().catch((err) => {
    started = null;
    emitStatus("error", err instanceof Error ? err.message : "The phone could not start.");
  });
  return started;
}

function post(path: string, body: unknown) {
  return fetch(`/api/admin/calls/connect/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function phoneOf(c: connect.Contact): string {
  try {
    return (c.getActiveInitialConnection() ?? c.getInitialConnection()).getEndpoint().phoneNumber;
  } catch {
    return "";
  }
}

function attr(c: connect.Contact, key: string): string | null {
  try {
    const v = c.getAttributes()[key]?.value?.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

export function useConnectDialler() {
  const [state, setState] = useState<DiallerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [recording, setRecording] = useState<RecordingState>("pending");
  /** Contact id of a call EasyLink AI handed over (the UI's "handed over" marker). */
  const [transferId, setTransferId] = useState<string | null>(null);
  const [handover, setHandover] = useState<IncomingCall | null>(null);

  const [status, setStatus] = useState<SoftphoneStatus>(lastStatus.s);
  const [statusNote, setStatusNote] = useState<string | null>(lastStatus.note ?? null);
  const [available, setAvailableState] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);

  const agentRef = useRef<connect.Agent | null>(null);
  const contactRef = useRef<connect.Contact | null>(null);
  /** The number and campaign of the call this agent just asked Connect to place. */
  const pendingDialRef = useRef<{ toNumber: string; campaignId?: string } | null>(null);
  const answeredRef = useRef(false);
  const hangingUpRef = useRef(false);

  const reset = useCallback(() => {
    contactRef.current = null;
    pendingDialRef.current = null;
    answeredRef.current = false;
    hangingUpRef.current = false;
    setMuted(false);
    setDurationSec(null);
    setRecording("pending");
    setActiveNumber(null);
    setTransferId(null);
    // `callRecordId` and `handover` survive: the wrap-up is written after hang-up.
  }, []);

  const readAgent = useCallback((agent: connect.Agent) => {
    agentRef.current = agent;
    setAvailableState(agent.getStatus().type === connect.AgentStateType.ROUTABLE);
  }, []);

  const onContact = useCallback(
    (c: connect.Contact) => {
      if (c.getType() !== connect.ContactType.VOICE && c.getType() !== connect.ContactType.QUEUE_CALLBACK) return;
      const contactId = c.getContactId();
      const inbound = c.isInbound();

      c.onConnecting(() => {
        if (inbound) {
          // Ringing: a hand-over from EasyLink AI, or a caller routed to a queue.
          setIncoming({
            contactId,
            callerNumber: phoneOf(c),
            summary: attr(c, "escalationSummary"),
            reason: attr(c, "escalationReason"),
            sentiment: attr(c, "sentiment"),
          });
          contactRef.current = c;
          return;
        }
        const pending = pendingDialRef.current;
        if (!pending) return;
        contactRef.current = c;
        void post("placed", { toNumber: pending.toNumber, contactId, ...(pending.campaignId ? { campaignId: pending.campaignId } : {}) })
          .then(async (res) => {
            const payload = await res.json().catch(() => null);
            if (res.ok) setCallRecordId(unwrapApiData<{ callRecordId: string | null }>(payload)?.callRecordId ?? null);
          })
          .catch(() => undefined);
      });

      c.onMissed(() => {
        setIncoming((cur) => (cur?.contactId === contactId ? null : cur));
      });

      c.onConnected(() => {
        if (answeredRef.current) return;
        answeredRef.current = true;
        contactRef.current = c;
        setIncoming(null);
        setState("connected");
        setDurationSec(0);
        // Connect's flows announced recording before anyone was joined.
        setRecording("on");
        if (inbound) {
          const handed: IncomingCall = {
            contactId,
            callerNumber: phoneOf(c),
            summary: attr(c, "escalationSummary"),
            reason: attr(c, "escalationReason"),
            sentiment: attr(c, "sentiment"),
          };
          setActiveNumber(handed.callerNumber);
          if (attr(c, "handledBy") === "EasyLink AI") {
            setTransferId(contactId);
            setHandover(handed);
          } else setHandover(null);
          void post("answered", {
            fromNumber: handed.callerNumber,
            contactId,
            ...(handed.summary ? { aiSummary: handed.summary } : {}),
          })
            .then(async (res) => {
              const payload = await res.json().catch(() => null);
              if (res.ok) setCallRecordId(unwrapApiData<{ callRecordId: string | null }>(payload)?.callRecordId ?? null);
            })
            .catch(() => undefined);
        } else {
          void post("connected", { contactId }).catch(() => undefined);
        }
      });

      const finish = () => {
        if (contactRef.current?.getContactId() !== contactId && contactRef.current !== null) return;
        void post("ended", { contactId }).catch(() => undefined);
        // The portal does its own wrap-up, so skip Connect's after-call work.
        try {
          c.clear({ success: () => undefined, failure: () => undefined });
        } catch {
          // Already cleared.
        }
        const byAgent = hangingUpRef.current;
        reset();
        setIncoming((cur) => (cur?.contactId === contactId ? null : cur));
        setState(byAgent ? "idle" : "ended");
      };
      c.onACW(finish);
      c.onEnded(() => {
        if (c.getStatus().type !== connect.ContactStateType.ENDED) finish();
      });
    },
    [reset],
  );

  useEffect(() => {
    current = {
      agent: (a) => {
        readAgent(a);
        a.onStateChange(() => readAgent(a));
        a.onMuteToggle(({ muted: m }) => setMuted(m));
      },
      contact: onContact,
      status: (s, note) => {
        setStatus(s);
        setStatusNote(note ?? null);
      },
    };
    if (lastAgent) current.agent(lastAgent);
    void startSoftphone();
    return () => {
      current = null;
    };
  }, [onContact, readAgent]);

  const dial = useCallback(
    async (rawNumber: string, opts?: { campaignId?: string }) => {
      if (state !== "idle") return;
      setError(null);
      const agent = agentRef.current;
      if (!agent) {
        setError(status === "signin" ? "Sign in to the phone first." : "The phone is still starting.");
        return;
      }
      const e164 = toAuE164(rawNumber);
      if (!e164) {
        setError("Enter a full Australian phone number.");
        return;
      }
      setState("dialling");
      setActiveNumber(e164);
      setCallRecordId(null);
      setHandover(null);
      pendingDialRef.current = { toNumber: e164, campaignId: opts?.campaignId };
      agent.connect(connect.Endpoint.byPhoneNumber(e164), {
        ...(OUTBOUND_QUEUE_ARN ? { queueARN: OUTBOUND_QUEUE_ARN } : {}),
        success: () => undefined,
        failure: (err: unknown) => {
          let message = "Could not place the call.";
          try {
            const parsed = typeof err === "string" ? JSON.parse(err) : err;
            const m = (parsed as { message?: string })?.message;
            if (m) message = m;
          } catch {
            // Keep the plain message.
          }
          setError(extractMessage({ message }, message));
          reset();
          setState("idle");
        },
      });
    },
    [state, status, reset],
  );

  const hangUp = useCallback(() => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;
    const c = contactRef.current;
    if (!c) {
      reset();
      setState("idle");
      return;
    }
    try {
      c.getAgentConnection().destroy({
        success: () => undefined,
        failure: () => {
          hangingUpRef.current = false;
          setError("Could not hang up. Try again.");
        },
      });
    } catch {
      reset();
      setState("idle");
    }
  }, [reset]);

  const accept = useCallback(() => {
    const c = contactRef.current;
    if (!c || !incoming) return;
    setError(null);
    setState("dialling");
    setActiveNumber(incoming.callerNumber);
    setCallRecordId(null);
    c.accept({
      success: () => undefined,
      failure: () => {
        setError("Could not take the call.");
        setState("idle");
      },
    });
  }, [incoming]);

  const decline = useCallback(() => {
    const c = contactRef.current;
    if (!c || !incoming) return;
    c.reject({ success: () => undefined, failure: () => undefined });
    setIncoming(null);
    contactRef.current = null;
  }, [incoming]);

  const setAvailable = useCallback((on: boolean) => {
    const agent = agentRef.current;
    if (!agent) return;
    const states = agent.getAgentStates();
    const target = on
      ? states.find((s) => s.type === connect.AgentStateType.ROUTABLE)
      : states.find((s) => s.type === connect.AgentStateType.OFFLINE);
    if (!target) return;
    agent.setState(target, {
      success: () => setAvailableState(on),
      failure: () => setError("Could not change your phone status."),
    }, { enqueueNextState: true });
  }, []);

  const signIn = useCallback(() => {
    // From a click, so the browser allows the window; Streams reconnects once signed in.
    window.open(LOGIN_URL, "easylink-connect-login", "width=420,height=600");
  }, []);

  const toggleMute = useCallback(() => {
    const agent = agentRef.current;
    if (!agent) return;
    if (muted) agent.unmute();
    else agent.mute();
  }, [muted]);

  const sendDigit = useCallback((digit: string) => {
    if (!/^[0-9*#]$/.test(digit)) return;
    const conn = contactRef.current?.getActiveInitialConnection();
    conn?.sendDigits(digit, { success: () => undefined, failure: () => undefined });
  }, []);

  /** Kept for the LiveKit hand-over panel's signature; Connect hand-overs ring in instead. */
  const join = useCallback(async (transfer: unknown) => void transfer, []);

  useEffect(() => {
    if (state !== "connected") return;
    const timer = window.setInterval(() => setDurationSec((prev) => (prev ?? 0) + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "ended") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  return {
    state,
    error,
    activeNumber,
    callRecordId,
    muted,
    durationSec,
    recording,
    /** No LiveKit room on Connect; the live transcript comes from Contact Lens instead. */
    room: null as Room | null,
    transferId,
    join,
    dial,
    hangUp,
    toggleMute,
    sendDigit,
    callActive: state === "dialling" || state === "connected",
    softphone: {
      status,
      note: statusNote,
      available,
      setAvailable,
      signIn,
      incoming,
      accept,
      decline,
      /** What EasyLink AI found out, for the call it handed over. */
      handover,
    },
  };
}
