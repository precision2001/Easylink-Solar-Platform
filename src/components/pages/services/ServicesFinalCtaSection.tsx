import { ServicesReveal } from "@/components/pages/services/ServicesReveal";
import { ServicesRippleLink } from "@/components/pages/services/ServicesRippleLink";
import Icon from "@/components/ui/Icons";
import { SERVICES_PAGE } from "@/utils/constant";

const { finalCta } = SERVICES_PAGE;

export function ServicesFinalCtaSection() {
  return (
    <section
      id="contact"
      aria-labelledby="services-final-cta-title"
      className="svc-anchor svc-final-cta relative overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      <div aria-hidden="true" className="svc-grid-lines absolute inset-0" />

      <div className="relative mx-auto w-full max-w-[1226px] px-4 sm:px-6 lg:px-8">
        <ServicesReveal className="flex flex-col items-center gap-6 text-center">
          <h2
            id="services-final-cta-title"
            className="max-w-[720px] font-outfit text-[30px] font-bold leading-[1.16] tracking-[-0.8px] text-white sm:text-[40px] lg:text-[46px]"
          >
            {finalCta.title}
          </h2>
          <p className="max-w-[560px] font-dm-sans text-base leading-7 text-svc-dark-body sm:text-lg">
            {finalCta.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <ServicesRippleLink
              href={finalCta.primary.href}
              onDark
              className="svc-cta-primary inline-flex h-13 min-w-[214px] items-center justify-center gap-2 rounded-xl px-7 font-outfit text-base font-semibold text-warm-black"
            >
              {finalCta.primary.label}
              <Icon name="ArrowRight" className="size-[18px] text-current" />
            </ServicesRippleLink>

            <ServicesRippleLink
              href={finalCta.secondary.href}
              onDark
              className="svc-glass inline-flex h-13 min-w-[160px] items-center justify-center gap-2 rounded-xl px-7 font-outfit text-base font-semibold text-white transition hover:bg-svc-glass-strong"
            >
              {finalCta.secondary.label}
              <Icon name="Mail" className="size-[18px] text-current" />
            </ServicesRippleLink>
          </div>
        </ServicesReveal>

        <ServicesReveal delayMs={120}>
          <div className="mt-14 grid gap-8 border-t border-svc-dark-border pt-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col gap-4">
              <h3 className="font-outfit text-base font-semibold leading-6 text-white">
                {finalCta.contact.title}
              </h3>
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {finalCta.contact.items.map((item) => {
                  const content = (
                    <>
                      <Icon
                        name={item.iconId}
                        className="size-4 shrink-0 text-yellow-lemon"
                      />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="svc-focusable-dark flex items-center gap-2.5 rounded-md font-inter text-sm leading-6 text-svc-dark-body transition hover:text-white"
                        >
                          {content}
                        </a>
                      ) : (
                        <span className="flex items-center gap-2.5 font-inter text-sm leading-6 text-svc-dark-body">
                          {content}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </ServicesReveal>
      </div>
    </section>
  );
}
