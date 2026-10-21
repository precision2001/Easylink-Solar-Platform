"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Quotes & leads" mock exactly
 * (DistPipeline.dc.html + the AISuggest card) — eight shared pipeline
 * stages, card contents, counts and the stage-mapping rules. There's no
 * pipeline-board backend (stage transitions, AI check-in messages) in this
 * app yet, so the board is sample data, same convention as the Overview and
 * Sales pages. The AI card's approve/edit/reject flow is real client-side
 * state, ported from the mock's own logic.
 */

const LATE = "#B91C1C";
const DUE = "#92400E";
const OK = "#166534";
const NEUTRAL = "#475569";

type Card = {
  name: string;
  what: string;
  next: string;
  nc: string;
  /** Installer badge line — only on dispatched jobs. */
  inst?: string;
  href?: string;
};

type Column = {
  n: string;
  dot: string;
  count: number;
  cards: Card[];
};

const COLUMNS: Column[] = [
  {
    n: "New lead",
    dot: "#94A3B8",
    count: 38,
    cards: [
      { name: "Sophie Tran", what: "Penrith · solar + battery", next: "AI calls in 10 min", nc: NEUTRAL },
      { name: "Greg Holt", what: "Rooty Hill · 6.6 kW", next: "Uncontacted 2 days", nc: LATE },
    ],
  },
  {
    n: "Appointment",
    dot: "#1976D2",
    count: 9,
    cards: [{ name: "Raj Malhotra", what: "Seven Hills · 6.6 kW", next: "Site visit Mon 10 am", nc: NEUTRAL }],
  },
  {
    n: "Site assessment",
    dot: "#1976D2",
    count: 4,
    cards: [{ name: "Nina Kovac", what: "Blacktown · battery add-on", next: "Assessment Wed 2 pm", nc: NEUTRAL }],
  },
  {
    n: "Designing",
    dot: "#7C3AED",
    count: 5,
    cards: [{ name: "Tom Barker", what: "Baulkham Hills · bigger battery", next: "Callback today 3 pm", nc: DUE }],
  },
  {
    n: "Proposal sent",
    dot: "#F68A0A",
    count: 8,
    cards: [{ name: "Lucy Fraser", what: "Kellyville · 7 kW", next: "Not opened in 5 days", nc: LATE }],
  },
  {
    n: "Deposit paid",
    dot: "#B45309",
    count: 3,
    cards: [
      {
        name: "Karen Whitfield",
        what: "Castle Hill · 10.56 kW + 13.5 kWh",
        next: "Needs an installer",
        nc: DUE,
        href: "/master/dispatch",
      },
      {
        name: "Michael Ross",
        what: "Blacktown · 10.56 kW",
        next: "Network approval pending",
        nc: DUE,
        href: "/master/dispatch",
      },
    ],
  },
  {
    n: "Installing",
    dot: "#15803D",
    count: 6,
    cards: [
      {
        name: "JOB-3127 Kellyville",
        what: "6.6 kW · kit in transit",
        next: "Install Wed 15 Oct",
        nc: OK,
        inst: "Solarman",
        href: "/master/jobs",
      },
      {
        name: "JOB-3131 Anna Bell",
        what: "Rouse Hill · 8 kW + 10 kWh",
        next: "Install Tue 14 Oct",
        nc: OK,
        inst: "Crew A (own)",
        href: "/master/jobs",
      },
    ],
  },
  {
    n: "Payment completed",
    dot: "#166534",
    count: 6,
    cards: [
      {
        name: "JOB-3112 Parramatta",
        what: "8 kW + 10 kWh",
        next: "Handover pack incomplete",
        nc: LATE,
        inst: "Solarman",
      },
    ],
  },
];

const RULES = [
  { s: "Deposit paid", t: "Customer pays the deposit on the proposal. The job appears in Dispatch." },
  {
    s: "Installing",
    t: "An installer accepts the offer. The job appears in the installer's My jobs and their Pipeline at the same stage.",
  },
  {
    s: "Payment completed",
    t: "Final invoice paid. The installer's handover pack still needs approving before their payout and your install commission release.",
  },
  { s: "Own crews", t: "Jobs for your own crews skip the offer step and go straight to Jobs & Installs." },
  { s: "Installer's own leads", t: "Leads an installer registers themselves never appear here." },
  {
    s: "Customer referrals",
    t: "Friends referred from a customer's portal arrive as New lead, source Referral, with the referrer's code. The $500 credit applies when the friend pays their deposit.",
  },
  {
    s: "Customer portal",
    t: "Every lead gets a portal login when the first appointment is booked. They pick a design option and accept the proposal there, and that moves the card.",
  },
] as const;

