import Link from "next/link";
import { SOLAR_MAINTENANCE_CUSTOMER_SECTION } from "@/utils/constant";

export function SolarMaintenanceCustomerSection() {
  const s = SOLAR_MAINTENANCE_CUSTOMER_SECTION;
  return (
    <section className="border-y border-warm-border bg-cream-50 px-4 py-14 sm:px-6 lg:py-16">
      <div className="mx-auto flex max-w-[1216px] flex-col gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
        <div className="max-w-2xl space-y-3">
          <p className="font-inter text-xs font-semibold uppercase tracking-[0.2em] text-warm-gray">
            {s.eyebrow}
          </p>
          <h2 className="font-source-sans text-3xl font-bold leading-tight tracking-tight text-warm-ink sm:text-4xl">
            {s.title}
          </h2>
          <p className="font-source-sans text-base leading-relaxed text-text">
            {s.body}
          </p>
        </div>
        <div className="flex shrink-0 justify-center lg:justify-end">
          <Link
            href={s.ctaHref}
            className="inline-flex items-center justify-center rounded-xl bg-navy-800 px-6 py-3 font-inter text-sm font-semibold text-white transition hover:bg-navy-900"
          >
            {s.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
