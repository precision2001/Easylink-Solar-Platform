"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ai, AGENT_NAMES, AiNotConnectedError, timeAgo, type AiDecision } from "@/lib/ai-platform/client";

/**
 * Decision records (spec 8.7): every time an agent woke up, what it saw (by
 * event), what it decided, at what autonomy level and what it cost. This is
 * the audit trail for the Privacy Act automated-decision transparency duty.
 */
const OUTCOME: Record<AiDecision["outcome"], [string, string, string]> = {
  executed: ["Done", "#DCFCE7", "#166534"],
  proposed: ["Waiting for a person", "#EEF7FE", "#0B2540"],
  escalated: ["Asked a person", "#FFFBEB", "#92400E"],
  denied: ["Blocked by policy", "#FEE2E2", "#991B1B"],
  no_action: ["No action needed", "#F1F5F9", "#334155"],
  error: ["Error", "#FEE2E2", "#991B1B"],
};
const LEVEL_NAME: Record<string, string> = { L0: "Shadow", L1: "Recommends", L2: "Decides", L3: "Decides" };

export function MasterAiDecisions() {
  const [rows, setRows] = useState<AiDecision[]>([]);
  const [events, setEvents] = useState<{ id: string; type: string; at: string; subject: { type: string; id: string } }[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [agent, setAgent] = useState("all");
  const [outcome, setOutcome] = useState("all");

  useEffect(() => {
    ai.activity(200)
      .then((d) => {
        setRows(d.decisions);
        setEvents(d.events);
        setState("ready");
      })
      .catch((e) => setState(e instanceof AiNotConnectedError ? "offline" : "error"));
  }, []);

  const shown = useMemo(() => rows.filter((r) => (agent === "all" || r.agentId === agent) && (outcome === "all" || r.outcome === outcome)), [rows, agent, outcome]);
  const cost = shown.reduce((s, r) => s + r.costAud, 0);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Decision records</span>
        </nav>
        <Link href="/master/ai-approvals" className="text-[13px] font-semibold text-[#0B4A7A] hover:underline">
          AI approvals
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-grow flex-col gap-1">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Decision records</h1>
            <span className="text-[14px] text-[#475569]">
              {state === "ready" ? `${shown.length} decisions · A$${cost.toFixed(2)} model cost` : "What each agent decided, and why."}
            </span>
          </div>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
            Agent
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="h-9 rounded-[10px] border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]">
              <option value="all">All agents</option>
              {Object.entries(AGENT_NAMES).map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
            Outcome
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="h-9 rounded-[10px] border border-[#CBD5E1] bg-white px-2 text-[13px] text-[#0F172A]">
              <option value="all">All outcomes</option>
              {Object.entries(OUTCOME).map(([k, [l]]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state === "offline" && (
          <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">
            <strong className="block text-[16px] text-[#0F172A]">AI platform not connected</strong>
            Set <code>AI_PLATFORM_URL</code> on the web server to see decision records.
          </div>
        )}
        {state === "error" && <p className="text-[14px] text-[#991B1B]">Could not load decision records.</p>}

        {state === "ready" && (
          <div className="flex flex-wrap items-start gap-4">
            <section aria-label="Decisions" className="min-w-0 flex-[3_1_640px] overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#475569]">
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">When</th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Agent</th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">About</th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Outcome</th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Level</th>
                    <th className="border-b border-[#E3E8EF] p-2 font-semibold">Summary</th>
                    <th className="border-b border-[#E3E8EF] p-2 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const [l, bg, fg] = OUTCOME[r.outcome];
                    return (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap border-b border-[#EEF2F6] px-2 py-2 text-[#475569]" title={r.createdAt}>
                          {timeAgo(r.createdAt)}
                        </td>
                        <td className="border-b border-[#EEF2F6] px-2 py-2 font-semibold text-[#0F172A]">{AGENT_NAMES[r.agentId] ?? r.agentId}</td>
                        <td className="border-b border-[#EEF2F6] px-2 py-2 text-[#475569]">{r.subject ? `${r.subject.type} ${r.subject.id}` : "—"}</td>
                        <td className="border-b border-[#EEF2F6] px-2 py-2">
                          <span className="rounded-full px-2 py-0.5 text-[12px] font-semibold" style={{ background: bg, color: fg }}>
                            {l}
                          </span>
                        </td>
                        <td className="border-b border-[#EEF2F6] px-2 py-2 text-[#475569]">{r.autonomyLevel ? LEVEL_NAME[r.autonomyLevel] : "—"}</td>
                        <td className="max-w-[360px] border-b border-[#EEF2F6] px-2 py-2 text-[#334155]">{r.reasoningSummary || "—"}</td>
                        <td className="border-b border-[#EEF2F6] px-2 py-2 text-right tabular-nums text-[#0F172A]">A${r.costAud.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {shown.length === 0 && <p className="p-4 text-center text-[14px] text-[#475569]">No decisions match.</p>}
            </section>
            <section aria-label="Recent events" className="flex min-w-0 flex-[1_1_300px] flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
              <h2 className="m-0 mb-1 text-[16px] font-bold text-[#0F172A]">What the system saw</h2>
              {events.slice(0, 40).map((e) => (
                <div key={e.id} className="flex gap-2 border-b border-[#EEF2F6] py-1.5 text-[12px] last:border-0">
                  <code className="flex-grow text-[#0B2540]">{e.type}</code>
                  <span className="whitespace-nowrap text-[#5B6B80]">{timeAgo(e.at)}</span>
                </div>
              ))}
              {events.length === 0 && <span className="text-[13px] text-[#475569]">No events yet.</span>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
