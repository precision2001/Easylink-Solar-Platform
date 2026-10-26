"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn, Field, inputCls, Pill } from "@/components/jobs/ui";
import { cc, day, OUTCOMES, outcomeLabel, when, type CallDetail, type CustomerRecord, type Outcome } from "./api";
import { FollowUpForm } from "./FollowUpForm";

const KIND_LABEL = { CALLBACK: "Call back", SITE_VISIT: "Site visit", TASK: "Task" } as const;

/**
 * The dialler's screen pop: as soon as a number matches a customer, what an
 * agent needs before saying hello. Pinned notes, job stage, last call and
 * what's still to do, with a link to the whole record.
 */
export function ScreenPop({ leadId, refreshKey }: { leadId: string; refreshKey: number }) {
  const [pop, setPop] = useState<Omit<CustomerRecord, "timeline"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cc("admin")
      .pop(leadId)
      .then((p) => !cancelled && (setPop(p), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load the customer"));
    return () => {
      cancelled = true;
    };
  }, [leadId, refreshKey]);

  if (error) return <p className="m-0 text-[12.5px] text-[#991B1B]">{error}</p>;
  if (!pop) return <p className="m-0 text-[12.5px] text-[#5B6B80]">Loading their record…</p>;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="info">{pop.lead.status.replace(/_/g, " ").toLowerCase()}</Pill>
        <Pill>{pop.lead.projectPhase.replace(/_/g, " ").toLowerCase()}</Pill>
        {pop.lead.installer && <Pill tone="good">{pop.lead.installer.name}</Pill>}
      </div>
      {pop.pinned.map((p) => (
        <p key={p.id} className="m-0 rounded-[8px] bg-[#FFFBEB] px-2.5 py-1.5 text-[12.5px] leading-[18px] text-[#78350F]">
          <b>Pinned:</b> {p.body}
        </p>
      ))}
      {pop.lastCall ? (
        <div className="flex flex-col gap-0.5 text-[12.5px]">
          <span className="font-semibold text-[#0F172A]">
            Last call {when(pop.lastCall.at)} · {pop.lastCall.by ?? "Staff"}
            {pop.lastCall.outcome ? ` · ${outcomeLabel(pop.lastCall.outcome)}` : ""}
          </span>
          {pop.lastCall.summary && <span className="text-[#475569]">{pop.lastCall.summary}</span>}
        </div>
      ) : (
        <span className="text-[12.5px] text-[#5B6B80]">First call with them.</span>
      )}
      {pop.openFollowUps.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-bold text-[#0F172A]">To do</span>
          {pop.openFollowUps.map((f) => (
            <span key={f.id} className="text-[12.5px] text-[#334155]">
              {KIND_LABEL[f.kind]}: {f.title} · {day(f.dueAt)}
            </span>
          ))}
        </div>
      )}
      <span className="text-[12px] text-[#5B6B80]">
        {pop.counts.calls} calls · {pop.counts.texts} texts · {pop.counts.emails} emails
      </span>
      <Link href={`/master/customers/${leadId}`} className="text-[13px] font-bold text-[#0B4A7A] no-underline hover:underline">
        Open customer record
      </Link>
    </div>
  );
}

/**
 * The wrap-up for the call just made: outcome (AI suggests one once the
 * transcript is in), notes, and a follow-up booked in the same place.
 */
export function WrapUp({ callId, onSaved, onNext }: { callId: string | null; onSaved: () => void; onNext?: () => void }) {
  const api = cc("admin");
  const [call, setCall] = useState<CallDetail | null>(null);
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [busy, setBusy] = useState(false);

  // Poll for a few minutes after the call: the transcript, summary and suggested outcome arrive later.
  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    let tries = 0;
    const load = () =>
      cc("admin")
        .call(callId)
        .then((c) => {
          if (cancelled) return;
          setCall(c);
          setOutcome((o) => o || c.outcome || c.suggestedOutcome || "");
          setNotes((n) => (n || touched ? n : (c.notes ?? c.aiSummary ?? "")));
        })
        .catch(() => undefined);
    void load();
    const t = setInterval(() => {
      tries += 1;
      if (tries > 18) clearInterval(t);
      else void load();
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [callId, touched]);

  if (!callId) {
    return <p className="m-0 text-[13px] text-[#5B6B80]">After a call, write it up here: outcome, notes and the next step.</p>;
  }

  const save = async (next: boolean) => {
    setBusy(true);
    setStatus(null);
    try {
      await api.disposition(callId, { outcome: outcome || undefined, notes });
      setStatus("Saved to the customer's record");
      onSaved();
      if (next) onNext?.();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {call?.aiSummary && (
        <div className="rounded-[10px] bg-[#EFF6FF] p-3 text-[13px] leading-[19px] text-[#1E3A5F]">
          <b className="text-[#1D4ED8]">AI summary.</b> {call.aiSummary}
        </div>
      )}
      {!call?.aiSummary && call && call.recordingStatus !== "NOT_RECORDED" && (
        <p className="m-0 text-[12.5px] text-[#5B6B80]">The transcript and AI summary appear here a minute or two after the call.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
        <Field label="Outcome">
          <select id="wu-outcome" className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
            <option value="">Choose…</option>
            {OUTCOMES.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
                {call?.suggestedOutcome === o.key ? " (AI suggests)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            id="wu-notes"
            className={`${inputCls} min-h-[72px]`}
            maxLength={5000}
            value={notes}
            onChange={(e) => {
              setTouched(true);
              setNotes(e.target.value);
            }}
          />
        </Field>
      </div>
      {booking ? (
        <FollowUpForm
          portal="admin"
          callId={callId}
          leadId={call?.leadId}
          idPrefix="wu-fu"
          suggest={outcome === "SITE_VISIT_BOOKED" ? "SITE_VISIT" : "CALLBACK"}
          onDone={() => {
            setBooking(false);
            setStatus("Follow-up booked");
            onSaved();
          }}
        />
      ) : (
        <div>
          <Btn small kind="ghost" onClick={() => setBooking(true)}>
            Book a callback, site visit or task
          </Btn>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {status && <span className="text-[12.5px] text-[#475569]">{status}</span>}
        <Btn kind="secondary" disabled={busy} onClick={() => void save(false)}>
          Save
        </Btn>
        {onNext && (
          <Btn disabled={busy || !outcome} onClick={() => void save(true)}>
            Save and call next
          </Btn>
        )}
      </div>
    </div>
  );
}
