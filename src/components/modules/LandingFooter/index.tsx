import Image from "next/image";
import Link from "next/link";

import Icon, { type IconType } from "@/components/ui/Icons";
import { RainbowButton } from "@/components/ui/RainbowButton";
import { LANDING_ENERGY_CTA, LANDING_FOOTER_COLUMNS } from "@/utils/constant";

export type FooterCustomCta = {
  title: string;
  description: string;
  primary: {
    label: string;
    href: string;
    iconId: IconType;
  };
  secondary: {
    label: string;
    href: string;
    iconId: IconType;
  };
};

export type FooterSectionProps = {
  /** BLUETTI product page design goes straight from app CTA into the link columns. */
  showReadyToControlCta?: boolean;
  customCta?: FooterCustomCta;
};

export function FooterSection({
  showReadyToControlCta = true,
  customCta,
}: FooterSectionProps) {
  const showCta = showReadyToControlCta || Boolean(customCta);

  return (
    <footer className="border-t border-gray-7 bg-gray-8 pb-6">
      <div className="mx-auto w-full px-4 pt-14 sm:px-6 lg:px-8">
        {customCta ? (
          <div className="faqs-support-cta-card mx-auto flex min-h-[282px] w-full max-w-[896px] flex-col items-center justify-center rounded-3xl border-2 border-gray-7/60 bg-gray-2/80 px-6 py-10 text-center backdrop-blur-[20px]">
            <h3 className="font-outfit text-[32px] font-bold leading-10 text-faqs-support-title sm:text-[40px]">
              {customCta.title}
            </h3>
            <p className="mx-auto mt-3 max-w-[519px] font-dm-sans text-base leading-6 text-faqs-support-body">
              {customCta.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={customCta.primary.href}
                className="faqs-support-primary-btn inline-flex h-12 min-w-[174px] items-center justify-center gap-1 rounded-xl px-[18px] font-outfit text-base font-medium leading-6 text-faqs-support-primary-text transition-opacity hover:opacity-95"
              >
                <Icon
                  name={customCta.primary.iconId}
                  className="size-[18px] text-current"
                />
                {customCta.primary.label}
              </Link>
              <Link
                href={customCta.secondary.href}
                className="inline-flex h-12 min-w-[178px] items-center justify-center gap-1 rounded-xl border-2 border-faqs-support-secondary-border bg-transparent px-4 font-outfit text-base font-medium leading-6 text-faqs-support-secondary-text backdrop-blur-[2px] transition hover:bg-white/40"
              >
                <Icon
                  name={customCta.secondary.iconId}
                  className="size-[18px] text-current"
                />
                {customCta.secondary.label}
              </Link>
            </div>
          </div>
        ) : showReadyToControlCta ? (
          <div className="mx-auto flex min-h-[280px] w-full max-w-[1224px] flex-col justify-center rounded-3xl border border-sky-100 bg-white px-6 py-10 text-center shadow-sm footer-card">
            <h3 className="text-4xl font-bold tracking-tight text-slate-900">
              Ready to Take Control of Your Energy?
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Join thousands of homeowners already saving with Easylink Solar and
              BLUETTI products.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <RainbowButton
                href={LANDING_ENERGY_CTA.primary.href}
                shape="rounded"
                className="bg-linear-to-r from-fuchsia-500 to-red-400 px-7 py-3 text-sm font-semibold text-white"
              >
                Get Your Quote
              </RainbowButton>
              <RainbowButton
                href={LANDING_ENERGY_CTA.secondary.href}
                shape="rounded"
                className="px-7 py-3 text-sm font-semibold text-slate-900"
              >
                Contact Sales
              </RainbowButton>
            </div>
          </div>
        ) : null}

        <div
          className={`mx-auto grid max-w-[1226px] gap-10 lg:grid-cols-[1.3fr_3fr] lg:px-6 ${
            showCta ? "mt-12" : "mt-0"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.webp"
                alt="EasyLink Solar"
                unoptimized
                width={40}
                height={40}
              />
              <p className="text-lg font-bold text-slate-950">EASYLINK SOLAR</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Your Local Solar Energy Partner
            </p>
            <p className="text-sm text-slate-600">
              Authorised{" "}
              <Link href="/bluetti" className="transition hover:text-slate-700">
                <span className="font-semibold text-sky-brand">BLUETTI</span>
              </Link>{" "}
              Distributor
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-4 lg:gap-y-8 lg:gap-x-10">
            {LANDING_FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="font-semibold text-slate-900">{column.title}</h4>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {column.items.map((item) => (
                    <li key={`${column.title}-${item.label}`}>
                      <Link
                        href={item.href}
                        className="transition hover:text-slate-900"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-200 pt-6 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-left lg:px-6">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} EasyLink Solar. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
            <Link href="/privacy-policy" className="transition hover:text-slate-800">Privacy</Link>
            <Link href="/terms" className="transition hover:text-slate-800">Terms</Link>
            <Link href="/refunds" className="transition hover:text-slate-800">Refunds</Link>
            <Link href="/cookies" className="transition hover:text-slate-800">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
