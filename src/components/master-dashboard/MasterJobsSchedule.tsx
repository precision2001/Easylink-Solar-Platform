"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Operations "Jobs & installs" board, laid out to match the Easylink Designer
 * DistJobs artboard: nine job-state tiles, a six-day installer schedule and a
 * job detail panel with the lifecycle strip, phase progress and linked records.
 *
 * The data is real — appointments, installers, leads, milestones, job offers
 * and payments. States this app has no model for yet (kit delivery, handover
 * packs, STC lodgement) come back as null and render as "—" rather than a
 * made-up number.
 */

type ScheduleJob = { id: string; time: string; title: string; status: string };

type ScheduleRow = {
  installerId: string;
  installerName: string;
  installerKind: string;
  cells: ScheduleJob[][];
};

type StatusCount = { key: string; label: string; value: number | null };

type WeekSchedule = {
  weekStart: string;
  days: { label: string; date: string }[];
  rows: ScheduleRow[];
  phaseCounts: { phase: string; label: string; count: number }[];
  statusCounts: StatusCount[];
};

type LifecycleStage = {
  key: string;
  label: string;
  at: string | null;
  state: "done" | "current" | "todo" | "unknown";
};

type AppointmentDetail = {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  installerName: string;
  leadId: string | null;
  leadName: string | null;
  leadAddress: string | null;
  designId: string | null;
  phaseProgress: { phase: string; label: string; completed: number; total: number }[];
  payment: { amountAud: number; status: string } | null;
  lifecycle: LifecycleStage[];
};

/** Chip palettes, matching the mock's S / I / V / D sets. */
const CHIP = {
  scheduled: { bg: "#DBEAFE", fg: "#1E3A8A" },
  install: { bg: "#DCFCE7", fg: "#14532D" },
  cancelled: { bg: "#FEE2E2", fg: "#7F1D1D" },
  progress: { bg: "#FFE7C2", fg: "#3B1D00" },
} as const;

function chipFor(status: string) {
  if (status === "COMPLETED") return CHIP.install;
  if (status === "CANCELLED" || status === "NO_SHOW") return CHIP.cancelled;
  if (status === "IN_PROGRESS") return CHIP.progress;
  return CHIP.scheduled;
}

const TILE_COLOR: Record<string, string> = {
  offered: "#1E40AF",
  accepted: "#0F172A",
  scheduled: "#0F172A",
  kitDelivered: "#0F172A",
  inProgress: "#B45309",
  packSubmitted: "#B45309",
  approved: "#166534",
  stcsLodged: "#166534",
  paid: "#166534",
};

