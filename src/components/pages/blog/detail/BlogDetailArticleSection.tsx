import Image from "next/image";

import { BlogDetailContactCard } from "@/components/pages/blog/detail/BlogDetailContactCard";
import { BlogDetailFeaturedQuote } from "@/components/pages/blog/detail/BlogDetailFeaturedQuote";
import { BlogDetailLeaderQuoteCard } from "@/components/pages/blog/detail/BlogDetailLeaderQuoteCard";
import { BlogDetailShareBar } from "@/components/pages/blog/detail/BlogDetailShareBar";
import type { BlogDetailContent } from "@/utils/constant";

type Props = {
  content: BlogDetailContent;
};

export function BlogDetailArticleSection({ content }: Props) {
  return (
    <article className="mx-auto w-full max-w-[720px] px-4 sm:px-6">
      <p className="font-source-sans text-[20px] font-normal leading-normal tracking-[0.0703px] text-blog-detail-body sm:text-[24px]">
        {content.leadParagraph}
      </p>

      <div className="relative mt-[40px] aspect-[720/481] w-full overflow-hidden rounded-[16px] border border-blog-detail-image-border shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <Image
          src={content.featuredImageSrc}
          alt={content.featuredImageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
          priority
        />
      </div>

      <div className="mt-[40px] flex flex-col gap-[24px]">
        {content.bodyParagraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="font-source-sans text-[16px] font-normal leading-normal tracking-[-0.3125px] text-blog-detail-body sm:text-[18px]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {content.featuredQuote ? (
        <div className="mt-[48px]">
          <BlogDetailFeaturedQuote quote={content.featuredQuote} />
        </div>
      ) : null}

      {content.leaderQuotes.length > 0 ? (
        <>
          <h2 className="mt-[48px] font-source-sans text-[20px] font-bold leading-normal text-blog-detail-body sm:text-[24px]">
            {content.industryLeadersHeading}
          </h2>

          <ul className="mt-[24px] flex flex-col gap-[24px]">
            {content.leaderQuotes.map((quote) => (
              <li key={quote.attribution}>
                <BlogDetailLeaderQuoteCard quote={quote} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-[48px] border-t border-blog-detail-divider pt-[33.036px]">
        {content.contact ? (
          <>
            <p className="font-inter text-[14px] font-bold leading-[20px] tracking-[-0.1504px] text-blog-detail-ends-label">
              ENDS
            </p>
            <div className="mt-[26.173px] mb-[26.173px]">
              <BlogDetailContactCard contact={content.contact} />
            </div>
          </>
        ) : null}
        <BlogDetailShareBar label={content.shareLabel} title={content.title} />
      </div>
    </article>
  );
}
