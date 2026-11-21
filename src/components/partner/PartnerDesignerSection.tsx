import Link from "next/link";
import { designerHref, type PartnerSiteConfig } from "@/lib/public/partnerSite";

/**
 * The Platform Designer promo that sits on an installer's own website, in
 * their colours.
 *
 * Two forms, same component. `page` is the standalone landing page an
 * installer links to from their navigation; `section` is the block they embed
 * in an existing page, which drops the outer padding and the heading scale so
 * it sits inside their layout rather than fighting it.
 *
 * Everything visible comes from the installer's own record: their name, logo
 * and colours. Nothing here mentions EasyLink unless the site is not
 * white-labelled, in which case a single "Powered by" line is shown — which is
 * the client's rule for non-Elite installers.
 *
 * The button is a plain link to /designs?partner=<key>. The design pages
 * already capture `partner` and send it with the saved design, so the lead
 * lands in this installer's account without the embed doing anything else.
 */

const BULLETS = [
  "See your roof from above and place real panels on it",
  "Your system size, yearly output and savings as you go",
  "A written proposal you can keep, with rebates applied",
];

export function PartnerDesignerSection({
  site,
  variant = "page",
}: {
  site: PartnerSiteConfig;
  /** `section` is for embedding inside an installer's existing page. */
  variant?: "page" | "section";
}) {
  const isPage = variant === "page";

  return (
    <section
      aria-labelledby="partner-designer-title"
      className={
        isPage
          ? "flex w-full flex-col items-center px-5 py-14 sm:py-20"
          : "flex w-full flex-col items-center px-4 py-10"
      }
      style={{ background: "#FFFFFF", color: "#0F172A" }}
    >
      <div className="flex w-full max-w-[920px] flex-col items-center gap-5 text-center">
        {site.logoUrl ? (
          // The installer's own logo, from their record. Plain <img>: the
          // host is theirs and is not in next.config's image allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.logoUrl}
            alt={site.companyName}
            className="h-11 w-auto object-contain"
          />
        ) : null}

        <h2
          id="partner-designer-title"
          className={
            isPage
              ? "m-0 font-source-sans text-[32px] leading-[1.15] font-bold sm:text-[42px]"
              : "m-0 font-source-sans text-[26px] leading-[1.2] font-bold sm:text-[32px]"
          }
        >
          Design your solar system in minutes
        </h2>

        <p className="m-0 max-w-[620px] text-[16px] leading-[1.6] text-[#475569]">
          Draw your system on a satellite view of your own roof, see what it
          would produce and what you would save, then send it to{" "}
          {site.companyName} for a quote. No sales call to get started.
        </p>

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-left">
          {BULLETS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px] leading-[1.5]">
              <span
                aria-hidden
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                style={{ background: site.brandPrimary, color: site.brandOnPrimary }}
              >
                ✓
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Link
          href={designerHref(site.key)}
          prefetch={false}
          className="mt-1 flex h-13 items-center rounded-[12px] px-7 text-[16px] font-bold no-underline transition-opacity hover:opacity-90"
          style={{ background: site.brandPrimary, color: site.brandOnPrimary }}
        >
          Start designing
        </Link>

        <p className="m-0 text-[13px] text-[#5B6B80]">
          Free, no obligation. Your design goes straight to {site.companyName}.
        </p>

        {/*
          The client's rule: Elite installers are fully white-labelled, the
          rest carry a "Powered by" line. Nothing else on this page names
          EasyLink either way.
        */}
        {site.whiteLabel ? null : (
          <p className="m-0 text-[12px] text-[#94A3B8]">
            Powered by EasyLink Solar
          </p>
        )}
      </div>
    </section>
  );
}
