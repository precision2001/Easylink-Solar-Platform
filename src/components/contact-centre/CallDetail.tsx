"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn, Field, inputCls, Modal, Pill } from "@/components/jobs/ui";
import { cc, dur, OUTCOMES, outcomeLabel, phoneFmt, when, type CallDetail as Detail, type Outcome, type Portal } from "./api";
import { FollowUpForm } from "./FollowUpForm";

const KIND_LABEL = { CALLBACK: "Call back", SITE_VISIT: "Site visit", TASK: "Task" } as const;

/**
 * One call: who, when, recording, AI summary, transcript, outcome and notes,
 * follow-ups. Unmatched calls can be attached to a new customer record here.
 */
export function CallDetailModal({ portal, callId, onClose, onChanged }: { portal: Portal; callId: string; onClose: () => void; onChanged?: () => void }) {
  const api = cc(portal);
  const staff = portal === "admin";
  const [call, setCall] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [audio, setAudio] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [summarising, setSummarising] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", address: "" });
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cc(portal)
      .call(callId)
      .then((c) => {
        if (cancelled) return;
        setCall(c);
        setOutcome(c.outcome ?? c.suggestedOutcome ?? "");
        setNotes(c.notes ?? "");
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load the call"));
    return () => {
      cancelled = true;
    };
  }, [portal, callId, reload]);

  const changed = () => {
    setReload((n) => n + 1);
    onChanged?.();
  };

  const play = async () => {
    setAudioError(null);
    try {
      setAudio((await api.recording(callId)).url);
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : "Couldn't open the recording");
    }
  };

  const save = async () => {
    setSaving(true);
    setSaved(null);
    try {
      await api.disposition(callId, { outcome: outcome || undefined, notes });
      setSaved("Saved");
      changed();
    } catch (e) {
      setSaved(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const summarise = async () => {
    setSummarising(true);
    try {
      const r = await api.summarise(callId);
      if (!outcome && r.suggestedOutcome) setOutcome(r.suggestedOutcome);
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write a summary");
    } finally {
      setSummarising(false);
    }
  };

  const makeLead = async () => {
    try {
      await api.newLead(callId, { name: newLead.name.trim(), email: newLead.email.trim() || undefined, address: newLead.address.trim() || undefined });
      changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the customer record");
    }
  };

  const title = call ? `${call.direction === "INBOUND" ? "Call from" : "Call to"} ${call.lead?.customerName ?? phoneFmt(call.counterpartyNumber)}` : "Call";

  return (
    <Modal title={title} onClose={onClose} wide>
      {error && <p className="m-0 mb-3 rounded-[10px] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">{error}</p>}
      {!call ? (
        !error && <p className="m-0 text-[14px] text-[#475569]">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4 text-[14px] text-[#0F172A]">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#475569]">
            <span>{when(call.startedAt)}</span>
            <span>· {dur(call.durationSec)}</span>
            <span>· {phoneFmt(call.counterpartyNumber)}</span>
            <Pill tone={call.handledBy === "AI" ? "info" : "neutral"}>{call.handledBy === "AI" ? "EasyLink AI" : (call.agent?.name ?? "Staff")}</Pill>
            {call.handledBy === "AI" && call.callerVerified !== null && <Pill tone={call.callerVerified ? "good" : "warn"}>{call.callerVerified ? "Caller verified" : "Not verified"}</Pill>}
            {call.outcome && <Pill tone="good">{outcomeLabel(call.outcome)}</Pill>}
          </div>

          {call.lead ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#F8FAFC] p-3">
              <span>
                <b>{call.lead.customerName}</b>
                <span className="text-[#475569]"> · {call.lead.address ?? "No address"} · {call.lead.status.replace(/_/g, " ").toLowerCase()}</span>
              </span>
              {staff && (
                <Link href={`/master/customers/${call.lead.id}`} className="text-[13px] font-bold text-[#0B4A7A] no-underline hover:underline">
                  Open customer record
                </Link>
              )}
            </div>
          ) : staff ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] p-3">
              <span className="text-[13px] font-semibold text-[#92400E]">This number isn&apos;t on a customer record yet. Make one and this call (and any other from the same number) goes on it.</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label="Name">
                  <input id="nl-name" className={inputCls} value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
                </Field>
                <Field label="Email (optional)">
                  <input id="nl-email" className={inputCls} type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
                </Field>
                <Field label="Address (optional)">
                  <input id="nl-address" className={inputCls} value={newLead.address} onChange={(e) => setNewLead({ ...newLead, address: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Btn small disabled={!newLead.name.trim()} onClick={() => void makeLead()}>
                  Make customer record
                </Btn>
              </div>
            </div>
          ) : null}

          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 text-[14px] font-bold">Summary</h3>
              {staff && call.transcriptStatus === "READY" && (
                <Btn small kind="ghost" disabled={summarising} onClick={() => void summarise()}>
                  {summarising ? "Writing…" : call.aiSummary ? "Rewrite with AI" : "Write with AI"}
                </Btn>
              )}
            </div>
            <p className="m-0 whitespace-pre-wrap text-[14px] leading-[21px] text-[#334155]">{call.aiSummary ?? (call.transcriptStatus === "READY" ? "No summary yet." : "A summary appears once the call's transcript is ready.")}</p>
            {call.suggestedOutcome && !call.outcome && <span className="text-[12.5px] text-[#475569]">AI suggests: {outcomeLabel(call.suggestedOutcome)}</span>}
          </section>

          {call.hasRecording && (
            <section className="flex flex-col gap-1.5">
              <h3 className="m-0 text-[14px] font-bold">Recording</h3>
              {audio ? (
                <audio controls src={audio} className="w-full" />
              ) : (
                <div>
                  <Btn small kind="secondary" onClick={() => void play()}>
                    Play recording
                  </Btn>
                </div>
              )}
              {audioError && <span className="text-[12.5px] text-[#991B1B]">{audioError}</span>}
            </section>
          )}

          {staff && (
            <section className="flex flex-col gap-2 rounded-[10px] border border-[#E3E8EF] p-3">
              <h3 className="m-0 text-[14px] font-bold">Outcome and notes</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr]">
                <Field label="Outcome">
                  <select id="cd-outcome" className={inputCls} value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
                    <option value="">Not set</option>
                    {OUTCOMES.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                        {call.suggestedOutcome === o.key && !call.outcome ? " (AI suggests)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Notes">
                  <textarea id="cd-notes" className={`${inputCls} min-h-[64px]`} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2">
                {saved && <span className="text-[12.5px] text-[#475569]">{saved}</span>}
                <Btn small disabled={saving} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save"}
                </Btn>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="m-0 text-[14px] font-bold">Follow-ups</h3>
              {staff && !booking && (
                <Btn small kind="ghost" onClick={() => setBooking(true)}>
                  Book a follow-up
                </Btn>
              )}
            </div>
            {call.followUps.length === 0 && !booking && <p className="m-0 text-[13px] text-[#64748B]">None booked.</p>}
            {call.followUps.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-[#F8FAFC] px-3 py-2 text-[13.5px]">
                <span>
                  <b>{KIND_LABEL[f.kind]}</b> · {f.title} · due {when(f.dueAt)}
                </span>
                <Pill tone={f.status === "OPEN" ? "warn" : f.status === "DONE" ? "good" : "neutral"}>{f.status === "OPEN" ? "Open" : f.status === "DONE" ? "Done" : "Cancelled"}</Pill>
              </div>
            ))}
            {booking && (
              <FollowUpForm
                portal={portal}
                callId={call.id}
                leadId={call.leadId}
                idPrefix="cd-fu"
                suggest={call.outcome === "SITE_VISIT_BOOKED" || call.suggestedOutcome === "SITE_VISIT_BOOKED" ? "SITE_VISIT" : "CALLBACK"}
                onDone={() => {
                  setBooking(false);
                  changed();
                }}
              />
            )}
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="m-0 text-[14px] font-bold">Transcript</h3>
            {call.transcriptSegments.length ? (
              <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto rounded-[10px] bg-[#F8FAFC] p-3">
                {call.transcriptSegments.map((s) => (
                  <p key={s.idx} className="m-0 text-[13.5px] leading-[20px]">
                    <b className={s.speaker === "CUSTOMER" ? "text-[#B45309]" : "text-[#1565C0]"}>
                      {s.speaker === "CUSTOMER" ? (call.lead?.customerName.split(" ")[0] ?? "Caller") : call.handledBy === "AI" ? "EasyLink AI" : (call.agent?.name.split(" ")[0] ?? "EasyLink")}:
                    </b>{" "}
                    {s.text}
                  </p>
                ))}
              </div>
            ) : (
              <p className="m-0 text-[13px] text-[#64748B]">
                {call.transcriptStatus === "READY" ? (call.transcriptText ?? "No words were picked up.") : call.recordingStatus === "NOT_RECORDED" ? "This call wasn't recorded, so there's no transcript." : "The transcript is still being made."}
              </p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
