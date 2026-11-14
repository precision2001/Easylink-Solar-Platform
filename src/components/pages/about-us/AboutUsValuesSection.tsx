import type { CSSProperties } from "react";
import Image from "next/image";

import { ABOUT_US_PAGE } from "@/utils/constant";

// These cards have a translucent/gradient background (by design — the hero
// photo shows through), so RainbowButton's usual trick (a big rotating
// plane hidden behind a smaller *opaque* cutout) doesn't work here: the
// plane shows through the whole translucent face instead of staying
// confined to the border. Masking the gradient down to just the ring band,
// and animating its own angle (not rotating the masked element), keeps the
// rotation confined to a thin border regardless of what's under it. Needs
// opacity variation, not flat white, or a rotating uniform color would
// show no visible motion.
const WHITE_RING_GRADIENT_ANIMATED =
  "conic-gradient(from var(--rainbow-angle), rgba(255,255,255,0.95), rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.95))";
const RING_WIDTH = 2;
const RING_MASK_LAYERS = "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)";

export function AboutUsValuesSection() {
  const rows = [
    ABOUT_US_PAGE.values.items.slice(0, 5),
    ABOUT_US_PAGE.values.items.slice(5, 10),
  ];

  return (
    <section className="relative h-fit log:h-screen w-full overflow-hidden py-16 lg:py-[67px]">
      <Image
        src={ABOUT_US_PAGE.values.backgroundImageSrc}
        alt={ABOUT_US_PAGE.values.backgroundImageAlt}
        fill
        className="object-cover"
        // style={{
        //   background: `lightgray 50% / cover no-repeat`
        // }}
        sizes="100vw"
      />

      <div className="relative z-1 mx-auto flex w-full max-w-[1259px] flex-col items-center gap-[67px] px-4 sm:px-6 lg:px-0">
        <h2 className="text-center font-source-sans text-[32px] font-medium leading-normal tracking-[-0.4395px] text-about-values-text sm:text-[40px]">
          <span className="av-gt av-gt-title relative">
            {ABOUT_US_PAGE.values.title}
          </span>
        </h2>

        <div className="flex w-full flex-col gap-[22px]">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-[24px]"
            >
              {row.map((item, i) => (
                <AboutUsValueCard
                  key={String(item.label)}
                  item={item}
                  index={rowIndex * 5 + i}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutUsValueCard({
  item,
  index,
}: {
  item: (typeof ABOUT_US_PAGE.values.items)[number];
  index: number;
}) {
  const labelLines: string[] = Array.isArray(item.label)
    ? [...item.label]
    : [item.label];
  const isVariantB = item.variant === "b";

  return (
    <div
      className="av-card relative overflow-hidden rounded-[20px] shadow-sm"
      // Gold glitter text (.av-gt / .av-sp in globals.css): offset each
      // card's shine and twinkle so the grid never pulses in unison.
      style={{ "--av-delay": `${-((index * 1.3) % 4.5)}s` } as CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-reduce:animate-none [animation:value-card-ring-spin_5s_linear_infinite]"
        style={{
          padding: RING_WIDTH,
          borderRadius: "inherit",
          backgroundImage: WHITE_RING_GRADIENT_ANIMATED,
          WebkitMask: RING_MASK_LAYERS,
          mask: RING_MASK_LAYERS,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <article
        className={`relative flex min-h-[180px] items-center justify-center rounded-[20px] px-4 py-8 sm:min-h-[234px] ${
          isVariantB
            ? "bg-linear-to-r from-about-values-card-bg-b-from to-about-values-card-bg-b-to"
            : "bg-about-values-card-bg-a"
        }`}
      >
        <p className="relative text-center font-source-sans text-lg font-semibold leading-normal tracking-[-0.4395px] text-about-values-text sm:text-xl">
          {labelLines.map((line) => (
            <span key={line} className="block">
              <span className="av-gt">{line}</span>
            </span>
          ))}
          <span aria-hidden className="av-sp s1" />
          <span aria-hidden className="av-sp s2" />
          <span aria-hidden className="av-sp s3" />
        </p>
      </article>
    </div>
  );
}
