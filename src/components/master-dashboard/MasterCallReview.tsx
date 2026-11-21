"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Call Review: what EasyLink's calls (Jay and the reps) teach about winning
 * sales. Every call with a transcript is reviewed by AI; this page shows the
 * patterns, the scorecards, each call's review, and the sales playbook that
 * is rebuilt automatically from the calls and read by Jay on every call.
 */

type Objection = { type: string; count: number; handledPct: number | null; winWhenHandledPct: number | null; examples: { said: string; better: string; response: string; handled: string; won: boolean }[] };
type Agent = { name: string; calls: number; wonPct: number | null; avgScore: number | null; talkRatio: number | null; scores: Record<string, number | null> };
type CallPick = { callId: string; score: number | null; outcome: string | null; summary: string | null; at: string; agent: string };
type Insights = {
  days: number;
  configured: boolean;
  totals: { reviewed: number; conversations: number; won: number; wonPct: number | null; avgScore: number | null; pending: number };
  byOutcome: Record<string, number>;
  objections: Objection[];
  agents: Agent[];
  missed: { text: string; count: number }[];
  whatWorked: { text: string; count: number }[];
  compliance: { issue: string; severity: string; quote: string; callId: string; at: string; agent: string }[];
  bestCalls: CallPick[];
  toCoach: CallPick[];
};
type Review = {
  callId: string;
  status: string;
  outcome: string | null;
  stageReached: string | null;
  score: number | null;
  scores: Record<string, number | null> | null;
  objections: { type: string; customerSaid: string; handled: string; response: string; better: string }[] | null;
  needs: string[] | null;
  buyingSignals: string[] | null;
  whatWorked: string[] | null;
  missed: string[] | null;
  compliance: { issue: string; severity: string; quote: string }[] | null;
  coaching: string[] | null;
  nextStep: string | null;
  summary: string | null;
  talkRatio: number | null;
  error: string | null;
  reviewedAt: string;
  agent?: string;
  customerName?: string | null;
  call?: { startedAt: string; durationSec: number | null; counterpartyNumber: string; leadId: string | null; direction: string };
};
type PlaybookVersion = { version: number; text: string; createdAt: string; source: "auto" | "staff"; fromCalls: number; check: { passed: boolean; problems: string[] } };
type Playbook = { auto: boolean; current: PlaybookVersion | null; history: PlaybookVersion[]; lastAutoAt: string | null; lastError?: string | null };

