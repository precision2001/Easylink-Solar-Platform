"use client";
import classNames from "classnames";
import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

export type VideoSliderSlide =
  | {
      type: "video";
      src: string;
      poster?: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      priority?: boolean;
    };

type VideoSliderProps = {
  slides: VideoSliderSlide[];
  children?: React.ReactNode;
  /** Merged onto the overlay wrapper (e.g. less top padding when there is no hero title). */
  overlayClassName?: string;
  dotsVariant?: "horizontal-bottom" | "vertical-right";
  navButtonClassName?: string;
  needHeightFull?: boolean;
};

export function VideoSlider({
  slides,
  children,
  overlayClassName,
  dotsVariant = "horizontal-bottom",
  navButtonClassName,
  needHeightFull = false,
}: VideoSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  /**
   * Which slides have been shown at least once — only those render their
   * media. Every slide used to mount its `<video>`/`<Image>` up front, and
   * because the inactive ones are merely `opacity-0` (still in the viewport)
   * the browser downloaded all of them immediately: on the customer hero
   * that meant multi-MB images nobody had scrolled to yet. Visited slides
   * stay mounted so going back to one still cross-fades instantly.
   */
  const [loadedSlides, setLoadedSlides] = useState<number[]>([0]);
  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;
      setCurrentSlide(index);
      setLoadedSlides((prev) =>
        prev.includes(index) ? prev : [...prev, index],
      );
      if (index !== 0 && !videoEnded) setVideoEnded(true);
    },
    [videoEnded, slides],
  );

  useEffect(() => {
    if (currentSlide === 0 && videoEnded && videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
      setTimeout(() => {
        setVideoEnded(false);
      }, 100);
    }
  }, [currentSlide, videoEnded]);

  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setCurrentSlide(1);
    setLoadedSlides((prev) => (prev.includes(1) ? prev : [...prev, 1]));
  }, []);

  return (
    <>
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === currentSlide ? "z-1 opacity-100" : "z-0 opacity-0"
          }`}
        >
          {!loadedSlides.includes(i) ? null : slide.type === "video" ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnd}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src={slide.src} type="video/mp4" />
            </video>
          ) : (
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              className="object-cover"
              // Only the opening slide is worth preloading; `priority` used to
              // be hardcoded to slide 1, which preloaded an off-screen image.
              priority={slide.priority ?? i === 0}
            />
          )}
        </div>
      ))}

      {/* Overlay content */}
      <div
        className={classNames(
          "relative z-2 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-6 pt-24 sm:px-8 sm:pt-[92px] lg:px-8",
          overlayClassName,
        )}
      >
        {dotsVariant === "horizontal-bottom" ? (
          <div className={classNames("flex flex-col gap-4", needHeightFull ? "h-full" : "")}>
            {children}

            <div className="flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`size-3 rounded-full transition-colors ${
                    i === currentSlide ? "bg-gold" : "bg-slate-ink/30"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {dotsVariant === "vertical-right" ? (
        <div className="absolute right-4 bottom-1/6 z-3 flex -translate-y-1/2 flex-col gap-2 sm:right-[42px]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`size-3 rounded-full transition-colors ${
                i === currentSlide
                  ? "home-hero-dot-active"
                  : "bg-home-hero-dot-idle"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}

      {/* Navigation arrows */}
      <button
        onClick={() => goToSlide(currentSlide - 1)}
        className={classNames(
          "absolute left-3 top-1/2 z-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-7/50 bg-surface-50/60 backdrop-blur-[15px] transition-colors hover:bg-surface-50/80 sm:left-[19px] sm:flex sm:size-[54px]",
          navButtonClassName,
        )}
        aria-label="Previous slide"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-800"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        onClick={() => goToSlide(currentSlide + 1)}
        className={classNames(
          "absolute right-3 top-1/2 z-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-7/50 bg-surface-50/60 backdrop-blur-[15px] transition-colors hover:bg-surface-50/80 sm:right-[19px] sm:flex sm:size-[54px]",
          navButtonClassName,
        )}
        aria-label="Next slide"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-800"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </>
  );
}
