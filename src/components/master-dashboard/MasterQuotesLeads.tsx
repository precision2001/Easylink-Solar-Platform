"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LeadsWorkspace } from "@/components/master-dashboard/quotes-leads/LeadsWorkspace";
import { NewLeadDialog } from "@/components/master-dashboard/quotes-leads/NewLeadDialog";
import {
  fetchBoard,
  fetchPipelineMeta,
  isLeadStage,
  type LeadStage,
  type PipelineMeta,
  type PipelineSummary,
} from "@/lib/admin/leads-pipeline";

/**
 * Quotes & Leads: the leads table, where each lead gets its stage, owner and
 * next action. The stage board is its own page (Pipeline, /master/pipeline);
 * a stage picked there opens here filtered to it (?stage=…).
 */

const RULES = [
  { s: "New lead", t: "Every new lead arrives with a first task: call them. It's due at the source's response target, counted in sales hours (Mon–Fri 8 am–6 pm, Sat 9 am–1 pm): design form 15 min, contact form 2 h, referral 4 h, anything else 1 day." },
  { s: "Next action", t: "Every open lead should always have one. Done completes it; + Next sets the following one. A lead with none, or with one past due, shows in red and in the Overdue view." },
  { s: "Sales owner", t: "The EasyLink staff member responsible for the sale. Not the installer: the installer is assigned in Dispatch once the deposit is paid." },
  { s: "Site visit", t: "Setting a Site visit as the next action moves the lead to Appointment; marking the visit done moves it to Site assessment. Forward only." },
  { s: "Stage", t: "Move it here as the sale progresses. Installers' journey milestones (site visit scheduled, installation started, system live…) move it forward automatically." },
  { s: "Deposit paid", t: "The job appears in Dispatch. From Installing it shows in the installer's pipeline." },
  { s: "Lost", t: "Needs a reason, and cancels the lead's open tasks. Lost leads leave the working list; reopen them from the Lost view." },
  { s: "Spam", t: "Kept but hidden from the lists, the dialler, the marketplace and reports." },
] as const;

export function MasterQuotesLeads() {
  const [territory, setTerritory] = useState("NSW & ACT");
  const [meta, setMeta] = useState<PipelineMeta | null>(null);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  // Pipeline page → a stage opens here filtered to it (?stage=PROPOSAL_SENT).
  const params = useSearchParams();
  const [stage, setStage] = useState<LeadStage | null>(() => {
    const s = params.get("stage");
    return isLeadStage(s) ? s : null;
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  useEffect(() => {
    fetchPipelineMeta()
      .then(setMeta)
      .catch((err: unknown) => setBoardError(err instanceof Error ? err.message : "Could not load the pipeline."));
  }, []);

  useEffect(() => {
    let live = true;
    fetchBoard()
      .then(({ summary }) => {
        if (!live) return;
        setBoardError(null);
        setSummary(summary ?? null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setBoardError(err instanceof Error ? err.message : "Could not load the pipeline board.");
      });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((n) => n + 1), []);

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <span className="font-semibold text-[#0F172A]">Quotes &amp; Leads</span>
        </nav>
        <label htmlFor="territory" className="sr-only">
          Territory
        </label>
        <select
          id="territory"
          value={territory}
          onChange={(e) => setTerritory(e.target.value)}
          className="h-[38px] rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
        >
          <option>NSW &amp; ACT</option>
        </select>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Quotes &amp; leads</h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Same eight stages installers use · jobs you dispatch show in the installer&apos;s pipeline
              from Installing
            </p>
          </div>
          <Link
            href="/designs"
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] no-underline"
          >
            Solar design
          </Link>
          <button
            type="button"
            onClick={() => setNewLeadOpen(true)}
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] hover:bg-[#E57F06]"
          >
            New lead
          </button>
        </div>

        {boardError ? (
          <p role="alert" className="m-0 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">
            {boardError}
          </p>
        ) : null}

        <LeadsWorkspace
          meta={meta}
          summary={summary}
          stage={stage}
          onClearStage={() => setStage(null)}
          reloadKey={reloadKey}
          onChanged={refresh}
        />

        <section
          aria-label="How the pipeline works"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">How leads move</h2>
          {RULES.map((r) => (
            <div key={r.s} className="flex flex-wrap gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0">
              <strong className="flex-[0_0_170px]">{r.s}</strong>
              <span className="flex-[1_1_300px] text-[#334155]">{r.t}</span>
            </div>
          ))}
        </section>
      </div>

      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