type AiState = null | "ok" | "edit" | "no";

const AI_DONE: Record<Exclude<AiState, null>, { text: string; bg: string; fg: string }> = {
  ok: { text: "Approved by you. The action ran and was logged.", bg: "#DCFCE7", fg: "#166534" },
  edit: {
    text: "Opened for editing. Your changes are logged as feedback to the agent.",
    bg: "#F1F5F9",
    fg: "#334155",
  },
  no: { text: "Rejected. Nothing ran; the agent will not retry this.", bg: "#FEE2E2", fg: "#991B1B" },
};

function AiSuggestionCard() {
  const [state, setState] = useState<AiState>(null);
  const done = state ? AI_DONE[state] : null;

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
          AI
        </span>
        <span className="text-[12px] font-semibold text-[#0B2540]">Sales agent</span>
        <span className="flex-grow" />
        <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[12px] font-bold text-[#92400E]">
          Needs your OK
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <strong className="text-[15px] leading-[1.35]">
          6 quotes have gone quiet. Send a short check-in to each?
        </strong>
        <span className="text-[13px] leading-[1.5] text-[#334155]">
          No reply for 5 or more days after opening the proposal. Each message is personalised from the
          quote and the questions they asked. None of these customers has opted out, and none has had
          more than 2 messages this week.
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#475569]">
        <span>
          <strong className="text-[#0F172A]">Used:</strong> proposal views, message history, opt-outs
        </span>
        <span>
          <strong className="text-[#0F172A]">Rule:</strong> POL-CONTACT-01 · 3 a week, 8 am to 8 pm
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
            onClick={() => setState(null)}
            className="h-8 rounded-[8px] border border-current px-3 text-[12px] font-bold"
          >
            Undo
          </button>
          <span className="text-[12px] font-semibold">Decision DEC-918522</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setState("ok")}
            className="h-10 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white"
          >
            Approve 6 messages
          </button>
          <button
            type="button"
            onClick={() => setState("edit")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => setState("no")}
            className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#991B1B]"
          >
            Reject
          </button>
          <span className="ml-auto text-[13px] font-semibold text-[#1565C0]">Why? DEC-918522</span>
        </div>
      )}
    </section>
  );
}

