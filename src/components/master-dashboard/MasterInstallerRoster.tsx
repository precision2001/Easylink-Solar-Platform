"use client";

import { useEffect, useMemo, useState } from "react";

type RosterAccreditation = {
  label: string;
  status: string;
  dueAt: string | null;
};

type RosterInstaller = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  serviceAreas: string[];
  accreditations: RosterAccreditation[];
};

function isOverdue(a: RosterAccreditation): boolean {
  if (a.status !== "valid") return true;
  if (a.dueAt && new Date(a.dueAt) < new Date()) return true;
  return false;
}

function documentsSummary(accreditations: RosterAccreditation[]): {
  label: string;
  bg: string;
  fg: string;
} {
  if (accreditations.length === 0) {
    return { label: "Not uploaded", bg: "#FEE2E2", fg: "#991B1B" };
  }
  const flagged = accreditations.filter(isOverdue);
  if (flagged.length === 0) {
    return { label: "All current", bg: "#DCFCE7", fg: "#166534" };
  }
  return { label: `${flagged[0].label} due`, bg: "#FEF3C7", fg: "#92400E" };
}

function Unbuilt({ title }: { title: string }) {
  return (
    <span title={title} className="cursor-help text-[#94A3B8]">
      —
    </span>
  );
}

export function MasterInstallerRoster() {
  const [roster, setRoster] = useState<RosterInstaller[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/installer-roster")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message ?? "Failed to load installers");
        const data: RosterInstaller[] = json.data ?? [];
        setRoster(data);
        setSelectedId((prev) => prev ?? data[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load installers"));
  }, []);

  const selected = useMemo(
    () => roster?.find((r) => r.id === selectedId) ?? null,
    [roster, selectedId],
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Installers</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Installers
            </h1>
            <p className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-[#5B6B80]">
              Linked installer companies keep their own profile, crew, areas
              and documents up to date — you see it live here. Service areas
              and document status are real; capacity scheduling, ratings,
              performance stats and the rate-card acceptance workflow aren&apos;t
              built yet (shown as &ldquo;—&rdquo;).
            </p>
          </div>
          <span
            title="Invite/link flow isn't built yet"
            className="flex h-11 shrink-0 cursor-not-allowed items-center rounded-[10px] bg-[#F68A0A]/50 px-[18px] text-[14px] font-bold text-[#3B1D00]/60"
          >
            Invite or link an installer
          </span>
        </div>

        {error ? (
          <p role="alert" className="rounded-[10px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}

        <section
          aria-label="Installer list"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Installer</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Type</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">SAA</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Documents</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">This week</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Rating</th>
                  <th className="border-b border-[#E3E8EF] p-2 font-semibold">Rates card v2</th>
                </tr>
              </thead>
              <tbody>
                {roster === null ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-[#5B6B80]">
                      Loading…
                    </td>
                  </tr>
                ) : roster.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-[#5B6B80]">
                      No installer accounts yet.
                    </td>
                  </tr>
                ) : (
                  roster.map((r) => {
                    const docs = documentsSummary(r.accreditations);
                    return (
                      <tr
                        key={r.id}
                        className={selectedId === r.id ? "bg-[#FFF7E6]" : "bg-white"}
                      >
                        <td className="border-b border-[#EEF2F6] p-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(r.id)}
                            className="bg-transparent p-0 text-left font-bold text-[#1565C0] hover:text-[#0D47A1]"
                          >
                            {r.name}
                          </button>
                          <br />
                          <span className="text-[12px] text-[#5B6B80]">{r.email}</span>
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <Unbuilt title="Own crew / linked company / EasyLink service categorization isn't built yet" />
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <Unbuilt title="Accreditation-by-job-type categorization isn't built yet" />
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                            style={{ background: docs.bg, color: docs.fg }}
                          >
                            {docs.label}
                          </span>
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <Unbuilt title="Weekly capacity scheduling isn't built yet" />
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <Unbuilt title="No rating system yet" />
                        </td>
                        <td className="border-b border-[#EEF2F6] p-3">
                          <Unbuilt title="Rate-card v1/v2 acceptance workflow isn't built yet" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selected ? (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <section
              aria-label="Installer detail"
              className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">
                  {selected.name}
                </h2>
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-[3px] text-[12px] font-bold text-[#334155]">
                  Linked installer
                </span>
              </div>
              <span className="text-[13px] text-[#475569]">
                Areas:{" "}
                {selected.serviceAreas.length > 0
                  ? selected.serviceAreas.join(", ")
                  : "No service areas on file"}
              </span>

              <h3 className="m-0 mt-1 text-[14px] font-bold text-[#0F172A]">
                Documents{" "}
                <span className="font-medium text-[#5B6B80]">
                  · from their Documents &amp; profile
                </span>
              </h3>
              {selected.accreditations.length === 0 ? (
                <span className="text-[13px] text-[#5B6B80]">
                  No documents on file yet.
                </span>
              ) : (
                selected.accreditations.map((a) => (
                  <div
                    key={a.label}
                    className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-1.5 text-[13px]"
                  >
                    <span className="flex-grow">{a.label}</span>
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: isOverdue(a) ? "#92400E" : "#166534" }}
                    >
                      {isOverdue(a)
                        ? a.dueAt
                          ? `Due ${new Date(a.dueAt).toLocaleDateString("en-AU")}`
                          : a.status
                        : "Current"}
                    </span>
                  </div>
                ))
              )}

              <h3 className="m-0 mt-1 text-[14px] font-bold text-[#0F172A]">Performance</h3>
              <div className="grid grid-cols-4 gap-2">
                {["Response", "Accepted", "Right first time", "On time"].map((label) => (
                  <div
                    key={label}
                    className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-2.5"
                  >
                    <span className="text-[11px] text-[#5B6B80]">{label}</span>
                    <strong className="text-[16px] text-[#94A3B8]" title="Not built yet">
                      —
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section
              aria-label="Rates cards"
              className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
            >
              <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Rates cards</h2>
              <p className="text-[13px] text-[#5B6B80]">
                Per-installer rate cards (v1/v2 pricing by job type, with
                acceptance tracking) aren&apos;t built yet — there&apos;s no
                pricing catalogue tied to installer payouts in the system
                today.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
