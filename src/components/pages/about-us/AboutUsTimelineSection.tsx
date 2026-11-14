"use client";

import { AboutUsTimelineCard } from "@/components/pages/about-us/AboutUsTimelineCard";
import { ABOUT_US_PAGE } from "@/utils/constant";
import { useEffect, useRef, useState } from "react";

/**
 * Timeline with an animated "energy" spine (styles: .tl-* in globals.css).
 *
 * - The spine fills top-to-bottom as the page scrolls, with a glowing comet
 *   head at the fill edge and a light pulse running down the filled part.
 * - Each node sits level with its card (same grid row), so nodes always line
 *   up with cards whatever their height. When the fill reaches a row its node
 *   turns into a glowing diamond with sonar rings. Cards slide in from their
 *   side as they scroll into view.
 * - All rows are the same height (auto-rows-fr on desktop), so every card is
 *   the height of the tallest one; badges sit at the bottom of each card.
 */
export function AboutUsTimelineSection() {
  const events = ABOUT_US_PAGE.timeline.events;
  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [reached, setReached] = useState<boolean[]>(() => events.map(() => false));
  const [shown, setShown] = useState<boolean[]>(() => events.map(() => false));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduce) {
        setProgress(1);
        setReached(events.map(() => true));
        setShown(events.map(() => true));
        return;
      }
      const list = listRef.current;
      if (!list) return;
      const rect = list.getBoundingClientRect();
      // The fill edge tracks a line 60% of the way down the screen.
      const edge = window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (edge - rect.top) / rect.height));
      setProgress(p);
      setReached((prev) => {
        const next = rowRefs.current.map((row, i) => {
          if (prev[i]) return true; // once lit, stays lit
          if (!row) return false;
          const r = row.getBoundingClientRect();
          return r.top + r.height / 2 <= edge;
        });
        return next.every((v, i) => v === prev[i]) ? prev : next;
      });
      // Cards slide in as soon as their top is 85% down the screen, ahead
      // of the comet, so there's never an empty gap while scrolling.
      setShown((prev) => {
        const next = rowRefs.current.map((row, i) => {
          if (prev[i]) return true;
          if (!row) return false;
          return row.getBoundingClientRect().top <= window.innerHeight * 0.85;
        });
        return next.every((v, i) => v === prev[i]) ? prev : next;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    if (reduce) return () => cancelAnimationFrame(frame);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [events]);

  return (
    <section className="about-us-timeline-surface relative overflow-hidden px-4 py-16 sm:px-6 lg:px-[90px] lg:py-[177px]">
      <div className="relative mx-auto w-full max-w-[1260px]">
        {/* Spine (desktop only) */}
        <div
          className="tl-spine pointer-events-none absolute inset-y-0 left-1/2 hidden w-[17px] -translate-x-1/2 lg:block"
          aria-hidden
        >
          <div className="tl-track about-us-timeline-line" />
          <div
            className="tl-fill about-us-timeline-line"
            style={{ clipPath: `inset(0 0 ${(1 - progress) * 100}% 0 round 999px)` }}
          />
          <div className="tl-head" style={{ top: `${progress * 100}%` }} />
        </div>

        <ol
          ref={listRef}
          className="relative grid grid-cols-1 gap-12 lg:auto-rows-fr lg:grid-cols-[1fr_120px_1fr] lg:gap-x-0 lg:gap-y-[60px]"
        >
          {events.map((event, index) => {
            const isLeft = event.side === "left";
            const on = reached[index];
            const cardOn = shown[index];
            return (
              <li key={event.id} className="contents">
                <div
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  className={`tl-card-wrap flex ${isLeft ? "tl-from-left lg:col-start-1 lg:justify-end" : "tl-from-right lg:col-start-3 lg:justify-start"} ${cardOn ? "is-on" : ""}`}
                  style={{ gridRow: index + 1 }}
                >
                  <AboutUsTimelineCard event={event} />
                </div>
                <div
                  className="hidden items-center justify-center lg:col-start-2 lg:flex"
                  style={{ gridRow: index + 1 }}
                  aria-hidden
                >
                  <span className={`tl-node ${on ? "is-on" : ""}`}>
                    <span className="tl-node-core" />
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
