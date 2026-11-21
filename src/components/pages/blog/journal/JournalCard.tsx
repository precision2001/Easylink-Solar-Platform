import Image from "next/image";
import Link from "next/link";

import { getBlogPostDetailHref, type BlogPost } from "@/utils/constant";

const CATEGORY_CHIP: Record<string, string> = {
  Rebates: "bg-yellow-lemon text-customer-page-bg",
  "Energy news": "bg-design-accent-cyan text-customer-page-bg",
  "Buying guide": "bg-leaf text-customer-page-bg",
};

export function categoryChipClass(category: string): string {
  return CATEGORY_CHIP[category] ?? "bg-white text-customer-page-bg";
}

type Props = { post: BlogPost; compact?: boolean };

/** Navy journal card: photo with the post's key number, category chip, title, excerpt. */
export function JournalCard({ post, compact = false }: Props) {
  return (
    <Link
      href={getBlogPostDetailHref(post.id)}
      className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-white/10 bg-customer-card-bg text-white/80 transition duration-300 hover:-translate-y-1.5 hover:border-design-accent-cyan/60 hover:shadow-[0_18px_50px_rgb(0_176_240/0.18)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-customer-page-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className={`relative overflow-hidden bg-customer-design-image-bg ${compact ? "h-[200px]" : "h-[230px]"}`}>
        <Image
          src={post.heroImageSrc}
          alt={post.heroImageAlt}
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-customer-card-bg/95" />
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1.5 font-inter text-xs font-extrabold uppercase tracking-wide ${categoryChipClass(post.category)}`}
        >
          {post.category}
        </span>
        {post.cardStat ? (
          <div className="absolute inset-x-5 bottom-3.5">
            <p className="font-source-sans text-[32px] font-black leading-none text-yellow-lemon">{post.cardStat}</p>
            {post.cardStatLabel && !compact ? (
              <p className="mt-1 font-inter text-xs text-white/75">{post.cardStatLabel}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex grow flex-col gap-3 px-6 pb-6 pt-5">
        <h3 className="font-source-sans text-[23px] font-extrabold leading-tight text-white">{post.title}</h3>
        {!compact ? <p className="grow font-inter text-[15px] leading-relaxed text-white/72">{post.excerpt}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/10 pt-3.5">
          <span className="font-inter text-[13px] text-white/60">
            {[post.dateLabel, post.readTimeLabel].filter(Boolean).join(" · ")}
          </span>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full border border-white/20 text-lg text-white transition group-hover:border-transparent group-hover:bg-yellow-lemon group-hover:text-customer-page-bg"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
