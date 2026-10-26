"use client";

import { useEffect, useState } from "react";
import { Btn, inputCls, Pill } from "@/components/jobs/ui";
import { cc, day, outcomeLabel, phoneFmt, when, type CustomerRecord as Rec, type Portal, type TimelineItem } from "./api";
import { CallDetailModal } from "./CallDetail";
import { FollowUpForm } from "./FollowUpForm";

const KIND_LABEL = { CALLBACK: "Call back", SITE_VISIT: "Site visit", TASK: "Task" } as const;
const FILTERS: { key: string; label: string; kinds: TimelineItem["kind"][] }[] = [
  { key: "all", label: "Everything", kinds: [] },
  { key: "calls", label: "Calls", kinds: ["call"] },
  { key: "messages", label: "Texts and emails", kinds: ["sms", "email"] },
  { key: "notes", label: "Notes and follow-ups", kinds: ["note", "follow_up"] },
  { key: "job", label: "Job and payments", kinds: ["appointment", "milestone", "payment", "event"] },
];
const DOT: Record<TimelineItem["kind"], string> = {
  call: "#1976D2",
  sms: "#0EA5E9",
  email: "#0EA5E9",
  note: "#F68A0A",
  follow_up: "#B45309",
  appointment: "#15803D",
  milestone: "#15803D",
  payment: "#7C3AED",
  event: "#64748B",
};

