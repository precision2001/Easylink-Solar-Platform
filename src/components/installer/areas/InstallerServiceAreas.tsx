"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Service areas & availability" mock
 * (ServiceAreas.dc.html) — the settings that decide which job offers reach
 * this installer.
 *
 * Nothing here is persisted yet: the app has no service-area, travel-radius,
 * job-type, crew-roster or blocked-date model, and no installer settings
 * endpoint to save one to. Every control below is genuinely interactive —
 * the mock's own logic ported, so the region count, the radius label and the
 * crew grid all recompute — but the state lives in this component for the
 * session only.
 *
 * Because this is a settings page rather than a report, "Save changes" is
 * explicit about that rather than silently doing nothing: it reports what
 * would be saved and says it was not persisted. A Save button that looked
 * like it worked would be worse than one that admits it doesn't.
 *
 * The two locked job types (commercial, drone cleaning) are the mock's own
 * rule — they need an accreditation upload or belong to the EasyLink drone
 * team — so they stay disabled with the reason shown.
 */

type JobType = {
  n: string;
  d: string;
  on: boolean;
  locked: boolean;
};

const REGION_NAMES = [
  "Parramatta",
  "Hills District",
  "Ryde",
  "Blacktown",
  "Inner West",
  "North Shore",
  "Penrith",
  "Liverpool",
  "Sutherland",
  "Central Coast",
];

/** The mock's starting selection. */
const INITIAL_REGIONS: Record<string, boolean> = {
  Parramatta: true,
  "Hills District": true,
  Ryde: true,
  Blacktown: true,
  "Inner West": false,
  "North Shore": false,
  Penrith: false,
  Liverpool: true,
  Sutherland: false,
  "Central Coast": false,
};

