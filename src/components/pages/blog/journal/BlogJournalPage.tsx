"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { JournalCard } from "@/components/pages/blog/journal/JournalCard";
import { RebateCheck } from "@/components/pages/blog/journal/RebateCheck";
import { RebateCountdown } from "@/components/pages/blog/journal/RebateCountdown";
import { fetchPublicBlogs } from "@/lib/public/blogs";
import { getBlogPostDetailHref, type BlogPost } from "@/utils/constant";

/** Market figures for the ticker. Each is sourced in the blog post that covers it. */
const TICKER = [
  { k: "Battery certificates per kWh", v: "6.8 → 5.7 on 1 Jan", tone: "text-blog-amber-ink" },
  { k: "Solar rebate", v: "20% less from 1 Jan", tone: "text-blog-amber-ink" },
  { k: "Solar Sharer", v: "3 free hours a day", tone: "text-teal-deep" },
  { k: "Default power prices 2026–27", v: "down 1.1% to 10.7%", tone: "text-success" },
  { k: "Home batteries since July 2025", v: "600,000+", tone: "text-teal-deep" },
  { k: "Australia's 2035 target", v: "62–70% emissions cut", tone: "text-teal-deep" },
];

const ALL = "All";

export function BlogJournalPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState(ALL);

  useEffect(() => {
    let cancelled = false;
    fetchPublicBlogs()
      .then((items) => !cancelled && setPosts(items))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = useMemo(() => posts?.find((p) => p.featured) ?? posts?.[0] ?? null, [posts]);
  const categories = useMemo(() => {
    const seen = new Set<string>();
    posts?.forEach((p) => seen.add(p.category));
    return [ALL, ...seen];
  }, [posts]);
  const shown = useMemo(() => {
    if (!posts) return [];
    if (category === ALL) return posts.filter((p) => p.id !== featured?.id);
    return posts.filter((p) => p.category === category);
  }, [posts, category, featured]);

  const featuredHref = featured ? getBlogPostDetailHref(featured.id) : null;

  return (
    <div className="blog-journal-surface pt-16 font-inter text-warm-ink">
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="blog-journal-grid absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="absolute -right-40 -top-40 size-[640px] rounded-full bg-white/35 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-12 px-6 pb-16 pt-16 lg:pt-20">
          <div className="min-w-0 flex-[999_1_600px]">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-teal-deep/35 bg-white/50 px-3.5 py-2 text-[13px] font-bold uppercase tracking-[0.12em] text-teal-deep">
              <span aria-hidden="true" className="size-[7px] rounded-full bg-success" />
              The EasyLink energy journal
            </p>
            <h1 className="mt-6 font-source-sans text-[52px] font-black leading-[0.98] tracking-tight text-warm-black sm:text-[68px] lg:text-[84px]">
              Power your home
              <br />
              with <span className="text-blog-ink-blue">smarter</span> decisions
            </h1>
            <p className="mt-6 max-w-[620px] text-lg leading-relaxed text-brown-muted sm:text-xl">
              Rebate changes, power prices and plain-English buying guides for Australian homes, so you know exactly what
              you&apos;re paying for.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a
                href="#rebate-check"
                className="rounded-full bg-customer-page-bg px-6 py-4 font-bold text-yellow-lemon transition hover:-translate-y-px hover:brightness-125"
              >
                Check what waiting costs you
              </a>
              <a
                href="#latest"
                className="rounded-full border-2 border-customer-page-bg px-6 py-3.5 font-semibold text-customer-page-bg transition hover:bg-customer-page-bg hover:text-white"
              >
                Read the latest
              </a>
            </div>
          </div>
          <div className="min-w-0 flex-[1_1_360px]">
            <RebateCountdown articleHref={featuredHref} />
          </div>
        </div>

        <div className="blog-ticker relative overflow-hidden border-y border-warm-black/10 bg-white/45" aria-label="Key numbers this month">
          <ul className="blog-ticker-track flex w-max py-3.5 text-[15px] whitespace-nowrap">
            {[...TICKER, ...TICKER].map((t, i) => (
              <li
                key={`${t.k}-${i}`}
                aria-hidden={i >= TICKER.length ? "true" : undefined}
                className="inline-flex items-center gap-2.5 border-r border-warm-black/15 px-7"
              >
                <span className="text-brown-muted">{t.k}</span>
                <span className={`font-bold ${t.tone}`}>{t.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-6 pb-6 pt-18">
        {error ? (
          <p className="rounded-3xl bg-customer-card-bg px-6 py-10 text-center text-white">
            We couldn&apos;t load the articles just now. Please refresh the page.
          </p>
        ) : null}

        {featured && featuredHref ? (
          <Link
            href={featuredHref}
            className="group relative block min-h-[540px] overflow-hidden rounded-[32px] border border-white/10 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-customer-page-bg"
          >
            <Image
              src={featured.heroImageSrc}
              alt={featured.heroImageAlt}
              fill
              priority
              sizes="(min-width: 1240px) 1192px, 100vw"
              className="object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-r from-navy-900/97 via-navy-900/85 via-40% to-navy-900/5"
            />
            <div className="relative flex min-h-[540px] max-w-[660px] flex-col justify-center gap-5 p-8 sm:p-14">
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className="rounded-full bg-yellow-lemon px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-customer-page-bg">
                  Featured
                </span>
                <span className="rounded-full border border-design-accent-cyan/60 px-3 py-1 font-bold text-design-accent-cyan">
                  {featured.category}
                </span>
                <span>{[featured.dateLabel, featured.readTimeLabel].filter(Boolean).join(" · ")}</span>
              </div>
              <h2 className="font-source-sans text-[38px] font-black leading-[1.02] tracking-tight sm:text-[52px]">
                {featured.title}
              </h2>
              <p className="text-lg leading-relaxed text-white/80">{featured.excerpt}</p>
              <div className="flex flex-wrap items-center gap-6">
                {featured.cardStat ? (
                  <div>
                    <p className="blog-sun-gradient bg-clip-text font-source-sans text-[56px] font-black leading-none text-transparent">
                      {featured.cardStat}
                    </p>
                    {featured.cardStatLabel ? <p className="mt-1.5 text-[13px] text-white/65">{featured.cardStatLabel}</p> : null}
                  </div>
                ) : null}
                <span className="blog-sun-gradient rounded-full px-6 py-3.5 font-bold text-customer-page-bg">Read the article →</span>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mt-18">
          <RebateCheck />
        </div>

        <div id="latest" className="mt-20 flex scroll-mt-28 flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-teal-deep">Latest articles</p>
            <h2 className="mt-2 font-source-sans text-[44px] font-black leading-[1.05] text-warm-black">Know before you buy</h2>
          </div>
          {categories.length > 2 ? (
            <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-customer-card-bg p-1.5">
              {categories.map((c) => {
                const on = c === category;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(c)}
                    className={`min-h-11 cursor-pointer rounded-full px-4.5 text-sm font-bold transition ${
                      on ? "blog-sun-gradient text-customer-page-bg" : "text-white/80 hover:text-white"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {posts === null && !error ? (
          <ul className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[470px] animate-pulse rounded-[26px] bg-customer-card-bg/80 motion-reduce:animate-none" />
            ))}
          </ul>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((post) => (
              <li key={post.id}>
                <JournalCard post={post} />
              </li>
            ))}
          </ul>
        )}
        {posts && shown.length === 0 ? (
          <p className="mt-7 text-base text-brown-muted">No articles in this category yet.</p>
        ) : null}

        <section className="relative mt-22 flex flex-wrap items-center justify-between gap-7 overflow-hidden rounded-[32px] bg-customer-page-bg p-8 text-white sm:p-14">
          <div aria-hidden="true" className="absolute -right-20 -top-20 size-80 rounded-full border-[40px] border-yellow-lemon/20" />
          <div className="relative min-w-0 flex-[1_1_520px]">
            <h2 className="font-source-sans text-[40px] font-black leading-[1.02] sm:text-[48px]">See what your roof can do</h2>
            <p className="mt-3.5 max-w-[560px] text-lg leading-relaxed text-white/78">
              Design a solar and battery system from your own roof in a few minutes, priced with installation included. No
              obligation.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3.5">
            <Link href="/designs" className="blog-sun-gradient rounded-full px-7 py-4 font-bold text-customer-page-bg transition hover:-translate-y-px">
              Start your free design
            </Link>
            <Link
              href="/ready-deals"
              className="rounded-full border-2 border-design-accent-cyan px-6 py-3.5 font-bold text-white transition hover:bg-design-accent-cyan hover:text-customer-page-bg"
            >
              Browse Ready Deals
            </Link>
          </div>
        </section>
      </div>
      <div className="h-20" aria-hidden="true" />
    </div>
  );
}

