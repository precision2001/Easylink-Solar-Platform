"use client";

import { customerRecordHref } from "@/components/contact-centre/api";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchInstallerLeads,
  formatPersonName,
  type InstallerLeadSummary,
} from "@/lib/installers/leads";
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
  installerLeadStage,
  stageTotals as countStages,
} from "@/components/installer/pipeline/pipelineStages";

/**
 * Pipeline status, matching the Easylink Designer "Pipeline status" artboard
 * (Pipeline.dc.html): per-stage counts above a stages table, with a board
 * view behind the same toggle.
 *
 * Columns are the eight sales stages (New lead → Payment completed) from the
 * lead's `stage`, the same pipeline Operations works in Quotes & Leads, so
 * both portals agree on where a job is. Lost leads are left out of the
 * leads list by the backend; if one does arrive, only its own stage cell is
 * marked "Lost".
 */

const STAGES = PIPELINE_STAGES;

const DONE = { bg: "#166534", fg: "#FFFFFF" };
const CURRENT = { bg: "#F68A0A", fg: "#3B1D00" };
const LOST_TONE = { bg: "#991B1B", fg: "#FFFFFF" };

function systemLabel(lead: InstallerLeadSummary) {
  const parts = [
    lead.design?.title,
    typeof lead.estimatedValue === "number"
      ? new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(lead.estimatedValue)
      : null,
  ].filter(Boolean);
  return parts.join(" · ") || "No design yet";
}

