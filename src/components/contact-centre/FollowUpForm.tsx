"use client";

import { useState } from "react";
import { Btn, Field, inputCls } from "@/components/jobs/ui";
import { cc, type FollowUp, type Portal } from "./api";

const KINDS: { key: FollowUp["kind"]; label: string; title: string }[] = [
  { key: "CALLBACK", label: "Call back", title: "Call back" },
  { key: "SITE_VISIT", label: "Site visit", title: "Site visit" },
  { key: "TASK", label: "Task", title: "" },
];

/** Tomorrow at 10 am, Sydney time, as a value for a datetime-local input. */
function defaultDue(): string {
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Book a callback, site visit or task with a due time, on a customer, a call, or a number. */
export function FollowUpForm({
  portal,
  leadId,
  callId,
  phone,
  suggest,
  onDone,
  idPrefix = "fu",
}: {
  portal: Portal;
  leadId?: string | null;
  callId?: string | null;
  phone?: string | null;
  suggest?: FollowUp["kind"];
  onDone: (t: FollowUp) => void;
  idPrefix?: string;
}) {
  const [kind, setKind] = useState<FollowUp["kind"]>(suggest ?? "CALLBACK");
  const [title, setTitle] = useState(KINDS.find((k) => k.key === (suggest ?? "CALLBACK"))!.title);
  const [due, setDue] = useState(defaultDue);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await cc(portal).addFollowUp({
        kind,
        title: title.trim() || KINDS.find((k) => k.key === kind)!.label,
        notes: notes.trim() || undefined,
        leadId: leadId ?? undefined,
        callId: callId ?? undefined,
        phone: !leadId && !callId ? (phone ?? undefined) : undefined,
        dueAt: new Date(due).toISOString(),
      });
      setNotes("");
      onDone(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book that");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of follow-up">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            onClick={() => {
              setKind(k.key);
              if (!title || KINDS.some((x) => x.title === title)) setTitle(k.title);
            }}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${kind === k.key ? "border-[#0B4A7A] bg-[#0B4A7A] text-white" : "border-[#CBD5E1] bg-white text-[#334155]"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_200px]">
        <Field label="What">
          <input id={`${idPrefix}-title`} className={inputCls} maxLength={300} value={title} placeholder="e.g. Send battery quote" onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="When">
          <input id={`${idPrefix}-due`} className={inputCls} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <input id={`${idPrefix}-notes`} className={inputCls} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="m-0 rounded-[8px] bg-[#FEF2F2] p-2 text-[13px] text-[#991B1B]">{error}</p>}
      <div className="flex justify-end">
        <Btn small disabled={busy || !due} onClick={() => void save()}>
          {busy ? "Booking…" : `Book ${KINDS.find((k) => k.key === kind)!.label.toLowerCase()}`}
        </Btn>
      </div>
    </div>
  );
}
