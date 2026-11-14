import { ABOUT_US_PAGE } from "@/utils/constant";
import { SitePortfolioCard } from "./SitePortfolioCard";

export function AboutUsPortfolioSection() {
  const rows = [
    ABOUT_US_PAGE.portfolio.items.slice(0, 3),
    ABOUT_US_PAGE.portfolio.items.slice(3, 6),
    ABOUT_US_PAGE.portfolio.items.slice(6, 9),
  ];

  return (
    <section className="about-us-portfolio-surface px-4 py-16 sm:px-6 lg:px-[91px] lg:py-[109px]">
      <div className="mx-auto flex w-full max-w-[1263px] flex-col gap-[47px]">
        <header className="max-w-[640px]">
          <h2 className="font-source-sans text-[32px] font-bold leading-normal text-about-portfolio-heading sm:text-[40px]">
            {ABOUT_US_PAGE.portfolio.title}
          </h2>
          <p className="mt-[5px] font-source-sans text-base font-normal leading-normal tracking-[-0.3125px] text-about-portfolio-subtitle">
            {ABOUT_US_PAGE.portfolio.subtitle}
          </p>
        </header>

        <div className="flex flex-col gap-12 lg:gap-[47px]">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-1 justify-items-center gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-5"
            >
              {row.map((item) => (
                <SitePortfolioCard key={item.id} item={item} />
              ))}
            </div>
          ))}
        </div>

        <p className="max-w-[900px] font-source-sans text-xs leading-relaxed text-about-portfolio-subtitle/80">
          {ABOUT_US_PAGE.portfolio.footnote}
        </p>
      </div>
    </section>
  );
}
