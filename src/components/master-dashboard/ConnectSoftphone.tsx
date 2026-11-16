"use client";

import { Btn } from "@/components/jobs/ui";
import { phoneFmt } from "@/components/contact-centre/api";
import type { useConnectDialler } from "@/hooks/useConnectDialler";

type Softphone = ReturnType<typeof useConnectDialler>["softphone"];

/**
 * The Amazon Connect phone's state, in the Agent Dialer header: signed in or
 * not, and whether Connect may ring this agent (hand-overs from EasyLink AI and
 * queued callers only reach agents marked Available).
 */
export function ConnectPhoneStatus({ softphone, onCall }: { softphone: Softphone; onCall: boolean }) {
  if (softphone.status === "loading") {
    return <span className="text-[12.5px] text-[#64748B]">Phone starting…</span>;
  }
  if (softphone.status === "signin") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[12.5px] font-semibold text-[#92400E]">Phone signed out</span>
        <Btn onClick={softphone.signIn}>Sign in to the phone</Btn>
      </div>
    );
  }
  if (softphone.status === "error") {
    return <span className="max-w-[360px] text-[12.5px] text-[#991B1B]">{softphone.note ?? "The phone is not working."}</span>;
  }
  const on = softphone.available;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] font-semibold text-[#334155]">Calls from EasyLink AI:</span>
      <div role="radiogroup" aria-label="Phone status" className="flex rounded-full bg-[#F1F5F9] p-0.5">
        {[
          { key: true, label: onCall ? "On a call" : "Available", dot: onCall ? "#F59E0B" : "#16A34A" },
          { key: false, label: "Offline", dot: "#94A3B8" },
        ].map((o) => (
          <button
            key={String(o.key)}
            type="button"
            role="radio"
            aria-checked={on === o.key}
            disabled={onCall}
            onClick={() => softphone.setAvailable(o.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${on === o.key ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B]"}`}
          >
            <span className="size-2 rounded-full" style={{ background: o.dot }} aria-hidden="true" />
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-[12px] text-[#64748B]">
        {on ? "Hand-overs and queued callers ring here." : "EasyLink AI books callbacks instead of ringing you."}
      </span>
    </div>
  );
}

/** A call ringing in the Connect phone: an EasyLink AI hand-over or a queued caller. */
export function ConnectIncomingCall({ softphone }: { softphone: Softphone }) {
  const call = softphone.incoming;
  if (!call) return null;
  const fromAi = Boolean(call.summary || call.reason);
  return (
    <section
      aria-live="assertive"
      className="flex flex-col gap-3 rounded-[14px] border-2 border-[#16A34A] bg-[#F0FDF4] p-4 shadow-[0_0_0_4px_rgba(22,163,74,0.12)]"
    >
      <div className="flex flex-col">
        <span className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#15803D]">
          {fromAi ? "EasyLink AI is handing you a call" : "Incoming call"}
        </span>
        <span className="text-[18px] font-bold text-[#0F172A]">{phoneFmt(call.callerNumber) || "Caller"}</span>
      </div>
      {call.reason && <span className="text-[13px] font-semibold text-[#166534]">Why: {call.reason}</span>}
      {call.summary && <p className="m-0 text-[14px] leading-[21px] text-[#14532D]">{call.summary}</p>}
      {call.sentiment && <span className="text-[12.5px] text-[#166534]">Caller mood: {call.sentiment}</span>}
      <div className="flex flex-wrap justify-end gap-2">
        <Btn kind="secondary" onClick={softphone.decline}>
          Can&apos;t take it
        </Btn>
        <Btn onClick={softphone.accept}>Take the call</Btn>
      </div>
    </section>
  );
}
