"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * Matches the Easylink Designer "Reviews" mock (Reviews.dc.html) — the
 * post-install survey results and the metrics that decide how offers are
 * ranked.
 *
 * There is no review model: nothing stores a per-job rating, comment, suburb
 * or installer reply, and no post-install SMS survey exists. The pipeline
 * analytics endpoint does carry a businessHealth block with NPS, CSAT and a
 * review count, but those are preformatted display strings rather than a star
 * distribution, so they cannot drive this page's histogram or review list
 * without inventing the structure around them. The four offer-ranking metrics
 * (response time, offers accepted, packs right first time, on-time arrivals)
 * have no source at all.
 *
 * So the figures below are the mock's sample data. The summary is computed
 * from the distribution rather than hard-coded, so the average, the total and
 * the bar widths always reconcile — change a count and the 4.7 moves with it.
 *
 * Replying is a preview: nothing is sent to the customer, and the reply is
 * kept in this page for the session so the Reply button's effect is visible.
 */

type Review = {
  job: string;
  where: string;
  stars: number;
  text: string;
  reply: string;
};

/** [stars, count] — the mock's own distribution. */
const COUNTS: [number, number][] = [
  [5, 29],
  [4, 7],
  [3, 1],
  [2, 1],
  [1, 0],
];

const REVIEWS: Review[] = [
  {
    job: "JOB-3104",
    where: "Westmead",
    stars: 5,
    text: "Arrived on time, tidy job and explained the battery app properly.",
    reply: "Thanks — enjoy the battery!",
  },
  {
    job: "JOB-3098",
    where: "Baulkham Hills",
    stars: 5,
    text: "Great crew, cleaned up everything before leaving.",
    reply: "",
  },
  {
    job: "JOB-3090",
    where: "Rydalmere",
    stars: 3,
    text: "Install was good but they had to come back for a missing label.",
    reply:
      "Sorry for the second visit — we now check labels before leaving site.",
  },
  {
    job: "JOB-3085",
    where: "Carlingford",
    stars: 4,
    text: "Good work, a bit later than the window we were given.",
    reply: "",
  },
];

const RANK: { t: string; v: string; s: string; c: string }[] = [
  { t: "Offer response time (median)", v: "38 min", s: "Good", c: "#166534" },
  { t: "Offers accepted", v: "71%", s: "Good", c: "#166534" },
  {
    t: "Handover packs right first time",
    v: "82%",
    s: "Improve",
    c: "#92400E",
  },
  { t: "On-time arrivals", v: "95%", s: "Good", c: "#166534" },
];

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export function InstallerReviews() {
  /** Replies added in this session, keyed by job. */
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const summary = useMemo(() => {
    const total = COUNTS.reduce((a, [, n]) => a + n, 0);
    const sum = COUNTS.reduce((a, [s, n]) => a + s * n, 0);
    /** Bars scale to the largest band, matching the mock's proportions. */
    const max = Math.max(...COUNTS.map(([, n]) => n), 1);
    return {
      total,
      average: total ? (sum / total).toFixed(1) : "0.0",
      bars: COUNTS.map(([s, n]) => ({ s, n, w: Math.round((n / max) * 100) })),
    };
  }, []);

  const openReply = (job: string) => {
    setDraftFor(job);
    setDraft("");
  };

  const sendReply = (job: string) => {
    const text = draft.trim();
    if (!text) return;
    setReplies((r) => ({ ...r, [job]: text }));
    setDraftFor(null);
    setDraft("");
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
            <li className="font-semibold text-[#0F172A]">Reviews</li>
          </ol>
        </nav>
      </header>

      <div>
        <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
          Reviews &amp; performance
        </h1>
        <p className="m-0 mt-1 text-[13px] text-[#5B6B80]">
          From the post-install SMS survey EasyLink sends the day after each job
        </p>
      </div>

      <InstallerAccountTabs active="reviews" />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section
          aria-label="Rating summary"
          className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <div className="flex items-baseline gap-2.5">
            <span className="font-source-sans text-[44px] font-bold text-[#0F172A]">
              {summary.average}
            </span>
            <span className="text-[14px] text-[#475569]">
              out of 5 · {summary.total} reviews
            </span>
          </div>

          {summary.bars.map((b) => (
            <div key={b.s} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-13 text-[#0F172A]">{b.s} stars</span>
              <span className="h-2.5 grow overflow-hidden rounded-full bg-[#EEF2F6]">
                <span
                  className="block h-full bg-[#F68A0A]"
                  style={{ width: `${b.w}%` }}
                />
              </span>
              <span className="w-6 text-right text-[#475569]">{b.n}</span>
            </div>
          ))}

          <h2 className="m-0 mt-2 text-[14px] font-bold text-[#0F172A]">
            What affects your offer ranking
          </h2>
          {RANK.map((r) => (
            <div
              key={r.t}
              className="flex items-center gap-2.5 border-b border-[#EEF2F6] py-2 text-[13px] last:border-0"
            >
              <span className="grow text-[#0F172A]">{r.t}</span>
              <strong className="text-[#0F172A]">{r.v}</strong>
              <span
                className="text-[12px] font-bold whitespace-nowrap"
                style={{ color: r.c }}
              >
                {r.s}
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="Recent reviews"
          className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Recent reviews</h2>
          {REVIEWS.map((r) => {
            const reply = replies[r.job] || r.reply;
            const isDrafting = draftFor === r.job;
            return (
              <article
                key={r.job}
                className="flex flex-col gap-1.5 border-b border-[#EEF2F6] py-3 last:border-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="grow text-[14px] text-[#0F172A]">
                    {r.job} · {r.where}
                  </strong>
                  <span
                    className="text-[13px] font-bold text-[#92400E]"
                    aria-label={`${r.stars} out of 5`}
                  >
                    {stars(r.stars)}
                  </span>
                </div>
                <p className="m-0 text-[14px] leading-[1.5] text-[#334155]">{r.text}</p>

                {reply ? (
                  <p className="m-0 rounded-[10px] bg-[#F8FAFC] p-2.5 text-[13px] text-[#475569]">
                    Your reply: {reply}
                    {replies[r.job] ? (
                      <span className="ml-1.5 font-semibold text-[#0B2540]">
                        (preview — not sent)
                      </span>
                    ) : null}
                  </p>
                ) : isDrafting ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`reply-${r.job}`} className="sr-only">
                      Reply to {r.job}
                    </label>
                    <textarea
                      id={`reply-${r.job}`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Thanks for the feedback…"
                      className="rounded-[10px] border border-[#CBD5E1] p-2.5 text-[13px] text-[#0F172A]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => sendReply(r.job)}
                        className="h-9 rounded-[9px] bg-[#F68A0A] px-3 text-[12px] font-bold text-[#3B1D00]"
                      >
                        Post reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftFor(null)}
                        className="h-9 rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openReply(r.job)}
                    className="h-9 self-start rounded-[9px] border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
                  >
                    Reply
                  </button>
                )}
              </article>
            );
          })}
          <span className="text-[12px] text-[#475569]">
            Replies here are a preview — this app has no review store yet, so nothing
            is sent to the customer.
          </span>
        </section>
      </div>
    </div>
  );
}