async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api/admin/cc/call-review${path}`, json !== undefined ? { ...rest, body: JSON.stringify(json), headers: { "Content-Type": "application/json" } } : rest);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new Error(body.message ?? `Request failed (${res.status})`);
  return body.data as T;
}

const OUTCOME_LABEL: Record<string, string> = {
  CLOSED: "Closed",
  PROPOSAL_SENT: "Proposal sent",
  VISIT_BOOKED: "Visit booked",
  CALLBACK: "Call back",
  NOT_INTERESTED: "Not interested",
  DO_NOT_CALL: "Do not call",
  NO_CONVERSATION: "No conversation",
  SERVICE: "Service",
  OTHER: "Other",
};
const OBJ_LABEL: Record<string, string> = {
  price: "Price",
  need_to_think: "Needs to think",
  partner_decision: "Partner decides",
  competitor_quote: "Other quote",
  timing: "Timing",
  trust: "Trust",
  roof_or_property: "Roof / property",
  renting_or_moving: "Renting / moving",
  payback_doubt: "Payback doubt",
  battery_value: "Battery value",
  already_has_solar: "Has solar",
  not_interested: "Not interested",
  other: "Other",
};
const SCORE_KEYS = ["discovery", "value", "objections", "closing", "rapport", "compliance"];
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });
const card = "flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";
const h2 = "m-0 text-[16px] font-bold text-[#0F172A]";

function Score({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[#94A3B8]">–</span>;
  const c = v >= 75 ? "#166534" : v >= 55 ? "#92400E" : "#991B1B";
  const bg = v >= 75 ? "#DCFCE7" : v >= 55 ? "#FEF3C7" : "#FEE2E2";
  return <span className="rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums" style={{ color: c, background: bg }}>{v}</span>;
}

export function MasterCallReview() {
  const [days, setDays] = useState(30);
  const [ins, setIns] = useState<Insights | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [outcome, setOutcome] = useState("");
  const [open, setOpen] = useState<Review | null>(null);
  const [pb, setPb] = useState<Playbook | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [i, r, p] = await Promise.all([
        api<Insights>(`/insights?days=${days}`),
        api<Review[]>(`/reviews?days=${days}${outcome ? `&outcome=${outcome}` : ""}`),
        api<Playbook>(`/playbook`),
      ]);
      setIns(i);
      setReviews(r);
      setPb(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load call reviews");
    }
  }, [days, outcome]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  };

  const t = ins?.totals;
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Call Review</span>
        </nav>
        <label className="flex items-center gap-2 text-[13px] text-[#334155]">
          Period
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-[8px] border border-[#CBD5E1] px-2 py-1">
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pt-6 pb-14">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Call Review</h1>
            <p className="mt-1 max-w-[760px] text-[13px] text-[#5B6B80]">
              Every call with a transcript, Jay&rsquo;s and the reps&rsquo;, is reviewed by AI: what the customer wanted, the objections and how they were handled, what was missed, compliance, and a score. The sales playbook below is rebuilt from these calls and Jay reads it on every call.
            </p>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("run", () => api(`/run`, { method: "POST", json: { limit: 20 } }))}
            className="rounded-[10px] bg-[#0B1A2E] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {busy === "run" ? "Reviewing…" : `Review new calls${t?.pending ? ` (${t.pending})` : ""}`}
          </button>
        </div>
        {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">{error}</p>}
        {ins && !ins.configured && <p className="m-0 rounded-[10px] bg-[#FEF3C7] px-3 py-2 text-[13px] text-[#92400E]">AI call reviews are not switched on for this server.</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Conversations", t?.conversations ?? "–", `${t?.reviewed ?? 0} calls reviewed`],
            ["Won", t ? `${t.won}` : "–", "closed, proposal sent or visit booked"],
            ["Win rate", t?.wonPct != null ? `${t.wonPct}%` : "–", "of conversations"],
            ["Average score", t?.avgScore ?? "–", "out of 100"],
            ["Waiting for review", t?.pending ?? "–", "reviewed every 5 minutes"],
          ].map(([l, v, s]) => (
            <div key={String(l)} className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white p-3.5">
              <span className="text-[12px] font-semibold text-[#5B6B80]">{l}</span>
              <span className="font-source-sans text-[26px] font-bold tabular-nums text-[#0F172A]">{v}</span>
              <span className="text-[12px] text-[#475569]">{s}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <section aria-label="Objections" className={card}>
            <h2 className={h2}>Objections</h2>
            {!ins || ins.objections.length === 0 ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">No objections found yet.</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[#5B6B80]">
                    <th className="py-1 font-semibold">Objection</th>
                    <th className="py-1 text-right font-semibold">Times</th>
                    <th className="py-1 text-right font-semibold">Handled</th>
                    <th className="py-1 text-right font-semibold">Won when handled</th>
                  </tr>
                </thead>
                <tbody>
                  {ins.objections.map((o) => (
                    <tr key={o.type} className="border-t border-[#EEF2F7]" title={o.examples.map((x) => `"${x.said}" → ${x.better}`).join("\n")}>
                      <td className="py-1.5 font-semibold text-[#0F172A]">{OBJ_LABEL[o.type] ?? o.type}</td>
                      <td className="py-1.5 text-right tabular-nums">{o.count}</td>
                      <td className="py-1.5 text-right tabular-nums">{o.handledPct ?? "–"}%</td>
                      <td className="py-1.5 text-right tabular-nums">{o.winWhenHandledPct ?? "–"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section aria-label="Scorecards" className={card}>
            <h2 className={h2}>Scorecards</h2>
            {!ins || ins.agents.length === 0 ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">No reviewed conversations yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-[12px] text-[#5B6B80]">
                      <th className="py-1 font-semibold">Who</th>
                      <th className="py-1 text-right font-semibold">Calls</th>
                      <th className="py-1 text-right font-semibold">Won</th>
                      <th className="py-1 text-right font-semibold">Score</th>
                      {SCORE_KEYS.map((k) => (
                        <th key={k} className="py-1 text-right font-semibold capitalize">{k.slice(0, 5)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ins.agents.map((a) => (
                      <tr key={a.name} className="border-t border-[#EEF2F7]">
                        <td className="py-1.5 font-semibold text-[#0F172A]">{a.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{a.calls}</td>
                        <td className="py-1.5 text-right tabular-nums">{a.wonPct ?? "–"}%</td>
                        <td className="py-1.5 text-right"><Score v={a.avgScore == null ? null : Math.round(a.avgScore)} /></td>
                        {SCORE_KEYS.map((k) => (
                          <td key={k} className="py-1.5 text-right tabular-nums text-[#334155]">{a.scores[k] ?? "–"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="m-0 mt-1 text-[11.5px] text-[#5B6B80]">Area scores are out of 10: discovery, value, objections, closing, rapport, compliance.</p>
              </div>
            )}
          </section>

          <section aria-label="What wins and what's missed" className={card}>
            <h2 className={h2}>What wins calls</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
              {(ins?.whatWorked ?? []).slice(0, 6).map((x) => (
                <li key={x.text}>✓ {x.text} <span className="text-[#5B6B80]">({x.count})</span></li>
              ))}
            </ul>
            <h2 className={h2}>Most often missed</h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
              {(ins?.missed ?? []).slice(0, 6).map((x) => (
                <li key={x.text}>✗ {x.text} <span className="text-[#5B6B80]">({x.count})</span></li>
              ))}
            </ul>
          </section>

          <section aria-label="Compliance" className={card}>
            <h2 className={h2}>Compliance flags</h2>
            {!ins || ins.compliance.length === 0 ? (
              <p className="m-0 text-[13px] text-[#5B6B80]">Nothing flagged.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
                {ins.compliance.slice(0, 10).map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`shrink-0 rounded-full px-2 text-[11px] font-bold uppercase ${c.severity === "high" ? "bg-[#FEE2E2] text-[#991B1B]" : c.severity === "medium" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F1F5F9] text-[#475569]"}`}>{c.severity}</span>
                    <span>
                      {c.issue} <span className="text-[#5B6B80]">· {c.agent} · {when(c.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-label="Sales playbook" className={card}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`${h2} flex-grow`}>Sales playbook {pb?.current ? <span className="text-[13px] font-semibold text-[#5B6B80]">· version {pb.current.version}, {pb.current.source === "auto" ? `built from ${pb.current.fromCalls} calls` : "edited by staff"}, {when(pb.current.createdAt)}</span> : null}</h2>
            {pb && (
              <button
                type="button"
                role="switch"
                aria-checked={pb.auto}
                disabled={busy !== null}
                onClick={() => void act("auto", () => api(`/playbook/auto`, { method: "PUT", json: { auto: !pb.auto } }))}
                className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${pb.auto ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#475569]"}`}
              >
                {pb.auto ? "Updates automatically from calls" : "Automatic updates paused"}
              </button>
            )}
            <button type="button" disabled={busy !== null} onClick={() => void act("rebuild", () => api(`/playbook/rebuild`, { method: "POST", json: {} }))} className="rounded-[10px] border border-[#CBD5E1] px-3 py-1 text-[12.5px] font-semibold disabled:opacity-50">
              {busy === "rebuild" ? "Rebuilding…" : "Rebuild now"}
            </button>
            <button type="button" onClick={() => setEdit(edit === null ? (pb?.current?.text ?? "") : null)} className="rounded-[10px] border border-[#CBD5E1] px-3 py-1 text-[12.5px] font-semibold">
              {edit === null ? "Edit" : "Cancel"}
            </button>
          </div>
          <p className="m-0 text-[12.5px] text-[#475569]">
            Rebuilt automatically, at most hourly, from calls without serious compliance problems. Each version is checked against EasyLink&rsquo;s selling rules (no invented prices, rebates or dates, no pressure, no revealing costs) and goes live for Jay only if it passes.
          </p>
          {pb?.lastError && <p className="m-0 rounded-[8px] bg-[#FEF3C7] px-3 py-2 text-[12.5px] text-[#92400E]">{pb.lastError}</p>}
          {edit !== null ? (
            <div className="flex flex-col gap-2">
              <textarea value={edit} onChange={(e) => setEdit(e.target.value)} rows={16} className="w-full rounded-[10px] border border-[#CBD5E1] p-3 text-[13px] leading-[19px]" />
              <button
                type="button"
                disabled={busy !== null || edit.trim().length < 20}
                onClick={() => void act("save", async () => {
                  await api(`/playbook`, { method: "PUT", json: { text: edit } });
                  setEdit(null);
                })}
                className="self-start rounded-[10px] bg-[#0B1A2E] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy === "save" ? "Checking and saving…" : "Save and check"}
              </button>
            </div>
          ) : pb?.current ? (
            <div className="whitespace-pre-wrap rounded-[10px] bg-[#F8FAFC] p-3 text-[13px] leading-[20px] text-[#0F172A]">{pb.current.text}</div>
          ) : (
            <p className="m-0 text-[13px] text-[#5B6B80]">No playbook yet. It is built once at least 3 conversations have been reviewed.</p>
          )}
          {pb && pb.history.length > 1 && (
            <details className="text-[12.5px]">
              <summary className="cursor-pointer font-semibold text-[#334155]">Earlier versions ({pb.history.length})</summary>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                {pb.history.map((h) => (
                  <li key={h.version} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">v{h.version}</span>
                    <span className="text-[#5B6B80]">{when(h.createdAt)} · {h.source === "auto" ? `${h.fromCalls} calls` : "staff edit"}</span>
                    {h.check.passed ? <span className="text-[#166534]">passed check</span> : <span className="text-[#991B1B]" title={h.check.problems.join("\n")}>failed check</span>}
                    {pb.current?.version === h.version ? (
                      <span className="rounded-full bg-[#DCFCE7] px-2 text-[11px] font-bold text-[#166534]">live</span>
                    ) : h.check.passed ? (
                      <button type="button" disabled={busy !== null} onClick={() => void act("rollback", () => api(`/playbook/rollback`, { method: "POST", json: { version: h.version } }))} className="text-[#1565C0] underline">
                        Use this version
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section aria-label="Reviewed calls" className={card}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`${h2} flex-grow`}>Reviewed calls</h2>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="rounded-[8px] border border-[#CBD5E1] px-2 py-1 text-[13px]">
              <option value="">All outcomes</option>
              {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {reviews === null ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p>
          ) : reviews.length === 0 ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">No reviewed calls in this period yet. Press &ldquo;Review new calls&rdquo; to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[#5B6B80]">
                    <th className="py-1 font-semibold">When</th>
                    <th className="py-1 font-semibold">Who</th>
                    <th className="py-1 font-semibold">Customer</th>
                    <th className="py-1 font-semibold">Outcome</th>
                    <th className="py-1 text-right font-semibold">Score</th>
                    <th className="py-1 font-semibold">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.callId} onClick={() => setOpen(open?.callId === r.callId ? null : r)} className={`cursor-pointer border-t border-[#EEF2F7] hover:bg-[#F8FAFC] ${open?.callId === r.callId ? "bg-[#EFF6FF]" : ""}`}>
                      <td className="whitespace-nowrap py-1.5">{r.call ? when(r.call.startedAt) : "–"}</td>
                      <td className="whitespace-nowrap py-1.5">{r.agent}</td>
                      <td className="py-1.5">{r.customerName ?? r.call?.counterpartyNumber ?? "–"}</td>
                      <td className="whitespace-nowrap py-1.5">{OUTCOME_LABEL[r.outcome ?? ""] ?? (r.status === "FAILED" ? "Review failed" : "–")}</td>
                      <td className="py-1.5 text-right"><Score v={r.score} /></td>
                      <td className="max-w-[460px] truncate py-1.5 text-[#475569]">{r.summary ?? r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {open && (
            <div className="flex flex-col gap-3 rounded-[12px] border border-[#BFDBFE] bg-[#F8FBFF] p-4 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[15px]">{open.customerName ?? open.call?.counterpartyNumber}</b>
                <span className="text-[#5B6B80]">{open.agent} · {OUTCOME_LABEL[open.outcome ?? ""] ?? "–"} · stage {open.stageReached?.toLowerCase() ?? "–"} · EasyLink talked {open.talkRatio != null ? `${Math.round(open.talkRatio * 100)}%` : "–"}</span>
                <Score v={open.score} />
                {open.call?.leadId && (
                  <Link href={`/master/customers/${open.call.leadId}`} className="ml-auto text-[#1565C0] underline">Customer record</Link>
                )}
                <button type="button" disabled={busy !== null} onClick={() => void act("one", () => api(`/reviews/${open.callId}/run`, { method: "POST", json: {} }))} className="text-[#1565C0] underline">
                  Review again
                </button>
              </div>
              {open.summary && <p className="m-0">{open.summary}</p>}
              {open.nextStep && <p className="m-0"><b>Next step:</b> {open.nextStep}</p>}
              {open.objections && open.objections.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <b>Objections</b>
                  {open.objections.map((o, i) => (
                    <div key={i} className="rounded-[8px] bg-white p-2">
                      <div>
                        <span className="font-semibold">{OBJ_LABEL[o.type] ?? o.type}</span> · handled {o.handled} · &ldquo;{o.customerSaid}&rdquo;
                      </div>
                      {o.response && <div className="text-[#475569]">Said: {o.response}</div>}
                      {o.better && <div className="text-[#166534]">Better: {o.better}</div>}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  ["Needs", open.needs],
                  ["Buying signals", open.buyingSignals],
                  ["What worked", open.whatWorked],
                  ["Missed", open.missed],
                  ["Coaching", open.coaching],
                ].map(([l, xs]) =>
                  xs && (xs as string[]).length ? (
                    <div key={String(l)}>
                      <b>{l as string}</b>
                      <ul className="m-0 mt-1 list-disc pl-4">
                        {(xs as string[]).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
              {open.compliance && open.compliance.length > 0 && (
                <div>
                  <b>Compliance</b>
                  <ul className="m-0 mt-1 list-disc pl-4">
                    {open.compliance.map((c, i) => (
                      <li key={i}>
                        [{c.severity}] {c.issue}
                        {c.quote ? ` · "${c.quote}"` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {open.scores && (
                <div className="flex flex-wrap gap-3 text-[12.5px] text-[#334155]">
                  {SCORE_KEYS.map((k) => (
                    <span key={k} className="capitalize">
                      {k} <b>{open.scores?.[k] ?? "–"}</b>/10
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
