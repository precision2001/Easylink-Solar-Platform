"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  main: ReactNode;
  aside: ReactNode;
};

/** On xl+, caps the aside column to the main column height so panels align without stretching main. */
export function CustomerDashboardColumns({ main, aside }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [asideMaxHeight, setAsideMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    const node = mainRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const sync = () => {
      if (window.matchMedia("(min-width: 1280px)").matches) {
        setAsideMaxHeight(node.offsetHeight);
      } else {
        setAsideMaxHeight(undefined);
      }
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.48fr)] xl:items-start">
      <div ref={mainRef}>{main}</div>
      <div
        className="flex min-h-0 min-w-0 flex-col xl:overflow-hidden"
        style={
          asideMaxHeight != null ? { maxHeight: asideMaxHeight } : undefined
        }
      >
        {aside}
      </div>
    </div>
  );
}
