"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, Field, inputCls, Pill } from "@/components/jobs/ui";
import { callLists, type Overview } from "@/components/call-lists/api";
import { cc, OUTCOMES, when, type Campaign, type CampaignStatus } from "./api";

const STATUS: Record<CampaignStatus, { label: string; tone: "good" | "warn" | "info" | "neutral" }> = {
  ACTIVE: { label: "Running", tone: "good" },
  PAUSED: { label: "Paused", tone: "warn" },
  DRAFT: { label: "Draft", tone: "info" },
  DONE: { label: "Finished", tone: "neutral" },
};

const EMPTY = { name: "", listKey: "", goal: "", script: "", restDays: 7, wrapSeconds: 10 };

/**
 * Outbound campaigns: a run through one call list with a goal and a script.
 * "Open in the dialler" turns on power dialling: after each wrap-up the next
 * person is rung automatically.
 */
export function MasterCampaigns() {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [lists, setLists] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    cc("admin")
      .campaigns()
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load campaigns"));
  }, []);

  useEffect(() => {
    load();
    callLists
      .overview()
      .then(setLists)
      .catch(() => undefined);
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await cc("admin").createCampaign({
        name: form.name.trim(),
        listKey: form.listKey,
        goal: form.goal.trim() || null,
        script: form.script.trim() || null,
        restDays: form.restDays,
        wrapSeconds: form.wrapSeconds,
      });
      setForm(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the campaign");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (c: Campaign, status: CampaignStatus) =>
    void cc("admin")
      .updateCampaign(c.id, { status })
      .then(load)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't update the campaign"));

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Campaigns</span>
        </nav>
        {!form && <Btn onClick={() => setForm({ ...EMPTY, listKey: lists?.lists[0]?.key ?? lists?.states[0]?.key ?? "" })}>New campaign</Btn>}
      </header>

      <div className="flex w-full max-w-[1200px] flex-col gap-4 px-8 pt-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Campaigns</h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            A campaign works through one call list with a goal and a script. In the dialler it rings the next person automatically after each wrap-up. People on the Do Not Call Register, or who asked not to be called, are never rung.
          </p>
        </div>
        {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">{error}</p>}

        {form && (
          <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">New campaign</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Name">
                <input id="cp-name" className={inputCls} value={form.name} maxLength={120} placeholder="e.g. Battery rebate, Western Sydney" onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Call list">
                <select id="cp-list" className={inputCls} value={form.listKey} onChange={(e) => setForm({ ...form, listKey: e.target.value })}>
                  <option value="">Choose…</option>
                  {(lists?.lists.length ?? 0) > 0 && (
                    <optgroup label="Contact lists">
                      {lists!.lists.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.name} · {l.callable} to call
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Open leads by state">
                    {(lists?.states ?? []).map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.state} · {s.callable} to call
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
            </div>
            <Field label="Goal (optional)">
              <input id="cp-goal" className={inputCls} maxLength={500} value={form.goal} placeholder="e.g. Book a free battery assessment" onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </Field>
            <Field label="Script (optional, shown in the dialler)">
              <textarea id="cp-script" className={`${inputCls} min-h-[96px]`} maxLength={4000} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3 md:max-w-[420px]">
              <Field label="Rest after a call (days)">
                <input id="cp-rest" type="number" min={0} max={90} className={inputCls} value={form.restDays} onChange={(e) => setForm({ ...form, restDays: Number(e.target.value) })} />
              </Field>
              <Field label="Pause before the next dial (seconds)">
                <input id="cp-wrap" type="number" min={3} max={120} className={inputCls} value={form.wrapSeconds} onChange={(e) => setForm({ ...form, wrapSeconds: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Btn kind="secondary" onClick={() => setForm(null)}>
                Cancel
              </Btn>
              <Btn disabled={saving || !form.name.trim() || !form.listKey} onClick={() => void save()}>
                {saving ? "Creating…" : "Create campaign"}
              </Btn>
            </div>
          </section>
        )}

        {rows?.length === 0 && !form && <p className="m-0 rounded-[14px] border border-dashed border-[#CBD5E1] bg-white p-6 text-[14px] text-[#475569]">No campaigns yet. Create one from a Contact list or a state list.</p>}

        {rows?.map((c) => (
          <section key={c.id} className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <h2 className="m-0 text-[18px] font-bold text-[#0F172A]">{c.name}</h2>
                  <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
                </span>
                <span className="text-[13px] text-[#475569]">
                  {c.list.name} · {c.list.callable} of {c.list.total} can be called now · rest {c.restDays} {c.restDays === 1 ? "day" : "days"} after a call
                </span>
                {c.goal && <span className="text-[13px] text-[#334155]">Goal: {c.goal}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status !== "ACTIVE" && c.status !== "DONE" && (
                  <Btn small onClick={() => setStatus(c, "ACTIVE")}>
                    {c.status === "PAUSED" ? "Resume" : "Start"}
                  </Btn>
                )}
                {c.status === "ACTIVE" && (
                  <>
                    <Link href={`/master/dialer?campaign=${c.id}`} className="inline-flex items-center rounded-[10px] bg-[#F68A0A] px-3 py-1.5 text-[13px] font-bold text-[#3B1D00] no-underline">
                      Open in the dialler
                    </Link>
                    <Btn small kind="secondary" onClick={() => setStatus(c, "PAUSED")}>
                      Pause
                    </Btn>
                  </>
                )}
                {c.status !== "DONE" && (
                  <Btn small kind="ghost" onClick={() => setStatus(c, "DONE")}>
                    Finish
                  </Btn>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["Calls", c.stats.calls],
                  ["Connected", c.stats.connectRate === null ? "–" : `${c.stats.connected} (${c.stats.connectRate}%)`],
                  ["Site visits", c.stats.siteVisits],
                  ["Quotes", c.stats.quotes],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex flex-col rounded-[10px] bg-[#F8FAFC] px-3 py-2">
                  <span className="font-source-sans text-[20px] font-bold tabular-nums text-[#0F172A]">{v}</span>
                  <span className="text-[12px] text-[#64748B]">{k}</span>
                </div>
              ))}
            </div>
            {Object.keys(c.stats.outcomes).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {OUTCOMES.filter((o) => c.stats.outcomes[o.key]).map((o) => (
                  <span key={o.key} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] text-[#475569]">
                    {o.label}: {c.stats.outcomes[o.key]}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[12px] text-[#64748B]">Updated {when(c.updatedAt)}</span>
          </section>
        ))}
      </div>
    </div>
  );
}
