"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Handover review" mock exactly
 * (HandoverReview.dc.html + its AISuggest card in info mode).
 *
 * This app has no handover-pack model yet — no install photos, CCEW/CoC
 * uploads, test results, serial matching, STC forms or RCTI payout runs — so
 * the queue and checklists are the mock's sample data. Picking a pack,
 * approving and sending back are real client-side state, ported from the
 * mock's own logic (including JOB-3112 being blocked while incomplete).
 */

type Check = { l: string; v: string; bg: string; fg: string };

const ok = (l: string, v: string): Check => ({ l, v, bg: "#F0FDF4", fg: "#166534" });
const bad = (l: string, v: string): Check => ({ l, v, bg: "#FEF2F2", fg: "#991B1B" });
const pend = (l: string, v: string): Check => ({ l, v, bg: "#FFFBEB", fg: "#92400E" });

const INC = { status: "Incomplete", bg: "#FEE2E2", fg: "#991B1B" } as const;
const RDY = { status: "Ready to review", bg: "#DBEAFE", fg: "#1E40AF" } as const;

type Pack = {
  id: string;
  where: string;
  who: string;
  date: string;
  pay: string;
  comm: string;
  sys: string;
  blocked: boolean;
  status: string;
  bg: string;
  fg: string;
  checks: Check[];
};

const PACKS: Pack[] = [
  {
    id: "JOB-3112",
    where: "Parramatta",
    who: "Solarman",
    date: "Thu 9 Oct",
    pay: "$3,420",
    comm: "$480",
    sys: "8 kW + 10 kWh",
    blocked: true,
    ...INC,
    checks: [
      bad("Photos", "8 of 12"),
      ok("Tests", "10 of 10 pass"),
      bad("CCEW", "Missing"),
      ok("STC form", "Signed in customer portal"),
      ok("Serials", "Matched to order"),
      ok("Customer sign-off", "Signed"),
    ],
  },
  {
    id: "JOB-3128",
    where: "Castle Hill",
    who: "Solarman",
    date: "Wed 8 Oct",
    pay: "$2,180",
    comm: "$410",
    sys: "6.6 kW",
    blocked: false,
    ...RDY,
    checks: [
      ok("Photos", "12 of 12"),
      ok("Tests", "10 of 10 pass"),
      ok("CCEW", "Uploaded"),
      ok("STC form", "Signed in customer portal"),
      ok("Serials", "Matched to order"),
      ok("Customer sign-off", "Signed"),
    ],
  },
  {
    id: "JOB-3130",
    where: "Rouse Hill",
    who: "Solarman",
    date: "Fri 10 Oct",
    pay: "$1,930",
    comm: "$360",
    sys: "13 kWh battery",
    blocked: false,
    ...RDY,
    checks: [
      ok("Photos", "11 of 11"),
      pend("Tests", "1 recheck · export limit"),
      ok("CCEW", "Uploaded"),
      ok("STC form", "Signed in customer portal"),
      ok("Serials", "Matched to order"),
      ok("Customer sign-off", "Signed"),
    ],
  },
];

/** The mock's AISuggest card in "info" mode: a suggestion, not an approval. */
function AiPreCheckCard({ jobId }: { jobId: string }) {
  const [dismissed, setDismissed] = useState<"opened" | "no" | null>(null);

  const done =
    dismissed === "opened"
      ? {
          text: "Opened for editing. Your changes are logged as feedback to the agent.",
          bg: "#F1F5F9",
          fg: "#334155",
        }
      : dismissed === "no"
        ? {
            text: "Rejected. Nothing ran; the agent will not retry this.",
            bg: "#FEE2E2",
            fg: "#991B1B",
          }
        : null;

  return (
    <section
      aria-label="AI suggestion"
      className="flex w-full flex-col gap-2.5 rounded-[14px] border border-[#9CCFF3] bg-[#EEF7FE] px-4 py-3.5 text-[#0F172A]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B4A7A] px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0zM20 3v4M22 5h-4M4 17v2M5 18H3" />
          </svg>
          AI insight
        </span>
        <span className="text-[12px] font-semibold text-[#0B2540]">Delivery agent</span>
        <span className="flex-grow" />
        <span className="rounded-full bg-[#E2E8F0] px-2.5 py-0.5 text-[12px] font-bold text-[#334155]">
          Suggestion
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35]">
          AI pre-check of {jobId}: photos, serials and STC claim
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">
          Checked every photo against the required list and read the panel, inverter and battery
          serials from the photos against the sales order. The STC claim and network notice are
          drafted and wait for your approval. The CoC is signed by the licensed electrician, never by
          AI.
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
        <span>
          <strong className="text-[#0F172A]">Used:</strong> handover photos, sales order serials,
          design
        </span>
        <span>
          <strong className="text-[#0F172A]">Rule:</strong> POL-SIGN-01 · licensed sign-off stays
          human
        </span>
      </div>

      {done ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold"
          style={{ background: done.bg, color: done.fg }}
        >
          <span className="flex-grow">{done.text}</span>
          <button
            type="button"
            onClick={() => setDismissed(null)}
            className="h-8 rounded-[8px] border border-current px-3 text-[12px] font-bold"
          >
            Undo
          </button>
          <span className="text-[12px] font-semibold">Decision DEC-918526</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDismissed("opened")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            Open the drafts
          </button>
          <button
            type="button"
            onClick={() => setDismissed("no")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#991B1B]"
          >
            Dismiss
          </button>
          <span className="ml-auto text-[13px] font-semibold text-[#1565C0]">Why? DEC-918526</span>
        </div>
      )}
    </section>
  );
}

