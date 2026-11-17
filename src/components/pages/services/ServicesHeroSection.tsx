import { ServicesBreadcrumb } from "@/components/pages/services/ServicesBreadcrumb";
import { ServicesHeroMockup } from "@/components/pages/services/ServicesHeroMockup";
import { ServicesReveal } from "@/components/pages/services/ServicesReveal";
import { ServicesRippleLink } from "@/components/pages/services/ServicesRippleLink";
import Icon from "@/components/ui/Icons";
import { SERVICES_PAGE } from "@/utils/constant";

const { hero } = SERVICES_PAGE;

export function ServicesHeroSection() {
  return (
    <section
      aria-labelledby="services-hero-title"
      className="svc-hero-bg relative overflow-hidden"
    >
      <div aria-hidden="true" className="svc-grid-lines absolute inset-0" />

      <div className="relative mx-auto w-full max-w-[1226px] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pb-28">
        <ServicesBreadcrumb />

        <div className="mt-8 grid items-center gap-12 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14">
          <div className="flex flex-col gap-7">
            <ServicesReveal className="flex flex-col gap-6">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-svc-dark-border bg-svc-glass px-3.5 py-1.5 font-inter text-xs font-semibold uppercase tracking-[0.12em] text-svc-dark-body backdrop-blur-md">
                <Icon name="Sparkles" className="size-3.5 text-yellow-lemon" />
                {hero.badge}
              </span>

              <h1
                id="services-hero-title"
                className="max-w-[660px] font-outfit text-[34px] font-bold leading-[1.1] tracking-[-1.2px] text-white sm:text-[46px] lg:text-[56px]"
              >
                Professional{" "}
                <span className="svc-gradient-text">
                  Website Design &amp; Development
                </span>{" "}
                That Grows Your Business
              </h1>

              <p className="max-w-[560px] font-dm-sans text-base leading-7 text-svc-dark-body sm:text-lg sm:leading-8">
                {hero.subtitle}
              </p>
            </ServicesReveal>

            <ServicesReveal delayMs={120} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <ServicesRippleLink
                  href={hero.primaryCta.href}
                  onDark
                  className="svc-cta-primary inline-flex h-13 min-w-[190px] items-center justify-center gap-2 rounded-xl px-7 font-outfit text-base font-semibold text-warm-black"
                >
                  {hero.primaryCta.label}
                  <Icon name="ArrowRight" className="size-[18px] text-current" />
                </ServicesRippleLink>

                <ServicesRippleLink
                  href={hero.secondaryCta.href}
                  onDark
                  className="svc-glass inline-flex h-13 min-w-[186px] items-center justify-center gap-2 rounded-xl px-7 font-outfit text-base font-semibold text-white transition hover:bg-svc-glass-strong"
                >
                  {hero.secondaryCta.label}
                  <Icon name="ArrowUpRight" className="size-[18px] text-current" />
                </ServicesRippleLink>
              </div>

              <p className="font-inter text-[13px] leading-5 text-svc-dark-muted">
                {hero.trustNote}
              </p>
            </ServicesReveal>

          </div>

          <ServicesReveal delayMs={160} className="relative">
            <div className="relative mx-auto w-full max-w-[620px]">
              <ServicesHeroMockup />

            </div>
          </ServicesReveal>
        </div>
      </div>
    </section>
  );
}
