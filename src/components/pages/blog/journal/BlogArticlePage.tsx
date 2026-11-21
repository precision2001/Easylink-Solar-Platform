import Image from "next/image";
import Link from "next/link";

import { ArticleBlocks } from "@/components/pages/blog/journal/ArticleBlocks";
import { JournalCard, categoryChipClass } from "@/components/pages/blog/journal/JournalCard";
import { ShareButtons } from "@/components/pages/blog/journal/ShareButtons";
import type { BlogArticle } from "@/lib/public/blog-article";
import type { BlogPost } from "@/utils/constant";

type Props = { post: BlogPost; article: BlogArticle; relatedPosts: readonly BlogPost[] };

export function BlogArticlePage({ post, article, relatedPosts }: Props) {
  return (
    <div className="blog-journal-surface pt-16 font-inter text-warm-ink">
      <article>
        <div className="mx-auto max-w-[1288px] px-6 pt-6">
          <section className="relative flex min-h-[600px] items-end overflow-hidden rounded-[36px]">
            <Image src={post.heroImageSrc} alt={post.heroImageAlt} fill priority sizes="(min-width: 1288px) 1240px, 100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-customer-page-bg/20 via-customer-page-bg/55 via-45% to-customer-page-bg/92" />
            <div className="relative w-full px-6 pb-12 sm:px-12 sm:pb-14">
              <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-white/80">
                <Link href="/blog" className="text-white underline underline-offset-2">
                  Blog
                </Link>
                <span aria-hidden="true">›</span>
                <span>{post.category}</span>
              </nav>
              <div className="mt-4.5 flex flex-wrap items-center gap-3 text-sm text-white/85">
                <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${categoryChipClass(post.category)}`}>
                  {post.category}
                </span>
                <span>{[post.dateLabel, post.readTimeLabel, post.authorName].filter(Boolean).join(" · ")}</span>
              </div>
              <h1 className="mt-4.5 max-w-[980px] font-source-sans text-[40px] font-black leading-[0.98] tracking-tight text-white sm:text-[56px] lg:text-[72px]">
                {post.title}
              </h1>
              <p className="mt-5.5 max-w-[720px] text-lg leading-relaxed text-white/85 sm:text-[21px]">{post.excerpt}</p>
            </div>
          </section>
        </div>

        {article.keyStats.length ? (
          <section aria-label="Key numbers" className="mx-auto max-w-[1240px] px-6">
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {article.keyStats.map((s) =>
                s.tone === "navy" ? (
                  <div key={s.label} className="rounded-[22px] bg-customer-page-bg p-6 text-yellow-lemon">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="mt-1.5 font-source-sans text-[44px] font-black leading-none lg:text-[52px]">{s.value}</p>
                    {s.note ? <p className="mt-1.5 text-[13px] font-semibold">{s.note}</p> : null}
                  </div>
                ) : (
                  <div key={s.label} className="rounded-[22px] border border-white/10 bg-customer-card-bg p-6 text-white/80">
                    <p className="text-sm text-white/70">{s.label}</p>
                    <p className="mt-1.5 font-source-sans text-[40px] font-black leading-none text-white lg:text-[48px]">{s.value}</p>
                    {s.note ? <p className="mt-1.5 text-[13px] text-white/65">{s.note}</p> : null}
                  </div>
                ),
              )}
            </div>
          </section>
        ) : null}

        <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-10 px-6 pt-12">
          <div className="min-w-0 flex-[999_1_600px] rounded-[32px] bg-cream-50 px-5 py-9 text-[18px] leading-[1.8] text-warm-ink sm:px-14 sm:py-14">
            <ArticleBlocks blocks={article.blocks} />
            {article.sources.length ? (
              <section aria-labelledby="sources-h" className="mt-12 border-t border-warm-border pt-6">
                <h2 id="sources-h" className="font-source-sans text-lg font-extrabold text-customer-page-bg">
                  Sources
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-normal">
                  {article.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-teal-deep underline underline-offset-2 hover:text-customer-page-bg">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside aria-label="More on this topic" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4.5">
            {article.tiers ? (
              <div className="rounded-3xl border border-white/10 bg-customer-card-bg p-6.5 text-white/80">
                <p className="text-[13px] font-bold uppercase tracking-widest text-design-accent-cyan">{article.tiers.title}</p>
                <div className="mt-4.5 flex flex-col gap-3.5 text-[15px]">
                  {article.tiers.rows.map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between">
                        <span>{r.label}</span>
                        <span className="font-extrabold text-white">{r.pct}%</span>
                      </div>
                      <div aria-hidden="true" className="mt-2 h-2.5 rounded-full bg-white/10">
                        <div className="blog-sun-gradient h-2.5 rounded-full" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-3xl border border-white/10 bg-customer-card-bg p-6.5">
              <p className="text-[13px] font-bold uppercase tracking-widest text-design-accent-cyan">Share</p>
              <div className="mt-3.5">
                <ShareButtons title={post.title} />
              </div>
            </div>
            <Link
              href="/blog#rebate-check"
              className="block rounded-3xl border border-design-accent-cyan/50 bg-customer-card-bg p-6.5 text-white transition hover:-translate-y-px"
            >
              <p className="font-source-sans text-2xl font-black leading-tight">Check your own numbers</p>
              <p className="mt-2 text-[15px] text-white/75">Move two sliders to see what waiting costs you.</p>
              <p className="mt-3 font-bold text-design-accent-cyan">Open the rebate check →</p>
            </Link>
          </aside>
        </div>
      </article>

      {relatedPosts.length ? (
        <section aria-labelledby="related-h" className="mx-auto mt-22 max-w-[1240px] px-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-teal-deep">Keep reading</p>
          <h2 id="related-h" className="mb-7 mt-2 font-source-sans text-[40px] font-black text-warm-black">
            More for smart buyers
          </h2>
          <ul className="grid grid-cols-1 gap-6.5 md:grid-cols-2 xl:grid-cols-3">
            {relatedPosts.map((p) => (
              <li key={p.id}>
                <JournalCard post={p} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="h-20" aria-hidden="true" />
    </div>
  );
}