export function InstallerPipelineStatusBoard() {
  const [leads, setLeads] = useState<InstallerLeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "board">("table");
  const [owner, setOwner] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchInstallerLeads({ page: 1, limit: 100 })
      .then((result) => {
        if (!cancelled) setLeads(result.leads);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load leads");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const owners = useMemo(() => {
    const byId = new Map<string, string>();
    for (const lead of leads ?? []) {
      if (lead.assignedTo) {
        byId.set(lead.assignedTo.id, formatPersonName(lead.assignedTo));
      }
    }
    return [...byId].map(([id, name]) => ({ id, name }));
  }, [leads]);

  const shown = useMemo(
    () => (leads ?? []).filter((lead) => !owner || lead.assignedToId === owner),
    [leads, owner],
  );

  const stageTotals = useMemo(() => countStages(shown), [shown]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 font-inter text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!leads) {
    return <div className="h-[420px] animate-pulse rounded-lg bg-cream-150" />;
  }

  return (
    <div className="flex w-full flex-col gap-[18px]">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Pipeline status
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            Your leads by stage · {shown.length}{" "}
            {shown.length === 1 ? "lead" : "leads"}
          </p>
        </div>

        {owners.length ? (
          <>
            <label htmlFor="pipeline-owner" className="sr-only">
              Owner
            </label>
            <select
              id="pipeline-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-[38px] rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
            >
              <option value="">Everyone</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <div
          role="group"
          aria-label="View"
          className="flex gap-1 rounded-[10px] border border-[#E3E8EF] bg-white p-1"
        >
          {(["table", "board"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className="h-9 rounded-[8px] px-3 text-[13px] font-semibold"
              style={{
                background: view === v ? "#0B1A2E" : "transparent",
                color: view === v ? "#FFFFFF" : "#475569",
              }}
            >
              {v === "table" ? "Stages table" : "Board"}
            </button>
          ))}
        </div>

        <Link
          href="/installers/dashboard/customers"
          className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] no-underline"
        >
          Register new customer
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stageTotals.map((s) => (
          <div
            key={s.stage}
            className="flex flex-col gap-0.5 rounded-xl border border-[#E3E8EF] bg-white p-3"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#475569]">
              {s.label}
            </span>
            <span className="font-source-sans text-[24px] font-bold text-[#0F172A]">
              {s.count}
            </span>
            <span className="text-[12px] text-[#5B6B80]">
              {s.count === 1 ? "lead" : "leads"}
            </span>
          </div>
        ))}
      </div>

      {!shown.length ? (
        <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[13px] text-[#5B6B80]">
          No leads to show.
        </div>
      ) : view === "table" ? (
        <section
          aria-label="Stages table"
          className="overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white"
        >
          <table className="w-full min-w-[1200px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[#E3E8EF] bg-[#F8FAFC] p-3 text-left text-[12px] font-bold text-[#475569]">
                  Customer
                </th>
                {STAGES.map((stage) => (
                  <th
                    key={stage}
                    className="border-b border-l border-[#E3E8EF] bg-[#F8FAFC] p-3 text-left text-[12px] font-bold text-[#475569]"
                  >
                    {PIPELINE_STAGE_LABEL[stage]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((lead) => {
                const at = STAGES.indexOf(installerLeadStage(lead));
                const isLost = lead.status === "LOST";
                return (
                  <tr key={lead.id}>
                    <td className="border-b border-[#EEF2F6] p-3">
                      <Link
                        href={customerRecordHref("installers", lead.id)}
                        title="Open customer record"
                        className="text-[13px] text-[#0F172A] no-underline hover:text-[#1565C0] hover:underline"
                      >
                        <strong>{lead.customerName}</strong>
                      </Link>
                      <br />
                      <span className="text-[12px] text-[#5B6B80]">
                        {systemLabel(lead)}
                      </span>
                    </td>
                    {STAGES.map((stage, i) => {
                      // A lost lead marks only its own cell: the stages it
                      // passed through are not an achievement to show as done.
                      const tone = isLost
                        ? i === at
                          ? LOST_TONE
                          : null
                        : i < at
                          ? DONE
                          : i === at
                            ? CURRENT
                            : null;
                      const label = isLost
                        ? i === at
                          ? "Lost"
                          : ""
                        : i < at
                          ? "Done"
                          : i === at
                            ? PIPELINE_STAGE_LABEL[stage]
                            : "";
                      return (
                        <td
                          key={stage}
                          className="border-b border-l border-[#EEF2F6] p-2"
                        >
                          <span
                            className="flex h-10 items-center justify-center rounded-lg px-1.5 text-center text-[11px] font-bold"
                            style={
                              tone
                                ? { background: tone.bg, color: tone.fg }
                                : { background: "#F1F5F9", color: "#475569" }
                            }
                          >
                            {label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section aria-label="Board" className="overflow-x-auto">
          <div className="grid min-w-[1360px] grid-cols-8 gap-2.5">
            {STAGES.map((stage) => {
              const items = shown.filter(
                (lead) => installerLeadStage(lead) === stage,
              );
              return (
                <div
                  key={stage}
                  className="flex min-h-[240px] flex-col gap-2 rounded-xl bg-[#EEF2F6] p-2.5"
                >
                  <span className="text-[12px] font-bold text-[#334155]">
                    {PIPELINE_STAGE_LABEL[stage]} · {items.length}
                  </span>
                  {items.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex flex-col gap-1 rounded-[10px] border border-[#E3E8EF] bg-white p-2.5"
                    >
                      <Link
                        href={customerRecordHref("installers", lead.id)}
                        title="Open customer record"
                        className="text-[13px] text-[#0F172A] no-underline hover:text-[#1565C0] hover:underline"
                      >
                        <strong>{lead.customerName}</strong>
                      </Link>
                      <span className="text-[12px] text-[#5B6B80]">
                        {systemLabel(lead)}
                      </span>
                      {lead.assignedTo ? (
                        <span className="text-[11px] font-bold text-[#475569]">
                          {formatPersonName(lead.assignedTo)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3.5 text-[12px] text-[#334155]">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-[#166534]" />
          Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-[#F68A0A]" />
          Current stage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] border border-[#CBD5E1] bg-[#F1F5F9]" />
          Not started
        </span>
      </div>
    </div>
  );
}
