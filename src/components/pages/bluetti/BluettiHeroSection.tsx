import Image from "next/image";
import { BLUETTI_EP2000_HERO } from "@/utils/constant";

export function BluettiHeroSection() {
  const { title, subtitle, backgroundImageSrc, backgroundImageAlt } =
    BLUETTI_EP2000_HERO;

  return (
    <section
      className="relative flex min-h-[min(100dvh,56rem)] w-full items-center justify-center overflow-hidden pt-16"
      aria-labelledby="bluetti-ep2000-hero-heading"
    >
      <Image
        src={backgroundImageSrc}
        alt={backgroundImageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="bluetti-hero-overlay pointer-events-none absolute inset-0 z-1" />
      <div className="relative z-2 flex w-full max-w-[1400px] flex-col items-center justify-center px-4 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-8 lg:px-8">
        <h1
          id="bluetti-ep2000-hero-heading"
          className="bluetti-hero-title text-bluetti-hero-text"
        >
          <span className="bluetti-hero-title-brand">{title.brand}</span>{" "}
          <span>{title.product}</span>
        </h1>
        <p className="bluetti-hero-subtitle text-bluetti-hero-text">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
