"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AiNotConnectedError, type AiPortal } from "@/lib/ai-platform/client";
import { aud, day, jobs, STAGES, type JobRow, type JobView } from "@/lib/ai-platform/jobs";
import { BillsPanel, ConfirmPanel, ConnectionPanel, DatesPanel, MatchingPanel, OfferPanel } from "./EarlyStages";
import { InvoicesPanel } from "./Invoices";
import { CloseOutPanel, MonitoringPanel, OnSitePanel, OrderPanel, SignaturesPanel } from "./LateStages";
import { Btn, Pill, useJob } from "./ui";
import { DealOrderPanel } from "@/components/market/DealOrderPanel";

/**
 * One job, from design to STCs, in every portal (EasyLink Job Journey doc).
 * The AI platform decides what each person sees and may do; this screen shows
 * the journey, the person's next steps, and a tab per part of the job.
 */
type Tab = "journey" | "invoices" | "documents" | "delivery" | "onsite" | "closeout" | "monitoring" | "matching";

const TAB_OF: Record<string, Tab> = {
  design_selected: "journey",
  installer_assigned: "journey",
  selection_confirmed: "journey",
  site_photos_ok: "journey",
  job_accepted: "journey",
  agreement_signed: "documents",
  deposit_paid: "invoices",
  install_date_set: "journey",
  connection_applied: "journey",
  connection_approved: "journey",
  bills_received: "journey",
  quote_final: "journey",
  equipment_paid: "delivery",
  delivered: "delivery",
  install_started: "onsite",
  installed: "onsite",
  site_docs_sent: "onsite",
  final_paid: "invoices",
  stc_pack_signed: "closeout",
  handover_sent: "closeout",
  stc_lodged: "closeout",
  monitoring_clear: "monitoring",
};

