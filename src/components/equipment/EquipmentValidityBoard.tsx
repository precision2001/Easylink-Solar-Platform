"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Equipment validity (CEC approved battery list) for the Master and Installer
 * portals: every battery range, valid / expiring / not valid, the listing end
 * date and what it means for STCs. Data: GET /api/pricing/equipment-validity
 * (backend battery ranges, refreshed by the weekly CEC check). The same
 * changes arrive as notifications in the portal bell.
 */
type Status = "valid" | "expiring" | "not-valid" | "check";
type Row = {
  id: string;
  brand: string;
  range: string;
  module: string;
  status: Status;
  reason: string;
  cec: string;
  cecExpires: string | null;
  daysLeft: number | null;
  quoted: boolean;
  stcEligible: boolean;
  commercial: boolean;
  sources: string[];
};
type Data = {
  checked: string;
  today: string;
  cecList: string;
  summary: { valid: number; expiring: number; notValid: number; check: number };
  ranges: Row[];
};

const STATUS: Record<Status, { label: string; pill: string; dot: string }> = {
  "not-valid": { label: "Not valid", pill: "bg-[#FDE8E7] text-[#B3261E] border-[#F3B8B4]", dot: "#B3261E" },
  expiring: { label: "Expiring", pill: "bg-[#FDF0DC] text-[#8A4B00] border-[#F1CF9A]", dot: "#C77700" },
  check: { label: "Check", pill: "bg-[#EEF2F6] text-[#475569] border-[#CBD5E1]", dot: "#64748B" },
  valid: { label: "Valid", pill: "bg-[#E3F4EA] text-[#1D7A46] border-[#B5DEC5]", dot: "#1D7A46" },
};

const auDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export function EquipmentValidityBoard({ portal }: { portal: "admin" | "installer" }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [onlyQuoted, setOnlyQuoted] = useState(false);
  const [showCommercial, setShowCommercial] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/pricing/equipment-validity")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { data?: Data; message?: string } | null;
        if (!res.ok || !body?.data) throw new Error(body?.message || `Couldn't load equipment validity (${res.status}).`);
        if (live) setData(body.data);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "Couldn't load equipment validity."));
    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      (data?.ranges ?? []).filter(
        (r) => (filter === "all" || r.status === filter) && (!onlyQuoted || r.quoted) && (showCommercial || !r.commercial),
      ),
    [data, filter, onlyQuoted, showCommercial],
  );

  const tiles: { key: Status; label: string; n: number; hint: string }[] = data
    ? [
        { key: "not-valid", label: "Not valid", n: data.summary.notValid, hint: "No battery STCs" },
        { key: "expiring", label: "Expiring", n: data.summary.expiring, hint: "Listing ends within 60 days" },
        { key: "check", label: "Check", n: data.summary.check, hint: "Listing not confirmed" },
        { key: "valid", label: "Valid", n: data.summary.valid, hint: "CEC listed" },
      ]
    : [];

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0F172A]">Equipment validity</h1>
          <p className="mt-1 max-w-[720px] text-[14px] leading-snug text-[#475569]">
            Batteries on the Clean Energy Council approved list. A battery must be listed on the install date for battery STCs.
            {portal === "installer" ? " Check before buying stock or booking an install." : " The pricing engine already leaves out STCs that can't be claimed."}
          </p>
        </div>
        {data ? (
          <p className="text-[12.5px] text-[#64748B]">
            Checked {auDate(data.checked)} ·{" "}
            <a href={data.cecList} target="_blank" rel="noreferrer" className="font-medium text-[#1560B8] underline">
              CEC approved battery list
            </a>
          </p>
        ) : null}
      </header>

      {error ? <p className="rounded-lg border border-[#F3B8B4] bg-[#FDE8E7] px-3 py-2 text-[14px] text-[#B3261E]">{error}</p> : null}
      {!data && !error ? <p className="text-[14px] text-[#64748B]">Loading…</p> : null}

      {data ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(filter === t.key ? "all" : t.key)}
                aria-pressed={filter === t.key}
                className={`rounded-xl border bg-white p-3 text-left shadow-sm transition ${filter === t.key ? "border-[#0F172A] ring-1 ring-[#0F172A]" : "border-[#E2E8F0]"}`}
              >
                <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[#64748B]">
                  <span className="size-2 rounded-full" style={{ background: STATUS[t.key].dot }} />
                  {t.label}
                </span>
                <span className="mt-1 block text-[26px] font-semibold tabular-nums text-[#0F172A]">{t.n}</span>
                <span className="block text-[12px] text-[#64748B]">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-4 text-[13.5px] text-[#334155]">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyQuoted} onChange={(e) => setOnlyQuoted(e.target.checked)} />
              Only batteries EasyLink quotes
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showCommercial} onChange={(e) => setShowCommercial(e.target.checked)} />
              Include commercial (C&amp;I)
            </label>
            {filter !== "all" ? (
              <button type="button" className="text-[#1560B8] underline" onClick={() => setFilter("all")}>
                Show all statuses
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-left text-[11.5px] font-semibold uppercase tracking-wide text-[#64748B]">
                  <th className="px-3 py-2">Battery</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Listing ends</th>
                  <th className="px-3 py-2">What it means</th>
                  <th className="px-3 py-2">Quoted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[#EEF2F6] align-top">
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-[#0F172A]">{r.brand}</span> {r.range}
                      <span className="block text-[12px] text-[#64748B]">{r.module}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[12px] font-semibold ${STATUS[r.status].pill}`}>{STATUS[r.status].label}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {r.cecExpires ? auDate(r.cecExpires) : "—"}
                      {r.daysLeft != null && r.daysLeft >= 0 && r.status !== "valid" ? (
                        <span className="block text-[12px] text-[#8A4B00]">{r.daysLeft} days left</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-[13.5px] leading-snug text-[#334155]">
                      {r.reason}
                      <span className="block text-[12px] text-[#64748B]">{r.cec}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-[#475569]">{r.quoted ? "Yes" : "—"}</td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-[14px] text-[#64748B]">
                      No batteries match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-[#64748B]">
            Checked every week against the CEC approved battery list, with the whysolar.com.au copy of Clean Energy Regulator data as a backup.
            Changes come to the notification bell: listings ending in 60, 30 and 7 days, approvals ended, and renewals.
          </p>
        </>
      ) : null}
    </section>
  );
}