function shiftWeek(weekStartIso: string, delta: number): string {
  const d = new Date(weekStartIso);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function weekLabel(weekStartIso: string): string {
  const d = new Date(weekStartIso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** A metric this app doesn't model yet. */
function Unbuilt() {
  return (
    <span title="Not built yet" className="cursor-help text-[#94A3B8]">
      —
    </span>
  );
}

export function MasterJobsSchedule() {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState("All installers");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const qs = weekStart ? `?weekStart=${weekStart}` : "";
    fetch(`/api/admin/jobs-schedule/week${qs}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success === false) throw new Error(json.message ?? "Failed to load schedule");
        setSchedule(json.data ?? json);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load schedule"));
  }, [weekStart]);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/admin/jobs-schedule/appointments/${selectedId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success === false) throw new Error(json.message ?? "Failed to load job");
        setDetail(json.data ?? json);
        setDetailError(null);
      })
      .catch((e: unknown) => setDetailError(e instanceof Error ? e.message : "Failed to load job"));
  }, [selectedId]);

  const rows = useMemo(() => {
    if (!schedule) return [];
    if (who === "Own crews") return schedule.rows.filter((r) => r.installerKind !== "Linked installer");
    if (who === "Linked installers")
      return schedule.rows.filter((r) => r.installerKind === "Linked installer");
    return schedule.rows;
  }, [schedule, who]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Jobs &amp; Installs</span>
        </nav>
        <label htmlFor="who" className="sr-only">
          Installer
        </label>
        <select
          id="who"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          className="h-[38px] rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]"
        >
          <option>All installers</option>
          <option>Own crews</option>
          <option>Linked installers</option>
        </select>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="flex-grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Jobs &amp; installs
            </h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              {schedule ? `Week of ${weekLabel(schedule.weekStart)}` : "Loading week"} · the same job
              records installers see in My jobs
            </p>
          </div>
          {schedule ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWeekStart(shiftWeek(schedule.weekStart, -1))}
                className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A]"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(shiftWeek(schedule.weekStart, 1))}
                className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A]"
              >
                Next →
              </button>
            </div>
          ) : null}
          <Link
            href="/master/dispatch"
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00] no-underline"
          >
            Dispatch a job
          </Link>
        </div>

        {error ? (
          <p className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]">
            {error}
          </p>
        ) : null}

        <div
          role="list"
          aria-label="Jobs by status"
          className="grid gap-1.5 overflow-x-auto"
          style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}
        >
          {(schedule?.statusCounts ?? []).map((s) => (
            <div
              key={s.key}
              role="listitem"
              className="flex min-w-[96px] flex-col gap-0.5 rounded-[10px] border border-[#E3E8EF] bg-white p-2"
            >
              <span className="text-[11px] font-bold text-[#475569]">{s.label}</span>
              <span
                className="font-source-sans text-[22px] font-bold"
                style={{ color: TILE_COLOR[s.key] ?? "#0F172A" }}
              >
                {s.value === null ? <Unbuilt /> : s.value}
              </span>
            </div>
          ))}
        </div>

        <section
          aria-label="Schedule"
          className="overflow-x-auto rounded-[14px] border border-[#E3E8EF] bg-white"
        >
          <div
            className="grid min-w-[1020px]"
            style={{ gridTemplateColumns: "170px repeat(6, minmax(140px, 1fr))" }}
          >
            <span className="border-b border-[#E3E8EF] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#475569]">
              Installer
            </span>
            {(schedule?.days ?? []).map((d) => (
              <span
                key={d.date}
                className="border-b border-l border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-bold text-[#334155]"
              >
                {d.label} {new Date(d.date).getDate()}
              </span>
            ))}

            {rows.map((r) => (
              <Row key={r.installerId} row={r} onPick={setSelectedId} />
            ))}
          </div>
          {schedule && rows.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-[#5B6B80]">
              No appointments booked for this week.
            </p>
          ) : null}
        </section>

        <section
          aria-label="Job detail"
          className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          {detailError ? (
            <p className="text-[13px] text-[#991B1B]">{detailError}</p>
          ) : !detail ? (
            <p className="text-[13px] text-[#5B6B80]">
              Select a job in the schedule above to see its lifecycle, phase progress and linked
              records.
            </p>
          ) : (
            <JobDetail detail={detail} />
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ row, onPick }: { row: ScheduleRow; onPick: (id: string) => void }) {
  return (
    <>
      <span className="flex flex-col gap-0.5 border-b border-[#EEF2F6] p-3">
        <strong className="text-[13px] text-[#0F172A]">{row.installerName}</strong>
        <span className="text-[12px] text-[#5B6B80]">{row.installerKind}</span>
      </span>
      {row.cells.map((cell, i) => (
        <span
          key={i}
          className="flex min-h-16 flex-col gap-1 border-b border-l border-[#EEF2F6] p-1.5"
        >
          {cell.map((j) => {
            const c = chipFor(j.status);
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => onPick(j.id)}
                className="flex flex-col gap-px rounded-[8px] px-2 py-1.5 text-left"
                style={{ background: c.bg, color: c.fg }}
              >
                <span className="text-[11px] font-bold">{j.time}</span>
                <span className="text-[12px] font-semibold">{j.title}</span>
              </button>
            );
          })}
        </span>
      ))}
    </>
  );
}

function JobDetail({ detail }: { detail: AppointmentDetail }) {
  const installDate = new Date(detail.startAt).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">
          {detail.title}
          {detail.leadName ? ` · ${detail.leadName}` : ""}
          {detail.leadAddress ? ` · ${detail.leadAddress}` : ""}
        </h2>
        <span className="rounded-full bg-[#FFE7C2] px-2.5 py-[3px] text-[12px] font-bold text-[#3B1D00]">
          Installer · {detail.installerName}
        </span>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Install {installDate}
        </span>
      </div>

      <ol
        aria-label="Job status"
        className="m-0 grid list-none gap-1 p-0"
        style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}
      >
        {detail.lifecycle.map((l) => (
          <li key={l.key} className="flex flex-col gap-1">
            <span
              className="h-1.5 rounded-full"
              style={{
                background:
                  l.state === "done" ? "#166534" : l.state === "current" ? "#F68A0A" : "#E2E8F0",
              }}
            />
            <span
              className="text-[11px] font-bold"
              style={{ color: l.state === "done" ? "#0F172A" : "#5B6B80" }}
              title={l.state === "unknown" ? "Not built yet" : undefined}
            >
              {l.label}
            </span>
            <span className="text-[11px] text-[#5B6B80]">
              {l.state === "unknown" ? <Unbuilt /> : shortDate(l.at)}
            </span>
          </li>
        ))}
      </ol>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">
            Installer&apos;s project workflow{" "}
            <span className="font-medium text-[#5B6B80]">· read-only</span>
          </h3>
          {detail.phaseProgress.map((p) => {
            const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
            return (
              <div key={p.phase} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-[190px] text-[#0F172A]">{p.label}</span>
                <span className="h-2 flex-grow overflow-hidden rounded-full bg-[#EEF2F6]">
                  <span
                    className="block h-full bg-[#F68A0A]"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-14 text-right text-[#475569]">
                  {p.completed} of {p.total}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">Linked records</h3>
          {detail.payment ? (
            <Link href="/master/payments" className="font-semibold text-[#1565C0]">
              Payment · ${detail.payment.amountAud.toLocaleString("en-AU")} ·{" "}
              {detail.payment.status.toLowerCase()}
            </Link>
          ) : (
            <span className="font-semibold text-[#5B6B80]">Payment · none recorded yet</span>
          )}
          {detail.designId ? (
            <Link href={`/designs/${detail.designId}`} className="font-semibold text-[#1565C0]">
              Design · open the saved design
            </Link>
          ) : (
            <span className="font-semibold text-[#5B6B80]">Design · not linked to this job</span>
          )}
          {detail.leadId ? (
            <Link href="/master/quotes-leads" className="font-semibold text-[#1565C0]">
              Lead · {detail.leadName ?? "view in Quotes & leads"}
            </Link>
          ) : null}
          <span className="font-semibold text-[#5B6B80]" title="Not built yet">
            Supply order · <Unbuilt />
          </span>
          <span className="font-semibold text-[#5B6B80]" title="Not built yet">
            Installer payout · <Unbuilt />
          </span>
          <span className="font-semibold text-[#5B6B80]" title="Not built yet">
            Handover pack · <Unbuilt />
          </span>
        </div>
      </div>
    </>
  );
}