function BoardCard({ card }: { card: Card }) {
  const body = (
    <>
      <strong className="text-[13px]">{card.name}</strong>
      <span className="text-[12px] text-[#5B6B80]">{card.what}</span>
      {card.inst ? (
        <span className="text-[11px] font-bold text-[#B45309]">Installer · {card.inst}</span>
      ) : null}
      <span className="text-[11px] font-semibold" style={{ color: card.nc }}>
        {card.next}
      </span>
    </>
  );

  const className =
    "flex flex-col gap-1 rounded-[10px] border border-[#E3E8EF] bg-white p-2.5 text-[#0F172A] no-underline";

  if (card.href) {
    return (
      <Link href={card.href} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

type Lead = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  address: string | null;
  retailer: string | null;
  notes: string | null;
  source: string | null;
  status: string;
  createdAt: string;
};

const STATUS_PALETTE: Record<string, [string, string]> = {
  NEW: ["#DBEAFE", "#1E40AF"],
  CONTACTED: ["#E2E8F0", "#334155"],
  QUALIFIED: ["#FEF3C7", "#92400E"],
  PROPOSAL_SENT: ["#FEF3C7", "#92400E"],
  NEGOTIATION: ["#FEF3C7", "#92400E"],
  WON: ["#DCFCE7", "#166534"],
  LOST: ["#FEE2E2", "#991B1B"],
};

const PAGE_SIZE = 20;

/** `—`, for a column this lead has no value in. */
function Blank() {
  return <span className="text-[#94A3B8]">—</span>;
}

/**
 * The real leads list.
 *
 * Everything else on this page is the pipeline mock; this table is live data
 * from `GET /leads`. It exists because a lead captured in the Agent Dialer
 * was previously write-only — the admin portal had no screen that listed
 * leads at all, so a just-saved customer looked lost.
 */
function LeadsTable() {
  const [rows, setRows] = useState<Lead[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (query) params.set("search", query);

    fetch(`/api/admin/leads?${params}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.message ?? "Could not load leads.");
        }
        return json;
      })
      .then((json) => {
        if (!live) return;
        setError(null);
        setRows(json.data ?? []);
        setTotal(json.meta?.pagination?.total ?? 0);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Could not load leads.");
      });

    return () => {
      live = false;
    };
  }, [page, query]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section
      aria-label="All leads"
      className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">All leads</h2>
        <span className="rounded-full bg-[#DCFCE7] px-2.5 py-[3px] text-[12px] font-bold text-[#166534]">
          Live data
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
          className="flex gap-2"
        >
          <label htmlFor="lead-search" className="sr-only">
            Search leads by name, email or address
          </label>
          <input
            id="lead-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or address"
            className="h-[38px] w-[230px] rounded-[10px] border border-[#CBD5E1] px-3 text-[13px] placeholder:text-[#94A3B8]"
          />
          <button
            type="submit"
            className="h-[38px] rounded-[10px] bg-[#0B1A2E] px-3.5 text-[13px] font-bold text-white"
          >
            Search
          </button>
        </form>
      </div>

      {error ? (
        <p role="alert" className="m-0 text-[13px] font-semibold text-[#991B1B]">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <p className="m-0 py-4 text-[13px] text-[#5B6B80]">Loading leads…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 py-4 text-[13px] text-[#5B6B80]">
          {query ? `No leads match “${query}”.` : "No leads yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#475569]">
                {["Customer", "Phone", "Address", "Retailer", "Source", "Status", "Created"].map(
                  (h) => (
                    <th key={h} className="border-b border-[#E3E8EF] p-2 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const [bg, fg] = STATUS_PALETTE[l.status] ?? STATUS_PALETTE.CONTACTED!;
                return (
                  <tr key={l.id}>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px]">
                      <strong className="text-[#0F172A]">{l.customerName}</strong>
                      <div className="text-[12px] text-[#5B6B80]">
                        {l.customerEmail ?? "No email"}
                      </div>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px] tabular-nums">
                      {l.customerPhone ?? <Blank />}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px]">
                      {l.address ?? <Blank />}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px]">
                      {l.retailer ?? <Blank />}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px] text-[#5B6B80]">
                      {l.source ?? <Blank />}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px]">
                      <span
                        className="rounded-full px-[9px] py-0.5 text-[12px] font-bold"
                        style={{ background: bg, color: fg }}
                      >
                        {l.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-[11px] whitespace-nowrap text-[#5B6B80]">
                      {new Date(l.createdAt).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows && rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-[#5B6B80]">
          <span className="flex-grow">
            {total} lead{total === 1 ? "" : "s"} · page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold disabled:text-[#94A3B8]"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold disabled:text-[#94A3B8]"
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function MasterQuotesLeads() {
  const [territory, setTerritory] = useState("NSW & ACT");

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
            className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-extrabold tracking-[0.04em] text-[#3B1D00] no-underline"
          >
            SOLAR DESIGN
          </Link>
          <span className="flex h-11 items-center rounded-[10px] bg-[#F68A0A] px-[18px] text-[14px] font-bold text-[#3B1D00]">
            New lead
          </span>
        </div>

        <LeadsTable />

        <AiSuggestionCard />

        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 flex-grow text-[18px] font-bold text-[#0F172A]">Pipeline board</h2>
          <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
            Sample data
          </span>
        </div>

        <section aria-label="Pipeline board" className="overflow-x-auto">
          <div className="grid min-w-[1440px] gap-2.5" style={{ gridTemplateColumns: "repeat(8, minmax(170px, 1fr))" }}>
            {COLUMNS.map((col) => (
              <div key={col.n} className="flex min-h-[360px] flex-col gap-2 rounded-[12px] bg-[#EEF2F6] p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: col.dot }} />
                  <span className="flex-grow text-[12px] font-bold text-[#334155]">{col.n}</span>
                  <span className="text-[12px] text-[#475569]">{col.count}</span>
                </div>
                {col.cards.map((card) => (
                  <BoardCard key={card.name} card={card} />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label="Stage mapping"
          className="flex flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">What moves a card</h2>
          {RULES.map((r) => (
            <div
              key={r.s}
              className="flex flex-wrap gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0"
            >
              <strong className="flex-[0_0_170px]">{r.s}</strong>
              <span className="flex-[1_1_300px] text-[#334155]">{r.t}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
