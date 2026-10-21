"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Matches the Easylink Designer "Policies & limits" mock (AIPolicies.dc.html):
 * the 14 limits every agent action is checked against, and the discount policy's
 * draft editor with its replay against the last 30 days.
 *
 * Sample data — this app has no policy engine, so nothing here gates anything
 * and publishing changes no behaviour. The live behaviour is the mock's own:
 * picking a policy swaps the panel, and changing the automatic threshold
 * recomputes the replay split.
 */

/** [id, name, version, hardStop] */
type Row = [string, string, number, string];

const GROUPS: [string, Row[]][] = [
  [
    "Sales and money",
    [
      ["POL-DISC-02", "Discounts", 3, ""],
      ["POL-REF-01", "Refunds", 2, ""],
      ["POL-QUOTE-01", "Quote validity", 2, ""],
      ["POL-SPEND-01", "AI spend budget", 1, ""],
    ],
  ],
  [
    "Customers",
    [
      ["POL-CONTACT-01", "Contact limits and calling hours", 1, "Hard stop"],
      ["POL-CLAIM-01", "Savings claims come from tools only", 1, "Hard stop"],
      ["POL-CARE-01", "Vulnerable customers", 1, ""],
      ["POL-AI-01", "AI says it is an AI", 1, "Hard stop"],
    ],
  ],
  [
    "Safety and compliance",
    [
      ["POL-MATCH-03", "Installer eligibility", 1, "Hard stop"],
      ["POL-DEL-01", "Irreversible submissions", 2, ""],
      ["POL-DRONE-04", "Drone flight checks", 1, "Hard stop"],
      ["POL-VPP-01", "VPP reserve and network limits", 2, "Hard stop"],
      ["POL-VPP-05", "Pausing a VPP site", 1, ""],
      ["POL-SIGN-01", "Licensed sign-off stays human", 1, "Hard stop"],
    ],
  ],
];

/** id → [owner, the rule, what happens if it is breached] */
const DETAIL: Record<string, [string, string, string]> = {
  "POL-REF-01": [
    "Finance",
    "Refunds up to A$500 within 14 days of payment run automatically. Larger refunds go to Finance.",
    "Sent for approval.",
  ],
  "POL-QUOTE-01": [
    "Sales lead",
    "A quoted price holds for 30 days. After that the agent re-prices from today's catalogue and rebates.",
    "Old price blocked; a new quote is issued.",
  ],
  "POL-SPEND-01": [
    "Owner",
    "Model and API spend per journey per day stays under budget. Spikes pause that agent.",
    "Sent for approval and the owner is alerted.",
  ],
  "POL-CONTACT-01": [
    "Sales lead",
    "At most 3 sales messages a week per customer, none after opt-out, and calls only inside the telemarketing hours standard. Do Not Call numbers are skipped.",
    "Blocked. The message is rescheduled or dropped.",
  ],
  "POL-CLAIM-01": [
    "Sales lead",
    "Any savings, payback or output figure in a message must come from a tool result for that customer's current design.",
    "Message blocked before sending.",
  ],
  "POL-CARE-01": [
    "Manager",
    "Hardship, distress, medical equipment or a complaint pauses automation on that journey and routes it to a person.",
    "Sent for approval in the vulnerable customers queue.",
  ],
  "POL-AI-01": [
    "Owner",
    "Every AI chat and call says it is an AI at the start and offers a person.",
    "Blocked.",
  ],
  "POL-MATCH-03": [
    "Ops manager",
    "Offers only go to installers with current SAA accreditation for the job type, insurance in date, the postcode in their area and spare capacity. Fewer than 2 eligible needs approval.",
    "Ineligible installers blocked; thin choice sent for approval.",
  ],
  "POL-DEL-01": [
    "Ops manager",
    "Network applications and STC claims can't be undone, so they need a person until the Delivery agent is promoted for them.",
    "Sent for approval.",
  ],
  "POL-DRONE-04": [
    "Chief remote pilot",
    "A flight needs an active drone, current maintenance, a valid remote pilot licence and operator certificate, cleared airspace and weather inside limits. Helipads or aerodromes within 3 km need the chief pilot.",
    "Blocked, or sent to the chief pilot.",
  ],
  "POL-VPP-01": [
    "VPP operator",
    "Dispatch never takes a battery below the customer's reserve, past their monthly event cap, or over the network export limit.",
    "Blocked for that site; the optimiser re-plans.",
  ],
  "POL-VPP-05": [
    "VPP operator",
    "Pausing or removing a site from the VPP needs the VPP operator.",
    "Sent for approval.",
  ],
  "POL-SIGN-01": [
    "Owner",
    "Certificates of Compliance, flight command and market compliance stay with licensed people. Agents prepare, people sign.",
    "Blocked.",
  ],
};

