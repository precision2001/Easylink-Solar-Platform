"use client";

import { useMemo, useState } from "react";

import {
  ACCEPTED_FORMATS,
  COLUMN_MAP,
  CRM_BATTERY_KWH,
  CRM_LIMIT_PERCENT,
  FILTERS,
  type FilterKey,
  IMPORT_RESULT,
  INTERESTS,
  OUTCOMES,
  SAVED_FORMATS,
  STAGE_PROBABILITY,
  TILES,
  TOTAL_CONTACTS,
  applyFilter,
  buildContacts,
  dealValue,
  fileStem,
  isWarmOutcome,
  nextInQueue,
  priceOptions,
} from "@/lib/contact-lists/calling";
import { money } from "@/lib/designer/simulation";

/**
 * Matches the Easylink Designer "Contact lists" mock (ContactListsBody.dc.html)
 * as Operations sees it — upload a spreadsheet, match its columns once, then
 * call from one cleaned database.
 *
 * Who may be called, the calling queue and the four options quoted on a call
 * live in @/lib/contact-lists/calling and are covered by tests; cold-calling a
 * number on the Do Not Call Register is an offence, so that rule is not
 * something to leave sitting in a render function.
 *
 * Sample data: the contacts are the mock's, on reserved test numbers.
 */

const SUN = "#F68A0A";
const SUN_INK = "#3B1D00";
const NAVY = "#0B1A2E";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BODY = "#334155";
const BORDER = "#E3E8EF";
const GREEN = "#166534";
const RED = "#991B1B";
const AMBER = "#92400E";
const BLUE_INK = "#1E40AF";
const CREAM = "#FFF7E6";
const WHITE = "#FFFFFF";

const SUN_GRAD = `linear-gradient(90deg, #FFE866, ${SUN})`;
const HOT = `linear-gradient(135deg, #FFE866, ${SUN})`;

const SMALL_BTN =
  "min-h-[34px] cursor-pointer rounded-[9px] border border-[#CBD5E1] bg-white px-2.5 text-[12px] font-semibold";
const FIELD_BOX =
  "flex min-h-10 items-center rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[13px]";
const FIELD_LABEL = "flex flex-col gap-1 text-[12px] font-semibold";
const TH = "p-2 text-left font-semibold";
const TD = "border-t border-[#E3E8EF] px-2 py-1";
const PILL = "rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap";

const CRM_TABS: [string, string][] = [
  ["lead", "Lead"],
  ["disc", "Discovery"],
  ["sys", "System"],
  ["follow", "Follow-ups · 1"],
  ["notes", "Notes & history"],
  ["web", "Portal & website"],
];

const AUTO_STEPS = [
  "Customer & address",
  "Roof & panels",
  "Sponsored equipment",
  "4 options",
  "Profile & email",
];

const SPONSORED: [string, string, string, string][] = [
  ["Panels", "AXITEC AC-440TGB/108BBA · 440 W", "PNL-AX440", "All 4 options"],
  ["Inverter", "FOXESS 1K5-1P-HI-9.9 hybrid", "INV-FX99 · INV-S5 for Essential", "Battery-ready, AS4777.2:2020"],
  ["Battery", "10 kWh stackable · FOX ESS 32.61 kWh", "BAT-100S · BAT-FX4660", "Bill-Buster, Electrify-Ready, Maximum"],
  ["Heat pump", "Reclaim Energy Gen3 · 270 L", "HWP-RC270", "Electrify-Ready, Maximum"],
  ["EV charger", "myenergi zappi v2 · 7 kW", "EVC-ZAP7", "Electrify-Ready, Maximum"],
];

const DISCOVERY: [string, string][] = [
  ["Owns the property", "Yes"],
  ["Property type", "House"],
  ["Roof", "Tile"],
  ["Storeys", "1"],
  ["Power supply", "Single phase"],
  ["Power bill ($ per quarter)", "1,150"],
  ["Electricity retailer", "—"],
  ["Existing solar (kW)", "None"],
  ["Existing solar age (years)", "—"],
  ["Has a battery", "No"],
  ["Shading", "Some"],
  ["Electric vehicle", "Planning one"],
  ["Decision makers on the call", "Partner to confirm"],
  ["Timeframe", "1–3 months"],
  ["Paying by", "Not sure"],
  ["Best time to call", "After 5 pm"],
];

const TIMELINE: [string, string][] = [
  ["14 Oct, 4:43 pm · Call · Interested", "Keen on a battery for evening use. Partner wants to see numbers."],
  ["14 Oct, 3:43 pm · Note", "Quarterly bill about $1,150. Wants to cut evening use."],
  ["13 Oct, 11:02 am · Call · No answer", "0491 570 006"],
];

const PORTAL_LINKS: [string, string][] = [
  ["Solar designer · see your savings", "https://www.easylinksolar.com.au/designs"],
  ["EasyLink Solar home page", "https://www.easylinksolar.com.au"],
  ["Installer sign-up", "https://www.easylinksolar.com.au/installers/auth"],
];

const ROOF_FACES: [string, number, number][] = [
  ["North", 22, 11],
  ["West", 16, 8],
];

/** The distributor company placeholder the mock uses in scripts and emails. */
const ORG = "[distributor company]";

