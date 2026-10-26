"use client";

import { useCallback, useEffect, useState } from "react";
import { callLists, type ListContact, type Overview } from "./api";
import { UploadCallList } from "./UploadCallList";

export type FollowUp = { id: string; name: string; phone: string | null; suburb: string; note: string; followUpDate: string };

const OUTCOME: Record<string, string> = {
  SITE_VISIT_BOOKED: "Site visit booked",
  QUOTE_REQUESTED: "Quote requested",
  CALL_BACK_LATER: "Call back later",
  VOICEMAIL_LEFT: "Voicemail left",
  NOT_INTERESTED: "Not interested",
  DO_NOT_CALL: "Do not call",
  WRONG_NUMBER: "Wrong number",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const suburbOf = (a: string | null) => (a ? (a.split(",").map((p) => p.trim()).filter(Boolean).at(-1) ?? a) : "No address");

/**
 * The dialler's "Up next" panel: follow-ups due (as before), or any call list,
 * one per state built from leads' addresses, plus uploaded lists. "Call next"
 * puts the next callable person's number in the dialler.
 */
export function CallListPanel({
  followUps,
  followUpsError,
  disabled,
  refreshKey,
  onPick,
}: {
  followUps: FollowUp[] | null;
  followUpsError: string | null;
  disabled: boolean;
  /** Changes when a call ends, so the list reloads with the new outcome. */
  refreshKey: number;
  onPick: (phone: string, who: { leadId?: string; name: string }) => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [key, setKey] = useState("followups");
  const [contacts, setContacts] = useState<ListContact[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadOverview = useCallback(() => {
    callLists.overview().then(setOverview).catch((e) => setError(e instanceof Error ? e.message : "Couldn't load call lists"));
  }, []);

  // Bumped to reload the open list after "Call next" or "Skip".
  const [reload, setReload] = useState(0);

  useEffect(loadOverview, [loadOverview, refreshKey]);
  useEffect(() => {
    if (key === "followups") return;
    let cancelled = false;
    const load = key.startsWith("state:")
      ? callLists.state(key.slice(6)).then((r) => ({ items: r.contacts, total: r.total }))
      : callLists.list(key).then((r) => ({ items: r.entries, total: r.total }));
    load
      .then((r) => {
        if (cancelled) return;
        setError(null);
        setContacts(r.items);
        setTotal(r.total);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load that list");
      });
    return () => {
      cancelled = true;
    };
  }, [key, refreshKey, reload]);

  const callNext = async () => {
    setNotice(null);
    try {
      const c = await callLists.next(key);
      if (!c?.phone) {
        setNotice("Nobody left to call on this list right now.");
        return;
      }
      onPick(c.phone, { leadId: c.leadId, name: c.name });
      setNotice(`Next: ${c.name}`);
      setReload((n) => n + 1);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't get the next person");
    }
  };

  const skip = async (c: ListContact) => {
    if (!c.entryId) return;
    await callLists.setEntry(key, c.entryId, "SKIPPED").catch(() => undefined);
    setReload((n) => n + 1);
    loadOverview();
  };

  const selected = overview?.lists.find((l) => l.key === key);

  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Up next</h2>
        <button type="button" onClick={() => setUploading(true)} className="text-[12px] font-bold text-[#0B4A7A] hover:underline">
          Upload a list
        </button>
      </div>

      <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]" htmlFor="call-list-pick">
        Call list
        <select
          id="call-list-pick"
          value={key}
          onChange={(e) => {
            setNotice(null);
            setError(null);
            setContacts(null);
            setKey(e.target.value);
          }}
          className="w-full rounded-[8px] border border-[#CBD5E1] bg-white px-2 py-1.5 text-[13px] font-normal text-[#0F172A]"
        >
          <option value="followups">Follow-ups due</option>
          <optgroup label="By state (open leads)">
            {(overview?.states ?? []).map((s) => (
              <option key={s.key} value={s.key}>
                {s.state} · {s.callable} to call
              </option>
            ))}
          </optgroup>
          {(overview?.lists.length ?? 0) > 0 && (
            <optgroup label="Uploaded lists">
              {overview!.lists.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.name} · {l.pending} left
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {key === "followups" ? (
        <>
          <p className="m-0 text-[12px] leading-[17px] text-[#5B6B80]">
            {followUpsError
              ? followUpsError
              : followUps === null
                ? "Loading…"
                : `${followUps.length} lead${followUps.length === 1 ? "" : "s"} with an upcoming follow-up`}
          </p>
          <div className="flex flex-col divide-y divide-[#EEF2F6] border-t border-[#EEF2F6]">
            {followUps?.length === 0 ? <p className="py-3 text-[13px] text-[#5B6B80]">Nothing scheduled.</p> : null}
            {(followUps ?? []).map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => q.phone && onPick(q.phone, { leadId: q.id, name: q.name })}
                disabled={disabled || !q.phone}
                className="flex items-start justify-between gap-2 py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[#0F172A]">{q.name}</span>
                  <span className="text-[12px] text-[#5B6B80]">
                    {q.suburb} · {q.note}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-[#5B6B80]">{day(q.followUpDate)}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-[12px] leading-[17px] text-[#5B6B80]">
              {error
                ? error
                : contacts === null
                  ? "Loading…"
                  : selected
                    ? `${selected.pending} of ${selected.total} left · ${selected.done} done · ${selected.skipped} skipped`
                    : `${total} ${total === 1 ? "person" : "people"} you can call`}
            </p>
            <button
              type="button"
              onClick={() => void callNext()}
              disabled={disabled}
              className="shrink-0 rounded-[8px] bg-[#F68A0A] px-2.5 py-1 text-[12px] font-bold text-[#3B1D00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Call next
            </button>
          </div>
          {notice && <p className="m-0 rounded-[8px] bg-[#EFF6FF] px-2 py-1.5 text-[12px] text-[#1E40AF]">{notice}</p>}
          <div className="flex max-h-[420px] flex-col divide-y divide-[#EEF2F6] overflow-y-auto border-t border-[#EEF2F6]">
            {contacts?.length === 0 ? <p className="py-3 text-[13px] text-[#5B6B80]">Nobody on this list yet.</p> : null}
            {(contacts ?? []).map((c) => (
              <div key={c.entryId ?? c.leadId} className="flex items-start justify-between gap-2 py-2.5">
                <button
                  type="button"
                  onClick={() => c.phone && onPick(c.phone, { leadId: c.leadId, name: c.name })}
                  disabled={disabled || !c.callable || c.entryStatus === "DONE"}
                  className="flex min-w-0 flex-col gap-0.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="text-[14px] font-bold text-[#0F172A]">{c.name}</span>
                  <span className="text-[12px] text-[#5B6B80]">
                    {suburbOf(c.address)}
                    {c.lastCallAt ? ` · last call ${day(c.lastCallAt)}${c.lastOutcome ? `, ${OUTCOME[c.lastOutcome] ?? c.lastOutcome}` : ""}` : " · not called yet"}
                  </span>
                  {!c.callable && <span className="text-[11px] font-semibold text-[#991B1B]">{c.notCallable}</span>}
                </button>
                {c.entryId && c.entryStatus === "PENDING" ? (
                  <button type="button" onClick={() => void skip(c)} className="shrink-0 text-[11px] font-semibold text-[#64748B] hover:underline">
                    Skip
                  </button>
                ) : c.entryStatus ? (
                  <span className="shrink-0 text-[11px] font-semibold text-[#64748B]">{c.entryStatus === "DONE" ? "Done" : "Skipped"}</span>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      {uploading && (
        <UploadCallList
          onClose={() => setUploading(false)}
          onDone={(r) => {
            loadOverview();
            setContacts(null);
            setKey(r.listId);
          }}
        />
      )}
    </section>
  );
}