/**
 * What the last 30 days of discount proposals would have done at each
 * automatic threshold — the mock's own replay figures.
 */
const REPLAY: Record<number, number> = { 0: 0, 3: 12, 5: 19, 7: 28 };
/** Live today: 19 automatic, 20 to the sales lead, 2 blocked. */
const LIVE_AUTO = 19;
const LIVE_ESC = 20;

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

const FIELD_LABEL = "text-[12px] font-semibold text-[#475569]";
const SELECT =
  "h-11 rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A]";

export function MasterPolicies() {
  const [auto, setAuto] = useState(5);
  const [selectedId, setSelectedId] = useState("POL-DISC-02");
  const [reason, setReason] = useState("");

  const flat = GROUPS.flatMap(([, rows]) => rows);
  const row = flat.find(([id]) => id === selectedId) ?? flat[0]!;
  const isDiscount = row[0] === "POL-DISC-02";
  const [owner, rule, breach] = DETAIL[row[0]] ?? ["Sales lead", "", ""];

  const nAuto = REPLAY[auto] ?? LIVE_AUTO;
  const nEsc = 39 - nAuto;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          AI operations <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Policies</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
        <span className="text-[12px] text-[#5B6B80]">
          14 active · every decision records the version that judged it
        </span>
      </header>

      <div className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Limits the AI can&rsquo;t cross, however it&rsquo;s asked
          </h1>
          <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
            Each write, message or payment is checked here before it runs: allowed, sent for
            approval, or blocked. Installers see the limits that apply to their own agents as
            read-only.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-4">
          <section
            aria-label="Policies"
            className="min-w-0 flex-[1_1_300px] overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white"
          >
            {GROUPS.map(([groupName, rows]) => (
              <div key={groupName}>
                <div className="px-4 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#475569]">
                  {groupName}
                </div>
                {rows.map(([id, name, version, hardStop]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    aria-current={id === row[0] ? "true" : undefined}
                    className="flex w-full flex-col gap-0.5 border-t border-[#EEF2F6] px-4 py-2.5 text-left"
                    style={{ background: id === row[0] ? "#FFF7E6" : "#FFFFFF" }}
                  >
                    <span className="flex gap-2">
                      <strong className="flex-grow text-[14px] text-[#0F172A]">{name}</strong>
                      {hardStop ? (
                        <span className="text-[11px] font-bold text-[#991B1B]">{hardStop}</span>
                      ) : null}
                    </span>
                    <span className="font-mono text-[12px] text-[#5B6B80]">
                      {id} · v{version}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>

          <section
            aria-label="Edit policy"
            className="flex min-w-0 flex-[2_1_540px] flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-5"
          >
            {isDiscount ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-grow flex-col gap-0.5">
                    <span className="font-mono text-[12px] text-[#5B6B80]">
                      POL-DISC-02 · owner: Sales lead · applies to Sales agent
                    </span>
                    <h2 className="m-0 text-[22px] font-bold text-[#0F172A]">
                      Discounts on system quotes
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#FEF3C7] px-2.5 py-[3px] text-[12px] font-bold text-[#92400E]">
                    Draft v4 · not live
                  </span>
                </div>

                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
                >
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pa" className={FIELD_LABEL}>
                      Automatic up to
                    </label>
                    <select
                      id="pa"
                      value={auto}
                      onChange={(e) => setAuto(Number(e.target.value))}
                      className={SELECT}
                    >
                      <option value={0}>0%: always ask</option>
                      <option value={3}>3% of system price</option>
                      <option value={5}>5% of system price</option>
                      <option value={7}>7% of system price</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pb" className={FIELD_LABEL}>
                      Needs approval up to
                    </label>
                    <select id="pb" defaultValue="10" className={SELECT}>
                      <option value="10">10% of system price</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pc" className={FIELD_LABEL}>
                      Approved by
                    </label>
                    <select id="pc" defaultValue="Sales lead" className={SELECT}>
                      <option>Sales lead</option>
                      <option>Owner</option>
                    </select>
                  </div>
                </div>

                <p className="m-0 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3 text-[13px] text-[#0F172A]">
                  Above 10% is always blocked. Each package&rsquo;s margin floor applies whatever
                  the percentage. Installer Ready Deals use the installer&rsquo;s own discount rules
                  inside this ceiling.
                </p>

                <div className="flex flex-col gap-2.5">
                  <h3 className="m-0 text-[15px] font-bold text-[#0F172A]">
                    Replay against the last 30 days
                  </h3>
                  <p className="m-0 text-[13px] text-[#475569]">
                    41 discount proposals. With automatic up to {auto}%, they would have gone:
                  </p>
                  <div
                    className="grid gap-2.5"
                    style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                  >
                    <div className="rounded-[12px] bg-[#DCFCE7] p-3.5 text-[#052E16]">
                      <div className="text-[12px] font-semibold">Automatic</div>
                      <div className="font-source-sans text-[30px] font-bold">{nAuto}</div>
                      <div className="text-[12px]">{sign(nAuto - LIVE_AUTO)} vs live</div>
                    </div>
                    <div className="rounded-[12px] bg-[#FEF3C7] p-3.5 text-[#3A2A10]">
                      <div className="text-[12px] font-semibold">To sales lead</div>
                      <div className="font-source-sans text-[30px] font-bold">{nEsc}</div>
                      <div className="text-[12px]">{sign(nEsc - LIVE_ESC)} vs live</div>
                    </div>
                    <div className="rounded-[12px] bg-[#FEE2E2] p-3.5 text-[#450A0A]">
                      <div className="text-[12px] font-semibold">Blocked</div>
                      <div className="font-source-sans text-[30px] font-bold">2</div>
                      <div className="text-[12px]">no change</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="why" className={FIELD_LABEL}>
                    Reason for the change (required, kept with the version)
                  </label>
                  <textarea
                    id="why"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="For example: approvals under 7% were accepted unedited 97% of the time"
                    className="resize-y rounded-[10px] border border-[#CBD5E1] px-3 py-2.5 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="flex-grow text-[12px] text-[#5B6B80]">
                    v3 live since 12 Sep, set by Sales lead. Changes over 5 points need a second
                    approver.
                  </span>
                  <span
                    title="Not built yet"
                    className="flex h-11 cursor-default items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
                  >
                    Discard draft
                  </span>
                  <span
                    title="Not built yet — no policy engine to publish to"
                    className="flex h-11 cursor-default items-center rounded-[10px] bg-[#F68A0A]/60 px-4.5 text-[14px] font-bold text-[#3B1D00]/60"
                  >
                    Publish v4
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[12px] text-[#5B6B80]">
                    {row[0]} · v{row[2]} · owner: {owner}
                  </span>
                  <h2 className="m-0 text-[22px] font-bold text-[#0F172A]">{row[1]}</h2>
                </div>
                <p className="m-0 text-[15px] leading-[1.55] text-[#0F172A]">{rule}</p>
                <p className="m-0 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3 text-[13px] text-[#0F172A]">
                  <strong>If breached:</strong> {breach}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <span
                    title="Not built yet"
                    className="flex h-11 cursor-default items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
                  >
                    Start a draft
                  </span>
                  <Link
                    href="/master/decision-records"
                    className="inline-flex h-11 items-center rounded-[10px] border border-[#CBD5E1] px-4 text-[14px] font-semibold text-[#0F172A]"
                  >
                    Decisions it judged
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