export function MasterContactLists() {
  const all = useMemo(() => buildContacts(), []);
  const options = useMemo(() => priceOptions(), []);

  const [tab, setTab] = useState<"db" | "import" | "formats">("db");
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [current, setCurrent] = useState(-1);
  const [outcome, setOutcome] = useState("");
  const [saved, setSaved] = useState("");
  const [queue, setQueue] = useState(false);
  const [crm, setCrm] = useState("lead");
  const [panels, setPanels] = useState(29);
  const [interests, setInterests] = useState<string[]>(["Solar", "Battery"]);
  const [auto, setAuto] = useState(0);
  const [preview, setPreview] = useState(1);
  const [captured, setCaptured] = useState(false);
  const [asked, setAsked] = useState(false);
  const [sent, setSent] = useState("");

  const rows = applyFilter(all, filter);
  const contact = current >= 0 ? all[current] : all[0];
  const deal = dealValue(panels);
  const firstName = contact.name.split(" ")[0];

  const startQueue = () => {
    const first = all.find((r) => r.callable);
    if (!first) return;
    setCurrent(first.index);
    setOutcome("");
    setSaved("");
    setQueue(true);
  };

  const saveCall = () => {
    if (!outcome) {
      setSaved("Pick an outcome first.");
      return;
    }
    if (queue) {
      const next = nextInQueue(all, current);
      if (next >= 0) setCurrent(next);
      setOutcome("");
      setSaved(`Saved: ${outcome}. Next contact loaded.`);
    } else {
      setSaved(`Saved: ${outcome}.`);
    }
  };

  const sendAll = () => {
    if (!asked) {
      // The Spam Act needs consent before a marketing email, so the tick is
      // a hard gate rather than a reminder.
      setSent(
        "Tick that the customer asked for the options first. Unsolicited marketing emails need consent under the Spam Act.",
      );
      return;
    }
    setSent(
      `Customer profile created in the Customer Portal with 4 options and ${captured ? "4 roof images" : "roof layouts"}. Email sent to ${contact.email} at ${new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}, logged in Notes & history, stage moved to Proposal sent, follow-up call booked in 2 days.`,
    );
  };

  const previewOption = options[preview - 1] ?? options[0];
  const faces = ROOF_FACES.map(([n, max, cols], i) => {
    const before = ROOF_FACES.slice(0, i).reduce((a, [, m]) => a + m, 0);
    const used = Math.max(0, Math.min(previewOption.panels - before, max));
    return { n, max, cols, used };
  });

  const pillStyle = (on: boolean) => ({
    background: on ? NAVY : WHITE,
    color: on ? WHITE : BODY,
    border: `1px solid ${on ? NAVY : "#CBD5E1"}`,
  });

  const chipStyle = (on: boolean) => ({
    background: on ? CREAM : WHITE,
    border: `1px solid ${on ? SUN : BORDER}`,
  });

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Contact lists</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-[1_1_320px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">Contact lists</h1>
            <p className="mb-0 mt-1 max-w-[70ch] text-[13px]" style={{ color: MUTED }}>
              Upload any spreadsheet or CSV, match its columns once, then call from one cleaned,
              editable database. Lists here are your distributor team&rsquo;s, separate from your
              installers&rsquo;.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTab("import");
              setStep("upload");
            }}
            className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] text-[14px] font-bold"
            style={{ background: SUN, color: SUN_INK }}
          >
            Upload a contact list
          </button>
        </div>

        {/* headline counts */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {TILES.map(([l, v, s], i) => {
            const hot = i === 1;
            return (
              <div
                key={l}
                className="flex flex-col gap-0.5 rounded-[14px] px-4 py-3.5"
                style={
                  hot
                    ? { background: HOT, color: SUN_INK }
                    : { background: WHITE, border: `1px solid ${BORDER}`, color: INK }
                }
              >
                <span className="text-[12px] font-semibold">{l}</span>
                <span className="font-source-sans text-[28px] font-bold">{v}</span>
                <span className="text-[12px]">{s}</span>
              </div>
            );
          })}
        </div>

        {/* section tabs */}
        <div
          role="tablist"
          aria-label="Sections"
          className="flex flex-wrap gap-1"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          {(
            [
              ["db", "Calling database"],
              ["import", "Import a list"],
              ["formats", "Saved formats"],
            ] as ["db" | "import" | "formats", string][]
          ).map(([k, l]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className="min-h-11 cursor-pointer border-0 bg-none px-3.5 text-[14px] font-semibold"
                style={{ borderBottom: `3px solid ${on ? SUN : "transparent"}`, color: on ? INK : MUTED }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* ---------------- calling database ---------------- */}
        {tab === "db" && (
          <div className="flex flex-wrap items-start gap-4">
            <section
              aria-label="Calling database"
              className="flex min-w-0 flex-[999_1_640px] flex-col gap-3 rounded-[14px] bg-white p-4"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="flex flex-wrap items-end gap-2.5">
                <label className={`${FIELD_LABEL} flex-[1_1_220px]`} style={{ color: BODY }}>
                  Search
                  <input
                    type="search"
                    placeholder="Name, number, email, suburb or postcode"
                    className="min-h-10 rounded-[10px] border border-[#CBD5E1] px-2.5 text-[14px] font-normal text-[#0F172A]"
                  />
                </label>
                <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
                  {FILTERS.map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={filter === k}
                      onClick={() => setFilter(k)}
                      className="min-h-10 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                      style={pillStyle(filter === k)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-grow text-[12px]" style={{ color: MUTED }}>
                  {rows.length} of {TOTAL_CONTACTS} contacts shown · examples
                </span>
                <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                  Add contact
                </button>
                <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                  Copy selected as CSV
                </button>
                <button
                  type="button"
                  onClick={startQueue}
                  className="min-h-[34px] cursor-pointer rounded-[9px] border-0 px-3 text-[12px] font-bold text-white"
                  style={{ background: NAVY }}
                >
                  Start calling queue
                </button>
              </div>

              <div className="overflow-x-auto rounded-[12px]" style={{ border: `1px solid ${BORDER}` }}>
                <table className="w-full min-w-[900px] border-collapse text-[13px]">
                  <thead>
                    <tr style={{ background: "#F8FAFC", color: MUTED }}>
                      <th className={TH}>Name</th>
                      <th className={TH}>Mobile</th>
                      <th className={TH}>Landline</th>
                      <th className={TH}>Suburb</th>
                      <th className={TH}>Postcode</th>
                      <th className={TH}>DNCR</th>
                      <th className={TH}>Last outcome</th>
                      <th className={TH}>List</th>
                      <th className="p-2">
                        <span className="absolute left-[-9999px]">Call</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const clear = r.dncrLabel === "Clear";
                      const warm = isWarmOutcome(r.outcome);
                      return (
                        <tr key={r.name} style={{ background: current === r.index ? CREAM : "transparent" }}>
                          <td className={TD}>
                            <input
                              defaultValue={r.name}
                              aria-label="Name"
                              className="min-h-8 w-full min-w-[140px] rounded-md border border-transparent bg-transparent px-1.5 text-[13px]"
                            />
                          </td>
                          <td className={`${TD} font-mono text-[12px]`}>{r.mobileText}</td>
                          <td className={`${TD} font-mono text-[12px]`}>{r.landlineText}</td>
                          <td className={TD}>{r.suburb}</td>
                          <td className={TD}>{r.postcode}</td>
                          <td className={TD}>
                            <span
                              className={PILL}
                              style={{
                                background: clear ? "transparent" : "#FEE2E2",
                                color: clear ? MUTED : RED,
                              }}
                            >
                              {r.dncrLabel}
                            </span>
                          </td>
                          <td className={TD}>
                            <span
                              className={PILL}
                              style={{
                                background: !r.outcome ? "transparent" : warm ? "#DCFCE7" : "#DBEAFE",
                                color: !r.outcome ? MUTED : warm ? GREEN : BLUE_INK,
                              }}
                            >
                              {r.outcomeLabel}
                            </span>
                          </td>
                          <td className={`${TD} text-[12px]`} style={{ color: MUTED }}>
                            {r.list}
                          </td>
                          <td className={TD}>
                            {r.callable ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrent(r.index);
                                  setOutcome("");
                                  setSaved("");
                                  setQueue(false);
                                }}
                                className="min-h-[34px] cursor-pointer rounded-[9px] border-0 px-3 text-[12px] font-bold"
                                style={{ background: SUN, color: SUN_INK }}
                              >
                                Call
                              </button>
                            ) : (
                              <span className={PILL} style={{ background: "#FEE2E2", color: RED }}>
                                On DNCR
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <span className="text-[12px]" style={{ color: MUTED }}>
                Example contacts with reserved test numbers. Every cell can be edited in place.
                Calling hours follow each contact&rsquo;s state: weekdays 9 am&ndash;8 pm, Saturdays
                9 am&ndash;5 pm, no Sundays or national public holidays.
              </span>
            </section>

            {/* ---------------- the call ---------------- */}
            {current >= 0 && (
              <aside
                aria-label="Call and CRM"
                className="flex flex-[1_1_100%] flex-col gap-3.5 rounded-[14px] bg-white p-4"
                style={{ border: `2px solid ${SUN}` }}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
                    <h2 className="m-0 font-source-sans text-[24px] font-bold">{contact.name}</h2>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      {contact.suburb} NSW {contact.postcode} · {contact.list}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                        Appointment
                      </span>
                      <span className={PILL} style={{ background: "#FEF3C7", color: AMBER }}>
                        New lead
                      </span>
                      {interests.map((t) => (
                        <span key={t} className={PILL} style={{ background: "#F1F5F9", color: BODY }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="grid flex-[2_1_480px] overflow-hidden rounded-[12px]"
                    style={{ border: `1px solid ${BORDER}`, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
                  >
                    {[
                      ["Sales probability", `${STAGE_PROBABILITY}%`],
                      ["Estimated revenue", money(deal.price)],
                      ["Weighted", money(deal.weighted)],
                      ["System", `${deal.kw} kW + ${CRM_BATTERY_KWH} kWh`],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        className="flex flex-col gap-0.5 px-3 py-2.5"
                        style={{ borderRight: `1px solid ${BORDER}` }}
                      >
                        <span
                          className="text-[11px] font-bold uppercase tracking-[0.05em]"
                          style={{ color: MUTED }}
                        >
                          {l}
                        </span>
                        <strong className="font-source-sans text-[22px]">{v}</strong>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuto(1);
                      setSent("");
                    }}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                    style={{ background: SUN_GRAD, color: SUN_INK }}
                  >
                    SOLAR DESIGN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrent(-1);
                      setQueue(false);
                    }}
                    className={SMALL_BTN}
                  >
                    Close
                  </button>
                </div>

                {auto > 0 ? (
                  <section
                    aria-label="Automatic solar design"
                    className="flex flex-col gap-3.5 pt-3.5"
                    style={{ borderTop: `1px solid ${BORDER}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="m-0 flex-grow font-source-sans text-[20px] font-bold">
                        Solar Design · 4 options for {contact.name}
                      </h3>
                      <button type="button" onClick={() => setAuto(0)} className={SMALL_BTN}>
                        Back to the call
                      </button>
                    </div>
                    <ol
                      aria-label="Steps"
                      className="m-0 grid list-none gap-1.5 p-0"
                      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
                    >
                      {AUTO_STEPS.map((t, i) => {
                        const n = i + 1;
                        const on = n === auto;
                        const past = n < auto;
                        return (
                          <li key={t}>
                            <button
                              type="button"
                              onClick={() => setAuto(n)}
                              aria-current={on ? "step" : undefined}
                              className="flex w-full cursor-pointer flex-col gap-1.5 rounded-[10px] border-0 px-2.5 py-2 text-left"
                              style={{
                                background: on ? NAVY : "#F8FAFC",
                                color: on ? WHITE : past ? GREEN : SLATE,
                              }}
                            >
                              <span
                                className="h-1 rounded-full"
                                style={{ background: on ? SUN : past ? GREEN : "#E2E8F0" }}
                              />
                              <span className="text-[12px] font-bold">
                                {n} · {t}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>

                    {auto === 1 && (
                      <>
                        <p className="m-0 text-[13px]" style={{ color: MUTED }}>
                          Filled from this call record. Anything missing is filled with a sensible
                          default, marked{" "}
                          <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                            Assumed
                          </span>
                          , so you can confirm it with the customer.
                        </p>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
                        >
                          {(
                            [
                              ["Customer", contact.name, false],
                              ["Mobile", contact.mobileText, false],
                              ["Email", contact.email, false],
                              ["Street", "[street]", true],
                              ["Suburb", `${contact.suburb} NSW ${contact.postcode}`, false],
                              ["Network", "Endeavour Energy · single phase", true],
                              ["Property", "House · tile roof · 1 storey", true],
                              ["Power bill", "$1,150 a quarter", false],
                              ["Usage rate · feed-in", "37c · 5c per kWh", true],
                              ["Roof faces", "North and west", true],
                              ["Interested in", interests.join(", ") || "Solar", false],
                              ["Timeframe", "1–3 months", false],
                            ] as [string, string, boolean][]
                          ).map(([l, v, assumed]) => (
                            <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                              {l}
                              <span className={`${FIELD_BOX} gap-1.5 font-normal`} style={{ color: INK }}>
                                <span className="flex-grow">{v}</span>
                                {assumed ? (
                                  <span className={PILL} style={{ background: "#DBEAFE", color: BLUE_INK }}>
                                    Assumed
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p
                          className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                          style={{ background: "#FEF3C7", color: AMBER }}
                        >
                          Street number is missing from the list, so the roof is found from the
                          suburb and postcode for now. Ask for the street before the site visit.
                        </p>
                      </>
                    )}

                    {auto === 2 && (
                      <>
                        <div role="group" aria-label="Preview option" className="flex flex-wrap gap-1.5">
                          {options.map((o, i) => {
                            const on = preview === i + 1;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => setPreview(i + 1)}
                                className="min-h-9 cursor-pointer rounded-full px-3 text-[12px] font-bold"
                                style={{ ...chipStyle(on), borderColor: on ? SUN : "#CBD5E1", color: INK }}
                              >
                                {o.n} · {o.panels} panels
                              </button>
                            );
                          })}
                        </div>
                        <div
                          role="img"
                          aria-label={`${previewOption.n}: ${previewOption.panels} panels on the north and west roof faces`}
                          className="relative flex min-h-[340px] items-center justify-center rounded-[14px] p-5"
                          style={{
                            backgroundColor: "#3D4A3A",
                            backgroundImage:
                              "linear-gradient(90deg, rgba(0,0,0,0.18) 2px, transparent 2px), linear-gradient(rgba(0,0,0,0.18) 2px, transparent 2px)",
                            backgroundSize: "120px 90px",
                          }}
                        >
                          <div
                            className="flex flex-wrap gap-1.5 rounded-md p-2.5"
                            style={{ border: "3px solid #FF4848", background: "#8A4B2A" }}
                          >
                            {faces.map((fc) => (
                              <div
                                key={fc.n}
                                className="flex flex-col items-center gap-1 rounded p-1.5"
                                style={{ background: "rgba(11,26,46,0.35)" }}
                              >
                                <div
                                  className="grid gap-[3px]"
                                  style={{ gridTemplateColumns: `repeat(${fc.cols}, 20px)` }}
                                >
                                  {Array.from({ length: fc.max }, (_, i) => (
                                    <span
                                      key={i}
                                      className="h-[30px] w-5 rounded-[2px]"
                                      style={{
                                        background: i < fc.used ? "#1976D2" : "rgba(255,255,255,0.08)",
                                        border: `1px solid ${NAVY}`,
                                      }}
                                    />
                                  ))}
                                </div>
                                <span className="text-[11px] font-semibold text-white">
                                  {fc.n} · {fc.used} of {fc.max}
                                </span>
                              </div>
                            ))}
                          </div>
                          <span
                            className="absolute bottom-2.5 left-3 rounded-md px-2 py-[3px] text-[11px]"
                            style={{ color: "#E2E8F0", background: "rgba(11,26,46,0.7)" }}
                          >
                            Satellite imagery · {contact.suburb} NSW {contact.postcode} · roof fits 38
                            × 440 W
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setCaptured(true)}
                            className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                          >
                            Capture roof images for the record
                          </button>
                          {captured ? (
                            <span role="status" className="text-[13px] font-semibold" style={{ color: GREEN }}>
                              4 layout images saved to the customer record · roof-layout-
                              {fileStem(contact.name)}-essential.png and 3 more
                            </span>
                          ) : null}
                        </div>
                      </>
                    )}

                    {auto === 3 && (
                      <>
                        <p className="m-0 text-[13px]" style={{ color: MUTED }}>
                          Sponsored equipment from the EasyLink catalogue. The same SKUs go into the
                          proposal, the installer&rsquo;s kit and the distributor&rsquo;s order.
                        </p>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                        >
                          {SPONSORED.map(([k, m, sku, use]) => (
                            <div
                              key={k}
                              className="flex flex-col gap-1 rounded-[12px] p-3"
                              style={{ border: `2px solid ${SUN}` }}
                            >
                              <span className="flex items-center gap-1.5">
                                <strong className="flex-grow text-[13px]">{k}</strong>
                                <span className={PILL} style={{ background: "#FFB547", color: SUN_INK }}>
                                  Sponsored
                                </span>
                              </span>
                              <span className="text-[13px]">{m}</span>
                              <code className="text-[11px]" style={{ color: MUTED }}>
                                {sku}
                              </code>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                {use}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {auto === 4 && (
                      <>
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}
                        >
                          {options.map((o) => (
                            <div
                              key={o.key}
                              className="flex flex-col gap-1.5 rounded-[14px] p-3.5"
                              style={{
                                border: `2px solid ${o.recommended ? SUN : BORDER}`,
                                background: o.recommended ? CREAM : WHITE,
                              }}
                            >
                              <span className="flex items-center gap-1.5">
                                <strong className="flex-grow text-[16px]">{o.n}</strong>
                                {o.recommended ? (
                                  <span className={PILL} style={{ background: "#DCFCE7", color: GREEN }}>
                                    Recommended
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                {o.d}
                              </span>
                              <strong className="font-source-sans text-[26px]">{money(o.price)}</strong>
                              <span className="text-[11px]" style={{ color: MUTED }}>
                                incl. installation &amp; GST, after STC rebates
                              </span>
                              {(
                                [
                                  ["Solar", `${o.kw} kW · ${o.panels} × AXITEC 440 W`],
                                  ["Inverter", o.inverter],
                                  ["Battery", o.battery ? `${o.battery} kWh · ${o.batterySku}` : "Battery-ready later"],
                                  [
                                    "EV charger · heat pump",
                                    `${o.ev ? "zappi 7 kW" : "—"} · ${o.heatPump ? "Reclaim 270 L" : "—"}`,
                                  ],
                                  ["Yearly savings", `≈ ${money(o.yearly)}`],
                                  ["Payback", `${o.payback.toFixed(1)} yrs (solar + battery)`],
                                ] as [string, string][]
                              ).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="flex justify-between gap-2 pt-1 text-[12px]"
                                  style={{ borderTop: `1px dashed ${BORDER}` }}
                                >
                                  <span style={{ color: MUTED }}>{k}</span>
                                  <span className="text-right font-semibold">{v}</span>
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                        <span className="text-[12px]" style={{ color: MUTED }}>
                          Savings from solar and battery at your $1,150 quarterly bill, 37c/kWh and
                          5c feed-in. EV fuel and hot-water savings come on top. Maximum is set at 29
                          panels. With the hybrid inverter, the 9.9 kW inverter could take
                          up to 45 panels (200%) if the roof fits them.
                        </span>
                      </>
                    )}

                    {auto === 5 && (
                      <>
                        <div className="flex flex-wrap items-start gap-3.5">
                          <div
                            className="flex flex-[1_1_280px] flex-col gap-1.5 rounded-[14px] p-3.5"
                            style={{ border: `1px solid ${BORDER}` }}
                          >
                            <strong className="text-[14px]">Customer portal record</strong>
                            {(
                              [
                                ["Name", contact.name],
                                ["Email", contact.email],
                                ["Mobile", contact.mobileText],
                                ["Address", `[street], ${contact.suburb} NSW ${contact.postcode}`],
                                ["Portal login", sent ? "Invite sent" : "Invite on send"],
                                ["Design options", "4 · Bill-Buster recommended"],
                                ["Roof images", captured ? "4 saved" : "Not captured yet"],
                                ["Stage", sent ? "Proposal sent" : "Designing"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <span
                                key={l}
                                className="flex justify-between gap-2 pt-1 text-[13px]"
                                style={{ borderTop: `1px solid #EEF2F6` }}
                              >
                                <span style={{ color: MUTED }}>{l}</span>
                                <span className="text-right font-semibold">{v}</span>
                              </span>
                            ))}
                            {sent ? (
                              <span
                                title="Not built yet"
                                className="cursor-help text-[13px] font-semibold"
                                style={{ color: "#1565C0" }}
                              >
                                Open what the customer sees
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="flex-[2_1_420px] overflow-hidden rounded-[14px]"
                            style={{ border: `1px solid ${BORDER}` }}
                          >
                            <div
                              className="flex flex-col gap-0.5 px-3.5 py-2.5 text-[12px]"
                              style={{ background: "#F8FAFC" }}
                            >
                              <span>
                                <strong>To:</strong> {contact.email}
                              </span>
                              <span>
                                <strong>From:</strong> {ORG} via EasyLink Solar
                              </span>
                              <span>
                                <strong>Subject:</strong> Your 4 solar and battery options, {firstName}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 p-3.5 text-[13px]">
                              <span>Hi {firstName},</span>
                              <span>
                                Thanks for your time on the phone today. Here are four options for
                                your home in {contact.suburb}, designed for your roof and your power
                                bill:
                              </span>
                              {options.map((o) => (
                                <span
                                  key={o.key}
                                  className="flex justify-between gap-2 pt-1"
                                  style={{ borderTop: `1px solid #EEF2F6` }}
                                >
                                  <strong>{o.n}</strong>
                                  <span>
                                    {o.kw} kW{o.battery ? ` + ${o.battery} kWh` : ""}
                                  </span>
                                  <strong>{money(o.price)}</strong>
                                </span>
                              ))}
                              <span
                                className="self-start rounded-[10px] px-4 py-2.5 font-bold tracking-[0.04em]"
                                style={{ background: SUN_GRAD, color: SUN_INK }}
                              >
                                VIEW MY 4 OPTIONS
                              </span>
                              <span className="text-[12px]" style={{ color: MUTED }}>
                                Your options, roof layouts and prices are saved in your EasyLink
                                customer portal. Prices are indicative until a free site check.
                                Unsubscribe from marketing emails at any time.
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={asked}
                            onClick={() => setAsked(!asked)}
                            className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                          >
                            {asked ? "✓ " : "☐ "}
                            The customer asked for these options on this call
                          </button>
                          <span className="flex-grow" />
                          <button
                            type="button"
                            onClick={sendAll}
                            className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                            style={{ background: SUN_GRAD, color: SUN_INK }}
                          >
                            Create customer profile &amp; send email
                          </button>
                        </div>
                        {sent ? (
                          <p
                            role="status"
                            className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                            style={{
                              background: asked ? "#DCFCE7" : "#FEF3C7",
                              color: asked ? GREEN : AMBER,
                            }}
                          >
                            {sent}
                          </p>
                        ) : null}
                      </>
                    )}

                    <div className="flex gap-2.5 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <button
                        type="button"
                        onClick={() => setAuto(Math.max(0, auto - 1))}
                        className={`${SMALL_BTN} min-h-10 px-3.5 text-[13px]`}
                      >
                        Back
                      </button>
                      <span className="flex-grow" />
                      {auto < 5 ? (
                        <button
                          type="button"
                          onClick={() => setAuto(Math.min(5, auto + 1))}
                          className="min-h-10 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold tracking-[0.04em]"
                          style={{ background: SUN_GRAD, color: SUN_INK }}
                        >
                          {["", "Find the roof", "Choose equipment", "Build 4 options", "Create profile & email"][auto] ?? "Next"}
                        </button>
                      ) : null}
                    </div>
                  </section>
                ) : (
                  <div className="flex flex-wrap items-start gap-[18px]">
                    {/* dialler */}
                    <div className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-2.5">
                      <p
                        className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                        style={{ background: "#DCFCE7", color: GREEN }}
                      >
                        OK to call · weekdays 9 am&ndash;8 pm in the contact&rsquo;s time zone
                      </p>
                      <span className="font-mono text-[26px] font-bold">{contact.mobileText}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          title="Not built yet"
                          className="min-h-11 flex-1 cursor-help rounded-[10px] border-0 font-bold"
                          style={{ background: SUN, color: SUN_INK }}
                        >
                          Call on this device
                        </button>
                        <button type="button" title="Not built yet" className={`${SMALL_BTN} min-h-11 cursor-help`}>
                          Copy number
                        </button>
                      </div>
                      <div
                        className="rounded-[10px] px-3 py-2.5 text-[13px]"
                        style={{ background: "#F8FAFC", color: BODY }}
                      >
                        <strong>Opening</strong>
                        <br />
                        &ldquo;Hi, it&rsquo;s [your name] from {ORG}. This call may be recorded for
                        quality and training. Is now a good time to talk about solar and battery
                        savings for your home?&rdquo;
                      </div>
                      <div
                        role="radiogroup"
                        aria-label="Outcome"
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                      >
                        {OUTCOMES.map((l) => {
                          const on = outcome === l;
                          return (
                            <button
                              key={l}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setOutcome(l)}
                              className="min-h-10 cursor-pointer rounded-[9px] px-2.5 text-left text-[12px] font-semibold"
                              style={chipStyle(on)}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>
                      <label className={FIELD_LABEL} style={{ color: BODY }}>
                        Call notes
                        <textarea
                          rows={2}
                          placeholder="Saved to the timeline"
                          className="rounded-[10px] border border-[#CBD5E1] px-2.5 py-2 text-[13px] font-normal"
                        />
                      </label>
                      <div className="flex gap-2">
                        <label className={`${FIELD_LABEL} flex-1`} style={{ color: BODY }}>
                          Follow-up
                          <span className={`${FIELD_BOX} font-normal`}>Site visit</span>
                        </label>
                        <label className={`${FIELD_LABEL} flex-1`} style={{ color: BODY }}>
                          When
                          <span className={`${FIELD_BOX} font-normal`}>Fri 16 Oct, 5:30 pm</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={saveCall}
                        className="min-h-11 cursor-pointer rounded-[10px] border-0 font-bold"
                        style={{ background: SUN, color: SUN_INK }}
                      >
                        {queue ? "Save and next" : "Save outcome"}
                      </button>
                      {saved ? (
                        <span
                          role="status"
                          className="text-[12px] font-semibold"
                          style={{ color: saved.startsWith("Pick") ? AMBER : GREEN }}
                        >
                          {saved}
                        </span>
                      ) : null}
                    </div>

                    {/* CRM */}
                    <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
                      <div
                        role="tablist"
                        aria-label="CRM sections"
                        className="flex flex-wrap gap-0.5"
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                      >
                        {CRM_TABS.map(([k, l]) => {
                          const on = crm === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              role="tab"
                              aria-selected={on}
                              onClick={() => setCrm(k)}
                              className="min-h-10 cursor-pointer border-0 bg-none px-3 text-[13px] font-semibold"
                              style={{
                                borderBottom: `3px solid ${on ? SUN : "transparent"}`,
                                color: on ? INK : MUTED,
                              }}
                            >
                              {l}
                            </button>
                          );
                        })}
                      </div>

                      {crm === "lead" && (
                        <>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                          >
                            {(
                              [
                                ["Lead stage", "Appointment"],
                                ["Sales probability %", `${STAGE_PROBABILITY} (stage default)`],
                                ["Estimated revenue $", `${money(deal.price)} from the system`],
                                ["How they found us", "Purchased list"],
                                ["Referred by", "—"],
                                ["Owner", "Daniel Shaw"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                                {l}
                                <span className={`${FIELD_BOX} font-normal`}>{v}</span>
                              </label>
                            ))}
                          </div>
                          <span className="text-[12px] font-semibold">Interested in</span>
                          <div className="flex flex-wrap gap-1.5">
                            {INTERESTS.map((l) => {
                              const on = interests.includes(l);
                              return (
                                <button
                                  key={l}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() =>
                                    setInterests(
                                      on ? interests.filter((x) => x !== l) : [...interests, l],
                                    )
                                  }
                                  className="min-h-9 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                                  style={chipStyle(on)}
                                >
                                  {l}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {crm === "disc" && (
                        <div
                          className="grid gap-2.5"
                          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                        >
                          {DISCOVERY.map(([l, v]) => (
                            <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                              {l}
                              <span className={`${FIELD_BOX} font-normal`}>{v}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {crm === "sys" && (
                        <>
                          <div
                            className="grid gap-2.5"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                          >
                            <label className={FIELD_LABEL} style={{ color: BODY }}>
                              Panels (AXITEC 440 W · PNL-AX440)
                              <span className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPanels(Math.max(1, panels - 1))}
                                  aria-label="Fewer panels"
                                  className={`${SMALL_BTN} min-h-10 w-10 px-0`}
                                >
                                  &minus;
                                </button>
                                <strong className="min-w-[32px] text-center">{panels}</strong>
                                <button
                                  type="button"
                                  onClick={() => setPanels(panels + 1)}
                                  aria-label="More panels"
                                  className={`${SMALL_BTN} min-h-10 w-10 px-0`}
                                >
                                  +
                                </button>
                              </span>
                            </label>
                            {(
                              [
                                ["Inverter", "FOXESS 1K5-1P-HI-9.9 hybrid · INV-FX99"],
                                ["Battery", "10 kWh stackable · BAT-100S × 2"],
                                ["Extras", "No EV charger · no heat pump"],
                              ] as [string, string][]
                            ).map(([l, v]) => (
                              <label key={l} className={FIELD_LABEL} style={{ color: BODY }}>
                                {l}
                                <span className={`${FIELD_BOX} font-normal`}>{v}</span>
                              </label>
                            ))}
                          </div>
                          <p className="m-0 text-[13px]">
                            <strong>{deal.kw} kW</strong> · panel : inverter {deal.ratio}% ·{" "}
                            {CRM_BATTERY_KWH} kWh battery · indicative {money(deal.price)} after STCs
                          </p>
                          {deal.oversized ? (
                            <p
                              className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                              style={{ background: "#FEE2E2", color: RED }}
                            >
                              Panel : inverter {deal.ratio}% is over the {CRM_LIMIT_PERCENT}%
                              hybrid inverter limit. Use fewer panels or a bigger inverter.
                            </p>
                          ) : null}
                        </>
                      )}

                      {crm === "follow" && (
                        <>
                          {(
                            [
                              [
                                "Site visit · Fri 16 Oct, 5:30 pm",
                                "Partner home after 5 pm · Daniel Shaw",
                                "Due",
                                "#FEF3C7",
                                AMBER,
                              ],
                              [
                                "Send designer link · Tue 13 Oct",
                                "Sent the website designer link by SMS (consented)",
                                "Done",
                                "#DCFCE7",
                                GREEN,
                              ],
                            ] as [string, string, string, string, string][]
                          ).map(([t, n, s, bg, fg]) => (
                            <div
                              key={t}
                              className="flex flex-wrap items-center gap-2 py-2"
                              style={{ borderBottom: `1px solid #EEF2F6` }}
                            >
                              <span className="flex flex-[1_1_240px] flex-col">
                                <strong className="text-[13px]">{t}</strong>
                                <span className="text-[12px]" style={{ color: MUTED }}>
                                  {n}
                                </span>
                              </span>
                              <span className={PILL} style={{ background: bg, color: fg }}>
                                {s}
                              </span>
                              <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                                Mark done
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            title="Not built yet"
                            className={`${SMALL_BTN} min-h-10 cursor-help self-start`}
                          >
                            Add follow-up
                          </button>
                        </>
                      )}

                      {crm === "notes" && (
                        <>
                          <label className={FIELD_LABEL} style={{ color: BODY }}>
                            Add a note
                            <textarea
                              rows={2}
                              className="rounded-[10px] border border-[#CBD5E1] px-2.5 py-2 text-[13px] font-normal"
                            />
                          </label>
                          {TIMELINE.map(([t, b]) => (
                            <div
                              key={t}
                              className="flex flex-col gap-0.5 pl-2.5"
                              style={{ borderLeft: `3px solid #CBD5E1` }}
                            >
                              <strong className="text-[13px]">{t}</strong>
                              <span className="text-[13px]">{b}</span>
                            </div>
                          ))}
                        </>
                      )}

                      {crm === "web" && (
                        <>
                          <p
                            className="m-0 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
                            style={{ background: "#DBEAFE", color: BLUE_INK }}
                          >
                            Looks like an existing customer: Mia Thompson · Parramatta ·
                            Appointment. Link this call record to her?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" title="Not built yet" className={`${SMALL_BTN} min-h-10 cursor-help`}>
                              Link to existing customer
                            </button>
                            <button
                              type="button"
                              title="Not built yet"
                              className="min-h-10 cursor-help rounded-[10px] border-0 px-3.5 font-bold"
                              style={{ background: SUN, color: SUN_INK }}
                            >
                              Create lead in Quotes &amp; leads
                            </button>
                          </div>
                          <span className="text-[12px]" style={{ color: MUTED }}>
                            Adds them to Quotes &amp; leads. The design, proposal and job follow the
                            lead to the installer you assign.
                          </span>
                          {PORTAL_LINKS.map(([l, u]) => (
                            <div
                              key={u}
                              className="flex flex-wrap items-center gap-2 py-2"
                              style={{ borderBottom: `1px solid #EEF2F6` }}
                            >
                              <span className="flex flex-[1_1_240px] flex-col">
                                <strong className="text-[13px]">{l}</strong>
                                <code className="text-[12px]">{u}</code>
                              </span>
                              <button type="button" title="Not built yet" className={`${SMALL_BTN} cursor-help`}>
                                Copy link
                              </button>
                            </div>
                          ))}
                          <span className="text-[12px]" style={{ color: MUTED }}>
                            Only text a link if they agreed to SMS. Every SMS needs &ldquo;Reply STOP
                            to opt out&rdquo;.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        )}

        {/* ---------------- import ---------------- */}
        {tab === "import" && (
          <section
            aria-label="Import a list"
            className="flex flex-col gap-3.5 rounded-[14px] bg-white p-4"
            style={{ border: `1px solid ${BORDER}` }}
          >
            {step === "upload" && (
              <div
                className="flex flex-col items-center gap-2 rounded-[14px] px-4 py-7 text-center"
                style={{ border: "2px dashed #CBD5E1", background: "#F8FAFC" }}
              >
                <h2 className="m-0 text-[16px] font-bold">Drop a contact list here</h2>
                <p className="m-0 text-[12px]" style={{ color: MUTED }}>
                  Any layout works. You match the columns next, and the matching is remembered for
                  lists in the same format.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {ACCEPTED_FORMATS.map((f) => (
                    <span key={f} className={PILL} style={{ background: "#F1F5F9", color: BODY }}>
                      {f}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold"
                  style={{ background: SUN, color: SUN_INK }}
                >
                  Choose a file
                </button>
                <span className="text-[12px]" style={{ color: MUTED }}>
                  Large lists are fine: a 700,000-row Excel file imports in under a minute.
                </span>
              </div>
            )}

            {step === "map" && (
              <>
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex-grow">
                    <h2 className="m-0 text-[16px] font-bold">Match columns</h2>
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      ARD-NSW.xlsx · 728,744 rows · 13 columns · heading row 1
                    </span>
                  </div>
                </div>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
                >
                  {COLUMN_MAP.map(([h, t]) => (
                    <div
                      key={h}
                      className="flex flex-col gap-1 rounded-[12px] p-2.5"
                      style={{ border: `1px solid ${SUN}` }}
                    >
                      <strong className="text-[13px]">{h}</strong>
                      <span
                        className="rounded-lg px-2 py-1.5 text-[12px] font-semibold"
                        style={{ border: "1px solid #CBD5E1" }}
                      >
                        {t}
                      </span>
                      <span className="text-[11px]" style={{ color: MUTED }}>
                        Matched by heading
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {[
                    "List name: ARD NSW",
                    "Duplicates: skip, keep the existing contact",
                    "No valid number: leave out",
                  ].map((s) => (
                    <span
                      key={s}
                      className="rounded-[10px] px-2.5 py-2 text-[12px] font-semibold"
                      style={{ border: "1px solid #CBD5E1" }}
                    >
                      {s}
                    </span>
                  ))}
                  <span className="flex-grow" />
                  <button
                    type="button"
                    onClick={() => setStep("done")}
                    className="min-h-11 cursor-pointer rounded-[10px] border-0 px-[18px] font-bold"
                    style={{ background: SUN, color: SUN_INK }}
                  >
                    Import contacts
                  </button>
                </div>
              </>
            )}

            {step === "done" && (
              <>
                <h2 className="m-0 text-[16px] font-bold">
                  &ldquo;ARD NSW&rdquo; is in your calling database
                </h2>
                <div
                  className="grid gap-2.5"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
                >
                  {IMPORT_RESULT.map(([l, v]) => (
                    <div
                      key={l}
                      className="flex flex-col rounded-[12px] p-3"
                      style={{ border: `1px solid ${BORDER}` }}
                    >
                      <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
                        {l}
                      </span>
                      <strong className="font-source-sans text-[24px]">{v}</strong>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTab("db");
                    setStep("upload");
                  }}
                  className="min-h-11 cursor-pointer self-start rounded-[10px] border-0 px-[18px] font-bold"
                  style={{ background: SUN, color: SUN_INK }}
                >
                  Open the calling database
                </button>
              </>
            )}
          </section>
        )}

        {/* ---------------- saved formats ---------------- */}
        {tab === "formats" && (
          <section
            aria-label="Saved formats"
            className="flex flex-col gap-2 rounded-[14px] bg-white p-4"
            style={{ border: `1px solid ${BORDER}` }}
          >
            <h2 className="m-0 text-[16px] font-bold">Saved formats</h2>
            <p className="m-0 text-[12px]" style={{ color: MUTED }}>
              A file whose headings match a saved format is matched automatically. You can still
              change it before importing.
            </p>
            {SAVED_FORMATS.map(([n, d]) => (
              <div
                key={n}
                className="flex flex-wrap items-center gap-2.5 py-2.5"
                style={{ borderTop: `1px solid #EEF2F6` }}
              >
                <span className="flex flex-[1_1_300px] flex-col">
                  <strong>{n}</strong>
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    {d}
                  </span>
                </span>
                <button
                  type="button"
                  title="Not built yet"
                  className={`${SMALL_BTN} cursor-help`}
                  style={{ color: RED }}
                >
                  Forget
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