export function JobWorkspace({ portal, jobId, backHref }: { portal: AiPortal; jobId: string; backHref?: string }) {
  const ctl = useJob(portal, jobId);
  const [tab, setTab] = useState<Tab>("journey");
  const v = ctl.view;

  if (ctl.state === "loading") return <p className="p-4 text-[14px] text-[#475569]">Loading the job…</p>;
  if (ctl.state === "offline") return <Box>Your job will appear here once the EasyLink AI platform is connected.</Box>;
  if (ctl.state === "denied") return <Box>This job isn&apos;t assigned to you.</Box>;
  if (ctl.state === "error" || !v) return <Box tone="bad">Couldn&apos;t load this job.</Box>;

  const j = v.job;
  const customer = v.viewer === "customer";
  const tabs: [Tab, string][] = [
    ["journey", customer ? "My installation" : "Journey"],
    ["invoices", `Invoices${v.invoices.length ? ` (${v.invoices.length})` : ""}`],
    ["documents", "Documents"],
    ["delivery", customer ? "Delivery" : "Order and delivery"],
    ...(!customer ? ([["onsite", "On site"]] as [Tab, string][]) : []),
    ["closeout", "STCs and handover"],
    ["monitoring", "Monitoring"],
    ...(v.viewer === "staff" ? ([["matching", "Matching"]] as [Tab, string][]) : []),
  ];
  const mine = v.next;
  const offer = v.viewer === "installer" ? v.offers.find((o) => o.status === "open") : undefined;

  return (
    <section aria-label={`Job: ${j.customerName}`} className="flex min-w-0 flex-col gap-4">
      {backHref && (
        <Link href={backHref} className="text-[13px] font-semibold text-[#0B4A7A] hover:underline">
          ← All jobs
        </Link>
      )}
      <header className="flex flex-wrap items-start gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
          <h2 className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">{customer ? j.selection.title : j.customerName}</h2>
          <span className="text-[13px] text-[#475569]">
            {j.site.address} · {j.selection.kw.toFixed(1)} kW{j.selection.battery ? ` + ${j.selection.battery.usableKwh} kWh battery` : ""} · {aud(j.selection.price)}
          </span>
          {!customer && (j.customerEmail || j.customerPhone) && !offer && <span className="text-[12.5px] text-[#475569]">{[j.customerEmail, j.customerPhone].filter(Boolean).join(" · ")}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">{customer ? "Your installer" : "Installer"}</span>
          {j.installerName ? <span className="rounded-full border border-[#9CCFF3] bg-[#EEF7FE] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#0B2540]">{j.installerName}</span> : <span className="text-[13px] text-[#92400E]">Being matched</span>}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">Installation</span>
          <span className="text-[13.5px] font-semibold text-[#0F172A]">{j.installDates ? `${day(j.installDates.day1)} – ${day(j.installDates.day2)}` : "Not booked yet"}</span>
        </div>
      </header>

      <Tracker view={v} />

      {(ctl.note || ctl.error) && (
        <div role="status" className={`flex items-start justify-between gap-2 rounded-[10px] border px-3 py-2 text-[13.5px] ${ctl.error ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]" : "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"}`}>
          <span>{ctl.error ?? ctl.note}</span>
          <button className="text-[16px] leading-none" aria-label="Dismiss" onClick={() => (ctl.setError(null), ctl.setNote(null))}>
            ×
          </button>
        </div>
      )}

      {offer ? (
        <OfferPanel ctl={ctl} view={v} />
      ) : (
        <NextSteps view={v} onGo={(k) => setTab(TAB_OF[k] ?? "journey")} mine={mine} />
      )}

      {!offer && <div className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-3 sm:p-4">
        <div role="tablist" aria-label="Job" className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#E3E8EF] px-1">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[14px] font-semibold" style={{ borderColor: tab === k ? "#0B4A7A" : "transparent", color: tab === k ? "#0B2540" : "#5B6B80" }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4 bg-[#F8FAFC] p-0 sm:rounded-[10px] sm:p-3">
          {tab === "journey" && (
            <>
              <ConfirmPanel portal={portal} ctl={ctl} view={v} />
              <DatesPanel ctl={ctl} view={v} />
              <ConnectionPanel ctl={ctl} view={v} />
              <BillsPanel portal={portal} ctl={ctl} view={v} />
            </>
          )}
          {tab === "invoices" && <InvoicesPanel portal={portal} ctl={ctl} view={v} />}
          {tab === "documents" && (v.signatures.length ? <SignaturesPanel portal={portal} ctl={ctl} view={v} /> : <Box>No documents to sign yet. The agreement appears once the installer accepts the job.</Box>)}
          {tab === "delivery" && <OrderPanel ctl={ctl} view={v} />}
          {tab === "onsite" && <OnSitePanel portal={portal} ctl={ctl} view={v} />}
          {tab === "closeout" && <CloseOutPanel portal={portal} ctl={ctl} view={v} />}
          {tab === "monitoring" && <MonitoringPanel ctl={ctl} view={v} />}
          {tab === "matching" && <MatchingPanel ctl={ctl} view={v} />}
        </div>
      </div>}
    </section>
  );
}

function Box({ children, tone }: { children: React.ReactNode; tone?: "bad" }) {
  return <div className={`rounded-[14px] border p-5 text-[14px] ${tone === "bad" ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]" : "border-[#E3E8EF] bg-white text-[#334155]"}`}>{children}</div>;
}

/** Nine stages; each fills as its milestones are reached. */
function Tracker({ view }: { view: JobView }) {
  const by = useMemo(() => STAGES.map((name, i) => ({ name, n: i + 1, ms: view.milestones.filter((m) => m.stage === i + 1) })), [view.milestones]);
  return (
    <ol aria-label="Job progress" className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-9">
      {by.map((s) => {
        const done = s.ms.filter((m) => m.done).length;
        const all = s.ms.length;
        const complete = done === all;
        const active = !complete && (done > 0 || s.ms.some((m) => m.open));
        return (
          <li key={s.n} className="flex min-w-0 flex-col gap-1 rounded-[10px] border bg-white p-2" style={{ borderColor: complete ? "#A7E3BD" : active ? "#0B4A7A" : "#E3E8EF" }} title={s.ms.map((m) => `${m.done ? "✓" : "·"} ${m.label}`).join("\n")}>
            <span className="text-[11px] font-bold text-[#5B6B80]">{s.n}</span>
            <span className="truncate text-[12.5px] font-semibold text-[#0F172A]">{s.name}</span>
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEF1F5]">
              <span className="block h-full rounded-full" style={{ width: `${(done / Math.max(all, 1)) * 100}%`, background: complete ? "#16A34A" : "#0B4A7A" }} />
            </span>
            <span className="text-[11px] text-[#5B6B80]">
              {done}/{all}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function NextSteps({ view, mine, onGo }: { view: JobView; mine: JobView["next"]; onGo: (key: string) => void }) {
  const waiting = view.waitingOn;
  if (!mine.length && !waiting.length) return null;
  const whoName = (w: string) => (w === "customer" ? (view.viewer === "staff" ? "the customer" : view.job.customerName) : w === "installer" ? (view.job.installerName ?? "the installer") : "EasyLink");
  return (
    <div className="flex flex-wrap gap-3">
      {mine.length > 0 && (
        <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-2 rounded-[14px] border-2 border-[#0B4A7A] bg-white p-4">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#0B4A7A]">{view.viewer === "staff" ? "Open steps" : "Your next step"}</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {mine.map((m) => (
              <li key={m.key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] font-semibold text-[#0F172A]">
                  {m.label}
                  {view.viewer === "staff" ? <span className="ml-2 text-[12px] font-normal text-[#5B6B80]">({whoName(m.who)})</span> : null}
                </span>
                <Btn small onClick={() => onGo(m.key)}>
                  Open
                </Btn>
              </li>
            ))}
          </ul>
        </div>
      )}
      {waiting.length > 0 && view.viewer !== "staff" && (
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]">Waiting on</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px] text-[#334155]">
            {waiting.map((m) => (
              <li key={m.key}>
                {whoName(m.who)}: {m.label.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Jobs list for installers (with offers) and staff (by stage). */
export function JobsList({ portal, hrefFor, title, intro }: { portal: AiPortal; hrefFor: (id: string) => string; title: string; intro?: string }) {
  const [rows, setRows] = useState<JobRow[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  useEffect(() => {
    jobs.list(portal).then(
      (r) => (setRows(r), setState("ready")),
      (e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : "error"),
    );
  }, [portal]);
  const offers = (rows ?? []).filter((r) => r.offer);
  const active = (rows ?? []).filter((r) => !r.offer || portal === "admin");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-source-sans text-[24px] font-bold text-[#0F172A]">{title}</h1>
        {intro && <p className="m-0 text-[14px] text-[#475569]">{intro}</p>}
      </div>
      {state === "loading" && <p className="text-[14px] text-[#475569]">Loading…</p>}
      {state === "offline" && <Box>Jobs will appear here once the EasyLink AI platform is connected.</Box>}
      {state === "error" && <Box tone="bad">Couldn&apos;t load jobs.</Box>}
      {portal === "installer" && offers.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-[#F5C77E] bg-[#FFFBEB] p-4">
          <strong className="text-[14px] text-[#92400E]">New job offers</strong>
          {offers.map((r) => (
            <Link key={r.id} href={hrefFor(r.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white px-3 py-2 text-[14px] hover:ring-1 hover:ring-[#F59E0B]">
              <span>
                <strong>{r.address.split(",").slice(-1)[0]?.trim()}</strong> · {r.system}
              </span>
              <Pill tone="warn">Answer by {new Date(r.offer!.expiresAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })}</Pill>
            </Link>
          ))}
        </div>
      )}
      {state === "ready" && (
        <div className="overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-[0.04em] text-[#5B6B80]">
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">System</th>
                <th className="px-3 py-2.5">Stage</th>
                {portal === "admin" && <th className="px-3 py-2.5">Installer</th>}
                <th className="px-3 py-2.5">Installation</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.id} className="border-t border-[#EEF1F5] hover:bg-[#F8FAFC]">
                  <td className="px-3 py-2.5">
                    <Link href={hrefFor(r.id)} className="font-semibold text-[#0B4A7A] hover:underline">
                      {r.customerName}
                    </Link>
                    <span className="block text-[12.5px] text-[#5B6B80]">{r.address}</span>
                  </td>
                  <td className="px-3 py-2.5">{r.system}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="flex gap-0.5" aria-hidden>
                        {STAGES.map((_, i) => (
                          <span key={i} className="h-2 w-3 rounded-sm" style={{ background: i < r.stage ? "#0B4A7A" : "#E3E8EF" }} />
                        ))}
                      </span>
                      <span className="text-[12.5px] text-[#334155]">
                        {r.stage}. {STAGES[r.stage - 1]}
                      </span>
                    </span>
                  </td>
                  {portal === "admin" && <td className="px-3 py-2.5">{r.installerName ?? (r.offer ? <Pill tone="info">Offered to {r.offer.installerName}</Pill> : <Pill tone="warn">Unassigned</Pill>)}</td>}
                  <td className="px-3 py-2.5 text-[13px]">{r.installDates ? `${day(r.installDates.day1)} – ${day(r.installDates.day2)}` : "—"}</td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[14px] text-[#475569]">
                    No jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** The customer's own job, found from their account. */
export function MyJob({ portal = "customer" as AiPortal }) {
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    jobs.list(portal).then(
      (r) => setId(r[0]?.id ?? null),
      () => setId(null),
    );
  }, [portal]);
  if (id === undefined) return null;
  if (id === null) return null;
  return (
    <div className="flex flex-col gap-4">
      <DealOrderPanel portal={portal} jobId={id} />
      <JobWorkspace portal={portal} jobId={id} />
    </div>
  );
}