/** The timeline only, newest first, with a filter; calls open their detail. */
export function Timeline({ items, onOpenCall }: { items: TimelineItem[]; onOpenCall: (id: string) => void }) {
  const [filter, setFilter] = useState("all");
  const kinds = FILTERS.find((f) => f.key === filter)!.kinds;
  const shown = kinds.length ? items.filter((i) => kinds.includes(i.kind)) : items;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${filter === f.key ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#334155]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="m-0 text-[13px] text-[#64748B]">Nothing here yet.</p>}
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {shown.map((t) => (
          <li key={t.id} className="relative flex gap-3 pb-4 pl-1">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: DOT[t.kind] }} aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-0.5">
              {t.kind === "call" && t.ref?.callId ? (
                <button type="button" onClick={() => onOpenCall(t.ref!.callId!)} className="text-left text-[14px] font-semibold text-[#0B4A7A] hover:underline">
                  {t.title}
                </button>
              ) : (
                <span className="text-[14px] font-semibold text-[#0F172A]">{t.title}</span>
              )}
              {t.detail && <span className="whitespace-pre-wrap text-[13.5px] leading-[20px] text-[#334155]">{t.detail}</span>}
              <span className="text-[12px] text-[#64748B]">
                {when(t.at)}
                {t.by ? ` · ${t.by}` : ""}
                {t.ref?.hasRecording ? " · recorded" : ""}
                {t.ref?.dueAt ? ` · due ${when(t.ref.dueAt)}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * A customer's whole record: details, pinned notes, open follow-ups, notes and
 * the timeline. Staff and the customer's installer use the same view.
 */
export function CustomerRecordView({ portal, leadId, compact }: { portal: Portal; leadId: string; compact?: boolean }) {
  const api = cc(portal);
  const [rec, setRec] = useState<Rec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState(false);
  const [booking, setBooking] = useState(false);
  const [openCall, setOpenCall] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cc(portal)
      .record(leadId)
      .then((r) => !cancelled && (setRec(r), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load this customer"));
    return () => {
      cancelled = true;
    };
  }, [portal, leadId, reload]);

  const refresh = () => setReload((n) => n + 1);

  if (error) return <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>;
  if (!rec) return <p className="m-0 text-[14px] text-[#475569]">Loading…</p>;
  const l = rec.lead;

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">{l.name}</h1>
            <span className="text-[14px] text-[#475569]">
              {l.address ?? "No address"} · {phoneFmt(l.phone) || "No phone"}
              {l.email ? ` · ${l.email}` : ""}
            </span>
            <span className="flex flex-wrap gap-1.5 pt-1">
              <Pill tone="info">{l.status.replace(/_/g, " ").toLowerCase()}</Pill>
              <Pill>{l.projectPhase.replace(/_/g, " ").toLowerCase()}</Pill>
              {l.installer && <Pill tone="good">Installer: {l.installer.name}</Pill>}
              {!l.consent.calls && <Pill tone="bad">No calls</Pill>}
              {!l.consent.sms && <Pill tone="warn">No texts</Pill>}
              {!l.consent.email && <Pill tone="warn">No emails</Pill>}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ["Calls", rec.counts.calls],
                ["Texts", rec.counts.texts],
                ["Emails", rec.counts.emails],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col rounded-[10px] bg-[#F8FAFC] px-4 py-2">
                <span className="font-source-sans text-[22px] font-bold tabular-nums text-[#0F172A]">{v}</span>
                <span className="text-[12px] text-[#64748B]">{k}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={`grid grid-cols-1 items-start gap-4 ${compact ? "" : "lg:grid-cols-[1fr_360px]"}`}>
        <section className="order-2 flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5 lg:order-1">
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Timeline</h2>
          <Timeline items={rec.timeline} onOpenCall={setOpenCall} />
        </section>

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          {rec.pinned.length > 0 && (
            <section className="flex flex-col gap-2 rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <h2 className="m-0 text-[14px] font-bold text-[#92400E]">Pinned</h2>
              {rec.pinned.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-2 text-[13.5px] text-[#0F172A]">
                  <span className="whitespace-pre-wrap">{p.body}</span>
                  <button type="button" className="shrink-0 text-[12px] font-semibold text-[#92400E] hover:underline" onClick={() => void api.pinNote(p.id, false).then(refresh)}>
                    Unpin
                  </button>
                </div>
              ))}
            </section>
          )}

          {rec.lastCall && (
            <section className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
              <h2 className="m-0 text-[14px] font-bold text-[#0F172A]">Last call</h2>
              <button type="button" onClick={() => setOpenCall(rec.lastCall!.id)} className="text-left text-[13.5px] font-semibold text-[#0B4A7A] hover:underline">
                {when(rec.lastCall.at)} · {rec.lastCall.by ?? "Staff"}
                {rec.lastCall.outcome ? ` · ${outcomeLabel(rec.lastCall.outcome)}` : ""}
              </button>
              {rec.lastCall.summary && <span className="text-[13px] leading-[19px] text-[#334155]">{rec.lastCall.summary}</span>}
            </section>
          )}

          <section className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-[14px] font-bold text-[#0F172A]">To do</h2>
              {!booking && (
                <Btn small kind="ghost" onClick={() => setBooking(true)}>
                  Book a follow-up
                </Btn>
              )}
            </div>
            {rec.openFollowUps.length === 0 && !booking && <p className="m-0 text-[13px] text-[#64748B]">Nothing booked.</p>}
            {rec.openFollowUps.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-[#F8FAFC] px-3 py-2 text-[13.5px]">
                <span className="min-w-0">
                  <b>{KIND_LABEL[f.kind]}</b> · {f.title}
                  <span className="block text-[12px] text-[#64748B]">
                    {day(f.dueAt)} · {f.assignee ?? "Anyone"}
                  </span>
                </span>
                <Btn small kind="secondary" onClick={() => void api.setFollowUp(f.id, { status: "DONE" }).then(refresh)}>
                  Done
                </Btn>
              </div>
            ))}
            {booking && (
              <FollowUpForm
                portal={portal}
                leadId={leadId}
                idPrefix="cr-fu"
                onDone={() => {
                  setBooking(false);
                  refresh();
                }}
              />
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
            <h2 className="m-0 text-[14px] font-bold text-[#0F172A]">Add a note</h2>
            <label className="sr-only" htmlFor="cr-note">
              Note
            </label>
            <textarea
              id="cr-note"
              className={`${inputCls} min-h-[72px]`}
              maxLength={5000}
              placeholder="e.g. Gate code 1234. Speak to Karen, not her partner."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-[13px] text-[#334155]" htmlFor="cr-pin">
                <input id="cr-pin" type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Pin to the top
              </label>
              <Btn
                small
                disabled={!note.trim()}
                onClick={() =>
                  void api.addNote(leadId, note.trim(), pin).then(() => {
                    setNote("");
                    setPin(false);
                    refresh();
                  })
                }
              >
                Add note
              </Btn>
            </div>
          </section>
        </div>
      </div>

      {openCall && <CallDetailModal portal={portal} callId={openCall} onClose={() => setOpenCall(null)} onChanged={refresh} />}
    </div>
  );
}