export function MasterHandoverReview() {
  const [selected, setSelected] = useState(1);
  const [doneMsg, setDoneMsg] = useState("");
  const [note, setNote] = useState("");

  const sel = PACKS[selected]!;

  const approve = () => {
    if (sel.blocked) return;
    setDoneMsg(
      `${sel.id} approved. ${sel.who} sees it as Approved in Handover packs and on their next Friday RCTI.`,
    );
  };
  const reject = () =>
    setDoneMsg(`${sel.id} sent back. ${sel.who} gets your note in their Handover pack.`);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Installer network <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Handover review</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample data
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
            Handover review
          </h1>
          <p className="mt-1 text-[13px] text-[#5B6B80]">
            Approving a pack releases the installer&apos;s payout on the next Friday run, your install
            commission, and STC lodgement
          </p>
        </div>

        <div
          className="grid items-start gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))" }}
        >
          <section
            aria-label="Queue"
            className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
          >
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
              Queue · {PACKS.length} packs
            </h2>
            {PACKS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(i);
                  setDoneMsg("");
                }}
                aria-pressed={i === selected}
                className="flex flex-col gap-1 rounded-[12px] bg-white p-3 text-left"
                style={{ border: `2px solid ${i === selected ? "#F68A0A" : "#E3E8EF"}` }}
              >
                <span className="flex items-center gap-2">
                  <strong className="flex-grow text-[14px] text-[#0F172A]">
                    {p.id} · {p.where}
                  </strong>
                  <span
                    className="rounded-full px-2 py-0.5 text-[12px] font-bold"
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {p.status}
                  </span>
                </span>
                <span className="text-[12px] text-[#5B6B80]">
                  {p.who} · installed {p.date} · payout {p.pay}
                </span>
              </button>
            ))}
          </section>

          <section
            aria-label="Pack"
            className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">
                {sel.id} · {sel.where}
              </h2>
              <span
                className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
                style={{ background: sel.bg, color: sel.fg }}
              >
                {sel.status}
              </span>
            </div>
            <span className="text-[13px] text-[#475569]">
              {sel.sys} · {sel.who}
            </span>

            <div
              className="grid gap-2.5"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              {sel.checks.map((c) => (
                <div
                  key={c.l}
                  className="flex flex-col gap-0.5 rounded-[10px] p-3"
                  style={{ background: c.bg }}
                >
                  <span className="text-[12px] text-[#475569]">{c.l}</span>
                  <strong className="text-[14px]" style={{ color: c.fg }}>
                    {c.v}
                  </strong>
                </div>
              ))}
            </div>

            <AiPreCheckCard jobId={sel.id} />

            <div className="flex flex-wrap gap-3 text-[13px] font-semibold">
              <span title="Not built yet" className="cursor-default text-[#5B6B80]">
                View photos
              </span>
              <span title="Not built yet" className="cursor-default text-[#5B6B80]">
                Test results
              </span>
              <span title="Not built yet" className="cursor-default text-[#5B6B80]">
                Certificates
              </span>
              <Link href="/master/jobs" className="text-[#1565C0]">
                Job record
              </Link>
            </div>

            <div className="flex flex-col gap-1 rounded-[10px] bg-[#F8FAFC] p-3 text-[13px]">
              <strong className="text-[#0F172A]">On approval</strong>
              <span className="text-[#334155]">
                Installer payout {sel.pay} goes on the next Friday RCTI · your install commission{" "}
                {sel.comm} moves from on hold to pending · solar and battery STCs lodged · network
                notice of completion sent
              </span>
            </div>

            {doneMsg ? (
              <p
                role="status"
                className="m-0 rounded-[10px] bg-[#DCFCE7] p-3 text-[14px] font-semibold text-[#166534]"
              >
                {doneMsg}
              </p>
            ) : null}

            <label htmlFor="note" className="text-[12px] font-semibold text-[#475569]">
              Note to installer
            </label>
            <textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What needs fixing…"
              className="resize-y rounded-[10px] border border-[#CBD5E1] px-3 py-2.5 text-[13px]"
            />

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={approve}
                aria-disabled={sel.blocked}
                title={sel.blocked ? "This pack is incomplete and can't be approved" : undefined}
                className="h-11 rounded-[10px] px-5 text-[14px] font-bold"
                style={
                  sel.blocked
                    ? { background: "#E2E8F0", color: "#475569" }
                    : { background: "#F68A0A", color: "#3B1D00" }
                }
              >
                Approve pack
              </button>
              <button
                type="button"
                onClick={reject}
                className="h-11 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#991B1B]"
              >
                Send back to installer
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
