"use client";

import { FeatureBarOfHero } from "../../modules/FeatureBarOfHero";
import { VideoSlider } from "../../ui/VideoSlider";

const slides = [
  { type: "video" as const, src: "/videos/customerLanding1.mp4" },
  {
    type: "image" as const,
    src: "/images/home/hero-slide-2.png",
    alt: "Solar installation",
  },
  {
    type: "image" as const,
    src: "/images/home/hero-slide-3.png",
    alt: "Solar installation",
  },
];

export function CustomerHeroSection() {
  return (
    <section className="relative min-h-[760px] w-full overflow-hidden sm:h-[716px] sm:min-h-0">
      <VideoSlider slides={slides}>
        <FeatureBarOfHero />
      </VideoSlider>
    </section>
  );
}
