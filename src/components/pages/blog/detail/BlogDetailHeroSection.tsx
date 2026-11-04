import { BlogDetailBreadcrumbs } from "@/components/pages/blog/detail/BlogDetailBreadcrumbs";
import { BlogDetailMetaRow } from "@/components/pages/blog/detail/BlogDetailMetaRow";
import type { BlogDetailContent } from "@/utils/constant";

type Props = {
  content: BlogDetailContent;
};

export function BlogDetailHeroSection({ content }: Props) {
  return (
    <section className="relative overflow-hidden bg-blog-detail-hero-bg pb-[26px] pt-28 sm:pt-32 lg:pb-[39px] lg:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[126px] -top-[26px] size-[223px] rounded-full bg-blog-detail-category-bg opacity-60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 size-[224px] translate-x-1/4 translate-y-1/4 rounded-full bg-blog-detail-category-bg opacity-40 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-[110px]">
        <div className="flex max-w-[896px] flex-col gap-[39px]">
          <div className="flex flex-col gap-[23px]">
            <div className="flex flex-col gap-[32px]">
              <BlogDetailBreadcrumbs currentTitle={content.breadcrumbTitle} />
              <BlogDetailMetaRow
                categoryLabel={content.categoryLabel}
                dateLabel={content.dateLabel}
                readTimeLabel={content.readTimeLabel}
              />
            </div>
            <h1 className="max-w-[882px] font-source-sans text-[32px] font-bold leading-[1.3] text-blog-detail-title sm:text-[44px] lg:text-[60px]">
              {content.title}
            </h1>
          </div>
          <div className="border-l-[3.145px] border-blog-detail-attribution-border pl-[27.14px]">
            <p className="font-source-sans text-[18px] font-bold leading-normal tracking-[-0.4395px] text-blog-detail-attribution-name">
              {content.attributionName}
            </p>
            {content.attributionRole ? (
              <p className="mt-[8px] font-source-sans text-[14px] font-normal leading-normal tracking-[-0.1504px] text-blog-detail-attribution-role">
                {content.attributionRole}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