const INITIAL_TYPES: JobType[] = [
  {
    n: "Solar installs",
    d: "Residential up to 15 kW · SAA install",
    on: true,
    locked: false,
  },
  {
    n: "Battery installs and add-ons",
    d: "SAA battery endorsement on file",
    on: true,
    locked: false,
  },
  {
    n: "Inverter swaps and service calls",
    d: "Warranty work paid at service rates",
    on: true,
    locked: false,
  },
  {
    n: "Site assessments",
    d: "Photos and switchboard check before quoting",
    on: false,
    locked: false,
  },
  {
    n: "Commercial over 30 kW",
    d: "Needs a design accreditation upload",
    on: false,
    locked: true,
  },
  {
    n: "Drone panel cleaning",
    d: "Done by the EasyLink drone team",
    on: false,
    locked: true,
  },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Cell load: 0 = Off, 1 = 1 job, 2 = 2 jobs. Clicking cycles through them. */
const LOAD = [
  { t: "Off", bg: "#F1F5F9", fg: "#5B6B80" },
  { t: "1 job", bg: "#DBEAFE", fg: "#1E40AF" },
  { t: "2 jobs", bg: "#1976D2", fg: "#FFFFFF" },
];

const INITIAL_WEEK: { crew: string; cells: number[] }[] = [
  { crew: "Emmanuel + Tomas", cells: [1, 1, 1, 1, 1, 0, 0] },
  { crew: "Aaron (with Tomas)", cells: [0, 1, 0, 1, 1, 1, 0] },
];

const BLOCKED = [
  { d: "Sat 18 Oct", w: "Aaron · leave" },
  { d: "24 Dec – 5 Jan", w: "Whole team · Christmas shutdown" },
  { d: "Mon 26 Jan", w: "Public holiday" },
];

export function InstallerServiceAreas() {
  const [radius, setRadius] = useState(35);
  const [base, setBase] = useState("2150 · Parramatta");
  const [regions, setRegions] = useState(INITIAL_REGIONS);
  const [types, setTypes] = useState(INITIAL_TYPES);
  const [week, setWeek] = useState(INITIAL_WEEK);
  const [saved, setSaved] = useState<string | null>(null);

  const regionCount = useMemo(
    () => Object.values(regions).filter(Boolean).length,
    [regions],
  );

  const toggleRegion = (n: string) => {
    setRegions((r) => ({ ...r, [n]: !r[n] }));
    setSaved(null);
  };

  const toggleType = (i: number) => {
    setTypes((t) =>
      t.map((x, idx) => (idx === i && !x.locked ? { ...x, on: !x.on } : x)),
    );
    setSaved(null);
  };

  const cycleCell = (row: number, col: number) => {
    setWeek((w) =>
      w.map((r, ri) =>
        ri === row
          ? { ...r, cells: r.cells.map((c, ci) => (ci === col ? (c + 1) % 3 : c)) }
          : r,
      ),
    );
    setSaved(null);
  };

  const save = () => {
    const picked = REGION_NAMES.filter((n) => regions[n]);
    const jobs = types.filter((t) => t.on).map((t) => t.n);
    const capacity = week.reduce((a, r) => a + r.cells.reduce((x, c) => x + c, 0), 0);
    setSaved(
      `${picked.length} regions (${picked.join(", ")}), ${radius} km travel, ` +
        `${jobs.length} job types, ${capacity} installs a week across ${week.length} crews.`,
    );
  };

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto">
          <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px] text-[#5B6B80]">
            <li>
              <Link
                href="/installers/dashboard/overview"
                prefetch={false}
                className="text-[#5B6B80] no-underline hover:text-[#0F172A]"
              >
                Installer Account
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">
              Service areas &amp; availability
            </li>
          </ol>
        </nav>
      </header>

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Service areas &amp; availability
          </h1>
          <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
            These settings decide which job offers reach you
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          className="h-11 rounded-[10px] bg-[#F68A0A] px-4.5 text-[14px] font-bold text-[#3B1D00]"
        >
          Save changes
        </button>
      </div>

      <InstallerAccountTabs active="areas" />

      {saved ? (
        <div
          role="status"
          className="rounded-[14px] px-4 py-3 text-[13px] leading-[1.5]"
          style={{ background: "#E0F2FE", color: "#0B2540" }}
        >
          <strong>Preview only — these settings were not saved.</strong> This app
          has no service-area or availability storage yet, so your changes live in
          this page for the session. What you set: {saved}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section
          aria-label="Areas"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Where you work</h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-[1_1_200px] flex-col gap-1">
              <label
                htmlFor="base"
                className="text-[12px] font-semibold text-[#475569]"
              >
                Base postcode
              </label>
              <input
                id="base"
                value={base}
                onChange={(e) => {
                  setBase(e.target.value);
                  setSaved(null);
                }}
                className="h-11 rounded-[10px] border border-[#CBD5E1] px-3 text-[14px] text-[#0F172A]"
              />
            </div>
            <div className="flex flex-[1_1_200px] flex-col gap-1">
              <label
                htmlFor="radius"
                className="text-[12px] font-semibold text-[#475569]"
              >
                Max travel · {radius} km
              </label>
              <input
                id="radius"
                type="range"
                min={10}
                max={80}
                step={5}
                value={radius}
                onChange={(e) => {
                  setRadius(Number(e.target.value));
                  setSaved(null);
                }}
                className="h-11 accent-[#F68A0A]"
              />
            </div>
          </div>
          <span className="text-[12px] font-semibold text-[#475569]">
            Regions you cover
          </span>
          <div className="flex flex-wrap gap-2">
            {REGION_NAMES.map((n) => {
              const on = regions[n];
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRegion(n)}
                  className="h-10 rounded-full border px-3.5 text-[13px] font-semibold"
                  style={
                    on
                      ? {
                          background: "#0B1A2E",
                          borderColor: "#0B1A2E",
                          color: "#FFFFFF",
                        }
                      : {
                          background: "#FFFFFF",
                          borderColor: "#CBD5E1",
                          color: "#0F172A",
                        }
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
          <span className="text-[12px] text-[#475569]">
            {regionCount} regions selected. EasyLink checks the postcodes against your
            licence state (NSW).
          </span>
        </section>

        <section
          aria-label="Job types"
          className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 mb-1.5 text-[16px] font-bold text-[#0F172A]">
            Job types you take
          </h2>
          {types.map((t, i) => (
            <label
              key={t.n}
              className={`flex min-h-12 items-center gap-3 border-b border-[#EEF2F6] last:border-0 ${
                t.locked ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              title={t.locked ? t.d : undefined}
            >
              <input
                type="checkbox"
                checked={t.on}
                disabled={t.locked}
                onChange={() => toggleType(i)}
                className="size-5 accent-[#F68A0A]"
              />
              <span className="flex grow flex-col">
                <span
                  className={`text-[14px] font-semibold ${
                    t.locked ? "text-[#5B6B80]" : "text-[#0F172A]"
                  }`}
                >
                  {t.n}
                </span>
                <span className="text-[12px] text-[#5B6B80]">{t.d}</span>
              </span>
            </label>
          ))}
        </section>
      </div>

      <section
        aria-label="Weekly availability"
        className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
            Standard week
          </h2>
          <span className="text-[12px] text-[#5B6B80]">
            How many installs each crew can take per day
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[860px] overflow-hidden rounded-[10px] border border-[#E3E8EF]">
            <div className="grid grid-cols-[160px_repeat(7,minmax(90px,1fr))]">
              <span className="bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#475569]">
                Crew
              </span>
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="border-l border-[#EEF2F6] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-bold text-[#334155]"
                >
                  {d}
                </span>
              ))}
              {week.map((w, ri) => (
                <Row
                  key={w.crew}
                  crew={w.crew}
                  cells={w.cells}
                  onCycle={(ci) => cycleCell(ri, ci)}
                />
              ))}
            </div>
          </div>
        </div>
        <span className="text-[12px] text-[#475569]">
          Tap a day to cycle it between Off, 1 job and 2 jobs.
        </span>
      </section>

      <section
        aria-label="Time off"
        className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
      >
        <div className="flex items-center gap-2">
          <h2 className="m-0 grow text-[16px] font-bold text-[#0F172A]">
            Blocked dates
          </h2>
          <span
            title="Not built yet — there is no calendar to block dates in"
            className="inline-flex h-10 cursor-default items-center rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]"
          >
            Block dates
          </span>
        </div>
        {BLOCKED.map((b) => (
          <div
            key={b.d}
            className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 text-[14px] last:border-0"
          >
            <span className="grow font-semibold text-[#0F172A]">{b.d}</span>
            <span className="text-[13px] text-[#475569]">{b.w}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

/** One crew row of the standard-week grid. */
function Row({
  crew,
  cells,
  onCycle,
}: {
  crew: string;
  cells: number[];
  onCycle: (col: number) => void;
}) {
  return (
    <>
      <span className="border-t border-[#EEF2F6] p-3 text-[13px] font-semibold text-[#0F172A]">
        {crew}
      </span>
      {cells.map((c, ci) => {
        const l = LOAD[c] ?? LOAD[0];
        return (
          <span
            key={WEEKDAYS[ci]}
            className="border-t border-l border-[#EEF2F6] p-2"
          >
            <button
              type="button"
              onClick={() => onCycle(ci)}
              aria-label={`${crew}, ${WEEKDAYS[ci]}: ${l.t}`}
              className="flex h-9 w-full items-center justify-center rounded-lg text-[12px] font-bold"
              style={{ background: l.bg, color: l.fg }}
            >
              {l.t}
            </button>
          </span>
        );
      })}
    </>
  );
}
